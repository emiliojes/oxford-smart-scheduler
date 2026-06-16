import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const timeToMins = t => { const [h,m="0"]=t.split(":"); return parseInt(h)*60+parseInt(m); };
function secGroup(n) {
  n = Number(n);
  if ([6,7,8].includes(n)) return "MIDDLE";
  if ([9,10,11,12].includes(n)) return "HIGH";
  return null;
}

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Maria" } } });
const asgns = await p.assignment.findMany({
  where: { teacherId: teacher.id },
  include: { grade: true, timeBlock: true },
});

const middleA = asgns.filter(a => secGroup(a.grade?.name) === "MIDDLE");
const highA   = asgns.filter(a => secGroup(a.grade?.name) === "HIGH");

const toMark = new Set();

for (const m of middleA) {
  for (const h of highA) {
    if (m.timeBlock.dayOfWeek !== h.timeBlock.dayOfWeek) continue;
    const mS=timeToMins(m.timeBlock.startTime), mE=timeToMins(m.timeBlock.endTime);
    const hS=timeToMins(h.timeBlock.startTime), hE=timeToMins(h.timeBlock.endTime);
    if (mS < hE && mE > hS) {
      toMark.add(m.id);
      toMark.add(h.id);
    }
  }
}

for (const id of toMark) {
  await p.assignment.update({
    where: { id },
    data: {
      status: "CONFLICT",
      conflicts: {
        deleteMany: {},
        create: [{
          conflictType: "TEACHER_DOUBLE_BOOKING",
          severity: "WARNING",
          description: "validations.teacherTimeOverlap",
        }],
      },
    },
  });
  const a = asgns.find(x => x.id === id);
  console.log(`⚠️  Marked WARNING: ${a?.timeBlock.startTime} Grade ${a?.grade?.name}${a?.grade?.section??""}`);
}

// Clear any stale conflicts on non-overlapping assignments
for (const a of asgns) {
  if (toMark.has(a.id)) continue;
  const hasConflict = await p.conflict.count({ where: { assignmentId: a.id } });
  if (hasConflict > 0 || a.status === "CONFLICT") {
    await p.assignment.update({
      where: { id: a.id },
      data: { status: "CONFIRMED", conflicts: { deleteMany: {} } },
    });
    console.log(`✅ Cleared stale conflict: ${a.timeBlock.startTime} Grade ${a.grade?.name}${a.grade?.section??""}`);
  }
}

console.log("\nDone.");
await p.$disconnect();
