import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const blocks = await p.timeBlock.findMany({
  where: { level: "SECONDARY" },
  orderBy: [{ startTime: "asc" }, { dayOfWeek: "asc" }]
});

// Group by startTime+endTime+blockType (unique time patterns)
const patterns = new Map();
for (const b of blocks) {
  const key = `${b.startTime}-${b.endTime}-${b.blockType}`;
  if (!patterns.has(key)) patterns.set(key, { startTime: b.startTime, endTime: b.endTime, blockType: b.blockType, days: [] });
  patterns.get(key).days.push(b.dayOfWeek);
}

console.log("SECONDARY time block patterns (all days combined):\n");
for (const p of [...patterns.values()].sort((a,b) => a.startTime.localeCompare(b.startTime))) {
  const days = p.days.sort().join(",");
  console.log(`  ${p.startTime} – ${p.endTime}  [${p.blockType.padEnd(12)}]  days: ${days}`);
}

// Expected from paper:
const expected = [
  { start: "07:15", end: "07:30", type: "REGISTRATION" },
  { start: "07:30", end: "08:30", type: "CLASS" },
  { start: "08:30", end: "09:30", type: "CLASS" },
  { start: "09:30", end: "09:45", type: "BREAK" },
  { start: "09:45", end: "10:45", type: "CLASS" },
  { start: "10:45", end: "11:45", type: "CLASS" },
  { start: "11:45", end: "12:45", type: "CLASS" },
  { start: "12:45", end: "13:15", type: "LUNCH" },
  { start: "13:15", end: "14:15", type: "CLASS" },
  { start: "14:15", end: "15:15", type: "CLASS" },
];

console.log("\n--- COMPARISON vs paper ---");
for (const e of expected) {
  const match = [...patterns.values()].find(p => p.startTime === e.start && p.endTime === e.end && p.blockType === e.type);
  const status = match ? `✅ OK (days: ${match.days.sort().join(",")})` : "❌ MISSING";
  console.log(`  ${e.start} – ${e.end}  [${e.type.padEnd(12)}]  ${status}`);
}

console.log("\n--- EXTRA blocks not in paper ---");
for (const p of [...patterns.values()]) {
  const inExpected = expected.some(e => e.start === p.startTime && e.end === p.endTime && e.type === p.blockType);
  if (!inExpected) console.log(`  ${p.startTime} – ${p.endTime}  [${p.blockType}]  days: ${p.days.sort().join(",")}`);
}

await p.$disconnect();
