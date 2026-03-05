import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ─── HELPERS ────────────────────────────────────────────────────────────────

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Find the closest matching time block for a given day + startTime string
// Handles cases like "7:30" → "07:30", and finds exact or closest match
async function findTimeBlock(day: number, start: string, end?: string): Promise<string | null> {
  const pad = (t: string) => t.trim().replace(/^(\d):/, '0$1:');
  const startPad = pad(start);
  const endPad = end ? pad(end) : undefined;

  // Try exact match first
  const exact = await prisma.timeBlock.findFirst({
    where: { dayOfWeek: day, startTime: startPad, blockType: { in: ['CLASS', 'REGISTRATION'] } },
  });
  if (exact) return exact.id;

  // Try matching by start only
  const byStart = await prisma.timeBlock.findFirst({
    where: { dayOfWeek: day, startTime: startPad },
  });
  if (byStart) return byStart.id;

  // Try closest start time within 5 min
  const all = await prisma.timeBlock.findMany({ where: { dayOfWeek: day, blockType: 'CLASS' } });
  const startMins = timeToMinutes(startPad);
  const closest = all
    .map(b => ({ b, diff: Math.abs(timeToMinutes(b.startTime) - startMins) }))
    .filter(x => x.diff <= 5)
    .sort((a, b) => a.diff - b.diff)[0];
  if (closest) return closest.b.id;

  return null;
}

async function getOrCreateSubject(name: string): Promise<string> {
  const existing = await prisma.subject.findFirst({ where: { name } });
  if (existing) return existing.id;
  const created = await prisma.subject.create({
    data: { name, level: 'PRIMARY', weeklyFrequency: 3, defaultDuration: 'SIXTY' },
  });
  console.log(`  Created subject: ${name}`);
  return created.id;
}

async function getOrCreateTeacher(name: string): Promise<string> {
  const existing = await prisma.teacher.findFirst({ where: { name } });
  if (existing) return existing.id;
  const created = await prisma.teacher.create({
    data: { name, maxWeeklyHours: 40, level: 'PRIMARY' },
  });
  console.log(`  Created teacher: ${name}`);
  return created.id;
}

async function getGrade(name: string, section: string): Promise<string | null> {
  const g = await prisma.grade.findFirst({ where: { name, section } });
  if (!g) { console.warn(`  WARNING: Grade not found: ${name} ${section}`); return null; }
  return g.id;
}

// ─── SCHEDULE DATA ───────────────────────────────────────────────────────────
// Format: { grade, section, teacher (temporary), schedule }
// schedule: day (1=Mon..5=Fri), start, end, subject
// For split cells like "Homeroom (7:30-8:15)" we use the embedded time as note

const DAYS: Record<string, number> = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5 };

interface SlotData {
  day: number;
  start: string;
  end: string;
  subject: string;
  note?: string;
}

interface GradeSchedule {
  gradeName: string;
  section: string;
  teacherName: string;
  slots: SlotData[];
}

