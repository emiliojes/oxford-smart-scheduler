/**
 * Replaces assignments for 6A, 6B, 7A, 7B with exact data from reference images.
 * Slot map: 1=07:30, 2=08:30, 3=09:45, 4=10:45, 5=11:45, 6=13:15, 7=14:15
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// ── TimeBlock IDs ────────────────────────────────────────────────
const TB = {
  "1_1":"cmm5nddc5000nkx32qkcoosjx","1_2":"cmm5nddhv000okx3231uzka2c",
  "1_3":"cmm5nddnj000pkx32jpew500f","1_4":"cmm5nddt8000qkx32zw03kmka",
  "1_5":"cmm5nddyx000rkx32qgytyze2","1_6":"cmm5nde4n000skx32dy35aah8",
  "1_7":"cmm5ndea9000tkx3284thbhaz",
  "2_1":"cmm5ndfph0012kx32e81wh4md","2_2":"cmm5ndfv50013kx32i73ddnyt",
  "2_3":"cmm5ndg0u0014kx32grei26h1","2_4":"cmm5ndg6j0015kx32155ldc9o",
  "2_5":"cmm5ndgc80016kx322pcgac45","2_6":"cmm5ndghy0017kx32tvhghnjh",
  "2_7":"cmm5ndgnl0018kx324encf3c3",
  "3_1":"cmm5ndi2t001hkx328epg4639","3_2":"cmm5ndi8i001ikx3239x92gy3",
  "3_3":"cmm5ndie9001jkx3232gz84ig","3_4":"cmm5ndijx001kkx32n4opjnj2",
  "3_5":"cmm5ndipk001lkx32cz3yvkjg","3_6":"cmm5ndiv9001mkx3277ybnpmt",
  "3_7":"cmm5ndj0y001nkx32iojtz6f9",
  "4_1":"cmm5ndkg5001wkx32x0ofn96v","4_2":"cmm5ndkoh001xkx32e510zcyl",
  "4_3":"cmm5ndktu001ykx327tnbn2f1","4_4":"cmm5ndl02001zkx32z80af4d8",
  "4_5":"cmm5ndl5r0020kx32f4t3pgga","4_6":"cmm5ndlbg0021kx32eziwhtxs",
  "4_7":"cmm5ndlhw0022kx32wv4k0g1y",
  "5_1":"cmm5ndn22002bkx3254m571hr","5_2":"cmm5ndn80002ckx328k2q9nh4",
  "5_3":"cmm5ndnde002dkx32t72putj5","5_4":"cmm5ndnj3002ekx3212ac3jdg",
  "5_5":"cmm5ndnos002fkx32dnj5mvro","5_6":"cmm5ndnu0002gkx32fcf1zhi4",
  "5_7":"cmm5ndo05002hkx3296yjdxco",
};

// ── Catalog lookups ──────────────────────────────────────────────
const teachers  = await p.teacher.findMany();
const subjects  = await p.subject.findMany();
const rooms     = await p.room.findMany();
const grades    = await p.grade.findMany();

const tByName = Object.fromEntries(teachers.map(t => [t.name.toLowerCase(), t.id]));
const sByName = {};
for (const s of subjects) sByName[s.name.toLowerCase()] = s.id;
const rByName = Object.fromEntries(rooms.map(r => [r.name.toLowerCase(), r.id]));
const gMap    = Object.fromEntries(
  grades.filter(g=>g.level==="SECONDARY").map(g=>[`${g.name}${g.section??""}`, g.id])
);

const T = n => { const id = tByName[n.toLowerCase()]; if (!id) throw new Error("No teacher: "+n); return id; };
const S = n => { const id = sByName[n.toLowerCase()]; if (!id) throw new Error("No subject: "+n); return id; };
const R = n => { const id = rByName[n.toLowerCase()]; if (!id) throw new Error("No room: "+n); return id; };

// ── Schedule data (exact from images) ───────────────────────────
// [day, slot, subject, teacher, room]
const SCHEDULES = {

  // ── 6A · Omely Rujano · Room #7 (Planta Baja) ────────────────
  "6A": [
    [1,1,"Homeroom",      "Omely Rujano",    "Room #7 (Planta Baja)"],
    [1,2,"Math",          "Omely Rujano",    "Room #7 (Planta Baja)"],
    [1,3,"English",       "Vielka Vega",     "Room #7 (Planta Baja)"],
    [1,4,"Social Science","Vanessa Muñoz",   "Room #7 (Planta Baja)"],
    [1,5,"Music",         "Leonel Vega",     "Room #7 (Planta Baja)"],
    [1,6,"Science",       "Conrado de Leon", "Room #7 (Planta Baja)"],
    [1,7,"Spanish",       "Elida Barria",    "Room #7 (Planta Baja)"],

    [2,1,"Science",       "Conrado de Leon", "Room #7 (Planta Baja)"],
    [2,2,"Art",           "Andrea Guerra",   "Room #7 (Planta Baja)"],
    [2,3,"Math",          "Omely Rujano",    "Room #7 (Planta Baja)"],
    [2,4,"Literature",    "Vielka Vega",     "Room #7 (Planta Baja)"],
    [2,5,"English",       "Vielka Vega",     "Room #7 (Planta Baja)"],
    [2,6,"Spanish",       "Elida Barria",    "Room #7 (Planta Baja)"],
    [2,7,"Social Science","Vanessa Muñoz",   "Room #7 (Planta Baja)"],

    [3,1,"Literature",    "Vielka Vega",     "Room #7 (Planta Baja)"],
    [3,2,"Spanish",       "Elida Barria",    "Room #7 (Planta Baja)"],
    [3,3,"Math",          "Omely Rujano",    "Room #7 (Planta Baja)"],
    [3,4,"Social Science","Vanessa Muñoz",   "Room #7 (Planta Baja)"],
    [3,5,"English",       "Vielka Vega",     "Room #7 (Planta Baja)"],
    [3,6,"French",        "Elsi Diaz",       "Room #7 (Planta Baja)"],
    [3,7,"Science",       "Conrado de Leon", "Room #7 (Planta Baja)"],

    [4,1,"Math",          "Omely Rujano",    "Room #7 (Planta Baja)"],
    [4,2,"French",        "Elsi Diaz",       "Room #7 (Planta Baja)"],
    [4,3,"Computing",     "Emilio Núñez",    "Computer Lab"],
    [4,4,"English",       "Vielka Vega",     "Room #7 (Planta Baja)"],
    [4,5,"Literature",    "Vielka Vega",     "Room #7 (Planta Baja)"],
    [4,6,"Science",       "Conrado de Leon", "Room #7 (Planta Baja)"],
    [4,7,"Spanish",       "Elida Barria",    "Room #7 (Planta Baja)"],

    [5,1,"Science",       "Conrado de Leon", "Room #7 (Planta Baja)"],
    [5,2,"P.E.",          "Francisco Mendoza","Gymnasium"],
    [5,3,"Math",          "Omely Rujano",    "Room #7 (Planta Baja)"],
    [5,4,"Spanish",       "Elida Barria",    "Room #7 (Planta Baja)"],
    [5,5,"English",       "Vielka Vega",     "Room #7 (Planta Baja)"],
  ],

  // ── 6B · Enis Rodriguez · Room #8 (Planta Baja) ──────────────
  "6B": [
    [1,1,"Homeroom",      "Enis Rodriguez",  "Room #8 (Planta Baja)"],
    [1,2,"Social Science","Vanessa Muñoz",   "Room #8 (Planta Baja)"],
    [1,3,"Science",       "Conrado de Leon", "Room #8 (Planta Baja)"],
    [1,4,"Spanish",       "Elida Barria",    "Room #8 (Planta Baja)"],
    [1,5,"Math",          "Enis Rodriguez",  "Room #8 (Planta Baja)"],
    [1,6,"English",       "Vielka Vega",     "Room #8 (Planta Baja)"],
    [1,7,"P.E.",          "Francisco Mendoza","Gymnasium"],

    [2,1,"Social Science","Vanessa Muñoz",   "Room #8 (Planta Baja)"],
    [2,2,"Science",       "Conrado de Leon", "Room #8 (Planta Baja)"],
    [2,3,"Spanish",       "Elida Barria",    "Room #8 (Planta Baja)"],
    [2,4,"Math",          "Enis Rodriguez",  "Room #8 (Planta Baja)"],
    [2,5,"Literature",    "Vielka Vega",     "Room #8 (Planta Baja)"],
    [2,6,"English",       "Vielka Vega",     "Room #8 (Planta Baja)"],
    [2,7,"Art",           "Andrea Guerra",   "Room #8 (Planta Baja)"],

    [3,1,"Spanish",       "Elida Barria",    "Room #8 (Planta Baja)"],
    [3,2,"English",       "Vielka Vega",     "Room #8 (Planta Baja)"],
    [3,3,"Computing",     "Emilio Núñez",    "Computer Lab"],
    [3,4,"French",        "Elsi Diaz",       "Room #8 (Planta Baja)"],
    [3,5,"Math",          "Enis Rodriguez",  "Room #8 (Planta Baja)"],
    [3,6,"Science",       "Conrado de Leon", "Room #8 (Planta Baja)"],
    [3,7,"Literature",    "Vielka Vega",     "Room #8 (Planta Baja)"],

    [4,1,"Social Science","Vanessa Muñoz",   "Room #8 (Planta Baja)"],
    [4,2,"English",       "Vielka Vega",     "Room #8 (Planta Baja)"],
    [4,3,"Science",       "Conrado de Leon", "Room #8 (Planta Baja)"],
    [4,4,"Spanish",       "Elida Barria",    "Room #8 (Planta Baja)"],
    [4,5,"Music",         "Leonel Vega",     "Room #8 (Planta Baja)"],
    [4,6,"Math",          "Enis Rodriguez",  "Room #8 (Planta Baja)"],
    [4,7,"French",        "Elsi Diaz",       "Room #8 (Planta Baja)"],

    [5,1,"Math",          "Enis Rodriguez",  "Room #8 (Planta Baja)"],
    [5,2,"English",       "Vielka Vega",     "Room #8 (Planta Baja)"],
    [5,3,"Spanish",       "Elida Barria",    "Room #8 (Planta Baja)"],
    [5,4,"Science",       "Conrado de Leon", "Room #8 (Planta Baja)"],
    [5,5,"Literature",    "Vielka Vega",     "Room #8 (Planta Baja)"],
  ],

  // ── 7A · Vielka Vega · Room #15 (Planta Alta) ────────────────
  "7A": [
    [1,1,"Homeroom",      "Vielka Vega",     "Room #15 (Planta Alta)"],
    [1,2,"English",       "Vielka Vega",     "Room #15 (Planta Alta)"],
    [1,3,"Literature",    "Vielka Vega",     "Room #15 (Planta Alta)"],
    [1,4,"Math",          "Enis Rodriguez",  "Room #15 (Planta Alta)"],
    [1,5,"Spanish",       "Elida Barria",    "Room #15 (Planta Alta)"],
    [1,6,"Social Science","Vanessa Muñoz",   "Room #15 (Planta Alta)"],
    [1,7,"Science",       "Conrado de Leon", "Room #15 (Planta Alta)"],

    [2,1,"English",       "Vielka Vega",     "Room #15 (Planta Alta)"],
    [2,2,"Math",          "Enis Rodriguez",  "Room #15 (Planta Alta)"],
    [2,3,"Art",           "Andrea Guerra",   "Room #15 (Planta Alta)"],
    [2,4,"Science",       "Conrado de Leon", "Room #15 (Planta Alta)"],
    [2,5,"Spanish",       "Elida Barria",    "Room #15 (Planta Alta)"],
    [2,6,"Music",         "Leonel Vega",     "Room #15 (Planta Alta)"],
    [2,7,"P.E.",          "Francisco Mendoza","Gymnasium"],

    [3,1,"Science",       "Conrado de Leon", "Room #15 (Planta Alta)"],
    [3,2,"Spanish",       "Elida Barria",    "Room #15 (Planta Alta)"],
    [3,3,"French",        "Elsi Diaz",       "Room #15 (Planta Alta)"],
    [3,4,"Math",          "Enis Rodriguez",  "Room #15 (Planta Alta)"],
    [3,5,"Literature",    "Vielka Vega",     "Room #15 (Planta Alta)"],
    [3,6,"Social Science","Vanessa Muñoz",   "Room #15 (Planta Alta)"],
    [3,7,"English",       "Vielka Vega",     "Room #15 (Planta Alta)"],

    [4,1,"English",       "Vielka Vega",     "Room #15 (Planta Alta)"],
    [4,2,"Literature",    "Vielka Vega",     "Room #15 (Planta Alta)"],
    [4,3,"French",        "Elsi Diaz",       "Room #15 (Planta Alta)"],
    [4,4,"Social Science","Vanessa Muñoz",   "Room #15 (Planta Alta)"],
    [4,5,"Math",          "Enis Rodriguez",  "Room #15 (Planta Alta)"],
    [4,6,"Spanish",       "Elida Barria",    "Room #15 (Planta Alta)"],
    [4,7,"Science",       "Conrado de Leon", "Room #15 (Planta Alta)"],

    [5,1,"Computing",     "Emilio Núñez",    "Computer Lab"],
    [5,2,"Math",          "Enis Rodriguez",  "Room #15 (Planta Alta)"],
    [5,3,"Spanish",       "Elida Barria",    "Room #15 (Planta Alta)"],
    [5,4,"English",       "Vielka Vega",     "Room #15 (Planta Alta)"],
    [5,5,"Science",       "Conrado de Leon", "Room #15 (Planta Alta)"],
  ],

  // ── 7B · Maria Pitti · Room #16 (Planta Alta) ────────────────
  "7B": [
    [1,1,"Homeroom",      "Maria Pitti",     "Room #16 (Planta Alta)"],
    [1,2,"Social Science","Vanessa Muñoz",   "Room #16 (Planta Alta)"],
    [1,3,"Math",          "Maria Pitti",     "Room #16 (Planta Alta)"],
    [1,4,"Literature",    "Vielka Vega",     "Room #16 (Planta Alta)"],
    [1,5,"Science",       "Conrado de Leon", "Room #16 (Planta Alta)"],
    [1,6,"Spanish",       "Elida Barria",    "Room #16 (Planta Alta)"],
    [1,7,"English",       "Vielka Vega",     "Room #16 (Planta Alta)"],

    [2,1,"Math",          "Maria Pitti",     "Room #16 (Planta Alta)"],
    [2,2,"Literature",    "Vielka Vega",     "Room #16 (Planta Alta)"],
    [2,3,"Science",       "Conrado de Leon", "Room #16 (Planta Alta)"],
    [2,4,"Art",           "Andrea Guerra",   "Room #16 (Planta Alta)"],
    [2,5,"Music",         "Leonel Vega",     "Room #16 (Planta Alta)"],
    [2,6,"Spanish",       "Elida Barria",    "Room #16 (Planta Alta)"],
    [2,7,"English",       "Vielka Vega",     "Room #16 (Planta Alta)"],

    [3,1,"Math",          "Maria Pitti",     "Room #16 (Planta Alta)"],
    [3,2,"Literature",    "Vielka Vega",     "Room #16 (Planta Alta)"],
    [3,3,"Science",       "Conrado de Leon", "Room #16 (Planta Alta)"],
    [3,4,"Social Science","Vanessa Muñoz",   "Room #16 (Planta Alta)"],
    [3,5,"Spanish",       "Elida Barria",    "Room #16 (Planta Alta)"],
    [3,6,"English",       "Vielka Vega",     "Room #16 (Planta Alta)"],
    [3,7,"French",        "Elsi Diaz",       "Room #16 (Planta Alta)"],

    [4,1,"Social Science","Vanessa Muñoz",   "Room #16 (Planta Alta)"],
    [4,2,"Spanish",       "Elida Barria",    "Room #16 (Planta Alta)"],
    [4,3,"Science",       "Conrado de Leon", "Room #16 (Planta Alta)"],
    [4,4,"Math",          "Maria Pitti",     "Room #16 (Planta Alta)"],
    [4,5,"French",        "Elsi Diaz",       "Room #16 (Planta Alta)"],
    [4,6,"English",       "Vielka Vega",     "Room #16 (Planta Alta)"],
    [4,7,"P.E.",          "Francisco Mendoza","Gymnasium"],

    [5,1,"English",       "Vielka Vega",     "Room #16 (Planta Alta)"],
    [5,2,"Spanish",       "Elida Barria",    "Room #16 (Planta Alta)"],
    [5,3,"Science",       "Conrado de Leon", "Room #16 (Planta Alta)"],
    [5,4,"Math",          "Maria Pitti",     "Room #16 (Planta Alta)"],
    [5,5,"Computing",     "Emilio Núñez",    "Computer Lab"],
  ],
};

// ── Delete and re-insert ─────────────────────────────────────────
for (const [gradeKey, rows] of Object.entries(SCHEDULES)) {
  const gradeId = gMap[gradeKey];
  if (!gradeId) { console.log(`SKIP: grade ${gradeKey} not found`); continue; }

  await p.assignment.deleteMany({ where: { gradeId } });
  let count = 0, errs = 0;

  for (const [day, slot, subName, teachName, roomName] of rows) {
    const tbId = TB[`${day}_${slot}`];
    if (!tbId) { console.log(`  No TB: ${gradeKey} d${day}s${slot}`); errs++; continue; }
    try {
      await p.assignment.create({
        data: {
          gradeId,
          teacherId:   T(teachName),
          subjectId:   S(subName),
          timeBlockId: tbId,
          roomId:      R(roomName),
          status:      "OK",
        },
      });
      count++;
    } catch (e) {
      console.log(`  ERR ${gradeKey} d${day}s${slot}: ${e.message}`);
      errs++;
    }
  }
  console.log(`✓ ${gradeKey}: ${count} inserted, ${errs} errors`);
}

await p.$disconnect();
