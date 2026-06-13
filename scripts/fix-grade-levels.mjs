/**
 * Fix grade levels: grades 6-8 should be LOW_SECONDARY, grades 9-12 should be SECONDARY
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const grades = await p.grade.findMany();
let fixed = 0;

for (const g of grades) {
  const num = Number(g.name);
  if ([6, 7, 8].includes(num) && g.level !== "LOW_SECONDARY") {
    await p.grade.update({ where: { id: g.id }, data: { level: "LOW_SECONDARY" } });
    console.log(`✓ Grade ${g.name}${g.section ?? ""} → LOW_SECONDARY`);
    fixed++;
  } else if ([9, 10, 11, 12].includes(num) && g.level !== "SECONDARY") {
    await p.grade.update({ where: { id: g.id }, data: { level: "SECONDARY" } });
    console.log(`✓ Grade ${g.name}${g.section ?? ""} → SECONDARY`);
    fixed++;
  } else {
    console.log(`  Grade ${g.name}${g.section ?? ""} → ${g.level} (ok)`);
  }
}

console.log(`\nFixed: ${fixed} grades`);
await p.$disconnect();
