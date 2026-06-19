import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const blocks = [
    // Monday afternoon slots for Science Lab Assistant (grades 6-7 are middle school, use LOW_SECONDARY)
    { day: 1, start: "13:15", end: "14:15", level: "LOW_SECONDARY", note: "6A Mon 1:15-2:15" },
    { day: 1, start: "14:15", end: "15:15", level: "LOW_SECONDARY", note: "7A Mon 2:15-3:15" },
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
