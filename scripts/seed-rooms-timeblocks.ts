import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const rooms = [
  { name: "Room 101", capacity: 30, isSpecialized: false },
  { name: "Room 102", capacity: 30, isSpecialized: false },
  { name: "Room 103", capacity: 30, isSpecialized: false },
  { name: "Room 104", capacity: 30, isSpecialized: false },
  { name: "Room 105", capacity: 30, isSpecialized: false },
  { name: "Room 106", capacity: 30, isSpecialized: false },
  { name: "Room 201", capacity: 30, isSpecialized: false },
  { name: "Room 202", capacity: 30, isSpecialized: false },
  { name: "Room 203", capacity: 30, isSpecialized: false },
  { name: "Room 204", capacity: 30, isSpecialized: false },
  { name: "Room 205", capacity: 30, isSpecialized: false },
  { name: "Room 206", capacity: 30, isSpecialized: false },
  { name: "Computer Lab", capacity: 30, isSpecialized: true, specializedFor: "Computing" },
  { name: "Gymnasium", capacity: 60, isSpecialized: true, specializedFor: "Gym" },
  { name: "Science Lab", capacity: 25, isSpecialized: true, specializedFor: "Science" },
];

// Monday=1 to Friday=5
// PRIMARY: 45-min blocks, SECONDARY: 60-min blocks
// Schedule: 7:00 - 13:00 (Primary), 7:00 - 14:00 (Secondary)

const primaryTimes = [
  "07:00", "07:45", "08:30", "09:15",
  "10:15", // after break
  "11:00", "11:45", "12:30",
];

const secondaryTimes = [
  "07:00", "08:00", "09:00",
  "10:00", // after break
  "10:30", "11:30", "12:30",
];

async function main() {
  console.log("🌱 Seeding rooms and time blocks...");

  // ─── ROOMS ────────────────────────────────────────────────────────────────
  for (const r of rooms) {
    const existing = await prisma.room.findFirst({ where: { name: r.name } });
    if (!existing) {
      await prisma.room.create({ data: r });
      console.log(`  ✅ Room created: ${r.name}`);
    } else {
      console.log(`  ⏭  Room exists: ${r.name}`);
    }
  }

  // ─── TIME BLOCKS ──────────────────────────────────────────────────────────
  let created = 0;
  for (let day = 1; day <= 5; day++) {
    // Primary blocks (45 min)
    for (const time of primaryTimes) {
      const existing = await prisma.timeBlock.findFirst({
        where: { dayOfWeek: day, startTime: time, level: "PRIMARY" },
      });
      if (!existing) {
        await prisma.timeBlock.create({
          data: { dayOfWeek: day, startTime: time, endTime: time, duration: "FORTYFIVE", level: "PRIMARY", blockType: "CLASS" },
        });
        created++;
      }
    }
    // Secondary blocks (60 min)
    for (const time of secondaryTimes) {
      const existing = await prisma.timeBlock.findFirst({
        where: { dayOfWeek: day, startTime: time, level: "SECONDARY" },
      });
      if (!existing) {
        await prisma.timeBlock.create({
          data: { dayOfWeek: day, startTime: time, endTime: time, duration: "SIXTY", level: "SECONDARY", blockType: "CLASS" },
        });
        created++;
      }
    }
  }

  console.log(`  ✅ Time blocks created: ${created}`);
  console.log("\n✅ Rooms and time blocks seeded successfully!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
