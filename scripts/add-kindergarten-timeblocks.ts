import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const blocks = [
    // Kindergarten uses SECONDARY blocks
    // Monday
    { day: 1, start: "11:15", end: "12:00", level: "SECONDARY", note: "KB Mon 11:15-12:00" },
    { day: 1, start: "12:30", end: "13:15", level: "SECONDARY", note: "KC Mon 12:30-1:15" },
    
    // Tuesday
    { day: 2, start: "11:15", end: "12:00", level: "SECONDARY", note: "KA Tue 11:15-12:00" },
    { day: 2, start: "12:30", end: "13:15", level: "SECONDARY", note: "KB Tue 12:30-1:15" },
    
    // Wednesday
    { day: 3, start: "11:15", end: "12:00", level: "SECONDARY", note: "KA Wed 11:15-12:00" },
    { day: 3, start: "12:30", end: "13:30", level: "SECONDARY", note: "KB Wed 12:30-1:30" },
    
    // Thursday
    { day: 4, start: "12:30", end: "13:30", level: "SECONDARY", note: "KC Thu 12:30-1:30" },
  ];
  
  for (const block of blocks) {
    const existing = await prisma.timeBlock.findFirst({
      where: { 
        dayOfWeek: block.day, 
        startTime: block.start, 
        level: block.level, 
        blockType: "CLASS" 
      }
    });
    
    if (existing) {
      console.log(`✓ Time block already exists: day ${block.day} ${block.start} (${block.level})`);
      continue;
    }
    
    await prisma.timeBlock.create({
      data: {
        dayOfWeek: block.day,
        startTime: block.start,
        endTime: block.end,
        level: block.level,
        blockType: "CLASS"
      }
    });
    
    console.log(`✅ Created ${block.level} time block: day ${block.day}, ${block.start}-${block.end} (${block.note})`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
