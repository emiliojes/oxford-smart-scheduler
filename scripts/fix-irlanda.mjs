/**
 * Irlanda Tuñon — Maths 9-12, T.Skills 11, Homeroom 12A, Room 22
 * Schedule from image:
 *
 * MON: 7:15 Registration | 7:30 Homeroom(12A) | 8:30 XII(Math) | 9:45 XIA | 10:45 XIB | 11:45 IXA | 12:45 LUNCH/Gym Sup | 2:15 IXB
 * TUE: 7:15 Reg | 7:30 XII | 9:45 IXB | 10:45 XIB(T.SK) | 11:45 - | 13:15 IXA | -- | --
 *   Wait — re-reading image:
 *   TUE: 7:30 XII | 8:30 - | 9:45 IXB | 10:45 XIA(T.SK) | 11:45 - | LUNCH | 13:15 IXA
 *
 * Exact schedule from image:
 * MON: Reg | Homeroom(12A) | XII | - | XIA | XIB | IXA | LUNCH/GymSup | - | IXB | -
 * TUE: Reg | XII | XII | - | IXB | XIA T.S | - | LUNCH | IXA | - | -
 * WED: Reg | XII | XII | - | XIA | - | IXA | LUNCH | - | IXB | -
 * THU: Reg | - | XII | - | XIA T.S | XIB T.S | IXB | LUNCH | - | XIA | -
 * FRI: Reg | XII | IXA | - | IXB | XIB | IXB | LUNCH/Student Dismissal | - | - | -
 *
 * Time slots (HIGH):
 *   07:15-07:30 REGISTRATION
 *   07:30-08:30
 *   08:30-09:30
 *   09:30-09:45 BREAK
 *   09:45-10:45
 *   10:45-11:45
 *   11:45-12:45
 *   12:45-13:15 LUNCH
 *   13:15-14:15
 *   14:15-15:15
 *   15:15 DEPARTURE
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Irlanda" } } });
console.log(`Teacher: ${teacher.name}`);

// IDs from check-subjects-rooms
const MATH9  = "cmm5kdc4i0000m9jh1myb3r9b";
const MATH10 = "cmmphggv50001qztfogohdfmx";
const MATH11 = "cmm5kg2rt0001m9jhz2041t6t";
const MATH12 = "cmmphgh410002qztf5m54kys2";
const TSKILL = "cmq5x9vtp0004pr5q5fhwg5xb"; // Computing T. — wait, T SK = Thinking and Skills
const THINKING = "cmq5x9voq0003pr5qiwuofjg5"; // Thinking and Skills
const HOMEROOM = "cmmpgd3o00000ptm79hrt6syr";
const ROOM22  = "cmq5x9vhp0002pr5qhh36eume";

const G9A  = "cmm5ljm3u00bm3094h75o4211";
const G9B  = "cmm5ljnot00c53094qng4nkjr";
const G10A = "cmm5ljp9l00co3094msdi8kob";
const G10B = "cmm5ljqxc00d73094c5acrpza";
const G11A = "cmm5ljsho00dq3094u8qgj435";
const G11B = "cmm5lju3400e93094uqm9pehz";
const G12A = "cmm5ljvtp00es3094kdk4mb9d";

// Get all timeblocks for HIGH (day 1-5)
const allTBs = await p.timeBlock.findMany({
  where: { level: "SECONDARY", blockType: "CLASS" },
  orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
});

const tb = (day, start) => {
  const block = allTBs.find(b => b.dayOfWeek === day && b.startTime === start);
  if (!block) console.warn(`  WARNING: no block found day${day} ${start}`);
  return block?.id;
};

// Delete all current assignments for Irlanda
const deleted = await p.assignment.deleteMany({ where: { teacherId: teacher.id } });
console.log(`Deleted ${deleted.count} old assignments`);

// New assignments from image
const assignments = [
  // MONDAY
  { day: 1, start: "07:30", gradeId: G12A, subjectId: HOMEROOM },
  { day: 1, start: "08:30", gradeId: G12A, subjectId: MATH12 },
  { day: 1, start: "09:45", gradeId: G11A, subjectId: MATH11 },
  { day: 1, start: "10:45", gradeId: G11B, subjectId: MATH11 },
  { day: 1, start: "11:45", gradeId: G9A,  subjectId: MATH9  },
  { day: 1, start: "14:15", gradeId: G9B,  subjectId: MATH9  },
  // TUESDAY
  { day: 2, start: "07:30", gradeId: G12A, subjectId: MATH12 },
  { day: 2, start: "08:30", gradeId: G12A, subjectId: MATH12 },
  { day: 2, start: "09:45", gradeId: G9B,  subjectId: MATH9  },
  { day: 2, start: "10:45", gradeId: G11A, subjectId: MATH11 },
  { day: 2, start: "13:15", gradeId: G9A,  subjectId: MATH9  },
  // WEDNESDAY
  { day: 3, start: "07:30", gradeId: G12A, subjectId: MATH12 },
  { day: 3, start: "08:30", gradeId: G12A, subjectId: MATH12 },
  { day: 3, start: "09:45", gradeId: G11A, subjectId: MATH11 },
  { day: 3, start: "11:45", gradeId: G9A,  subjectId: MATH9  },
  { day: 3, start: "14:15", gradeId: G9B,  subjectId: MATH9  },  // IXB at 2:15
  // THURSDAY
  { day: 4, start: "08:30", gradeId: G12A, subjectId: MATH12 },
  { day: 4, start: "09:45", gradeId: G11A, subjectId: THINKING },
  { day: 4, start: "10:45", gradeId: G11B, subjectId: THINKING },
  { day: 4, start: "11:45", gradeId: G9B,  subjectId: MATH9  },
  { day: 4, start: "13:15", gradeId: G11A, subjectId: MATH11 },  // XIA at 1:15
  // FRIDAY
  { day: 5, start: "07:30", gradeId: G12A, subjectId: MATH12 },
  { day: 5, start: "08:30", gradeId: G9A,  subjectId: MATH9  },
  { day: 5, start: "09:45", gradeId: G9B,  subjectId: MATH9  },
  { day: 5, start: "10:45", gradeId: G11B, subjectId: MATH11 },
  { day: 5, start: "11:45", gradeId: G9B,  subjectId: MATH9  },
];

let created = 0;
for (const a of assignments) {
  const timeBlockId = tb(a.day, a.start);
  if (!timeBlockId) continue;
  await p.assignment.create({
    data: { teacherId: teacher.id, gradeId: a.gradeId, subjectId: a.subjectId, timeBlockId, roomId: ROOM22 },
  });
  created++;
}
console.log(`Created ${created} assignments`);

await p.$disconnect();
console.log("Done!");
