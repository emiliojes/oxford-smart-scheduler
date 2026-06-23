import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 BUSCANDO "ARACELLYS"\n');

// Buscar todos los teachers
const allTeachers = await p.teacher.findMany({
  orderBy: { name: 'asc' }
});

console.log(`Total de teachers: ${allTeachers.length}\n`);

// Buscar específicamente Aracellys
const aracellys = allTeachers.filter(t => 
  t.name.toLowerCase().includes('aracellys') || 
  t.name.toLowerCase().includes('aracelly')
);

if (aracellys.length > 0) {
  console.log('✅ Encontrado:');
  aracellys.forEach(t => {
    console.log(`   - ${t.name} (${t.level})`);
  });
} else {
  console.log('❌ No se encontró ningún teacher con "Aracellys" en el nombre');
  console.log('\n📋 Teachers que contienen "Do" en el nombre:');
  
  const dominguez = allTeachers.filter(t => 
    t.name.toLowerCase().includes('do')
  );
  
  dominguez.forEach(t => {
    console.log(`   - ${t.name} (${t.level})`);
  });
}

console.log('');

await p.$disconnect();
