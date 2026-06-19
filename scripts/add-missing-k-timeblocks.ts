import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const blocks = [
    // KA Monday 09:15 (already exists for day 2, need for day 1)
    { day: 1, start: "09:15", end: "10:15", level: "SECONDARY", note: "KA Mon 9:15-10:00" },
    
    // KC Friday 10:15
    { day: 5, start: "10:15", end: "11:15", level: "SECONDARY", note: "KC Fri 10:15-11:00" },
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