const PRIMARY_SCHEDULES: GradeSchedule[] = [
  // ── KINDER A ──────────────────────────────────────────────────────────────
  {
    gradeName: 'K', section: 'A', teacherName: 'Primaria Teacher KA',
    slots: [
      // MON
      { day:1, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:1, start:'07:30', end:'08:30', subject:'Homeroom' },
      { day:1, start:'08:30', end:'09:00', subject:'Reading and Phonics' },
      { day:1, start:'09:15', end:'10:15', subject:'Spanish' },
      { day:1, start:'10:15', end:'11:15', subject:'English' },
      { day:1, start:'11:15', end:'12:00', subject:'Math Primary' },
      { day:1, start:'12:30', end:'13:15', subject:'Computing' },
      { day:1, start:'13:15', end:'14:15', subject:'Handwriting' },
      // TUE
      { day:2, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:2, start:'07:30', end:'08:30', subject:'English' },
      { day:2, start:'08:30', end:'09:00', subject:'Reading and Phonics' },
      { day:2, start:'09:15', end:'10:15', subject:'Music' },
      { day:2, start:'10:15', end:'11:15', subject:'P.E.' },
      { day:2, start:'11:15', end:'12:00', subject:'Spanish' },
      { day:2, start:'12:30', end:'13:15', subject:'Math Primary', note:'12:30-1:30' },
      { day:2, start:'13:15', end:'14:15', subject:'Handwriting', note:'1:30-1:50' },
      // WED
      { day:3, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:3, start:'07:30', end:'08:30', subject:'English' },
      { day:3, start:'08:30', end:'09:00', subject:'Reading and Phonics' },
      { day:3, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:3, start:'10:15', end:'11:15', subject:'Science' },
      { day:3, start:'11:15', end:'12:00', subject:'Spanish' },
      { day:3, start:'12:30', end:'13:15', subject:'Motor Skills' },
      { day:3, start:'13:15', end:'14:15', subject:'Story Time' },
      // THU
      { day:4, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:4, start:'07:30', end:'08:30', subject:'Spanish' },
      { day:4, start:'08:30', end:'09:00', subject:'Reading and Phonics' },
      { day:4, start:'09:15', end:'10:15', subject:'English' },
      { day:4, start:'10:15', end:'11:15', subject:'Math Primary' },
      { day:4, start:'11:15', end:'12:00', subject:'Science' },
      { day:4, start:'12:30', end:'13:15', subject:'PSHE', note:'12:30-1:30' },
      { day:4, start:'13:15', end:'14:15', subject:'Story Time' },
      // FRI
      { day:5, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:5, start:'07:30', end:'08:30', subject:'English' },
      { day:5, start:'08:30', end:'09:00', subject:'Handwriting' },
      { day:5, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:5, start:'10:15', end:'11:15', subject:'Science', note:'10:15-11:00' },
      { day:5, start:'11:15', end:'12:00', subject:'Art', note:'11:00-12:00' },
      { day:5, start:'12:30', end:'13:15', subject:'Story Time', note:'12:00-12:15' },
    ],
  },

  // ── KINDER B ──────────────────────────────────────────────────────────────
  {
    gradeName: 'K', section: 'B', teacherName: 'Primaria Teacher KB',
    slots: [
      { day:1, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:1, start:'07:30', end:'08:30', subject:'Homeroom' },
      { day:1, start:'08:30', end:'09:00', subject:'Reading and Phonics' },
      { day:1, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:1, start:'10:15', end:'11:15', subject:'English' },
      { day:1, start:'11:15', end:'12:00', subject:'Spanish' },
      { day:1, start:'12:30', end:'13:15', subject:'Motor Skills' },
      { day:1, start:'13:15', end:'14:15', subject:'Handwriting' },
      { day:2, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:2, start:'07:30', end:'08:30', subject:'English' },
      { day:2, start:'08:30', end:'09:00', subject:'Reading and Phonics' },
      { day:2, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:2, start:'10:15', end:'11:15', subject:'Science' },
      { day:2, start:'11:15', end:'12:00', subject:'Computing' },
      { day:2, start:'12:30', end:'13:15', subject:'Spanish' },
      { day:2, start:'13:15', end:'14:15', subject:'Handwriting' },
      { day:3, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:3, start:'07:30', end:'08:30', subject:'English' },
      { day:3, start:'08:30', end:'09:00', subject:'Reading and Phonics' },
      { day:3, start:'09:15', end:'10:15', subject:'P.E.' },
      { day:3, start:'10:15', end:'11:15', subject:'Math Primary' },
      { day:3, start:'11:15', end:'12:00', subject:'Science' },
      { day:3, start:'12:30', end:'13:15', subject:'Spanish', note:'12:30-1:30' },
      { day:3, start:'13:15', end:'14:15', subject:'Story Time', note:'1:30-1:50' },
      { day:4, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:4, start:'07:30', end:'08:30', subject:'English' },
      { day:4, start:'08:30', end:'09:00', subject:'Reading and Phonics' },
      { day:4, start:'09:15', end:'10:15', subject:'Music' },
      { day:4, start:'10:15', end:'11:15', subject:'Spanish' },
      { day:4, start:'11:15', end:'12:00', subject:'Science' },
      { day:4, start:'12:30', end:'13:15', subject:'Math Primary', note:'12:30-1:30' },
      { day:4, start:'13:15', end:'14:15', subject:'Story Time' },
      { day:5, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:5, start:'07:30', end:'08:30', subject:'English' },
      { day:5, start:'08:30', end:'09:00', subject:'Handwriting' },
      { day:5, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:5, start:'10:15', end:'11:15', subject:'PSHE' },
      { day:5, start:'11:15', end:'12:00', subject:'Art', note:'11:00-12:00' },
      { day:5, start:'12:30', end:'13:15', subject:'Story Time', note:'12:00-12:15' },
    ],
  },

  // ── KINDER C ──────────────────────────────────────────────────────────────
  {
    gradeName: 'K', section: 'C', teacherName: 'Primaria Teacher KC',
    slots: [
      { day:1, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:1, start:'07:30', end:'08:30', subject:'Homeroom' },
      { day:1, start:'08:30', end:'09:00', subject:'Reading and Phonics' },
      { day:1, start:'09:15', end:'10:15', subject:'English' },
      { day:1, start:'10:15', end:'11:15', subject:'Math Primary' },
      { day:1, start:'11:15', end:'12:00', subject:'Computing' },
      { day:1, start:'12:30', end:'13:15', subject:'Spanish', note:'12:30-1:15' },
      { day:1, start:'13:15', end:'14:15', subject:'Handwriting', note:'1:15-1:45' },
      { day:2, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:2, start:'07:30', end:'08:30', subject:'English' },
      { day:2, start:'08:30', end:'09:00', subject:'Reading and Phonics' },
      { day:2, start:'09:15', end:'10:15', subject:'Spanish' },
      { day:2, start:'10:15', end:'11:15', subject:'Math Primary' },
      { day:2, start:'11:15', end:'12:00', subject:'Science' },
      { day:2, start:'12:30', end:'13:15', subject:'Handwriting', note:'12:30-1:00' },
      { day:2, start:'13:15', end:'14:15', subject:'Music', note:'1:00-1:50' },
      { day:3, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:3, start:'07:30', end:'08:30', subject:'English' },
      { day:3, start:'08:30', end:'09:00', subject:'Reading and Phonics' },
      { day:3, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:3, start:'10:15', end:'11:15', subject:'Art' },
      { day:3, start:'11:15', end:'12:00', subject:'Motor Skills' },
      { day:3, start:'12:30', end:'13:15', subject:'PSHE', note:'12:30-1:30' },
      { day:3, start:'13:15', end:'14:15', subject:'Story Time' },
      { day:4, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:4, start:'07:30', end:'08:30', subject:'English' },
      { day:4, start:'08:30', end:'09:00', subject:'Reading and Phonics' },
      { day:4, start:'09:15', end:'10:15', subject:'P.E.' },
      { day:4, start:'10:15', end:'11:15', subject:'Math Primary' },
      { day:4, start:'11:15', end:'12:00', subject:'Science' },
      { day:4, start:'12:30', end:'13:15', subject:'Spanish', note:'12:30-1:30' },
      { day:4, start:'13:15', end:'14:15', subject:'Story Time' },
      { day:5, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:5, start:'07:30', end:'08:30', subject:'English' },
      { day:5, start:'08:30', end:'09:00', subject:'Handwriting' },
      { day:5, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:5, start:'10:15', end:'11:15', subject:'Spanish', note:'10:15-11:00' },
      { day:5, start:'11:15', end:'12:00', subject:'Art', note:'11:00-12:00' },
      { day:5, start:'12:30', end:'13:15', subject:'Story Time', note:'12:00-12:15' },
    ],
  },

  // ── GRADE 1A ──────────────────────────────────────────────────────────────
  {
    gradeName: '1', section: 'A', teacherName: 'Primaria Teacher 1A',
    slots: [
      { day:1, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:1, start:'07:30', end:'08:30', subject:'Homeroom', note:'7:30-8:15' },
      { day:1, start:'08:30', end:'09:00', subject:'Science', note:'8:15-9:00' },
      { day:1, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:1, start:'10:15', end:'11:15', subject:'Spanish' },
      { day:1, start:'11:15', end:'12:00', subject:'English' },
      { day:1, start:'12:30', end:'13:15', subject:'Social Studies' },
      { day:1, start:'13:15', end:'14:15', subject:'Guided Reading' },
      { day:2, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:2, start:'07:30', end:'08:30', subject:'Spanish' },
      { day:2, start:'08:30', end:'09:00', subject:'Reading and Phonics' },
      { day:2, start:'09:15', end:'10:15', subject:'English' },
      { day:2, start:'10:15', end:'11:15', subject:'Math Primary', note:'10:15-11:00' },
      { day:2, start:'11:15', end:'12:00', subject:'Social Studies', note:'11:00-12:00' },
      { day:2, start:'12:30', end:'13:15', subject:'Art', note:'12:30-1:30' },
      { day:2, start:'13:15', end:'14:15', subject:'Story Time', note:'1:30-1:50' },
      { day:3, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:3, start:'07:30', end:'08:30', subject:'Spanish' },
      { day:3, start:'08:30', end:'09:00', subject:'Reading and Phonics' },
      { day:3, start:'09:15', end:'10:15', subject:'English' },
      { day:3, start:'10:15', end:'11:15', subject:'Computing' },
      { day:3, start:'11:15', end:'12:00', subject:'Math Primary' },
      { day:3, start:'12:30', end:'13:15', subject:'Science', note:'12:30-1:30' },
      { day:3, start:'13:15', end:'14:15', subject:'Story Time', note:'1:30-1:50' },
      { day:4, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:4, start:'07:30', end:'08:30', subject:'English' },
      { day:4, start:'08:30', end:'09:00', subject:'Reading and Phonics' },
      { day:4, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:4, start:'10:15', end:'11:15', subject:'P.E.' },
      { day:4, start:'11:15', end:'12:00', subject:'PSHE' },
      { day:4, start:'12:30', end:'13:15', subject:'Science' },
      { day:4, start:'13:15', end:'14:15', subject:'Handwriting' },
      { day:5, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:5, start:'07:30', end:'08:30', subject:'Music' },
      { day:5, start:'08:30', end:'09:00', subject:'Handwriting' },
      { day:5, start:'09:15', end:'10:15', subject:'English' },
      { day:5, start:'10:15', end:'11:15', subject:'Math Primary' },
      { day:5, start:'11:15', end:'12:00', subject:'Spanish' },
      { day:5, start:'12:30', end:'13:15', subject:'Story Time', note:'12:00-12:15' },
    ],
  },

  // ── GRADE 1B ──────────────────────────────────────────────────────────────
  {
    gradeName: '1', section: 'B', teacherName: 'Primaria Teacher 1B',
    slots: [
      { day:1, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:1, start:'07:30', end:'08:30', subject:'Homeroom', note:'7:30-8:00' },
      { day:1, start:'08:30', end:'09:00', subject:'Science', note:'8:00-9:00' },
      { day:1, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:1, start:'10:15', end:'11:15', subject:'English', note:'10:15-11:00' },
      { day:1, start:'11:15', end:'12:00', subject:'P.E.', note:'11:00-12:00' },
      { day:1, start:'12:30', end:'13:15', subject:'Art', note:'12:30-1:30' },
      { day:1, start:'13:15', end:'14:15', subject:'Handwriting' },
      { day:2, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:2, start:'07:30', end:'08:30', subject:'English' },
      { day:2, start:'08:30', end:'09:00', subject:'Reading and Phonics' },
      { day:2, start:'09:15', end:'10:15', subject:'Social Studies' },
      { day:2, start:'10:15', end:'11:15', subject:'Spanish' },
      { day:2, start:'11:15', end:'12:00', subject:'Science' },
      { day:2, start:'12:30', end:'13:15', subject:'Math Primary' },
      { day:2, start:'13:15', end:'14:15', subject:'Story Time', note:'1:30-1:50' },
      { day:3, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:3, start:'07:30', end:'08:30', subject:'English' },
      { day:3, start:'08:30', end:'09:00', subject:'Story Time' },
      { day:3, start:'09:15', end:'10:15', subject:'Spanish' },
      { day:3, start:'10:15', end:'11:15', subject:'Music' },
      { day:3, start:'11:15', end:'12:00', subject:'Math Primary' },
      { day:3, start:'12:30', end:'13:15', subject:'Computing', note:'12:30-1:30' },
      { day:3, start:'13:15', end:'14:15', subject:'Reading and Phonics' },
      { day:4, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:4, start:'07:30', end:'08:30', subject:'English' },
      { day:4, start:'08:30', end:'09:00', subject:'Reading and Phonics' },
      { day:4, start:'09:15', end:'10:15', subject:'Spanish' },
      { day:4, start:'10:15', end:'11:15', subject:'Social Studies' },
      { day:4, start:'11:15', end:'12:00', subject:'Math Primary' },
      { day:4, start:'12:30', end:'13:15', subject:'PSHE' },
      { day:4, start:'13:15', end:'14:15', subject:'Story Time' },
      { day:5, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:5, start:'07:30', end:'08:30', subject:'English' },
      { day:5, start:'08:30', end:'09:00', subject:'Handwriting' },
      { day:5, start:'09:15', end:'10:15', subject:'Spanish', note:'9:15-10:00' },
      { day:5, start:'10:15', end:'11:15', subject:'Math Primary', note:'10:00-11:00' },
      { day:5, start:'11:15', end:'12:00', subject:'Science', note:'11:15-12:15' },
      { day:5, start:'12:30', end:'13:15', subject:'Story Time', note:'12:00-12:15' },
    ],
  },

  // ── GRADE 2A ──────────────────────────────────────────────────────────────
  {
    gradeName: '2', section: 'A', teacherName: 'Primaria Teacher 2A',
    slots: [
      { day:1, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:1, start:'07:30', end:'08:30', subject:'Homeroom', note:'7:30-8:00' },
      { day:1, start:'08:30', end:'09:00', subject:'Science', note:'8:00-9:00' },
      { day:1, start:'09:15', end:'10:15', subject:'Social Studies' },
      { day:1, start:'10:15', end:'11:15', subject:'English' },
      { day:1, start:'11:15', end:'12:00', subject:'Spanish' },
      { day:1, start:'12:30', end:'13:15', subject:'Math Primary' },
      { day:1, start:'13:15', end:'14:15', subject:'Handwriting' },
      { day:2, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:2, start:'07:30', end:'08:30', subject:'Music' },
      { day:2, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:2, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:2, start:'10:15', end:'11:15', subject:'Spanish' },
      { day:2, start:'11:15', end:'12:00', subject:'English' },
      { day:2, start:'12:30', end:'13:15', subject:'Art', note:'12:30-1:30' },
      { day:2, start:'13:15', end:'14:15', subject:'Story Time', note:'1:30-1:50' },
      { day:3, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:3, start:'07:30', end:'08:30', subject:'English' },
      { day:3, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:3, start:'09:15', end:'10:15', subject:'Science' },
      { day:3, start:'10:15', end:'11:15', subject:'Spanish' },
      { day:3, start:'11:15', end:'12:00', subject:'Math Primary' },
      { day:3, start:'12:30', end:'13:15', subject:'Social Studies' },
      { day:3, start:'13:15', end:'14:15', subject:'Story Time' },
      { day:4, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:4, start:'07:30', end:'08:30', subject:'Spanish' },
      { day:4, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:4, start:'09:15', end:'10:15', subject:'English', note:'9:15-10:15' },
      { day:4, start:'10:15', end:'11:15', subject:'Computing', note:'10:45-11:45' },
      { day:4, start:'11:15', end:'12:00', subject:'Story Time', note:'11:45-12:00' },
      { day:4, start:'12:30', end:'13:15', subject:'Math Primary', note:'12:30-1:15' },
      { day:4, start:'13:15', end:'14:15', subject:'PSHE', note:'1:15-1:50' },
      { day:5, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:5, start:'07:30', end:'08:30', subject:'English' },
      { day:5, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:5, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:5, start:'10:15', end:'11:15', subject:'Science', note:'10:15-11:15' },
      { day:5, start:'11:15', end:'12:00', subject:'P.E.', note:'11:15-12:00' },
      { day:5, start:'12:30', end:'13:15', subject:'Story Time', note:'12:15-12:30' },
    ],
  },

  // ── GRADE 2B ──────────────────────────────────────────────────────────────
  {
    gradeName: '2', section: 'B', teacherName: 'Primaria Teacher 2B',
    slots: [
      { day:1, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:1, start:'07:30', end:'08:30', subject:'Homeroom', note:'7:30-8:00' },
      { day:1, start:'08:30', end:'09:00', subject:'PSHE', note:'8:00-9:00' },
      { day:1, start:'09:15', end:'10:15', subject:'Music' },
      { day:1, start:'10:15', end:'11:15', subject:'Spanish' },
      { day:1, start:'11:15', end:'12:00', subject:'English' },
      { day:1, start:'12:30', end:'13:15', subject:'Math Primary' },
      { day:1, start:'13:15', end:'14:15', subject:'Guided Reading' },
      { day:2, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:2, start:'07:30', end:'08:30', subject:'Spanish' },
      { day:2, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:2, start:'09:15', end:'10:15', subject:'English' },
      { day:2, start:'10:15', end:'11:15', subject:'Computing' },
      { day:2, start:'11:15', end:'12:00', subject:'P.E.' },
      { day:2, start:'12:30', end:'13:15', subject:'Math Primary' },
      { day:2, start:'13:15', end:'14:15', subject:'Story Time' },
      { day:3, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:3, start:'07:30', end:'08:30', subject:'Spanish' },
      { day:3, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:3, start:'09:15', end:'10:15', subject:'Social Studies' },
      { day:3, start:'10:15', end:'11:15', subject:'Math Primary' },
      { day:3, start:'11:15', end:'12:00', subject:'Science' },
      { day:3, start:'12:30', end:'13:15', subject:'English', note:'12:30-1:30' },
      { day:3, start:'13:15', end:'14:15', subject:'Handwriting', note:'1:30-1:50' },
      { day:4, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:4, start:'07:30', end:'08:30', subject:'English' },
      { day:4, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:4, start:'09:15', end:'10:15', subject:'Social Studies', note:'9:15-10:00' },
      { day:4, start:'10:15', end:'11:15', subject:'Math Primary', note:'10:00-11:00' },
      { day:4, start:'11:15', end:'12:00', subject:'Science', note:'11:00-12:00' },
      { day:4, start:'12:30', end:'13:15', subject:'Spanish' },
      { day:4, start:'13:15', end:'14:15', subject:'Story Time' },
      { day:5, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:5, start:'07:30', end:'08:30', subject:'English' },
      { day:5, start:'08:30', end:'09:00', subject:'Handwriting' },
      { day:5, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:5, start:'10:15', end:'11:15', subject:'Science' },
      { day:5, start:'11:15', end:'12:00', subject:'Art', note:'11:15-12:15' },
      { day:5, start:'12:30', end:'13:15', subject:'Story Time', note:'12:15-12:30' },
    ],
  },

  // ── GRADE 2C ──────────────────────────────────────────────────────────────
  {
    gradeName: '2', section: 'C', teacherName: 'Primaria Teacher 2C',
    slots: [
      { day:1, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:1, start:'07:30', end:'08:30', subject:'Homeroom', note:'7:30-8:00' },
      { day:1, start:'08:30', end:'09:00', subject:'English', note:'8:00-9:00' },
      { day:1, start:'09:15', end:'10:15', subject:'Spanish' },
      { day:1, start:'10:15', end:'11:15', subject:'Computing' },
      { day:1, start:'11:15', end:'12:00', subject:'Math Primary' },
      { day:1, start:'12:30', end:'13:15', subject:'Science' },
      { day:1, start:'13:15', end:'14:15', subject:'Handwriting' },
      { day:2, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:2, start:'07:30', end:'08:30', subject:'English' },
      { day:2, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:2, start:'09:15', end:'10:15', subject:'PSHE' },
      { day:2, start:'10:15', end:'11:15', subject:'Science' },
      { day:2, start:'11:15', end:'12:00', subject:'Math Primary' },
      { day:2, start:'12:30', end:'13:15', subject:'Spanish', note:'12:30-1:30' },
      { day:2, start:'13:15', end:'14:15', subject:'Story Time', note:'1:30-1:50' },
      { day:3, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:3, start:'07:30', end:'08:30', subject:'English' },
      { day:3, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:3, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:3, start:'10:15', end:'11:15', subject:'Art' },
      { day:3, start:'11:15', end:'12:00', subject:'Social Studies' },
      { day:3, start:'12:30', end:'13:15', subject:'Science', note:'12:30-1:30' },
      { day:3, start:'13:15', end:'14:15', subject:'Story Time', note:'1:30-1:50' },
      { day:4, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:4, start:'07:30', end:'08:30', subject:'P.E.', note:'7:30-8:15' },
      { day:4, start:'08:30', end:'09:00', subject:'English', note:'8:15-9:00' },
      { day:4, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:4, start:'10:15', end:'11:15', subject:'Spanish' },
      { day:4, start:'11:15', end:'12:00', subject:'Guided Reading', note:'11:15-11:45' },
      { day:4, start:'12:30', end:'13:15', subject:'Social Studies', note:'12:30-1:30' },
      { day:4, start:'13:15', end:'14:15', subject:'Handwriting', note:'1:30-1:50' },
      { day:5, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:5, start:'07:30', end:'08:30', subject:'Spanish', note:'7:30-8:15' },
      { day:5, start:'08:30', end:'09:00', subject:'Guided Reading', note:'8:15-9:00' },
      { day:5, start:'09:15', end:'10:15', subject:'Music' },
      { day:5, start:'10:15', end:'11:15', subject:'English' },
      { day:5, start:'11:15', end:'12:00', subject:'Math Primary', note:'11:15-12:15' },
      { day:5, start:'12:30', end:'13:15', subject:'Story Time', note:'12:15-12:30' },
    ],
  },

  // ── GRADE 3A ──────────────────────────────────────────────────────────────
  {
    gradeName: '3', section: 'A', teacherName: 'Primaria Teacher 3A',
    slots: [
      { day:1, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:1, start:'07:30', end:'08:30', subject:'Homeroom' },
      { day:1, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:1, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:1, start:'10:15', end:'11:15', subject:'English' },
      { day:1, start:'11:15', end:'12:00', subject:'Social Studies' },
      { day:1, start:'12:30', end:'13:15', subject:'Spanish' },
      { day:1, start:'13:15', end:'14:15', subject:'Handwriting' },
      { day:2, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:2, start:'07:30', end:'08:30', subject:'Computing' },
      { day:2, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:2, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:2, start:'10:15', end:'11:15', subject:'Social Studies', note:'10:15-11:00' },
      { day:2, start:'11:15', end:'12:00', subject:'Science', note:'11:00-12:00' },
      { day:2, start:'12:30', end:'13:15', subject:'English' },
      { day:2, start:'13:15', end:'14:15', subject:'Story Time' },
      { day:3, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:3, start:'07:30', end:'08:30', subject:'P.E.', note:'7:30-8:15' },
      { day:3, start:'08:30', end:'09:00', subject:'English', note:'8:15-9:00' },
      { day:3, start:'09:15', end:'10:15', subject:'Music' },
      { day:3, start:'10:15', end:'11:15', subject:'Science' },
      { day:3, start:'11:15', end:'12:00', subject:'Spanish' },
      { day:3, start:'12:30', end:'13:15', subject:'Math Primary' },
      { day:3, start:'13:15', end:'14:15', subject:'Guided Reading' },
      { day:4, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:4, start:'07:30', end:'08:30', subject:'English' },
      { day:4, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:4, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:4, start:'10:15', end:'11:15', subject:'PSHE' },
      { day:4, start:'11:15', end:'12:00', subject:'Spanish' },
      { day:4, start:'12:30', end:'13:15', subject:'Science' },
      { day:4, start:'13:15', end:'14:15', subject:'Story Time' },
      { day:5, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:5, start:'07:30', end:'08:30', subject:'English' },
      { day:5, start:'08:30', end:'09:00', subject:'Handwriting' },
      { day:5, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:5, start:'10:15', end:'11:15', subject:'Spanish' },
      { day:5, start:'11:15', end:'12:00', subject:'Art', note:'11:15-12:15' },
      { day:5, start:'12:30', end:'13:15', subject:'Story Time', note:'12:15-12:30' },
    ],
  },

  // ── GRADE 3B ──────────────────────────────────────────────────────────────
  {
    gradeName: '3', section: 'B', teacherName: 'Primaria Teacher 3B',
    slots: [
      { day:1, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:1, start:'07:30', end:'08:30', subject:'Homeroom' },
      { day:1, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:1, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:1, start:'10:15', end:'11:15', subject:'Social Studies', note:'10:15-11:00' },
      { day:1, start:'11:15', end:'12:00', subject:'Science', note:'11:00-12:00' },
      { day:1, start:'12:30', end:'13:15', subject:'English' },
      { day:1, start:'13:15', end:'14:15', subject:'Handwriting' },
      { day:2, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:2, start:'07:30', end:'08:30', subject:'English' },
      { day:2, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:2, start:'09:15', end:'10:15', subject:'Art' },
      { day:2, start:'10:15', end:'11:15', subject:'Math Primary' },
      { day:2, start:'11:15', end:'12:00', subject:'Spanish' },
      { day:2, start:'12:30', end:'13:15', subject:'PSHE', note:'12:30-1:30' },
      { day:2, start:'13:15', end:'14:15', subject:'Story Time' },
      { day:3, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:3, start:'07:30', end:'08:30', subject:'English', note:'7:30-8:15' },
      { day:3, start:'08:30', end:'09:00', subject:'P.E.', note:'8:15-9:00' },
      { day:3, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:3, start:'10:15', end:'11:15', subject:'Social Studies', note:'10:15-11:00' },
      { day:3, start:'11:15', end:'12:00', subject:'Science', note:'11:00-12:00' },
      { day:3, start:'12:30', end:'13:15', subject:'Spanish', note:'12:30-1:30' },
      { day:3, start:'13:15', end:'14:15', subject:'Guided Reading' },
      { day:4, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:4, start:'07:30', end:'08:30', subject:'English' },
      { day:4, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:4, start:'09:15', end:'10:15', subject:'Spanish' },
      { day:4, start:'10:15', end:'11:15', subject:'Math Primary' },
      { day:4, start:'11:15', end:'12:00', subject:'Science' },
      { day:4, start:'12:30', end:'13:15', subject:'Story Time', note:'12:30-12:45' },
      { day:4, start:'13:15', end:'14:15', subject:'Music', note:'12:45-1:50' },
      { day:5, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:5, start:'07:30', end:'08:30', subject:'English' },
      { day:5, start:'08:30', end:'09:00', subject:'Handwriting' },
      { day:5, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:5, start:'10:15', end:'11:15', subject:'Story Time', note:'10:15-10:45' },
      { day:5, start:'11:15', end:'12:00', subject:'Computing', note:'10:45-11:45' },
      { day:5, start:'12:30', end:'13:15', subject:'Spanish', note:'11:45-12:30' },
    ],
  },

  // ── GRADE 4A ──────────────────────────────────────────────────────────────
  {
    gradeName: '4', section: 'A', teacherName: 'Primaria Teacher 4A',
    slots: [
      { day:1, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:1, start:'07:30', end:'08:30', subject:'Homeroom', note:'7:30-8:00' },
      { day:1, start:'08:30', end:'09:00', subject:'Science', note:'8:00-9:00' },
      { day:1, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:1, start:'10:15', end:'11:15', subject:'English' },
      { day:1, start:'11:15', end:'12:00', subject:'Guided Reading' },
      { day:1, start:'12:30', end:'13:15', subject:'Spanish' },
      { day:1, start:'13:15', end:'14:15', subject:'Handwriting' },
      { day:2, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:2, start:'07:30', end:'08:30', subject:'English' },
      { day:2, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:2, start:'09:15', end:'10:15', subject:'Computing' },
      { day:2, start:'10:15', end:'11:15', subject:'Music' },
      { day:2, start:'11:15', end:'12:00', subject:'Spanish' },
      { day:2, start:'12:30', end:'13:15', subject:'Math Primary', note:'12:30-1:30' },
      { day:2, start:'13:15', end:'14:15', subject:'Story Time', note:'1:30-1:50' },
      { day:3, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:3, start:'07:30', end:'08:30', subject:'Social Studies' },
      { day:3, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:3, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:3, start:'10:15', end:'11:15', subject:'Science' },
      { day:3, start:'11:15', end:'12:00', subject:'English' },
      { day:3, start:'12:30', end:'13:15', subject:'Spanish', note:'12:30-1:30' },
      { day:3, start:'13:15', end:'14:15', subject:'Handwriting' },
      { day:4, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:4, start:'07:30', end:'08:30', subject:'English', note:'7:30-8:15' },
      { day:4, start:'08:30', end:'09:00', subject:'P.E.', note:'8:15-9:00' },
      { day:4, start:'09:15', end:'10:15', subject:'Spanish' },
      { day:4, start:'10:15', end:'11:15', subject:'PSHE' },
      { day:4, start:'11:15', end:'12:00', subject:'Science' },
      { day:4, start:'12:30', end:'13:15', subject:'Math Primary', note:'12:30-1:30' },
      { day:4, start:'13:15', end:'14:15', subject:'Story Time', note:'1:30-1:50' },
      { day:5, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:5, start:'07:30', end:'08:30', subject:'Social Studies' },
      { day:5, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:5, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:5, start:'10:15', end:'11:15', subject:'English' },
      { day:5, start:'11:15', end:'12:00', subject:'Art', note:'11:15-12:15' },
      { day:5, start:'12:30', end:'13:15', subject:'Story Time', note:'12:15-12:30' },
    ],
  },

  // ── GRADE 4B ──────────────────────────────────────────────────────────────
  {
    gradeName: '4', section: 'B', teacherName: 'Primaria Teacher 4B',
    slots: [
      { day:1, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:1, start:'07:30', end:'08:30', subject:'Homeroom', note:'7:30-8:00' },
      { day:1, start:'08:30', end:'09:00', subject:'Computing', note:'8:00-9:00' },
      { day:1, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:1, start:'10:15', end:'11:15', subject:'English' },
      { day:1, start:'11:15', end:'12:00', subject:'PSHE' },
      { day:1, start:'12:30', end:'13:15', subject:'Science' },
      { day:1, start:'13:15', end:'14:15', subject:'Story Time' },
      { day:2, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:2, start:'07:30', end:'08:30', subject:'Spanish' },
      { day:2, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:2, start:'09:15', end:'10:15', subject:'Science' },
      { day:2, start:'10:15', end:'11:15', subject:'Art' },
      { day:2, start:'11:15', end:'12:00', subject:'English' },
      { day:2, start:'12:30', end:'13:15', subject:'Math Primary' },
      { day:2, start:'13:15', end:'14:15', subject:'Handwriting' },
      { day:3, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:3, start:'07:30', end:'08:30', subject:'Music' },
      { day:3, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:3, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:3, start:'10:15', end:'11:15', subject:'Spanish' },
      { day:3, start:'11:15', end:'12:00', subject:'P.E.' },
      { day:3, start:'12:30', end:'13:15', subject:'English' },
      { day:3, start:'13:15', end:'14:15', subject:'Story Time' },
      { day:4, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:4, start:'07:30', end:'08:30', subject:'Social Studies' },
      { day:4, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:4, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:4, start:'10:15', end:'11:15', subject:'Science' },
      { day:4, start:'11:15', end:'12:00', subject:'English' },
      { day:4, start:'12:30', end:'13:15', subject:'Spanish' },
      { day:4, start:'13:15', end:'14:15', subject:'Handwriting' },
      { day:5, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:5, start:'07:30', end:'08:30', subject:'Spanish', note:'7:30-8:15' },
      { day:5, start:'08:30', end:'09:00', subject:'Guided Reading', note:'8:15-8:45' },
      { day:5, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:5, start:'10:15', end:'11:15', subject:'Social Studies' },
      { day:5, start:'11:15', end:'12:00', subject:'English', note:'11:15-12:15' },
      { day:5, start:'12:30', end:'13:15', subject:'Story Time', note:'12:15-12:30' },
    ],
  },

  // ── GRADE 5A ──────────────────────────────────────────────────────────────
  {
    gradeName: '5', section: 'A', teacherName: 'Primaria Teacher 5A',
    slots: [
      { day:1, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:1, start:'07:30', end:'08:30', subject:'Homeroom' },
      { day:1, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:1, start:'09:15', end:'10:15', subject:'Spanish' },
      { day:1, start:'10:15', end:'11:15', subject:'English' },
      { day:1, start:'11:15', end:'12:00', subject:'Math Primary' },
      { day:1, start:'12:30', end:'13:15', subject:'PSHE' },
      { day:1, start:'13:15', end:'14:15', subject:'Storytime' },
      { day:2, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:2, start:'07:30', end:'08:30', subject:'English', note:'7:30-8:15' },
      { day:2, start:'08:30', end:'09:00', subject:'Science', note:'8:15-9:00' },
      { day:2, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:2, start:'10:15', end:'11:15', subject:'Social Studies' },
      { day:2, start:'11:15', end:'12:00', subject:'Spanish' },
      { day:2, start:'12:30', end:'13:15', subject:'Computing' },
      { day:2, start:'13:15', end:'14:15', subject:'Guided Reading' },
      { day:3, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:3, start:'07:30', end:'08:30', subject:'Social Studies', note:'7:30-8:15' },
      { day:3, start:'08:30', end:'09:00', subject:'Science', note:'8:15-9:00' },
      { day:3, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:3, start:'10:15', end:'11:15', subject:'P.E.' },
      { day:3, start:'11:15', end:'12:00', subject:'English' },
      { day:3, start:'12:30', end:'13:15', subject:'Spanish' },
      { day:3, start:'13:15', end:'14:15', subject:'Guided Reading' },
      { day:4, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:4, start:'07:30', end:'08:30', subject:'French' },
      { day:4, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:4, start:'09:15', end:'10:15', subject:'Spanish', note:'9:15-10:00' },
      { day:4, start:'10:15', end:'11:15', subject:'Math Primary', note:'10:00-11:00' },
      { day:4, start:'11:15', end:'12:00', subject:'Science', note:'11:00-11:45' },
      { day:4, start:'12:30', end:'13:15', subject:'English' },
      { day:4, start:'13:15', end:'14:15', subject:'Handwriting' },
      { day:5, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:5, start:'07:30', end:'08:30', subject:'English' },
      { day:5, start:'08:30', end:'09:00', subject:'Handwriting' },
      { day:5, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:5, start:'10:15', end:'11:15', subject:'Music' },
      { day:5, start:'11:15', end:'12:00', subject:'Art', note:'11:15-12:15' },
      { day:5, start:'12:30', end:'13:15', subject:'Storytime', note:'12:15-12:30' },
    ],
  },

  // ── GRADE 5B ──────────────────────────────────────────────────────────────
  {
    gradeName: '5', section: 'B', teacherName: 'Primaria Teacher 5B',
    slots: [
      { day:1, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:1, start:'07:30', end:'08:30', subject:'Homeroom' },
      { day:1, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:1, start:'09:15', end:'10:15', subject:'Computing', note:'9:15-10:00' },
      { day:1, start:'10:15', end:'11:15', subject:'English', note:'10:00-11:00' },
      { day:1, start:'11:15', end:'12:00', subject:'Math Primary', note:'11:00-12:00' },
      { day:1, start:'12:30', end:'13:15', subject:'Spanish' },
      { day:1, start:'13:15', end:'14:15', subject:'Story Time' },
      { day:2, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:2, start:'07:30', end:'08:30', subject:'English', note:'7:30-8:15' },
      { day:2, start:'08:30', end:'09:00', subject:'Science', note:'8:15-9:00' },
      { day:2, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:2, start:'10:15', end:'11:15', subject:'Art' },
      { day:2, start:'11:15', end:'12:00', subject:'PSHE' },
      { day:2, start:'12:30', end:'13:15', subject:'Spanish' },
      { day:2, start:'13:15', end:'14:15', subject:'Guided Reading' },
      { day:3, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:3, start:'07:30', end:'08:30', subject:'French' },
      { day:3, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:3, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:3, start:'10:15', end:'11:15', subject:'English' },
      { day:3, start:'11:15', end:'12:00', subject:'Spanish' },
      { day:3, start:'12:30', end:'13:15', subject:'Story Time', note:'12:30-12:45' },
      { day:3, start:'13:15', end:'14:15', subject:'Music', note:'12:45-1:50' },
      { day:4, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:4, start:'07:30', end:'08:30', subject:'Spanish' },
      { day:4, start:'08:30', end:'09:00', subject:'Guided Reading' },
      { day:4, start:'09:15', end:'10:15', subject:'Math Primary' },
      { day:4, start:'10:15', end:'11:15', subject:'Social Studies' },
      { day:4, start:'11:15', end:'12:00', subject:'Science' },
      { day:4, start:'12:30', end:'13:15', subject:'English' },
      { day:4, start:'13:15', end:'14:15', subject:'Handwriting' },
      { day:5, start:'07:15', end:'07:30', subject:'Homeroom' },
      { day:5, start:'07:30', end:'08:30', subject:'English', note:'7:30-8:15' },
      { day:5, start:'08:30', end:'09:00', subject:'Science', note:'8:15-9:00' },
      { day:5, start:'09:15', end:'10:15', subject:'Math Primary', note:'9:15-10:00' },
      { day:5, start:'10:15', end:'11:15', subject:'P.E.' },
      { day:5, start:'11:15', end:'12:00', subject:'Social Studies' },
      { day:5, start:'12:30', end:'13:15', subject:'Handwriting', note:'12:00-12:30' },
    ],
  },
];

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== IMPORTANDO HORARIOS DE PRIMARIA ===\n');
  let totalCreated = 0;
  let totalSkipped = 0;

  // Ensure needed subjects exist
  const extraSubjects = ['Reading and Phonics', 'Motor Skills', 'Guided Reading', 'Storytime', 'Story Time', 'Handwriting', 'Art', 'French'];
  for (const s of extraSubjects) await getOrCreateSubject(s);

  for (const gs of PRIMARY_SCHEDULES) {
    console.log(`\n--- ${gs.gradeName} ${gs.section} (${gs.teacherName}) ---`);
    const teacherId = await getOrCreateTeacher(gs.teacherName);
    const gradeId = await getGrade(gs.gradeName, gs.section);
    if (!gradeId) { console.log(`  SKIP: grade not found`); continue; }

    for (const slot of gs.slots) {
      const tbId = await findTimeBlock(slot.day, slot.start, slot.end);
      if (!tbId) {
        console.warn(`  MISSING timeblock: day${slot.day} ${slot.start}-${slot.end} | ${slot.subject}`);
        totalSkipped++;
        continue;
      }
      const subjectId = await getOrCreateSubject(slot.subject);

      // Check if already exists (avoid duplicates on re-run)
      const exists = await prisma.assignment.findFirst({
        where: { teacherId, gradeId, subjectId, timeBlockId: tbId },
      });
      if (exists) { totalSkipped++; continue; }

      await prisma.assignment.create({
        data: {
          teacherId,
          gradeId,
          subjectId,
          timeBlockId: tbId,
          status: 'CONFIRMED',
          note: slot.note ?? null,
        },
      });
      totalCreated++;
    }
    console.log(`  Done`);
  }

  console.log(`\n=== RESULTADO ===`);
  console.log(`  Creados: ${totalCreated}`);
  console.log(`  Saltados (ya existían o sin timeblock): ${totalSkipped}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
