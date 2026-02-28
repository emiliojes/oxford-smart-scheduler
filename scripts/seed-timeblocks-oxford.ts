import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Real Oxford School time blocks based on actual schedules.
 *
 * SECONDARY schedule (from teacher schedules):
 * 07:15-07:30  Registration
 * 07:30-08:30  Class (60 min)
 * 08:30-09:30  Class (60 min)
 * 09:30-09:45  Break
 * 09:45-10:45  Class (60 min)
 * 10:45-11:45  Class (60 min)
 * 11:45-12:45  Class (60 min)
 * 12:45-13:15  Lunch
 * 13:15-14:15  Class (60 min)
 * 14:15-15:15  Class (60 min)
 * 15:15-15:30  Student Dismissal
 *
 * PRIMARY schedule (from Grade 4A/4B schedules):
 * 07:15-07:30  Registration
 * 07:30-08:30  Homeroom / Class (60 min)
 * 08:30-09:00  Class (30 min)
 * 09:00-09:15  Break
 * 09:15-10:15  Class (60 min)
 * 10:15-11:15  Class (60 min)
 * 11:15-12:00  Class (45 min)
 * 12:00-12:30  Lunch
 * 12:30-13:15  Class (45 min)
 * 13:15-13:50  Class (35 min)
 * 13:50        Bus / Parents Collection
 */

type BlockDef = {
  startTime: string;
  endTime: string;
  blockType: string;
  level: string;
};

// Build blocks for every weekday (1=Mon .. 5=Fri)
const secondaryBlocks: Omit<BlockDef, "level">[] = [
  { startTime: "07:15", endTime: "07:30", blockType: "REGISTRATION" },
  { startTime: "07:30", endTime: "08:30", blockType: "CLASS" },
  { startTime: "08:30", endTime: "09:30", blockType: "CLASS" },
  { startTime: "09:30", endTime: "09:45", blockType: "BREAK" },
  { startTime: "09:45", endTime: "10:45", blockType: "CLASS" },
  { startTime: "10:45", endTime: "11:45", blockType: "CLASS" },
  { startTime: "11:45", endTime: "12:45", blockType: "CLASS" },
  { startTime: "12:45", endTime: "13:15", blockType: "LUNCH" },
  { startTime: "13:15", endTime: "14:15", blockType: "CLASS" },
  { startTime: "14:15", endTime: "15:15", blockType: "CLASS" },
];

const primaryBlocks: Omit<BlockDef, "level">[] = [
  { startTime: "07:15", endTime: "07:30", blockType: "REGISTRATION" },
  { startTime: "07:30", endTime: "08:30", blockType: "CLASS" },  // Homeroom / class slot
  { startTime: "08:30", endTime: "09:00", blockType: "CLASS" },  // 30-min slot
  { startTime: "09:00", endTime: "09:15", blockType: "BREAK" },
  { startTime: "09:15", endTime: "10:15", blockType: "CLASS" },
  { startTime: "10:15", endTime: "11:15", blockType: "CLASS" },
  { startTime: "11:15", endTime: "12:00", blockType: "CLASS" },  // 45-min slot
  { startTime: "12:00", endTime: "12:30", blockType: "LUNCH" },
  { startTime: "12:30", endTime: "13:15", blockType: "CLASS" },  // 45-min slot
  { startTime: "13:15", endTime: "13:50", blockType: "CLASS" },  // 35-min slot (Story Time / Handwriting)
];

async function main() {
  console.log("🕐 Seeding real Oxford time blocks...");

  // Clear old time blocks (and cascade-delete assignments that reference them)
  console.log("  🗑  Clearing old time blocks and assignments...");
  await prisma.assignment.deleteMany({});
  await prisma.timeBlock.deleteMany({});

  let created = 0;

  for (let day = 1; day <= 5; day++) {
    // Secondary blocks
    for (const b of secondaryBlocks) {
      await prisma.timeBlock.create({
        data: {
          dayOfWeek: day,
          startTime: b.startTime,
          endTime: b.endTime,
          level: "SECONDARY",
          blockType: b.blockType,
        },
      });
      created++;
    }

    // Primary blocks
    for (const b of primaryBlocks) {
      await prisma.timeBlock.create({
        data: {
          dayOfWeek: day,
          startTime: b.startTime,
          endTime: b.endTime,
          level: "PRIMARY",
          blockType: b.blockType,
        },
      });
      created++;
    }
  }

  console.log(`  ✅ Created ${created} time blocks (${secondaryBlocks.length * 5} secondary + ${primaryBlocks.length * 5} primary)`);
  console.log("\n✅ Oxford time blocks seeded successfully!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
