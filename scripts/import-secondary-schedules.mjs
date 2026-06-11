/**
 * Imports complete Secondary 2026 student schedules from the reference images.
 * - Adds missing rooms (Room #7 - #19)
 * - Clears all existing SECONDARY assignments
 * - Inserts all 10 grade schedules
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// ─── IDs from DB ────────────────────────────────────────────────
const SUBJECTS = {
  HOMEROOM:       "cmmpgd3o",
  MATH:           "cmm5lil1",
  ENGLISH:        "cmm5lilf",
  SCIENCE:        "cmm5lill",
  SPANISH:        "cmm5lila",
  FRENCH:         "cmm5limp",
  LITERATURE:     "cmm5linh",
  SOC_SCIENCE:    "cmm5limv",
  COMPUTING:      "cmm5lilr",
  MUSIC:          "cmm5lilx",
  PE:             "cmm5lim2",
  ART:            "cmmpg6hc",
  BIOLOGY:        "cmm5lin0",
  CHEMISTRY:      "cmm5lin6",
  PHYSICS:        "cmm5linb",
};

const TEACHERS = {
  OMELY:     "cmm5n4al",  // placeholder, resolved below
  ENIS:      "cmm5n4fw",
  VIELKA:    "cmm5n4es",
  CONRADO:   "cmm5n4e0",
  ELIDA:     "cmm5n4ee",
  ELSI:      "cmm5n4k0",
  VANESSA:   "cmm5n4gx",
  EMILIO:    "cmm5n4d7",
  MARIA:     "cmm5n4f6",
  ARISTIDES: "cmm5n4c1",  // Ricardo Ferran? resolved below
  JUDITH:    "cmm5n4dl",
  FRANCISCO: "cmm5n4i4",
  LEONEL:    "cmm5n4he",
  IRLANDA:   "cmm5n4ax",
  ANDREA_C:  "cmm5n4bm",
  ANDREA_G:  "cmm5n4gj",
  ERIKA:     "cmmpg9dw",
};

// ─── Resolve teacher IDs by name ─────────────────────────────────
const teacherRows = await p.teacher.findMany();
const tByName = Object.fromEntries(teacherRows.map(t => [t.name.toLowerCase(), t.id]));
const T = (name) => {
  const id = tByName[name.toLowerCase()];
  if (!id) throw new Error(`Teacher not found: ${name}`);
  return id;
};

// ─── Resolve subject IDs by name ─────────────────────────────────
const subjectRows = await p.subject.findMany();
const sByName = {};
for (const s of subjectRows) {
  const k = s.name.toLowerCase().replace(/\s+/g,"_");
  if (!sByName[k]) sByName[k] = s.id;
}
const S = (name) => {
  const k = name.toLowerCase().replace(/\s+/g,"_");
  const id = sByName[k];
  if (!id) throw new Error(`Subject not found: ${name} (key: ${k})`);
  return id;
};

// ─── Add missing rooms ────────────────────────────────────────────
const roomNames = [
  "Room #7 (Planta Baja)",
  "Room #8 (Planta Baja)",
  "Room #9 (Planta Baja)",
  "Room #12 (Planta Baja)",
  "Room #13 (Planta Baja)",
  "Room #14 (Planta Baja)",
  "Room #15 (Planta Alta)",
  "Room #16 (Planta Alta)",
  "Room #17 (Planta Alta)",
  "Room #18 (Planta Alta)",
  "Room #19 (Planta Alta)",
];
for (const name of roomNames) {
  const exists = await p.room.findFirst({ where: { name } });
  if (!exists) {
    await p.room.create({ data: { name, capacity: 30 } });
    console.log(`  Room created: ${name}`);
  }
}

// ─── Resolve room IDs ────────────────────────────────────────────
const roomRows = await p.room.findMany();
const rByName = Object.fromEntries(roomRows.map(r => [r.name.toLowerCase(), r.id]));
const R = (name) => {
  const id = rByName[name.toLowerCase()];
  if (!id) throw new Error(`Room not found: ${name}`);
  return id;
};

// ─── TimeBlock IDs (CLASS slots) day→slot→id ─────────────────────
// Slots: 1=07:30, 2=08:30, 3=09:45, 4=10:45, 5=11:45, 6=13:15, 7=14:15
const TB = {
  "1_1": "cmm5nddc5000nkx32qkcoosjx", "1_2": "cmm5nddhv000okx3231uzka2c",
  "1_3": "cmm5nddnj000pkx32jpew500f", "1_4": "cmm5nddt8000qkx32zw03kmka",
  "1_5": "cmm5nddyx000rkx32qgytyze2", "1_6": "cmm5nde4n000skx32dy35aah8",
  "1_7": "cmm5ndea9000tkx3284thbhaz",
  "2_1": "cmm5ndfph0012kx32e81wh4md", "2_2": "cmm5ndfv50013kx32i73ddnyt",
  "2_3": "cmm5ndg0u0014kx32grei26h1", "2_4": "cmm5ndg6j0015kx32155ldc9o",
  "2_5": "cmm5ndgc80016kx322pcgac45", "2_6": "cmm5ndghy0017kx32tvhghnjh",
  "2_7": "cmm5ndgnl0018kx324encf3c3",
  "3_1": "cmm5ndi2t001hkx328epg4639", "3_2": "cmm5ndi8i001ikx3239x92gy3",
  "3_3": "cmm5ndie9001jkx3232gz84ig", "3_4": "cmm5ndijx001kkx32n4opjnj2",
  "3_5": "cmm5ndipk001lkx32cz3yvkjg", "3_6": "cmm5ndiv9001mkx3277ybnpmt",
  "3_7": "cmm5ndj0y001nkx32iojtz6f9",
  "4_1": "cmm5ndkg5001wkx32x0ofn96v", "4_2": "cmm5ndkoh001xkx32e510zcyl",
  "4_3": "cmm5ndktu001ykx327tnbn2f1", "4_4": "cmm5ndl02001zkx32z80af4d8",
  "4_5": "cmm5ndl5r0020kx32f4t3pgga", "4_6": "cmm5ndlbg0021kx32eziwhtxs",
  "4_7": "cmm5ndlhw0022kx32wv4k0g1y",
  "5_1": "cmm5ndn22002bkx3254m571hr", "5_2": "cmm5ndn80002ckx328k2q9nh4",
  "5_3": "cmm5ndnde002dkx32t72putj5", "5_4": "cmm5ndnj3002ekx3212ac3jdg",
  "5_5": "cmm5ndnos002fkx32dnj5mvro", "5_6": "cmm5ndnu0002gkx32fcf1zhi4",
  "5_7": "cmm5ndo05002hkx3296yjdxco",
};

// ─── Grade IDs ───────────────────────────────────────────────────
const gradeRows = await p.grade.findMany();
const gByNameSec = Object.fromEntries(
  gradeRows.filter(g => g.level === "SECONDARY")
    .map(g => [`${g.name}${g.section ?? ""}`, g.id])
);

// ─── Schedule data from reference images ─────────────────────────
// Format: [day, slot, subject, teacher, room]
// Slot 1=07:30 2=08:30 3=09:45 4=10:45 5=11:45 6=13:15 7=14:15

const SCHEDULES = {

  "6A": {
    room: "Room #7 (Planta Baja)",
    teacher_homeroom: "Omely Rujano",
    data: [
      [1,1,"Homeroom",   "Omely Rujano",   "Room #7 (Planta Baja)"],
      [1,2,"Math",       "Omely Rujano",   "Room #7 (Planta Baja)"],
      [1,3,"English",    "Vielka Vega",    "Room #7 (Planta Baja)"],
      [1,4,"Social Science","Vanessa Muñoz","Room #7 (Planta Baja)"],
      [1,5,"Music",      "Leonel Vega",    "Room #7 (Planta Baja)"],
      [1,6,"Science",    "Conrado de Leon","Room #7 (Planta Baja)"],
      [1,7,"Spanish",    "Elida Barria",   "Room #7 (Planta Baja)"],
      [2,1,"Science",    "Conrado de Leon","Room #7 (Planta Baja)"],
      [2,2,"Art",        "Andrea Guerra",  "Room #7 (Planta Baja)"],
      [2,3,"Math",       "Omely Rujano",   "Room #7 (Planta Baja)"],
      [2,4,"Literature", "Vielka Vega",    "Room #7 (Planta Baja)"],
      [2,5,"English",    "Vielka Vega",    "Room #7 (Planta Baja)"],
      [2,6,"Spanish",    "Elida Barria",   "Room #7 (Planta Baja)"],
      [2,7,"Soc. Sciences","Vanessa Muñoz","Room #7 (Planta Baja)"],
      [3,1,"Literature", "Vielka Vega",    "Room #7 (Planta Baja)"],
      [3,2,"Spanish",    "Elida Barria",   "Room #7 (Planta Baja)"],
      [3,3,"Math",       "Omely Rujano",   "Room #7 (Planta Baja)"],
      [3,4,"Soc. Sciences","Vanessa Muñoz","Room #7 (Planta Baja)"],
      [3,5,"English",    "Vielka Vega",    "Room #7 (Planta Baja)"],
      [3,6,"English",    "Vielka Vega",    "Room #7 (Planta Baja)"],
      [3,7,"Science",    "Conrado de Leon","Room #7 (Planta Baja)"],
      [4,1,"Math",       "Omely Rujano",   "Room #7 (Planta Baja)"],
      [4,2,"French",     "Elsi Diaz",      "Room #7 (Planta Baja)"],
      [4,3,"Computing",  "Emilio Núñez",   "Computer Lab"],
      [4,4,"English",    "Vielka Vega",    "Room #7 (Planta Baja)"],
      [4,5,"Literature", "Vielka Vega",    "Room #7 (Planta Baja)"],
      [4,6,"Spanish",    "Elida Barria",   "Room #7 (Planta Baja)"],
      [4,7,"Science",    "Conrado de Leon","Room #7 (Planta Baja)"],
      [5,1,"Science",    "Conrado de Leon","Room #7 (Planta Baja)"],
      [5,2,"P.E.",       "Francisco Mendoza","Gymnasium"],
      [5,3,"Math",       "Omely Rujano",   "Room #7 (Planta Baja)"],
      [5,4,"Spanish",    "Elida Barria",   "Room #7 (Planta Baja)"],
      [5,5,"English",    "Vielka Vega",    "Room #7 (Planta Baja)"],
      // Friday has no slot 6,7 (early departure)
    ],
  },

  "6B": {
    room: "Room #8 (Planta Baja)",
    teacher_homeroom: "Enis Rodriguez",
    data: [
      [1,1,"Homeroom",   "Enis Rodriguez", "Room #8 (Planta Baja)"],
      [1,2,"Soc. Sciences","Vanessa Muñoz","Room #8 (Planta Baja)"],
      [1,3,"Science",    "Conrado de Leon","Room #8 (Planta Baja)"],
      [1,4,"Spanish",    "Elida Barria",   "Room #8 (Planta Baja)"],
      [1,5,"Math",       "Enis Rodriguez", "Room #8 (Planta Baja)"],
      [1,6,"English",    "Vielka Vega",    "Room #8 (Planta Baja)"],
      [1,7,"P.E.",       "Francisco Mendoza","Gymnasium"],
      [2,1,"Soc. Sciences","Vanessa Muñoz","Room #8 (Planta Baja)"],
      [2,2,"Science",    "Conrado de Leon","Room #8 (Planta Baja)"],
      [2,3,"Spanish",    "Elida Barria",   "Room #8 (Planta Baja)"],
      [2,4,"Math",       "Enis Rodriguez", "Room #8 (Planta Baja)"],
      [2,5,"Literature", "Vielka Vega",    "Room #8 (Planta Baja)"],
      [2,6,"English",    "Vielka Vega",    "Room #8 (Planta Baja)"],
      [2,7,"Art",        "Andrea Guerra",  "Room #8 (Planta Baja)"],
      [3,1,"Spanish",    "Elida Barria",   "Room #8 (Planta Baja)"],
      [3,2,"English",    "Vielka Vega",    "Room #8 (Planta Baja)"],
      [3,3,"Computing",  "Emilio Núñez",   "Computer Lab"],
      [3,4,"Soc. Sciences","Vanessa Muñoz","Room #8 (Planta Baja)"],
      [3,5,"Math",       "Enis Rodriguez", "Room #8 (Planta Baja)"],
      [3,6,"Science",    "Conrado de Leon","Room #8 (Planta Baja)"],
      [3,7,"Literature", "Vielka Vega",    "Room #8 (Planta Baja)"],
      [4,1,"Soc. Sciences","Vanessa Muñoz","Room #8 (Planta Baja)"],
      [4,2,"English",    "Vielka Vega",    "Room #8 (Planta Baja)"],
      [4,3,"Science",    "Conrado de Leon","Room #8 (Planta Baja)"],
      [4,4,"Spanish",    "Elida Barria",   "Room #8 (Planta Baja)"],
      [4,5,"Music",      "Leonel Vega",    "Room #8 (Planta Baja)"],
      [4,6,"Math",       "Enis Rodriguez", "Room #8 (Planta Baja)"],
      [4,7,"French",     "Elsi Diaz",      "Room #8 (Planta Baja)"],
      [5,1,"Math",       "Enis Rodriguez", "Room #8 (Planta Baja)"],
      [5,2,"English",    "Vielka Vega",    "Room #8 (Planta Baja)"],
      [5,3,"Spanish",    "Elida Barria",   "Room #8 (Planta Baja)"],
      [5,4,"Science",    "Conrado de Leon","Room #8 (Planta Baja)"],
      [5,5,"Literature", "Vielka Vega",    "Room #8 (Planta Baja)"],
    ],
  },

  "7A": {
    room: "Room #15 (Planta Alta)",
    teacher_homeroom: "Vielka Vega",
    data: [
      [1,1,"Homeroom",   "Vielka Vega",    "Room #15 (Planta Alta)"],
      [1,2,"English",    "Vielka Vega",    "Room #15 (Planta Alta)"],
      [1,3,"Literature", "Vielka Vega",    "Room #15 (Planta Alta)"],
      [1,4,"Math",       "Enis Rodriguez", "Room #15 (Planta Alta)"],
      [1,5,"Spanish",    "Elida Barria",   "Room #15 (Planta Alta)"],
      [1,6,"Soc. Sciences","Vanessa Muñoz","Room #15 (Planta Alta)"],
      [1,7,"Science",    "Conrado de Leon","Room #15 (Planta Alta)"],
      [2,1,"English",    "Vielka Vega",    "Room #15 (Planta Alta)"],
      [2,2,"Math",       "Enis Rodriguez", "Room #15 (Planta Alta)"],
      [2,3,"Art",        "Andrea Guerra",  "Room #15 (Planta Alta)"],
      [2,4,"Science",    "Conrado de Leon","Room #15 (Planta Alta)"],
      [2,5,"Spanish",    "Elida Barria",   "Room #15 (Planta Alta)"],
      [2,6,"Music",      "Leonel Vega",    "Room #15 (Planta Alta)"],
      [2,7,"Soc. Sciences","Vanessa Muñoz","Room #15 (Planta Alta)"],
      [3,1,"Science",    "Conrado de Leon","Room #15 (Planta Alta)"],
      [3,2,"Spanish",    "Elida Barria",   "Room #15 (Planta Alta)"],
      [3,3,"French",     "Elsi Diaz",      "Room #15 (Planta Alta)"],
      [3,4,"Math",       "Enis Rodriguez", "Room #15 (Planta Alta)"],
      [3,5,"Literature", "Vielka Vega",    "Room #15 (Planta Alta)"],
      [3,6,"Soc. Sciences","Vanessa Muñoz","Room #15 (Planta Alta)"],
      [3,7,"English",    "Vielka Vega",    "Room #15 (Planta Alta)"],
      [4,1,"English",    "Vielka Vega",    "Room #15 (Planta Alta)"],
      [4,2,"Literature", "Vielka Vega",    "Room #15 (Planta Alta)"],
      [4,3,"French",     "Elsi Diaz",      "Room #15 (Planta Alta)"],
      [4,4,"Soc. Sciences","Vanessa Muñoz","Room #15 (Planta Alta)"],
      [4,5,"Math",       "Enis Rodriguez", "Room #15 (Planta Alta)"],
      [4,6,"Spanish",    "Elida Barria",   "Room #15 (Planta Alta)"],
      [4,7,"Science",    "Conrado de Leon","Room #15 (Planta Alta)"],
      [5,1,"Computing",  "Emilio Núñez",   "Computer Lab"],
      [5,2,"Math",       "Enis Rodriguez", "Room #15 (Planta Alta)"],
      [5,3,"Spanish",    "Elida Barria",   "Room #15 (Planta Alta)"],
      [5,4,"English",    "Vielka Vega",    "Room #15 (Planta Alta)"],
      [5,5,"Science",    "Conrado de Leon","Room #15 (Planta Alta)"],
    ],
  },

  "7B": {
    room: "Room #16 (Planta Alta)",
    teacher_homeroom: "Maria Pitti",
    data: [
      [1,1,"Homeroom",   "Maria Pitti",    "Room #16 (Planta Alta)"],
      [1,2,"Soc. Sciences","Vanessa Muñoz","Room #16 (Planta Alta)"],
      [1,3,"Math",       "Maria Pitti",    "Room #16 (Planta Alta)"],
      [1,4,"Literature", "Vielka Vega",    "Room #16 (Planta Alta)"],
      [1,5,"Science",    "Conrado de Leon","Room #16 (Planta Alta)"],
      [1,6,"Spanish",    "Elida Barria",   "Room #16 (Planta Alta)"],
      [1,7,"English",    "Vielka Vega",    "Room #16 (Planta Alta)"],
      [2,1,"Math",       "Maria Pitti",    "Room #16 (Planta Alta)"],
      [2,2,"Literature", "Vielka Vega",    "Room #16 (Planta Alta)"],
      [2,3,"Science",    "Conrado de Leon","Room #16 (Planta Alta)"],
      [2,4,"Art",        "Andrea Guerra",  "Room #16 (Planta Alta)"],
      [2,5,"Music",      "Leonel Vega",    "Room #16 (Planta Alta)"],
      [2,6,"Spanish",    "Elida Barria",   "Room #16 (Planta Alta)"],
      [2,7,"English",    "Vielka Vega",    "Room #16 (Planta Alta)"],
      [3,1,"Math",       "Maria Pitti",    "Room #16 (Planta Alta)"],
      [3,2,"Literature", "Vielka Vega",    "Room #16 (Planta Alta)"],
      [3,3,"Science",    "Conrado de Leon","Room #16 (Planta Alta)"],
      [3,4,"Soc. Sciences","Vanessa Muñoz","Room #16 (Planta Alta)"],
      [3,5,"Spanish",    "Elida Barria",   "Room #16 (Planta Alta)"],
      [3,6,"English",    "Vielka Vega",    "Room #16 (Planta Alta)"],
      [3,7,"French",     "Elsi Diaz",      "Room #16 (Planta Alta)"],
      [4,1,"Soc. Sciences","Vanessa Muñoz","Room #16 (Planta Alta)"],
      [4,2,"Spanish",    "Elida Barria",   "Room #16 (Planta Alta)"],
      [4,3,"Science",    "Conrado de Leon","Room #16 (Planta Alta)"],
      [4,4,"Math",       "Maria Pitti",    "Room #16 (Planta Alta)"],
      [4,5,"Math",       "Maria Pitti",    "Room #16 (Planta Alta)"],
      [4,6,"Math",       "Maria Pitti",    "Room #16 (Planta Alta)"],
      [4,7,"P.E.",       "Francisco Mendoza","Gymnasium"],
      [5,1,"Science",    "Conrado de Leon","Room #16 (Planta Alta)"],
      [5,2,"Spanish",    "Elida Barria",   "Room #16 (Planta Alta)"],
      [5,3,"Science",    "Conrado de Leon","Room #16 (Planta Alta)"],
      [5,4,"Math",       "Maria Pitti",    "Room #16 (Planta Alta)"],
      [5,5,"Computing",  "Emilio Núñez",   "Computer Lab"],
    ],
  },

  "8A": {
    room: "Room #18 (Planta Alta)",
    teacher_homeroom: "Conrado De León",
    data: [
      [1,1,"Homeroom",   "Conrado de Leon","Room #18 (Planta Alta)"],
      [1,2,"Spanish",    "Elida Barria",   "Room #18 (Planta Alta)"],
      [1,3,"Soc.Science","Vanessa Muñoz",  "Room #18 (Planta Alta)"],
      [1,4,"Science",    "Conrado de Leon","Room #18 (Planta Alta)"],
      [1,5,"Math",       "Maria Pitti",    "Room #18 (Planta Alta)"],
      [1,6,"Music",      "Leonel Vega",    "Room #18 (Planta Alta)"],
      [1,7,"English",    "Vielka Vega",    "Room #18 (Planta Alta)"],
      [2,1,"Soc. Sciences","Vanessa Muñoz","Room #18 (Planta Alta)"],
      [2,2,"Science",    "Conrado de Leon","Room #18 (Planta Alta)"],
      [2,3,"Spanish",    "Elida Barria",   "Room #18 (Planta Alta)"],
      [2,4,"Literature", "Vielka Vega",    "Room #18 (Planta Alta)"],
      [2,5,"Art",        "Andrea Guerra",  "Room #18 (Planta Alta)"],
      [2,6,"Math",       "Maria Pitti",    "Room #18 (Planta Alta)"],
      [2,7,"English",    "Vielka Vega",    "Room #18 (Planta Alta)"],
      [3,1,"Math",       "Maria Pitti",    "Room #18 (Planta Alta)"],
      [3,2,"Science",    "Conrado de Leon","Room #18 (Planta Alta)"],
      [3,3,"Literature", "Vielka Vega",    "Room #18 (Planta Alta)"],
      [3,4,"Spanish",    "Elida Barria",   "Room #18 (Planta Alta)"],
      [3,5,"French",     "Elsi Diaz",      "Room #18 (Planta Alta)"],
      [3,6,"English",    "Vielka Vega",    "Room #18 (Planta Alta)"],
      [3,7,"P.E.",       "Francisco Mendoza","Gymnasium"],
      [4,1,"Science",    "Conrado de Leon","Room #18 (Planta Alta)"],
      [4,2,"Math",       "Maria Pitti",    "Room #18 (Planta Alta)"],
      [4,3,"Soc.Science","Vanessa Muñoz",  "Room #18 (Planta Alta)"],
      [4,4,"English",    "Vielka Vega",    "Room #18 (Planta Alta)"],
      [4,5,"Spanish",    "Elida Barria",   "Room #18 (Planta Alta)"],
      [4,6,"French",     "Elsi Diaz",      "Room #18 (Planta Alta)"],
      [4,7,"Computing",  "Emilio Núñez",   "Computer Lab"],
      [5,1,"Spanish",    "Elida Barria",   "Room #18 (Planta Alta)"],
      [5,2,"Science",    "Conrado de Leon","Room #18 (Planta Alta)"],
      [5,3,"English",    "Vielka Vega",    "Room #18 (Planta Alta)"],
      [5,4,"Math",       "Maria Pitti",    "Room #18 (Planta Alta)"],
      [5,5,"Literature", "Vielka Vega",    "Room #18 (Planta Alta)"],
    ],
  },

  "8B": {
    room: "Room #19 (Planta Alta)",
    teacher_homeroom: "Elida Barria",
    data: [
      [1,1,"Homeroom",   "Elida Barria",   "Room #19 (Planta Alta)"],
      [1,2,"Science",    "Conrado de Leon","Room #19 (Planta Alta)"],
      [1,3,"Math",       "Maria Pitti",    "Room #19 (Planta Alta)"],
      [1,4,"Music",      "Leonel Vega",    "Room #19 (Planta Alta)"],
      [1,5,"English",    "Vielka Vega",    "Room #19 (Planta Alta)"],
      [1,6,"Literature", "Vielka Vega",    "Room #19 (Planta Alta)"],
      [1,7,"Spanish",    "Elida Barria",   "Room #19 (Planta Alta)"],
      [2,1,"Literature", "Vielka Vega",    "Room #19 (Planta Alta)"],
      [2,2,"Spanish",    "Elida Barria",   "Room #19 (Planta Alta)"],
      [2,3,"Soc. Sciences","Vanessa Muñoz","Room #19 (Planta Alta)"],
      [2,4,"Science",    "Conrado de Leon","Room #19 (Planta Alta)"],
      [2,5,"Science",    "Conrado de Leon","Room #19 (Planta Alta)"],
      [2,6,"Art",        "Andrea Guerra",  "Room #19 (Planta Alta)"],
      [2,7,"Math",       "Maria Pitti",    "Room #19 (Planta Alta)"],
      [3,1,"Soc. Sciences","Vanessa Muñoz","Room #19 (Planta Alta)"],
      [3,2,"French",     "Elsi Diaz",      "Room #19 (Planta Alta)"],
      [3,3,"Spanish",    "Elida Barria",   "Room #19 (Planta Alta)"],
      [3,4,"English",    "Vielka Vega",    "Room #19 (Planta Alta)"],
      [3,5,"Science",    "Conrado de Leon","Room #19 (Planta Alta)"],
      [3,6,"Math",       "Maria Pitti",    "Room #19 (Planta Alta)"],
      [3,7,"P.E.",       "Francisco Mendoza","Gymnasium"],
      [4,1,"Literature", "Vielka Vega",    "Room #19 (Planta Alta)"],
      [4,2,"Science",    "Conrado de Leon","Room #19 (Planta Alta)"],
      [4,3,"Math",       "Maria Pitti",    "Room #19 (Planta Alta)"],
      [4,4,"French",     "Elsi Diaz",      "Room #19 (Planta Alta)"],
      [4,5,"Spanish",    "Elida Barria",   "Room #19 (Planta Alta)"],
      [4,6,"Soc. Sciences","Vanessa Muñoz","Room #19 (Planta Alta)"],
      [4,7,"Soc. Sciences","Vanessa Muñoz","Room #19 (Planta Alta)"],
      [5,1,"Science",    "Conrado de Leon","Room #19 (Planta Alta)"],
      [5,2,"Math",       "Maria Pitti",    "Room #19 (Planta Alta)"],
      [5,3,"Computing",  "Emilio Núñez",   "Computer Lab"],
      [5,4,"English",    "Vielka Vega",    "Room #19 (Planta Alta)"],
      [5,5,"Spanish",    "Elida Barria",   "Room #19 (Planta Alta)"],
    ],
  },

  "9A": {
    room: "Room #13 (Planta baja)",
    teacher_homeroom: "Emilio Nuñez",
    data: [
      [1,1,"Homeroom",   "Emilio Núñez",   "Room #13 (Planta Baja)"],
      [1,2,"Literature", "Vielka Vega",    "Room #13 (Planta Baja)"],
      [1,3,"English",    "Vielka Vega",    "Room #13 (Planta Baja)"],
      [1,4,"Spanish",    "Elida Barria",   "Room #13 (Planta Baja)"],
      [1,5,"Math",       "Maria Pitti",    "Room #13 (Planta Baja)"],
      [1,6,"Chemistry",  "Irlanda Tuñon",  "Room #13 (Planta Baja)"],
      [1,7,"Biology",    "Conrado de Leon","Room #13 (Planta Baja)"],
      [2,1,"Literature", "Vielka Vega",    "Room #13 (Planta Baja)"],
      [2,2,"English",    "Vielka Vega",    "Room #13 (Planta Baja)"],
      [2,3,"Soc. Sciences","Vanessa Muñoz","Room #13 (Planta Baja)"],
      [2,4,"Biology",    "Conrado de Leon","Room #13 (Planta Baja)"],
      [2,5,"Spanish",    "Elida Barria",   "Room #13 (Planta Baja)"],
      [2,6,"Math",       "Maria Pitti",    "Room #13 (Planta Baja)"],
      [2,7,"Physics",    "Aristides Guerra","Room #13 (Planta Baja)"],
      [3,1,"Computing",  "Emilio Núñez",   "Computer Lab"],
      [3,2,"English",    "Vielka Vega",    "Room #13 (Planta Baja)"],
      [3,3,"Chemistry",  "Irlanda Tuñon",  "Room #13 (Planta Baja)"],
      [3,4,"Biology",    "Conrado de Leon","Room #13 (Planta Baja)"],
      [3,5,"Math",       "Maria Pitti",    "Room #13 (Planta Baja)"],
      [3,6,"Physics",    "Aristides Guerra","Room #13 (Planta Baja)"],
      [3,7,"Spanish",    "Elida Barria",   "Room #13 (Planta Baja)"],
      [4,1,"English",    "Vielka Vega",    "Room #13 (Planta Baja)"],
      [4,2,"Physics",    "Aristides Guerra","Room #13 (Planta Baja)"],
      [4,3,"Literature", "Vielka Vega",    "Room #13 (Planta Baja)"],
      [4,4,"Biology",    "Conrado de Leon","Room #13 (Planta Baja)"],
      [4,5,"Soc. Sciences","Vanessa Muñoz","Room #13 (Planta Baja)"],
      [4,6,"Computing",  "Emilio Núñez",   "Computer Lab"],
      [4,7,"Math",       "Maria Pitti",    "Room #13 (Planta Baja)"],
      [5,1,"English",    "Vielka Vega",    "Room #13 (Planta Baja)"],
      [5,2,"Math",       "Maria Pitti",    "Room #13 (Planta Baja)"],
      [5,3,"Spanish",    "Elida Barria",   "Room #13 (Planta Baja)"],
      [5,4,"Chemistry",  "Irlanda Tuñon",  "Room #13 (Planta Baja)"],
      [5,5,"P.E.",       "Francisco Mendoza","Gymnasium"],
    ],
  },

  "9B": {
    room: "Room #14 (Planta baja)",
    teacher_homeroom: "Judith Gil",
    data: [
      [1,1,"Homeroom",   "Judith Gil",     "Room #14 (Planta Baja)"],
      [1,2,"English",    "Vielka Vega",    "Room #14 (Planta Baja)"],
      [1,3,"Chemistry",  "Irlanda Tuñon",  "Room #14 (Planta Baja)"],
      [1,4,"Biology",    "Conrado de Leon","Room #14 (Planta Baja)"],
      [1,5,"Physics",    "Aristides Guerra","Room #14 (Planta Baja)"],
      [1,6,"Literature", "Vielka Vega",    "Room #14 (Planta Baja)"],
      [1,7,"Math",       "Judith Gil",     "Room #14 (Planta Baja)"],
      [2,1,"English",    "Vielka Vega",    "Room #14 (Planta Baja)"],
      [2,2,"Computing",  "Emilio Núñez",   "Computer Lab"],
      [2,3,"Chemistry",  "Irlanda Tuñon",  "Room #14 (Planta Baja)"],
      [2,4,"Spanish",    "Elida Barria",   "Room #14 (Planta Baja)"],
      [2,5,"Math",       "Judith Gil",     "Room #14 (Planta Baja)"],
      [2,6,"Soc. Sciences","Vanessa Muñoz","Room #14 (Planta Baja)"],
      [2,7,"Biology",    "Conrado de Leon","Room #14 (Planta Baja)"],
      [3,1,"English",    "Vielka Vega",    "Room #14 (Planta Baja)"],
      [3,2,"Spanish",    "Elida Barria",   "Room #14 (Planta Baja)"],
      [3,3,"Biology",    "Conrado de Leon","Room #14 (Planta Baja)"],
      [3,4,"Literature", "Vielka Vega",    "Room #14 (Planta Baja)"],
      [3,5,"Computing",  "Emilio Núñez",   "Computer Lab"],
      [3,6,"Math",       "Judith Gil",     "Room #14 (Planta Baja)"],
      [3,7,"Physics",    "Aristides Guerra","Room #14 (Planta Baja)"],
      [4,1,"Physics",    "Aristides Guerra","Room #14 (Planta Baja)"],
      [4,2,"Spanish",    "Elida Barria",   "Room #14 (Planta Baja)"],
      [4,3,"Biology",    "Conrado de Leon","Room #14 (Planta Baja)"],
      [4,4,"Chemistry",  "Irlanda Tuñon",  "Room #14 (Planta Baja)"],
      [4,5,"Math",       "Judith Gil",     "Room #14 (Planta Baja)"],
      [4,6,"Math",       "Judith Gil",     "Room #14 (Planta Baja)"],
      [4,7,"Literature", "Vielka Vega",    "Room #14 (Planta Baja)"],
      [5,1,"Soc. Sciences","Vanessa Muñoz","Room #14 (Planta Baja)"],
      [5,2,"English",    "Vielka Vega",    "Room #14 (Planta Baja)"],
      [5,3,"Math",       "Judith Gil",     "Room #14 (Planta Baja)"],
      [5,4,"Spanish",    "Elida Barria",   "Room #14 (Planta Baja)"],
      [5,5,"P.E.",       "Francisco Mendoza","Gymnasium"],
    ],
  },

  "10A": {
    room: "Room #9 (Planta Baja)",
    teacher_homeroom: "Vanessa Muñoz",
    data: [
      [1,1,"Homeroom",   "Vanessa Muñoz",  "Room #9 (Planta Baja)"],
      [1,2,"Biology",    "Conrado de Leon","Room #9 (Planta Baja)"],
      [1,3,"Literature", "Vielka Vega",    "Room #9 (Planta Baja)"],
      [1,4,"Soc. Sciences","Vanessa Muñoz","Room #9 (Planta Baja)"],
      [1,5,"Chemistry",  "Irlanda Tuñon",  "Room #9 (Planta Baja)"],
      [1,6,"Math",       "Judith Gil",     "Room #9 (Planta Baja)"],
      [1,7,"English",    "Vielka Vega",    "Room #9 (Planta Baja)"],
      [2,1,"Biology",    "Conrado de Leon","Room #9 (Planta Baja)"],
      [2,2,"Math",       "Judith Gil",     "Room #9 (Planta Baja)"],
      [2,3,"English",    "Vielka Vega",    "Room #9 (Planta Baja)"],
      [2,4,"Spanish",    "Elida Barria",   "Room #9 (Planta Baja)"],
      [2,5,"Chemistry",  "Irlanda Tuñon",  "Room #9 (Planta Baja)"],
      [2,6,"Physics",    "Aristides Guerra","Room #9 (Planta Baja)"],
      [2,7,"Literature", "Vielka Vega",    "Room #9 (Planta Baja)"],
      [3,1,"Biology",    "Conrado de Leon","Room #9 (Planta Baja)"],
      [3,2,"Physics",    "Aristides Guerra","Room #9 (Planta Baja)"],
      [3,3,"Math",       "Judith Gil",     "Room #9 (Planta Baja)"],
      [3,4,"English",    "Vielka Vega",    "Room #9 (Planta Baja)"],
      [3,5,"Chemistry",  "Irlanda Tuñon",  "Room #9 (Planta Baja)"],
      [3,6,"Computing",  "Emilio Núñez",   "Computer Lab"],
      [3,7,"Spanish",    "Elida Barria",   "Room #9 (Planta Baja)"],
      [4,1,"Biology",    "Conrado de Leon","Room #9 (Planta Baja)"],
      [4,2,"Literature", "Vielka Vega",    "Room #9 (Planta Baja)"],
      [4,3,"Spanish",    "Elida Barria",   "Room #9 (Planta Baja)"],
      [4,4,"Math",       "Judith Gil",     "Room #9 (Planta Baja)"],
      [4,5,"Computing",  "Emilio Núñez",   "Computer Lab"],
      [4,6,"Physics",    "Aristides Guerra","Room #9 (Planta Baja)"],
      [4,7,"Soc. Sciences","Vanessa Muñoz","Room #9 (Planta Baja)"],
      [5,1,"Math",       "Judith Gil",     "Room #9 (Planta Baja)"],
      [5,2,"Soc. Sciences","Vanessa Muñoz","Room #9 (Planta Baja)"],
      [5,3,"English",    "Vielka Vega",    "Room #9 (Planta Baja)"],
      [5,4,"Spanish",    "Elida Barria",   "Room #9 (Planta Baja)"],
      [5,5,"Physics",    "Aristides Guerra","Room #9 (Planta Baja)"],
    ],
  },

  "10B": {
    room: "Room #12 (Planta Baja)",
    teacher_homeroom: "Aristides Guerra",
    data: [
      [1,1,"Homeroom",   "Aristides Guerra","Room #12 (Planta Baja)"],
      [1,2,"Physics",    "Aristides Guerra","Room #12 (Planta Baja)"],
      [1,3,"Spanish",    "Elida Barria",   "Room #12 (Planta Baja)"],
      [1,4,"Math",       "Judith Gil",     "Room #12 (Planta Baja)"],
      [1,5,"Literature", "Vielka Vega",    "Room #12 (Planta Baja)"],
      [1,6,"English",    "Vielka Vega",    "Room #12 (Planta Baja)"],
      [1,7,"Chemistry",  "Irlanda Tuñon",  "Room #12 (Planta Baja)"],
      [2,1,"Physics",    "Aristides Guerra","Room #12 (Planta Baja)"],
      [2,2,"Literature", "Vielka Vega",    "Room #12 (Planta Baja)"],
      [2,3,"Math",       "Judith Gil",     "Room #12 (Planta Baja)"],
      [2,4,"Chemistry",  "Irlanda Tuñon",  "Room #12 (Planta Baja)"],
      [2,5,"Soc. Sciences","Vanessa Muñoz","Room #12 (Planta Baja)"],
      [2,6,"Biology",    "Conrado de Leon","Room #12 (Planta Baja)"],
      [2,7,"Spanish",    "Elida Barria",   "Room #12 (Planta Baja)"],
      [3,1,"Physics",    "Aristides Guerra","Room #12 (Planta Baja)"],
      [3,2,"Soc. Sciences","Vanessa Muñoz","Room #12 (Planta Baja)"],
      [3,3,"English",    "Vielka Vega",    "Room #12 (Planta Baja)"],
      [3,4,"Math",       "Judith Gil",     "Room #12 (Planta Baja)"],
      [3,5,"Biology",    "Conrado de Leon","Room #12 (Planta Baja)"],
      [3,6,"Spanish",    "Elida Barria",   "Room #12 (Planta Baja)"],
      [3,7,"Chemistry",  "Irlanda Tuñon",  "Room #12 (Planta Baja)"],
      [4,1,"Math",       "Judith Gil",     "Room #12 (Planta Baja)"],
      [4,2,"Computing",  "Emilio Núñez",   "Computer Lab"],
      [4,3,"Math",       "Judith Gil",     "Room #12 (Planta Baja)"],
      [4,4,"Spanish",    "Elida Barria",   "Room #12 (Planta Baja)"],
      [4,5,"Chemistry",  "Irlanda Tuñon",  "Room #12 (Planta Baja)"],
      [4,6,"Biology",    "Conrado de Leon","Room #12 (Planta Baja)"],
      [4,7,"Physics",    "Aristides Guerra","Room #12 (Planta Baja)"],
      [5,1,"English",    "Vielka Vega",    "Room #12 (Planta Baja)"],
      [5,2,"Biology",    "Conrado de Leon","Room #12 (Planta Baja)"],
      [5,3,"Math",       "Judith Gil",     "Room #12 (Planta Baja)"],
      [5,4,"Computing",  "Emilio Núñez",   "Computer Lab"],
      [5,5,"Chemistry",  "Irlanda Tuñon",  "Room #12 (Planta Baja)"],
    ],
  },
};

// ─── Alias map: schedule names → existing subject names in DB ────
const SUBJECT_ALIAS = {
  "soc._sciences": "social_science",
  "soc.science":   "social_science",
  "soc._science":  "social_science",
  "homeroom":      "homeroom",
  "p.e.":          "p.e.",
  "pe":            "p.e.",
  "computing":     "computing",
  "literature":    "literature",
  "biology":       "biology",
  "chemistry":     "chemistry",
  "physics":       "physics",
  "music":         "music",
  "art":           "art",
  "french":        "french",
  "spanish":       "spanish",
  "english":       "english",
  "math":          "math",
  "science":       "science",
};
// Apply aliases to sByName so S() resolves variant names
for (const [alias, target] of Object.entries(SUBJECT_ALIAS)) {
  if (!sByName[alias] && sByName[target]) sByName[alias] = sByName[target];
}

// refresh room map after creation
const roomRows2 = await p.room.findMany();
for (const r of roomRows2) rByName[r.name.toLowerCase()] = r.id;

// ─── Delete existing SECONDARY assignments ────────────────────────
const secGradeIds = Object.values(gByNameSec);
const deleted = await p.assignment.deleteMany({
  where: { gradeId: { in: secGradeIds } },
});
console.log(`\nDeleted ${deleted.count} existing SECONDARY assignments`);

// ─── Insert new assignments ───────────────────────────────────────
let total = 0, errors = 0;
for (const [gradeKey, sched] of Object.entries(SCHEDULES)) {
  const gradeId = gByNameSec[gradeKey];
  if (!gradeId) { console.log(`  SKIP (grade not found): ${gradeKey}`); continue; }

  for (const [day, slot, subjectName, teacherName, roomName] of sched.data) {
    const tbKey = `${day}_${slot}`;
    const tbId = TB[tbKey];
    if (!tbId) { console.log(`  SKIP (no TB): ${gradeKey} day${day} slot${slot}`); errors++; continue; }

    let subjectId;
    try { subjectId = S(subjectName); } catch {
      // try partial match
      const partial = Object.entries(sByName).find(([k]) => k.includes(subjectName.toLowerCase().split(" ")[0].slice(0,4)));
      if (partial) { subjectId = partial[1]; }
      else { console.log(`  SKIP (no subject): ${subjectName}`); errors++; continue; }
    }

    let teacherId;
    try { teacherId = T(teacherName); } catch {
      console.log(`  SKIP (no teacher): ${teacherName}`); errors++; continue;
    }

    let roomId;
    try { roomId = R(roomName); } catch {
      console.log(`  SKIP (no room): ${roomName}`); errors++; continue;
    }

    await p.assignment.create({
      data: { gradeId, teacherId, subjectId, timeBlockId: tbId, roomId, status: "OK" },
    });
    total++;
  }
  console.log(`  ✓ ${gradeKey}: inserted`);
}

console.log(`\n✅ Done: ${total} assignments created, ${errors} errors`);
await p.$disconnect();
