import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Exact same logic as the UI (ScheduleGrid + schedule/page.tsx)
const DUTY_KEYWORDS = ["Duty", "Resource Room Support", "Homeroom"];
const isDuty = (name) => DUTY_KEYWORDS.some(k => name.includes(k));

const teachers = await p.teacher.findMany({ orderBy: { name: "asc" } });

console.log("Middle & High School — Teaching Hours (matches UI logic)\n" + "=".repeat(65));
console.log("Excludes: Homeroom, Duty, Resource Room Support | Only CLASS blocks | Deduplicates joint classes\n");

const results = [];

for (const t of teachers) {
  const assignments = await p.assignment.findMany({
    where: {
      teacherId: t.id,
      timeBlock: { level: { in: ["LOW_SECONDARY", "SECONDARY"] }, blockType: "CLASS" },
      grade: { isNot: null },
    },
    include: { timeBlock: true, grade: true, subject: true },
  });

  if (assignments.length === 0) continue;

  // Exclude duty/homeroom subjects
  const teaching = assignments.filter(a => !isDuty(a.subject.name));

  // Deduplicate joint classes: same (dayOfWeek, startTime) only counts once
  const seen = new Map();
  for (const a of teaching) {
    const key = `${a.timeBlock.dayOfWeek}-${a.timeBlock.startTime}`;
    if (!seen.has(key)) seen.set(key, a);
  }
  const unique = [...seen.values()];

  let totalMins = 0;
  for (const a of unique) {
    const dur = parseFloat(String(a.timeBlock.duration ?? 0));
    if (!isNaN(dur)) totalMins += dur;
  }

  if (totalMins === 0) continue;

  const hrs = totalMins / 60;
  const label = Number.isInteger(hrs) ? `${hrs}h` : `${Math.floor(hrs)}h ${totalMins % 60}min`;
  results.push({ name: t.name, hrs, label, count: unique.length, raw: totalMins });
}

results.sort((a, b) => b.hrs - a.hrs);

results.forEach(r => {
  const flag = r.hrs > 30 ? " ⚠️ HIGH" : r.hrs < 10 ? " ℹ️ LOW" : "";
  console.log(`${r.name.padEnd(30)} ${r.label.padStart(8)}  (${r.count} classes)${flag}`);
});

console.log(`\nTotal: ${results.length} Middle/High teachers with teaching hours`);
console.log(`>30h:   ${results.filter(r => r.hrs > 30).length}`);
console.log(`20-30h: ${results.filter(r => r.hrs >= 20 && r.hrs <= 30).length}`);
console.log(`10-20h: ${results.filter(r => r.hrs >= 10 && r.hrs < 20).length}`);
console.log(`<10h:   ${results.filter(r => r.hrs < 10).length}`);

await p.$disconnect();
