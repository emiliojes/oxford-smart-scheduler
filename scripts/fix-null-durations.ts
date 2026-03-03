import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixNullDurations() {
  console.log("=== FIX NULL DURATIONS ===");
  
  // Find all time blocks with null duration
  const nullBlocks = await prisma.timeBlock.findMany({
    where: { duration: null },
    orderBy: { dayOfWeek: 'asc' }
  });
  
  console.log(`Found ${nullBlocks.length} time blocks with null duration:`);
  
  for (const block of nullBlocks) {
    const start = block.startTime;
    const end = block.endTime;
    console.log(`  Day ${block.dayOfWeek}: ${start} - ${end} (${block.blockType})`);
    
    // Calculate duration in minutes
    if (start && end) {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const mins = (eh * 60 + em) - (sh * 60 + sm);
      
      if (mins > 0) {
        console.log(`    -> Setting duration to ${mins} minutes`);
        await prisma.timeBlock.update({
          where: { id: block.id },
          data: { duration: mins.toString() }
        });
      } else {
        console.log(`    -> Invalid time range, skipping`);
      }
    }
  }
  
  console.log("\nDone fixing null durations.");
}

fixNullDurations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
