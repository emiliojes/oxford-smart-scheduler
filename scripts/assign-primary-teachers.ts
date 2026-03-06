import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const RENAMES: { from: string; to: string }[] = [
  { from: 'Primaria Teacher KA',  to: 'Katerin Martinez' },
  { from: 'Primaria Teacher KB',  to: 'Yanela Barria' },
  { from: 'Primaria Teacher KC',  to: 'Sabrina Cruz' },
  { from: 'Primaria Teacher 1A',  to: 'Rebeca Vergara Rudas' },
  { from: 'Primaria Teacher 1B',  to: 'Johanna Castilo' },
  { from: 'Primaria Teacher 2A',  to: 'Evelyn Quintero' },
  { from: 'Primaria Teacher 2B',  to: 'Cinthya Richards' },
  { from: 'Primaria Teacher 2C',  to: 'Maria Del Carmen Quintero Vega' },
  { from: 'Primaria Teacher 3A',  to: 'Jessamyn Jaen' },
  { from: 'Primaria Teacher 3B',  to: 'Erika Ortega' },
  { from: 'Primaria Teacher 4A',  to: 'Barbara Castillo' },
  { from: 'Primaria Teacher 4B',  to: 'Liz Medina' },
  { from: 'Primaria Teacher 5A',  to: 'Marcelo Batista' },
  { from: 'Primaria Teacher 5B',  to: 'Ginger Delgado' },
];

async function main() {
  console.log('=== RENOMBRANDO TEACHERS DE PRIMARIA ===\n');

  for (const { from, to } of RENAMES) {
    const teacher = await prisma.teacher.findFirst({ where: { name: from } });
    if (!teacher) { console.warn(`  NOT FOUND: ${from}`); continue; }

    // Check if target name already exists (avoid duplicate)
    const existing = await prisma.teacher.findFirst({ where: { name: to } });
    if (existing && existing.id !== teacher.id) {
      console.warn(`  DUPLICATE: "${to}" ya existe (id: ${existing.id}). Reasignando assignments...`);
      // Move all assignments from temp teacher to the existing real teacher
      await prisma.assignment.updateMany({
        where: { teacherId: teacher.id },
        data: { teacherId: existing.id },
      });
      await prisma.teacher.delete({ where: { id: teacher.id } });
      console.log(`  MERGED: ${from} → ${to} (existing)`);
      continue;
    }

    await prisma.teacher.update({ where: { id: teacher.id }, data: { name: to } });
    console.log(`  OK: "${from}" → "${to}"`);
  }

  // ── CREATE GRADE 1C ─────────────────────────────────────────────────────
  console.log('\n=== CREANDO GRADE 1C ===');
  let grade1C = await prisma.grade.findFirst({ where: { name: '1', section: 'C' } });
  if (grade1C) {
    console.log(`  Grade 1C ya existe (id: ${grade1C.id})`);
  } else {
    grade1C = await prisma.grade.create({
      data: { name: '1', section: 'C', level: 'PRIMARY', capacity: 25 },
    });
    console.log(`  Created Grade 1C (id: ${grade1C.id})`);
  }

  // ── IMPORT 1C SCHEDULE FOR JOHANNA CASTILO ──────────────────────────────
  console.log('\n=== IMPORTANDO HORARIO GRADE 1C ===');
  const teacher = await prisma.teacher.findFirst({ where: { name: 'Johanna Castilo' } });
  if (!teacher) { console.error('Johanna Castilo not found'); return; }

  async function getSubject(name: string) {
    const s = await prisma.subject.findFirst({ where: { name } });
    if (s) return s.id;
    const created = await prisma.subject.create({
      data: { name, level: 'PRIMARY', weeklyFrequency: 3, defaultDuration: 'SIXTY' },
    });
    console.log(`  Created subject: ${name}`);
    return created.id;
  }

  async function findTB(day: number, start: string) {
    const pad = (t: string) => t.replace(/^(\d):/, '0$1:');
    const s = pad(start);
    const exact = await prisma.timeBlock.findFirst({ where: { dayOfWeek: day, startTime: s } });
    return exact?.id ?? null;
  }

  const slots: { day: number; start: string; subject: string; note?: string }[] = [
    // MONDAY
    { day:1, start:'07:15', subject:'Homeroom' },
    { day:1, start:'07:30', subject:'Homeroom', note:'7:30-8:00' },
    { day:1, start:'08:30', subject:'Spanish', note:'8:00-9:00' },
    { day:1, start:'09:15', subject:'English' },
    { day:1, start:'10:15', subject:'Science' },
    { day:1, start:'11:15', subject:'Math Primary' },
    { day:1, start:'12:30', subject:'PSHE' },
    { day:1, start:'13:15', subject:'Reading and Phonics' },
    // TUESDAY
    { day:2, start:'07:15', subject:'Homeroom' },
    { day:2, start:'07:30', subject:'English' },
    { day:2, start:'08:30', subject:'Reading and Phonics' },
    { day:2, start:'09:15', subject:'P.E.' },
    { day:2, start:'10:15', subject:'Science' },
    { day:2, start:'11:15', subject:'Math Primary' },
    { day:2, start:'12:30', subject:'Social Studies', note:'12:30-1:30' },
    { day:2, start:'13:15', subject:'Handwriting', note:'1:30-1:50' },
    // WEDNESDAY
    { day:3, start:'07:15', subject:'Homeroom' },
    { day:3, start:'07:30', subject:'Computing' },
    { day:3, start:'08:30', subject:'Reading and Phonics' },
    { day:3, start:'09:15', subject:'Math Primary' },
    { day:3, start:'10:15', subject:'Spanish' },
    { day:3, start:'11:15', subject:'English' },
    { day:3, start:'12:30', subject:'Handwriting' },
    { day:3, start:'13:15', subject:'Story Time' },
    // THURSDAY
    { day:4, start:'07:15', subject:'Homeroom' },
    { day:4, start:'07:30', subject:'Music' },
    { day:4, start:'08:30', subject:'Reading and Phonics' },
    { day:4, start:'09:15', subject:'English' },
    { day:4, start:'10:15', subject:'Math Primary' },
    { day:4, start:'11:15', subject:'Spanish' },
    { day:4, start:'12:30', subject:'Science' },
    { day:4, start:'13:15', subject:'Storytime' },
    // FRIDAY
    { day:5, start:'07:15', subject:'Homeroom' },
    { day:5, start:'07:30', subject:'Spanish' },
    { day:5, start:'08:30', subject:'English' },
    { day:5, start:'09:15', subject:'Math Primary' },
    { day:5, start:'10:15', subject:'Art' },
    { day:5, start:'11:15', subject:'Social Studies' },
    { day:5, start:'12:30', subject:'Storytime', note:'12:00-12:15' },
  ];

  let created = 0;
  let skipped = 0;
  for (const slot of slots) {
    const tbId = await findTB(slot.day, slot.start);
    if (!tbId) { console.warn(`  MISSING TB: day${slot.day} ${slot.start} | ${slot.subject}`); skipped++; continue; }
    const subjectId = await getSubject(slot.subject);
    const exists = await prisma.assignment.findFirst({
      where: { teacherId: teacher.id, gradeId: grade1C!.id, timeBlockId: tbId },
    });
    if (exists) { skipped++; continue; }
    await prisma.assignment.create({
      data: { teacherId: teacher.id, gradeId: grade1C!.id, subjectId, timeBlockId: tbId, status: 'CONFIRMED', note: slot.note ?? null },
    });
    created++;
  }

  console.log(`  Creados: ${created} | Saltados: ${skipped}`);
  console.log('\n=== LISTO ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
