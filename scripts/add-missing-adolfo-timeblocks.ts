import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const blocks = [
    // 5B is grade 5 (PRIMARY), day 3, 12:45-13:50 (afternoon slot)
    { day: 3, start: "12:45", end: "13:50", level: "PRIMARY", note: "5B Wed 12:45-1:50" },
    
    // KC is Kindergarten C (SECONDARY), day 4, 10:15-11:15
    { day: 4, start: "10:15", end: "11:15", level: "SECONDARY", note: "KC Thu 10:15" },
    
    // 3B is grade 3 (PRIMARY), day 4, 12:45-13:50 (afternoon slot)
    { day: 4, start: "12:45", end: "13:50", level: "PRIMARY", note: "3B Thu 12:45-1:50" },
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
