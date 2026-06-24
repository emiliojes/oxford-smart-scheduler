import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Standard LOW_SECONDARY block structure (applies Mon-Fri)
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

const existing = await p.timeBlock.findMany({ where: { level: "LOW_SECONDARY" }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] });

console.log("Missing LOW_SECONDARY blocks by day:\n");
const missing = [];
for (let day = 1; day <= 5; day++) {
  const dayName = ["Mon","Tue","Wed","Thu","Fri"][day-1];
  const dayBlocks = existing.filter(b => b.dayOfWeek === day);
  for (const s of standardBlocks) {
    const found = dayBlocks.find(b => b.startTime === s.startTime && b.blockType === s.blockType);
    if (!found) {
      console.log(`  ❌ ${dayName} ${s.startTime}-${s.endTime} ${s.blockType}`);
      missing.push({ dayOfWeek: day, ...s });
    }
  }
}
if (missing.length === 0) console.log("  None missing!");

console.log(`\nTotal missing: ${missing.length}`);
await p.$disconnect();
