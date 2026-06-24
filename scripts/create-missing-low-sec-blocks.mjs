import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const standardBlocks = [
  { startTime: "07:15", endTime: "07:30", blockType: "REGISTRATION" },
  { startTime: "07:30", endTime: "08:30", blockType: "CLASS" },
  { startTime: "08:30", endTime: "09:30", blockType: "CLASS" },
  { startTime: "09:30", endTime: "09:45", blockType: "BREAK" },
  { startTime: "09:45", endTime: "10:45", blockType: "CLASS" },
  { startTime: "10:45", endTime: "11:30", blockType: "CLASS" },
  { startTime: "11:30", endTime: "12:00", blockType: "LUNCH" },
  { startTime: "12:00", endTime: "13:00", blockType: "CLASS" },
  { startTime: "13:00", endTime: "14:00", blockType: "CLASS" },
  { startTime: "14:00", endTime: "15:15", blockType: "CLASS" },
  { startTime: "15:15", endTime: "15:15", blockType: "DISMISSAL" },
];

const existing = await p.timeBlock.findMany({ where: { level: "LOW_SECONDARY" } });

let created = 0;
for (let day = 1; day <= 5; day++) {
  const dayName = ["Mon","Tue","Wed","Thu","Fri"][day-1];
  for (const s of standardBlocks) {
    const found = existing.find(b => b.dayOfWeek === day && b.startTime === s.startTime && b.blockType === s.blockType);
    if (!found) {
      await p.timeBlock.create({
        data: { dayOfWeek: day, startTime: s.startTime, endTime: s.endTime, blockType: s.blockType, level: "LOW_SECONDARY" }
      });
      console.log(`✅ Created ${dayName} ${s.startTime} ${s.blockType} LOW_SECONDARY`);
      created++;
    }
  }
}
console.log(`\n✅ Created ${created} new LOW_SECONDARY blocks`);

// ── Now migrate all Middle School assignments from wrong blocks ──
const middleGrades = await p.grade.findMany({ where: { level: "LOW_SECONDARY" } });
console.log(`\nMigrating assignments for ${middleGrades.length} Middle School grades...`);

// Map: from any PRIMARY/SECONDARY block → correct LOW_SECONDARY block
const allBlocks = await p.timeBlock.findMany({ orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] });
const lowSecBlocks = allBlocks.filter(b => b.level === "LOW_SECONDARY" && b.blockType === "CLASS");

let totalMoved = 0;
for (const grade of middleGrades) {
  const wrongAssignments = await p.assignment.findMany({
    where: {
      gradeId: grade.id,
      timeBlock: { level: { not: "LOW_SECONDARY" } }
    },
    include: { timeBlock: true, subject: true }
  });

  for (const a of wrongAssignments) {
    const target = lowSecBlocks.find(
      b => b.dayOfWeek === a.timeBlock.dayOfWeek && b.startTime === a.timeBlock.startTime
    );
    if (target) {
      await p.assignment.update({ where: { id: a.id }, data: { timeBlockId: target.id } });
      console.log(`  ✅ ${grade.name}${grade.section||''} | ${a.subject.name} | day${a.timeBlock.dayOfWeek} ${a.timeBlock.startTime} → LOW_SECONDARY`);
      totalMoved++;
    } else {
      console.log(`  ⚠️  No LOW_SECONDARY CLASS block for day${a.timeBlock.dayOfWeek} ${a.timeBlock.startTime} — skipped (${grade.name}${grade.section||''} ${a.subject.name})`);
    }
  }
}

console.log(`\n✅ Done. Migrated ${totalMoved} assignments to correct LOW_SECONDARY blocks.`);
await p.$disconnect();
