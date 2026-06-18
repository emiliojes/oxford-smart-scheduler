import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Add SECONDARY time block at 09:15 for KA on day 2
  // This is a special case - KA uses SECONDARY blocks but needs this specific slot
  
  const existing = await prisma.timeBlock.findFirst({
    where: { 
      dayOfWeek: 2, 
      startTime: "09:15", 
      level: "SECONDARY", 
      blockType: "CLASS" 
    }
  });
  
  if (existing) {
    console.log("✓ Time block already exists for day 2 at 09:15 (SECONDARY)");
    return;
  }
  
  await prisma.timeBlock.create({
    data: {
      dayOfWeek: 2,
      startTime: "09:15",
      endTime: "10:15",
      level: "SECONDARY",
      blockType: "CLASS"
    }
  });
  
  console.log("✅ Created SECONDARY time block: day 2, 09:15-10:15 (for KA)");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
