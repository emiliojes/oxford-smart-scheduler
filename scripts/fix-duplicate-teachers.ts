import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const teachers = await prisma.teacher.findMany({ orderBy: { createdAt: "asc" } });

  // Group by normalized name
  const byName: Record<string, typeof teachers> = {};
  for (const t of teachers) {
    const key = t.name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!byName[key]) byName[key] = [];
    byName[key].push(t);
  }

  for (const [name, group] of Object.entries(byName)) {
    if (group.length < 2) continue;
    console.log(`\nDuplicate: "${group[0].name}" (${group.length} records)`);
    
    // Keep the one with assignments (or the oldest if none)
    const withAssignments = await Promise.all(
      group.map(async t => ({
        teacher: t,
        count: await prisma.assignment.count({ where: { teacherId: t.id } }),
      }))
    );
    withAssignments.sort((a, b) => b.count - a.count);
    const keep = withAssignments[0].teacher;
    const remove = withAssignments.slice(1).map(x => x.teacher);

    console.log(`  Keep: ${keep.id} (${withAssignments[0].count} assignments)`);
    for (const r of remove) {
      console.log(`  Remove: ${r.id} (${withAssignments.find(x => x.teacher.id === r.id)?.count} assignments)`);
      // Re-assign any assignments to the kept teacher
      await prisma.assignment.updateMany({ where: { teacherId: r.id }, data: { teacherId: keep.id } });
      // Update user links
      await prisma.user.updateMany({ where: { teacherId: r.id }, data: { teacherId: keep.id } });
      await prisma.teacher.delete({ where: { id: r.id } });
    }
  }

  console.log("\nDone.");
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
