/**
 * Replaces assignments for 8A, 8B, 9A, 9B from reference images.
 * Middle (8A,8B): post-lunch at 13:00 and 14:00
 * High   (9A,9B): post-lunch at 13:30 and 14:30
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const allTBs = await p.timeBlock.findMany({ where: { blockType: "CLASS", level: "SECONDARY" } });
const tbMap = {};
for (const b of allTBs) {
  const key = `${b.dayOfWeek}_${b.startTime}`;
  if (!tbMap[key]) tbMap[key] = b.id;
}
const TB = (day, st) => { const id = tbMap[`${day}_${st}`]; if (!id) throw new Error(`No TB d${day} ${st}`); return id; };

const teachers = await p.teacher.findMany();
const subjects = await p.subject.findMany();
const rooms    = await p.room.findMany();
const grades   = await p.grade.findMany({ where: { level: "SECONDARY" } });

const tByName = Object.fromEntries(teachers.map(t => [t.name.toLowerCase(), t.id]));
const sByName = Object.fromEntries(subjects.map(s => [s.name.toLowerCase(), s.id]));
const rByName = Object.fromEntries(rooms.map(r => [r.name.toLowerCase(), r.id]));
const gMap    = Object.fromEntries(grades.map(g => [`${g.name}${g.section ?? ""}`, g.id]));

const T = n => { const id = tByName[n.toLowerCase()]; if (!id) throw new Error("No teacher: " + n); return id; };
const S = n => { const id = sByName[n.toLowerCase()]; if (!id) throw new Error("No subject: " + n); return id; };
const R = n => { const id = rByName[n.toLowerCase()]; if (!id) throw new Error("No room: " + n); return id; };

// Middle post-lunch slots: 13:00, 14:00
// High post-lunch slots:   13:30, 14:30
// [day, startTime, subject, teacher, room]

const SCHEDULES = {

  // 8A · Conrado De León · Room #18 (Planta Alta)
  // Ref image: SOC.SCIENCES Tue7:30, SPANISH Mon8:30, SCIENCE Tue8:30...
  "8A": [
    [1,"07:30","Homeroom",      "Conrado de Leon","Room #18 (Planta Alta)"],
    [1,"08:30","Spanish",       "Elida Barria",   "Room #18 (Planta Alta)"],
    [1,"09:45","Soc.Science",   "Vanessa Muñoz",  "Room #18 (Planta Alta)"],
    [1,"10:45","Science",       "Conrado de Leon","Room #18 (Planta Alta)"],
    [1,"11:45","Math",          "Maria Pitti",    "Room #18 (Planta Alta)"],
    [1,"13:00","Music",         "Leonel Vega",    "Room #18 (Planta Alta)"],
    [1,"14:00","English",       "Vielka Vega",    "Room #18 (Planta Alta)"],

    [2,"07:30","Soc.Science",   "Vanessa Muñoz",  "Room #18 (Planta Alta)"],
    [2,"08:30","Science",       "Conrado de Leon","Room #18 (Planta Alta)"],
    [2,"09:45","Spanish",       "Elida Barria",   "Room #18 (Planta Alta)"],
    [2,"10:45","Literature",    "Vielka Vega",    "Room #18 (Planta Alta)"],
    [2,"11:45","Art",           "Andrea Guerra",  "Room #18 (Planta Alta)"],
    [2,"13:00","Math",          "Maria Pitti",    "Room #18 (Planta Alta)"],
    [2,"14:00","English",       "Vielka Vega",    "Room #18 (Planta Alta)"],

    [3,"07:30","Math",          "Maria Pitti",    "Room #18 (Planta Alta)"],
    [3,"08:30","Science",       "Conrado de Leon","Room #18 (Planta Alta)"],
    [3,"09:45","Literature",    "Vielka Vega",    "Room #18 (Planta Alta)"],
    [3,"10:45","Spanish",       "Elida Barria",   "Room #18 (Planta Alta)"],
    [3,"11:45","French",        "Elsi Diaz",      "Room #18 (Planta Alta)"],
    [3,"13:00","English",       "Vielka Vega",    "Room #18 (Planta Alta)"],
    [3,"14:00","P.E.",          "Francisco Mendoza","Gymnasium"],

    [4,"07:30","Science",       "Conrado de Leon","Room #18 (Planta Alta)"],
    [4,"08:30","Math",          "Maria Pitti",    "Room #18 (Planta Alta)"],
    [4,"09:45","Soc.Science",   "Vanessa Muñoz",  "Room #18 (Planta Alta)"],
    [4,"10:45","English",       "Vielka Vega",    "Room #18 (Planta Alta)"],
    [4,"11:45","Spanish",       "Elida Barria",   "Room #18 (Planta Alta)"],
    [4,"13:00","French",        "Elsi Diaz",      "Room #18 (Planta Alta)"],
    [4,"14:00","Computing",     "Emilio Núñez",   "Computer Lab"],

    [5,"07:30","Spanish",       "Elida Barria",   "Room #18 (Planta Alta)"],
    [5,"08:30","Science",       "Conrado de Leon","Room #18 (Planta Alta)"],
    [5,"09:45","English",       "Vielka Vega",    "Room #18 (Planta Alta)"],
    [5,"10:45","Math",          "Maria Pitti",    "Room #18 (Planta Alta)"],
    [5,"11:45","Literature",    "Vielka Vega",    "Room #18 (Planta Alta)"],
  ],

  // 8B · Elida Barria · Room #19 (Planta Alta)
  "8B": [
    [1,"07:30","Homeroom",      "Elida Barria",   "Room #19 (Planta Alta)"],
    [1,"08:30","Science",       "Conrado de Leon","Room #19 (Planta Alta)"],
    [1,"09:45","Math",          "Maria Pitti",    "Room #19 (Planta Alta)"],
    [1,"10:45","Music",         "Leonel Vega",    "Room #19 (Planta Alta)"],
    [1,"11:45","English",       "Vielka Vega",    "Room #19 (Planta Alta)"],
    [1,"13:00","Literature",    "Vielka Vega",    "Room #19 (Planta Alta)"],
    [1,"14:00","Spanish",       "Elida Barria",   "Room #19 (Planta Alta)"],

    [2,"07:30","Literature",    "Vielka Vega",    "Room #19 (Planta Alta)"],
    [2,"08:30","Spanish",       "Elida Barria",   "Room #19 (Planta Alta)"],
    [2,"09:45","Soc.Science",   "Vanessa Muñoz",  "Room #19 (Planta Alta)"],
    [2,"10:45","Science",       "Conrado de Leon","Room #19 (Planta Alta)"],
    [2,"11:45","Science",       "Conrado de Leon","Room #19 (Planta Alta)"],
    [2,"13:00","Art",           "Andrea Guerra",  "Room #19 (Planta Alta)"],
    [2,"14:00","Math",          "Maria Pitti",    "Room #19 (Planta Alta)"],

    [3,"07:30","Soc.Science",   "Vanessa Muñoz",  "Room #19 (Planta Alta)"],
    [3,"08:30","French",        "Elsi Diaz",      "Room #19 (Planta Alta)"],
    [3,"09:45","Spanish",       "Elida Barria",   "Room #19 (Planta Alta)"],
    [3,"10:45","English",       "Vielka Vega",    "Room #19 (Planta Alta)"],
    [3,"11:45","Science",       "Conrado de Leon","Room #19 (Planta Alta)"],
    [3,"13:00","Math",          "Maria Pitti",    "Room #19 (Planta Alta)"],
    [3,"14:00","P.E.",          "Francisco Mendoza","Gymnasium"],

    [4,"07:30","Literature",    "Vielka Vega",    "Room #19 (Planta Alta)"],
    [4,"08:30","Science",       "Conrado de Leon","Room #19 (Planta Alta)"],
    [4,"09:45","Math",          "Maria Pitti",    "Room #19 (Planta Alta)"],
    [4,"10:45","French",        "Elsi Diaz",      "Room #19 (Planta Alta)"],
    [4,"11:45","Spanish",       "Elida Barria",   "Room #19 (Planta Alta)"],
    [4,"13:00","Soc.Science",   "Vanessa Muñoz",  "Room #19 (Planta Alta)"],
    [4,"14:00","English",       "Vielka Vega",    "Room #19 (Planta Alta)"],

    [5,"07:30","Science",       "Conrado de Leon","Room #19 (Planta Alta)"],
    [5,"08:30","Math",          "Maria Pitti",    "Room #19 (Planta Alta)"],
    [5,"09:45","Computing",     "Emilio Núñez",   "Computer Lab"],
    [5,"10:45","English",       "Vielka Vega",    "Room #19 (Planta Alta)"],
    [5,"11:45","Spanish",       "Elida Barria",   "Room #19 (Planta Alta)"],
  ],

  // 9A · Emilio Nuñez · Room #13 (Planta Baja)
  "9A": [
    [1,"07:30","Homeroom",      "Emilio Núñez",   "Room #13 (Planta Baja)"],
    [1,"08:30","Literature",    "Vielka Vega",    "Room #13 (Planta Baja)"],
    [1,"09:45","English",       "Vielka Vega",    "Room #13 (Planta Baja)"],
    [1,"10:45","Spanish",       "Elida Barria",   "Room #13 (Planta Baja)"],
    [1,"11:45","Math",          "Maria Pitti",    "Room #13 (Planta Baja)"],
    [1,"13:30","Chemistry",     "Irlanda Tuñon",  "Room #13 (Planta Baja)"],
    [1,"14:30","Biology",       "Conrado de Leon","Room #13 (Planta Baja)"],

    [2,"07:30","Literature",    "Vielka Vega",    "Room #13 (Planta Baja)"],
    [2,"08:30","English",       "Vielka Vega",    "Room #13 (Planta Baja)"],
    [2,"09:45","Soc.Science",   "Vanessa Muñoz",  "Room #13 (Planta Baja)"],
    [2,"10:45","Biology",       "Conrado de Leon","Room #13 (Planta Baja)"],
    [2,"11:45","Spanish",       "Elida Barria",   "Room #13 (Planta Baja)"],
    [2,"13:30","Math",          "Maria Pitti",    "Room #13 (Planta Baja)"],
    [2,"14:30","Physics",       "Aristides Guerra","Room #13 (Planta Baja)"],

    [3,"07:30","Computing",     "Emilio Núñez",   "Computer Lab"],
    [3,"08:30","English",       "Vielka Vega",    "Room #13 (Planta Baja)"],
    [3,"09:45","Chemistry",     "Irlanda Tuñon",  "Room #13 (Planta Baja)"],
    [3,"10:45","Biology",       "Conrado de Leon","Room #13 (Planta Baja)"],
    [3,"11:45","Math",          "Maria Pitti",    "Room #13 (Planta Baja)"],
    [3,"13:30","Physics",       "Aristides Guerra","Room #13 (Planta Baja)"],
    [3,"14:30","Spanish",       "Elida Barria",   "Room #13 (Planta Baja)"],

    [4,"07:30","English",       "Vielka Vega",    "Room #13 (Planta Baja)"],
    [4,"08:30","Physics",       "Aristides Guerra","Room #13 (Planta Baja)"],
    [4,"09:45","Literature",    "Vielka Vega",    "Room #13 (Planta Baja)"],
    [4,"10:45","Biology",       "Conrado de Leon","Room #13 (Planta Baja)"],
    [4,"11:45","Soc.Science",   "Vanessa Muñoz",  "Room #13 (Planta Baja)"],
    [4,"13:30","Computing",     "Emilio Núñez",   "Computer Lab"],
    [4,"14:30","Math",          "Maria Pitti",    "Room #13 (Planta Baja)"],

    [5,"07:30","English",       "Vielka Vega",    "Room #13 (Planta Baja)"],
    [5,"08:30","Math",          "Maria Pitti",    "Room #13 (Planta Baja)"],
    [5,"09:45","Spanish",       "Elida Barria",   "Room #13 (Planta Baja)"],
    [5,"10:45","Chemistry",     "Irlanda Tuñon",  "Room #13 (Planta Baja)"],
    [5,"11:45","P.E.",          "Francisco Mendoza","Gymnasium"],
  ],

  // 9B · Judith Gil · Room #14 (Planta Baja)
  "9B": [
    [1,"07:30","Homeroom",      "Judith Gil",     "Room #14 (Planta Baja)"],
    [1,"08:30","English",       "Vielka Vega",    "Room #14 (Planta Baja)"],
    [1,"09:45","Chemistry",     "Irlanda Tuñon",  "Room #14 (Planta Baja)"],
    [1,"10:45","Biology",       "Conrado de Leon","Room #14 (Planta Baja)"],
    [1,"11:45","Physics",       "Aristides Guerra","Room #14 (Planta Baja)"],
    [1,"13:30","Literature",    "Vielka Vega",    "Room #14 (Planta Baja)"],
    [1,"14:30","Math",          "Judith Gil",     "Room #14 (Planta Baja)"],

    [2,"07:30","English",       "Vielka Vega",    "Room #14 (Planta Baja)"],
    [2,"08:30","Computing",     "Emilio Núñez",   "Computer Lab"],
    [2,"09:45","Chemistry",     "Irlanda Tuñon",  "Room #14 (Planta Baja)"],
    [2,"10:45","Spanish",       "Elida Barria",   "Room #14 (Planta Baja)"],
    [2,"11:45","Math",          "Judith Gil",     "Room #14 (Planta Baja)"],
    [2,"13:30","Soc.Science",   "Vanessa Muñoz",  "Room #14 (Planta Baja)"],
    [2,"14:30","Biology",       "Conrado de Leon","Room #14 (Planta Baja)"],

    [3,"07:30","English",       "Vielka Vega",    "Room #14 (Planta Baja)"],
    [3,"08:30","Spanish",       "Elida Barria",   "Room #14 (Planta Baja)"],
    [3,"09:45","Biology",       "Conrado de Leon","Room #14 (Planta Baja)"],
    [3,"10:45","Literature",    "Vielka Vega",    "Room #14 (Planta Baja)"],
    [3,"11:45","Computing",     "Emilio Núñez",   "Computer Lab"],
    [3,"13:30","Math",          "Judith Gil",     "Room #14 (Planta Baja)"],
    [3,"14:30","Physics",       "Aristides Guerra","Room #14 (Planta Baja)"],

    [4,"07:30","Physics",       "Aristides Guerra","Room #14 (Planta Baja)"],
    [4,"08:30","Spanish",       "Elida Barria",   "Room #14 (Planta Baja)"],
    [4,"09:45","Biology",       "Conrado de Leon","Room #14 (Planta Baja)"],
    [4,"10:45","Chemistry",     "Irlanda Tuñon",  "Room #14 (Planta Baja)"],
    [4,"11:45","Math",          "Judith Gil",     "Room #14 (Planta Baja)"],
    [4,"13:30","Literature",    "Vielka Vega",    "Room #14 (Planta Baja)"],
    [4,"14:30","Biology",       "Conrado de Leon","Room #14 (Planta Baja)"],

    [5,"07:30","Soc.Science",   "Vanessa Muñoz",  "Room #14 (Planta Baja)"],
    [5,"08:30","English",       "Vielka Vega",    "Room #14 (Planta Baja)"],
    [5,"09:45","Math",          "Judith Gil",     "Room #14 (Planta Baja)"],
    [5,"10:45","Spanish",       "Elida Barria",   "Room #14 (Planta Baja)"],
    [5,"11:45","P.E.",          "Francisco Mendoza","Gymnasium"],
  ],
};

// ── Subject alias map ────────────────────────────────────────────
const ALIAS = { "soc.science": "social science", "soc.sciences": "social science" };
const resolveS = n => {
  const key = ALIAS[n.toLowerCase()] ?? n.toLowerCase();
  const id = sByName[key];
  if (!id) throw new Error("No subject: " + n + " (tried: " + key + ")");
  return id;
};

// ── Delete and re-insert ─────────────────────────────────────────
for (const [gradeKey, rows] of Object.entries(SCHEDULES)) {
  const gradeId = gMap[gradeKey];
  if (!gradeId) { console.log(`SKIP: ${gradeKey} not found`); continue; }

  await p.assignment.deleteMany({ where: { gradeId } });
  let count = 0, errs = 0;

  for (const [day, startTime, subName, teachName, roomName] of rows) {
    try {
      await p.assignment.create({
        data: {
          gradeId,
          teacherId:   T(teachName),
          subjectId:   resolveS(subName),
          timeBlockId: TB(day, startTime),
          roomId:      R(roomName),
          status:      "OK",
        },
      });
      count++;
    } catch (e) {
      console.log(`  ERR ${gradeKey} D${day} ${startTime}: ${e.message}`);
      errs++;
    }
  }
  console.log(`✓ ${gradeKey}: ${count} inserted, ${errs} errors`);
}

await p.$disconnect();
