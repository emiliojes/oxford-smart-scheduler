/**
 * Replaces assignments for 10A, 10B, 11A, 11B, 12A from reference images.
 * All High School: post-lunch slots at 13:30 and 14:30
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// ── Add missing rooms ────────────────────────────────────────────
for (const name of ["Room #20 (Planta Alta)","Room #21 (Planta Alta)","Room #22 (Planta Baja)"]) {
  const ex = await p.room.findFirst({ where: { name } });
  if (!ex) { await p.room.create({ data: { name, capacity: 30 } }); console.log("Room created:", name); }
}

// ── Add missing subjects ─────────────────────────────────────────
const subjectsNow = await p.subject.findMany();
const sByNameRaw = Object.fromEntries(subjectsNow.map(s => [s.name.toLowerCase(), s.id]));
for (const name of ["Thinking and Skills","Computing T."]) {
  if (!sByNameRaw[name.toLowerCase()]) {
    const cr = await p.subject.create({ data: { name, level: "SECONDARY", weeklyFrequency: 2, defaultDuration: "SIXTY" } });
    sByNameRaw[name.toLowerCase()] = cr.id;
    console.log("Subject created:", name);
  }
}

// ── Reload catalogs ──────────────────────────────────────────────
const allTBs   = await p.timeBlock.findMany({ where: { blockType: "CLASS", level: "SECONDARY" } });
const teachers = await p.teacher.findMany();
const subjects = await p.subject.findMany();
const rooms    = await p.room.findMany();
const grades   = await p.grade.findMany({ where: { level: "SECONDARY" } });

const tbMap   = {};
for (const b of allTBs) { const k = `${b.dayOfWeek}_${b.startTime}`; if (!tbMap[k]) tbMap[k] = b.id; }
const tByName = Object.fromEntries(teachers.map(t => [t.name.toLowerCase(), t.id]));
const sByName = Object.fromEntries(subjects.map(s => [s.name.toLowerCase(), s.id]));
const rByName = Object.fromEntries(rooms.map(r => [r.name.toLowerCase(), r.id]));
const gMap    = Object.fromEntries(grades.map(g => [`${g.name}${g.section ?? ""}`, g.id]));

const ALIAS = { "soc.science":"social science","soc.sciences":"social science","computing t.":"computing t.","computing l.":"computing","thinking and skills":"thinking and skills" };
const TB = (d,t) => { const id=tbMap[`${d}_${t}`]; if(!id) throw new Error(`No TB d${d} ${t}`); return id; };
const T  = n => { const id=tByName[n.toLowerCase()]; if(!id) throw new Error("No teacher: "+n); return id; };
const S  = n => { const key=ALIAS[n.toLowerCase()]??n.toLowerCase(); const id=sByName[key]; if(!id) throw new Error("No subject: "+n+" → "+key); return id; };
const R  = n => { const id=rByName[n.toLowerCase()]; if(!id) throw new Error("No room: "+n); return id; };

const SCHEDULES = {

  // 10A · Vanessa Muñoz · Room #9 (Planta Baja)
  "10A": [
    [1,"07:30","Homeroom",         "Vanessa Muñoz",   "Room #9 (Planta Baja)"],
    [1,"08:30","Biology",          "Conrado de Leon", "Room #9 (Planta Baja)"],
    [1,"09:45","Literature",       "Vielka Vega",     "Room #9 (Planta Baja)"],
    [1,"10:45","Soc.Sciences",     "Vanessa Muñoz",   "Room #9 (Planta Baja)"],
    [1,"11:45","Chemistry",        "Irlanda Tuñon",   "Room #9 (Planta Baja)"],
    [1,"13:30","Math",             "Judith Gil",      "Room #9 (Planta Baja)"],
    [1,"14:30","English",          "Vielka Vega",     "Room #9 (Planta Baja)"],

    [2,"07:30","Biology",          "Conrado de Leon", "Room #9 (Planta Baja)"],
    [2,"08:30","Math",             "Judith Gil",      "Room #9 (Planta Baja)"],
    [2,"09:45","English",          "Vielka Vega",     "Room #9 (Planta Baja)"],
    [2,"10:45","Spanish",          "Elida Barria",    "Room #9 (Planta Baja)"],
    [2,"11:45","Chemistry",        "Irlanda Tuñon",   "Room #9 (Planta Baja)"],
    [2,"13:30","Physics",          "Aristides Guerra","Room #9 (Planta Baja)"],
    [2,"14:30","Literature",       "Vielka Vega",     "Room #9 (Planta Baja)"],

    [3,"07:30","Biology",          "Conrado de Leon", "Room #9 (Planta Baja)"],
    [3,"08:30","Physics",          "Aristides Guerra","Room #9 (Planta Baja)"],
    [3,"09:45","Math",             "Judith Gil",      "Room #9 (Planta Baja)"],
    [3,"10:45","English",          "Vielka Vega",     "Room #9 (Planta Baja)"],
    [3,"11:45","Chemistry",        "Irlanda Tuñon",   "Room #9 (Planta Baja)"],
    [3,"13:30","Computing T.",     "Emilio Núñez",    "Computer Lab"],
    [3,"14:30","Spanish",          "Elida Barria",    "Room #9 (Planta Baja)"],

    [4,"07:30","Biology",          "Conrado de Leon", "Room #9 (Planta Baja)"],
    [4,"08:30","Literature",       "Vielka Vega",     "Room #9 (Planta Baja)"],
    [4,"09:45","Spanish",          "Elida Barria",    "Room #9 (Planta Baja)"],
    [4,"10:45","Math",             "Judith Gil",      "Room #9 (Planta Baja)"],
    [4,"11:45","Computing",        "Emilio Núñez",    "Computer Lab"],
    [4,"13:30","Physics",          "Aristides Guerra","Room #9 (Planta Baja)"],
    [4,"14:30","Chemistry",        "Irlanda Tuñon",   "Room #9 (Planta Baja)"],

    [5,"07:30","Math",             "Judith Gil",      "Room #9 (Planta Baja)"],
    [5,"08:30","Soc.Sciences",     "Vanessa Muñoz",   "Room #9 (Planta Baja)"],
    [5,"09:45","English",          "Vielka Vega",     "Room #9 (Planta Baja)"],
    [5,"10:45","Spanish",          "Elida Barria",    "Room #9 (Planta Baja)"],
    [5,"11:45","Physics",          "Aristides Guerra","Room #9 (Planta Baja)"],
  ],

  // 10B · Aristides Guerra · Room #12 (Planta Baja)
  "10B": [
    [1,"07:30","Homeroom",         "Aristides Guerra","Room #12 (Planta Baja)"],
    [1,"08:30","Physics",          "Aristides Guerra","Room #12 (Planta Baja)"],
    [1,"09:45","Spanish",          "Elida Barria",    "Room #12 (Planta Baja)"],
    [1,"10:45","Math",             "Judith Gil",      "Room #12 (Planta Baja)"],
    [1,"11:45","Literature",       "Vielka Vega",     "Room #12 (Planta Baja)"],
    [1,"13:30","English",          "Vielka Vega",     "Room #12 (Planta Baja)"],
    [1,"14:30","Chemistry",        "Irlanda Tuñon",   "Room #12 (Planta Baja)"],

    [2,"07:30","Physics",          "Aristides Guerra","Room #12 (Planta Baja)"],
    [2,"08:30","Literature",       "Vielka Vega",     "Room #12 (Planta Baja)"],
    [2,"09:45","Math",             "Judith Gil",      "Room #12 (Planta Baja)"],
    [2,"10:45","Chemistry",        "Irlanda Tuñon",   "Room #12 (Planta Baja)"],
    [2,"11:45","Soc.Sciences",     "Vanessa Muñoz",   "Room #12 (Planta Baja)"],
    [2,"13:30","Biology",          "Conrado de Leon", "Room #12 (Planta Baja)"],
    [2,"14:30","Spanish",          "Elida Barria",    "Room #12 (Planta Baja)"],

    [3,"07:30","Physics",          "Aristides Guerra","Room #12 (Planta Baja)"],
    [3,"08:30","Soc.Sciences",     "Vanessa Muñoz",   "Room #12 (Planta Baja)"],
    [3,"09:45","English",          "Vielka Vega",     "Room #12 (Planta Baja)"],
    [3,"10:45","Math",             "Judith Gil",      "Room #12 (Planta Baja)"],
    [3,"11:45","Biology",          "Conrado de Leon", "Room #12 (Planta Baja)"],
    [3,"13:30","Spanish",          "Elida Barria",    "Room #12 (Planta Baja)"],
    [3,"14:30","Literature",       "Vielka Vega",     "Room #12 (Planta Baja)"],

    [4,"07:30","Math",             "Judith Gil",      "Room #12 (Planta Baja)"],
    [4,"08:30","Computing T.",     "Emilio Núñez",    "Computer Lab"],
    [4,"09:45","English",          "Vielka Vega",     "Room #12 (Planta Baja)"],
    [4,"10:45","Spanish",          "Elida Barria",    "Room #12 (Planta Baja)"],
    [4,"11:45","Chemistry",        "Irlanda Tuñon",   "Room #12 (Planta Baja)"],
    [4,"13:30","Biology",          "Conrado de Leon", "Room #12 (Planta Baja)"],
    [4,"14:30","Physics",          "Aristides Guerra","Room #12 (Planta Baja)"],

    [5,"07:30","English",          "Vielka Vega",     "Room #12 (Planta Baja)"],
    [5,"08:30","Biology",          "Conrado de Leon", "Room #12 (Planta Baja)"],
    [5,"09:45","Math",             "Judith Gil",      "Room #12 (Planta Baja)"],
    [5,"10:45","Computing",        "Emilio Núñez",    "Computer Lab"],
    [5,"11:45","Chemistry",        "Irlanda Tuñon",   "Room #12 (Planta Baja)"],
  ],

  // 11A · Andrea Concepción · Room #20 (Planta Alta)
  "11A": [
    [1,"07:30","Homeroom",         "Andrea Concepcion","Room #20 (Planta Alta)"],
    [1,"08:30","Spanish",          "Elida Barria",    "Room #20 (Planta Alta)"],
    [1,"09:45","Math",             "Judith Gil",      "Room #20 (Planta Alta)"],
    [1,"10:45","Computing T.",     "Emilio Núñez",    "Computer Lab"],
    [1,"11:45","Biology",          "Conrado de Leon", "Room #20 (Planta Alta)"],
    [1,"13:30","Physics",          "Aristides Guerra","Room #20 (Planta Alta)"],
    [1,"14:30","Literature",       "Vielka Vega",     "Room #20 (Planta Alta)"],

    [2,"07:30","Spanish",          "Elida Barria",    "Room #20 (Planta Alta)"],
    [2,"08:30","Biology",          "Conrado de Leon", "Room #20 (Planta Alta)"],
    [2,"09:45","Physics",          "Aristides Guerra","Room #20 (Planta Alta)"],
    [2,"10:45","Math",             "Judith Gil",      "Room #20 (Planta Alta)"],
    [2,"11:45","English",          "Vielka Vega",     "Room #20 (Planta Alta)"],
    [2,"13:30","Chemistry",        "Irlanda Tuñon",   "Room #20 (Planta Alta)"],
    [2,"14:30","Computing",        "Emilio Núñez",    "Computer Lab"],

    [3,"07:30","Spanish",          "Elida Barria",    "Room #20 (Planta Alta)"],
    [3,"08:30","Biology",          "Conrado de Leon", "Room #20 (Planta Alta)"],
    [3,"09:45","Math",             "Judith Gil",      "Room #20 (Planta Alta)"],
    [3,"10:45","Physics",          "Aristides Guerra","Room #20 (Planta Alta)"],
    [3,"11:45","English",          "Vielka Vega",     "Room #20 (Planta Alta)"],
    [3,"13:30","Literature",       "Vielka Vega",     "Room #20 (Planta Alta)"],
    [3,"14:30","Chemistry",        "Irlanda Tuñon",   "Room #20 (Planta Alta)"],

    [4,"07:30","Spanish",          "Elida Barria",    "Room #20 (Planta Alta)"],
    [4,"08:30","Soc.Sciences",     "Vanessa Muñoz",   "Room #20 (Planta Alta)"],
    [4,"09:45","Chemistry",        "Irlanda Tuñon",   "Room #20 (Planta Alta)"],
    [4,"10:45","Thinking and Skills","Andrea Concepcion","Room #20 (Planta Alta)"],
    [4,"11:45","English",          "Vielka Vega",     "Room #20 (Planta Alta)"],
    [4,"13:30","Math",             "Judith Gil",      "Room #20 (Planta Alta)"],
    [4,"14:30","Literature",       "Vielka Vega",     "Room #20 (Planta Alta)"],

    [5,"07:30","Biology",          "Conrado de Leon", "Room #20 (Planta Alta)"],
    [5,"08:30","Physics",          "Aristides Guerra","Room #20 (Planta Alta)"],
    [5,"09:45","Chemistry",        "Irlanda Tuñon",   "Room #20 (Planta Alta)"],
    [5,"10:45","Soc.Sciences",     "Vanessa Muñoz",   "Room #20 (Planta Alta)"],
    [5,"11:45","English",          "Vielka Vega",     "Room #20 (Planta Alta)"],
  ],

  // 11B · Ricardo Ferrán · Room #21 (Planta Alta)
  "11B": [
    [1,"07:30","Homeroom",         "Ricardo Ferran",  "Room #21 (Planta Alta)"],
    [1,"08:30","Chemistry",        "Irlanda Tuñon",   "Room #21 (Planta Alta)"],
    [1,"09:45","English",          "Vielka Vega",     "Room #21 (Planta Alta)"],
    [1,"10:45","Math",             "Judith Gil",      "Room #21 (Planta Alta)"],
    [1,"11:45","Spanish",          "Elida Barria",    "Room #21 (Planta Alta)"],
    [1,"13:30","Biology",          "Conrado de Leon", "Room #21 (Planta Alta)"],
    [1,"14:30","Physics",          "Aristides Guerra","Room #21 (Planta Alta)"],

    [2,"07:30","Chemistry",        "Irlanda Tuñon",   "Room #21 (Planta Alta)"],
    [2,"08:30","Physics",          "Aristides Guerra","Room #21 (Planta Alta)"],
    [2,"09:45","Math",             "Judith Gil",      "Room #21 (Planta Alta)"],
    [2,"10:45","English",          "Vielka Vega",     "Room #21 (Planta Alta)"],
    [2,"11:45","Biology",          "Conrado de Leon", "Room #21 (Planta Alta)"],
    [2,"13:30","Literature",       "Vielka Vega",     "Room #21 (Planta Alta)"],
    [2,"14:30","Spanish",          "Elida Barria",    "Room #21 (Planta Alta)"],

    [3,"07:30","Chemistry",        "Irlanda Tuñon",   "Room #21 (Planta Alta)"],
    [3,"08:30","Literature",       "Vielka Vega",     "Room #21 (Planta Alta)"],
    [3,"09:45","Physics",          "Aristides Guerra","Room #21 (Planta Alta)"],
    [3,"10:45","Spanish",          "Elida Barria",    "Room #21 (Planta Alta)"],
    [3,"11:45","Soc.Sciences",     "Vanessa Muñoz",   "Room #21 (Planta Alta)"],
    [3,"13:30","English",          "Vielka Vega",     "Room #21 (Planta Alta)"],
    [3,"14:30","Computing T.",     "Emilio Núñez",    "Computer Lab"],

    [4,"07:30","Computing",        "Emilio Núñez",    "Computer Lab"],
    [4,"08:30","Math",             "Judith Gil",      "Room #21 (Planta Alta)"],
    [4,"09:45","Thinking and Skills","Ricardo Ferran","Room #21 (Planta Alta)"],
    [4,"10:45","Physics",          "Aristides Guerra","Room #21 (Planta Alta)"],
    [4,"11:45","Biology",          "Conrado de Leon", "Room #21 (Planta Alta)"],
    [4,"13:30","English",          "Vielka Vega",     "Room #21 (Planta Alta)"],
    [4,"14:30","Spanish",          "Elida Barria",    "Room #21 (Planta Alta)"],

    [5,"07:30","Literature",       "Vielka Vega",     "Room #21 (Planta Alta)"],
    [5,"08:30","Literature",       "Vielka Vega",     "Room #21 (Planta Alta)"],
    [5,"09:45","Soc.Sciences",     "Vanessa Muñoz",   "Room #21 (Planta Alta)"],
    [5,"10:45","Math",             "Judith Gil",      "Room #21 (Planta Alta)"],
    [5,"11:45","Biology",          "Conrado de Leon", "Room #21 (Planta Alta)"],
  ],

  // 12A · Irlanda Tuñón · Room #22 (Planta Baja)
  "12A": [
    [1,"07:30","Homeroom",         "Irlanda Tuñon",   "Room #22 (Planta Baja)"],
    [1,"08:30","Math",             "Judith Gil",      "Room #22 (Planta Baja)"],
    [1,"09:45","Biology",          "Conrado de Leon", "Room #22 (Planta Baja)"],
    [1,"10:45","Physics",          "Aristides Guerra","Room #22 (Planta Baja)"],
    [1,"11:45","English",          "Vielka Vega",     "Room #22 (Planta Baja)"],
    [1,"13:30","Spanish",          "Elida Barria",    "Room #22 (Planta Baja)"],
    [1,"14:30","Computing",        "Emilio Núñez",    "Computer Lab"],

    [2,"07:30","Math",             "Judith Gil",      "Room #22 (Planta Baja)"],
    [2,"08:30","Chemistry",        "Irlanda Tuñon",   "Room #22 (Planta Baja)"],
    [2,"09:45","Biology",          "Conrado de Leon", "Room #22 (Planta Baja)"],
    [2,"10:45","Physics",          "Aristides Guerra","Room #22 (Planta Baja)"],
    [2,"11:45","Literature",       "Vielka Vega",     "Room #22 (Planta Baja)"],
    [2,"13:30","Spanish",          "Elida Barria",    "Room #22 (Planta Baja)"],
    [2,"14:30","English",          "Vielka Vega",     "Room #22 (Planta Baja)"],

    [3,"07:30","Math",             "Judith Gil",      "Room #22 (Planta Baja)"],
    [3,"08:30","Chemistry",        "Irlanda Tuñon",   "Room #22 (Planta Baja)"],
    [3,"09:45","Soc.Sciences",     "Vanessa Muñoz",   "Room #22 (Planta Baja)"],
    [3,"10:45","Computing T.",     "Emilio Núñez",    "Computer Lab"],
    [3,"11:45","Literature",       "Vielka Vega",     "Room #22 (Planta Baja)"],
    [3,"13:30","Spanish",          "Elida Barria",    "Room #22 (Planta Baja)"],
    [3,"14:30","English",          "Vielka Vega",     "Room #22 (Planta Baja)"],

    [4,"07:30","Math",             "Judith Gil",      "Room #22 (Planta Baja)"],
    [4,"08:30","Chemistry",        "Irlanda Tuñon",   "Room #22 (Planta Baja)"],
    [4,"09:45","Physics",          "Aristides Guerra","Room #22 (Planta Baja)"],
    [4,"10:45","Biology",          "Conrado de Leon", "Room #22 (Planta Baja)"],
    [4,"11:45","Literature",       "Vielka Vega",     "Room #22 (Planta Baja)"],
    [4,"13:30","Spanish",          "Elida Barria",    "Room #22 (Planta Baja)"],
    [4,"14:30","English",          "Vielka Vega",     "Room #22 (Planta Baja)"],

    [5,"07:30","Math",             "Judith Gil",      "Room #22 (Planta Baja)"],
    [5,"08:30","Chemistry",        "Irlanda Tuñon",   "Room #22 (Planta Baja)"],
    [5,"09:45","Biology",          "Conrado de Leon", "Room #22 (Planta Baja)"],
    [5,"10:45","Physics",          "Aristides Guerra","Room #22 (Planta Baja)"],
    [5,"11:45","Soc.Sciences",     "Vanessa Muñoz",   "Room #22 (Planta Baja)"],
  ],
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
          subjectId:   S(subName),
          timeBlockId: TB(day, startTime),
          roomId:      R(roomName),
          status:      "OK",
        },
      });
      count++;
    } catch (e) {
      console.log(`  ERR ${gradeKey} D${day} ${startTime} ${subName}: ${e.message}`);
      errs++;
    }
  }
  console.log(`✓ ${gradeKey}: ${count} inserted, ${errs} errors`);
}

await p.$disconnect();
