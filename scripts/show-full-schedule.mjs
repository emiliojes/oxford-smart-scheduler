import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const fmt = (t) => {
  const [h, m = "00"] = t.split(":");
  const hr = Number(h);
  return `${hr % 12 || 12}:${m.padStart(2, "0")} ${hr >= 12 ? "PM" : "AM"}`;
};

const blocks = await p.timeBlock.findMany({
  where: { dayOfWeek: 1, level: { in: ["SECONDARY", "BOTH"] } },
  orderBy: { startTime: "asc" },
});

// Separate Middle and High blocks
const midBlocks = blocks.filter(b => {
  if (b.blockType === "LUNCH") return false;
  if (["13:30","14:30"].includes(b.startTime)) return false;
  if (b.startTime === "11:45" && b.endTime === "12:45") return false;
  return true;
});

const highBlocks = blocks.filter(b => {
  if (b.blockType === "LUNCH") return false;
  if (["13:00","14:00"].includes(b.startTime)) return false;
  if (b.startTime === "11:45" && b.endTime === "12:30") return false;
  return true;
});

// Add virtual lunch
const midFull = [
  ...midBlocks,
  { blockType: "LUNCH", startTime: "12:30", endTime: "13:00" },
  { blockType: "DISMISSAL", startTime: "15:00", endTime: "15:15" },
].sort((a, b) => a.startTime.localeCompare(b.startTime));

const highFull = [
  ...highBlocks,
  { blockType: "LUNCH", startTime: "13:00", endTime: "13:30" },
].sort((a, b) => a.startTime.localeCompare(b.startTime));

const label = (b) => {
  if (b.blockType === "REGISTRATION") return "REGISTRATION";
  if (b.blockType === "BREAK") return "BREAK";
  if (b.blockType === "LUNCH") return "LUNCH";
  if (b.blockType === "DISMISSAL") return "DEPARTURE";
  return "CLASS";
};

console.log("╔══════════════════════════════════╗");
console.log("║      MIDDLE SCHOOL (6A-8B)       ║");
console.log("╠══════════════════════════════════╣");
for (const b of midFull) {
  const time = `${fmt(b.startTime)} - ${fmt(b.endTime)}`;
  console.log(`║  ${time.padEnd(22)} ${label(b).padEnd(12)}║`);
}

console.log("\n╔══════════════════════════════════╗");
console.log("║     HIGH SCHOOL (9A-12A)         ║");
console.log("╠══════════════════════════════════╣");
for (const b of highFull) {
  const time = `${fmt(b.startTime)} - ${fmt(b.endTime)}`;
  console.log(`║  ${time.padEnd(22)} ${label(b).padEnd(12)}║`);
}

await p.$disconnect();
