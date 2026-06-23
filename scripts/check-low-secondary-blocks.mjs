import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 VERIFICANDO BLOQUES DE LOW_SECONDARY DESPUÉS DEL LUNCH\n');

const blocks = await p.timeBlock.findMany({
  where: { 
    level: "LOW_SECONDARY",
    startTime: { gte: "12:00" }
  },
  orderBy: [
    { dayOfWeek: 'asc' },
    { startTime: 'asc' }
  ]
});

const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

console.log(`📋 Bloques después de 12:00 PM (${blocks.length} bloques):\n`);

const byTime = {};
blocks.forEach(b => {
  const key = `${b.startTime}-${b.endTime}`;
  if (!byTime[key]) byTime[key] = [];
  byTime[key].push(b);
});

Object.keys(byTime).sort().forEach(time => {
  const blockList = byTime[time];
  console.log(`\n${time} (${blockList[0].blockType}):`);
  blockList.forEach(b => {
    console.log(`  ${days[b.dayOfWeek]} | ID: ${b.id}`);
  });
});

console.log('\n\n📝 BLOQUES QUE DEBEN QUEDAR:');
console.log('  12:00-13:00 (1:00 PM)');
console.log('  13:00-14:00 (2:00 PM)');
console.log('  14:00-15:15 (3:15 PM)');

console.log('\n\n❌ BLOQUES QUE DEBEN ELIMINARSE:');
console.log('  13:15-14:15');
console.log('  14:15-15:15');

await p.$disconnect();
