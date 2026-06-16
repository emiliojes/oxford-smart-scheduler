import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const DAYS = ["", "MON", "TUE", "WED", "THU", "FRI"];

const timeToMins = (t) => {
  const [h, m = "0"] = t.split(":");
  return parseInt(h) * 60 + parseInt(m);
};

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Emilio" } } });
const asgns = await p.assignment.findMany({
  where: { teacherId: teacher.id },
  include: { timeBlock: true, grade: true, subject: true },
});

let warnings = 0;
let cleared = 0;

for (const a of asgns) {
  // Find overlapping assignments (same teacher, same day, different timeblock, overlapping time)
  const others = asgns.filter(o =>
    o.id !== a.id &&
    o.timeBlock.dayOfWeek === a.timeBlock.dayOfWeek &&
    o.timeBlockId !== a.timeBlockId
  );

  const aStart = timeToMins(a.timeBlock.startTime);
  const aEnd   = timeToMins(a.timeBlock.endTime);

  const overlaps = others.filter(o => {
    const oStart = timeToMins(o.timeBlock.startTime);
    const oEnd   = timeToMins(o.timeBlock.endTime);
    return aStart < oEnd && aEnd > oStart;
  });

  if (overlaps.length > 0) {
    // Mark as WARNING conflict
    await p.assignment.update({
      where: { id: a.id },
      data: {
        status: "CONFLICT",
        conflicts: {
          deleteMany: {},
          create: [{
            conflictType: "TEACHER_DOUBLE_BOOKING",
            severity: "WARNING",
            description: `validations.teacherTimeOverlap`,
          }],
        },
      },
    });
    console.log(`⚠️  WARNING set: ${DAYS[a.timeBlock.dayOfWeek]} ${a.timeBlock.startTime} Grade ${a.grade?.name}${a.grade?.section??""} (overlaps with ${overlaps.map(o => `${o.timeBlock.startTime} ${o.grade?.name}${o.grade?.section??""}`).join(", ")})`);
    warnings++;
  } else {
    // Clear any stale conflicts
    const existing = await p.conflict.count({ where: { assignmentId: a.id } });
    if (existing > 0 || a.status === "CONFLICT") {
      await p.assignment.update({
        where: { id: a.id },
        data: { status: "CONFIRMED", conflicts: { deleteMany: {} } },
      });
      cleared++;
    }
  }
}

console.log(`\n✅ Done: ${warnings} overlap warnings set, ${cleared} cleared`);
await p.$disconnect();
