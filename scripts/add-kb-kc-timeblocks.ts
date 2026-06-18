import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // KB and KC also use SECONDARY blocks like KA
  // Need to ensure SECONDARY time blocks exist at 09:15 for all days where KB/KC have classes
  
  const days = [4]; // Thursday for KB and KC
  
  for (const day of days) {
    const existing = await prisma.timeBlock.findFirst({
      where: { 
        dayOfWeek: day, 
        startTime: "09:15", 
        level: "SECONDARY", 
        blockType: "CLASS" 
      }
    });
    
    if (existing) {
      console.log(`✓ Time block already exists for day ${day} at 09:15 (SECONDARY)`);
      continue;
    }
    
    await prisma.timeBlock.create({
      data: {
        dayOfWeek: day,
        startTime: "09:15",
        endTime: "10:15",
        level: "SECONDARY",
        blockType: "CLASS"
      }
    });
    
    console.log(`✅ Created SECONDARY time block: day ${day}, 09:15-10:15 (for KB/KC)`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
