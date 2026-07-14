"use client";

import { useEffect, useState, useRef } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useHistory } from "@/context/HistoryContext";
import { AssignmentForm } from "./AssignmentForm";

interface Assignment {
  id: string;
  teacher: { name: string };
  subject: { name: string };
  grade: { name: string; section: string | null; level?: string } | null;
  room: { name: string } | null;
  timeBlock: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    duration: string;
    blockType: string;
  };
  note: string | null;
  status: string;
  conflicts: Array<{ description: string }>;
}

interface TimeBlock {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  duration: string;
  blockType: string;
  level: string;
}

interface SupervisionDutySlim {
  area: string;
  startTime: string;
  dayPattern: string;
}

const DUTY_DAY_MAP: Record<string, number[]> = {
  EVERYDAY:    [1,2,3,4,5],
  MON_TO_FRI:  [1,2,3,4,5],
  MON_TO_THU:  [1,2,3,4],
  TUE_AND_THU: [2,4],
  MON:[1], TUE:[2], WED:[3], THU:[4], FRI:[5],
};

interface ScheduleGridProps {
  assignments: Assignment[];
  timeBlocks: TimeBlock[];
  viewType: "teacher" | "grade" | "room";
  onRefresh?: () => void;
  showSubject?: boolean;
  supervisionDuties?: SupervisionDutySlim[];
}

// Color palette per grade — same grade same color, different grades different colors
const GRADE_COLORS: Record<string, string> = {
  "PK": "border-pink-300    bg-pink-50    dark:bg-pink-900/30    dark:border-pink-500",
  "K":  "border-fuchsia-300 bg-fuchsia-50 dark:bg-fuchsia-900/30 dark:border-fuchsia-500",
  "1":  "border-violet-300  bg-violet-50  dark:bg-violet-900/30  dark:border-violet-500",
  "2":  "border-indigo-300  bg-indigo-50  dark:bg-indigo-900/30  dark:border-indigo-500",
  "3":  "border-sky-300     bg-sky-50     dark:bg-sky-900/30     dark:border-sky-500",
  "4":  "border-teal-300    bg-teal-50    dark:bg-teal-900/30    dark:border-teal-500",
  "5":  "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 dark:border-emerald-500",
  "6":  "border-lime-300    bg-lime-50    dark:bg-lime-900/30    dark:border-lime-500",
  "7":  "border-yellow-300  bg-yellow-50  dark:bg-yellow-900/30  dark:border-yellow-500",
  "8":  "border-orange-300  bg-orange-50  dark:bg-orange-900/30  dark:border-orange-500",
  "9":  "border-red-300     bg-red-50     dark:bg-red-900/30     dark:border-red-400",
  "10": "border-rose-300    bg-rose-50    dark:bg-rose-900/30    dark:border-rose-500",
  "11": "border-blue-300    bg-blue-50    dark:bg-blue-900/40    dark:border-blue-500",
  "12": "border-cyan-300    bg-cyan-50    dark:bg-cyan-900/30    dark:border-cyan-500",
};

function getGradeColor(grade: string | null | undefined): string {
  if (!grade) return "border-blue-300 bg-blue-50 dark:bg-blue-900/40 dark:border-blue-500";
  return GRADE_COLORS[grade] ?? "border-blue-300 bg-blue-50 dark:bg-blue-900/40 dark:border-blue-500";
}

const DAYS = [
  { value: 1, label: "MONDAY" },
  { value: 2, label: "TUESDAY" },
  { value: 3, label: "WEDNESDAY" },
  { value: 4, label: "THURSDAY" },
  { value: 5, label: "FRIDAY" },
];

function formatTime12h(time: string): string {
  const [hourStr, minute = "00"] = time.split(":");
  const hour = Number(hourStr);
  if (Number.isNaN(hour)) return time;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.padStart(2, "0")} ${suffix}`;
}

function formatTimeRange(startTime: string, endTime?: string): string {
  return endTime ? `${formatTime12h(startTime)} - ${formatTime12h(endTime)}` : formatTime12h(startTime);
}

function getSecondaryGroup(gradeName: string | null | undefined): "MIDDLE" | "HIGH" | null {
  const grade = Number(gradeName);
  if ([6, 7, 8].includes(grade)) return "MIDDLE";
  if ([9, 10, 11, 12].includes(grade)) return "HIGH";
  return null;
}

export function ScheduleGrid({ assignments, timeBlocks, viewType, onRefresh, showSubject, supervisionDuties }: ScheduleGridProps) {
  const { t } = useLanguage();
  const { canManage } = useAuth();
  const { pushAction } = useHistory();
  const dragAssignmentId = useRef<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null); // "day-startTime"
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = async (dayValue: number, startTime: string) => {
    const assignmentId = dragAssignmentId.current;
    if (!assignmentId) return;
    setDropTarget(null);
    setIsDragging(false);
    // Find timeBlock id for this day + startTime
    const tb = timeBlocks.find(b => b.dayOfWeek === dayValue && b.startTime === startTime);
    if (!tb) return;
    // Don't drop onto same slot
    const current = assignments.find(a => a.id === assignmentId);
    if (current?.timeBlock.dayOfWeek === dayValue && current?.timeBlock.startTime === startTime) return;
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeBlockId: tb.id }),
      });
      const result = await res.json();
      if (res.ok) {
        // Push to undo history
        if (current) {
          pushAction({
            id: current.id,
            actionType: "MOVE",
            description: `Moved ${current.subject.name} → ${startTime} Day${dayValue}`,
            before: {
              teacherId: (current as any).teacherId ?? result.teacherId,
              subjectId: (current as any).subjectId ?? result.subjectId,
              gradeId: (current as any).gradeId ?? result.gradeId ?? null,
              roomId: (current as any).roomId ?? result.roomId ?? null,
              timeBlockId: timeBlocks.find(b => b.dayOfWeek === current.timeBlock.dayOfWeek && b.startTime === current.timeBlock.startTime)?.id ?? "",
            },
            after: {
              teacherId: result.teacherId,
              subjectId: result.subjectId,
              gradeId: result.gradeId ?? null,
              roomId: result.roomId ?? null,
              timeBlockId: tb.id,
            },
          });
        }
        if (result.status === "CONFLICT" && result.conflicts?.length > 0) {
          const msgs = (result.conflicts as Array<{description: string; severity: string}>)
            .filter(c => c.severity === "ERROR")
            .map(c => c.description);
          toast.warning("Clase movida con conflictos", {
            description: msgs.join(" • "),
            duration: 8000,
          });
        } else {
          toast.success("Clase movida");
        }
        if (onRefresh) onRefresh();
      } else {
        toast.error(result.error || "Error al mover");
      }
    } catch (e) {
      toast.error("Error de conexión");
      console.error("Drop failed", e);
    }
  };

  // Determine dominant level from assignments to filter time blocks accordingly
  const levelCounts: Record<string, number> = {};
  for (const a of assignments) {
    const lvl = (a as any).grade?.level ?? "";
    levelCounts[lvl] = (levelCounts[lvl] ?? 0) + 1;
  }
  const dominantLevel = Object.entries(levelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  const hasPrimary   = (levelCounts["PRIMARY"] ?? 0) > 0;
  const hasLowSec    = (levelCounts["LOW_SECONDARY"] ?? 0) > 0;
  const hasSecondary = (levelCounts["SECONDARY"] ?? 0) > 0;

  // Teacher with both Middle (LOW_SECONDARY) and High (SECONDARY) → unified single table
  const isMixedSecondary = viewType === "teacher" && hasLowSec && hasSecondary;

  const isFullyMixed = hasPrimary && (hasLowSec || hasSecondary);
  const tbLevel = isMixedSecondary
    ? null                                              // include all secondary blocks (Middle + High)
    : isFullyMixed
    ? null
    : (hasPrimary && hasLowSec)
    ? "PRIMARY"
    : dominantLevel === "LOW_SECONDARY" ? "SECONDARY"
    : dominantLevel;
  const baseRelevantTimeBlocks = isMixedSecondary
    ? timeBlocks.filter(b => b.level === "LOW_SECONDARY" || b.level === "SECONDARY" || b.level === "BOTH")
    : tbLevel
    ? (tbLevel === "SECONDARY" && hasLowSec && !hasSecondary)
      // Pure Middle teacher: include both SECONDARY (shared morning) and LOW_SECONDARY (afternoon) blocks
      ? timeBlocks.filter(b => b.level === "LOW_SECONDARY" || b.level === "SECONDARY" || b.level === "BOTH")
      : timeBlocks.filter(b => b.level === tbLevel || b.level === "BOTH")
    : timeBlocks;
  const secondaryGroups = new Set(assignments.map(a => getSecondaryGroup(a.grade?.name)).filter(Boolean));
  const shouldUseSecondaryLunchSplit = (tbLevel === "SECONDARY" || isMixedSecondary) && secondaryGroups.size > 0 && viewType === "teacher";
  const relevantTimeBlocks = shouldUseSecondaryLunchSplit
    ? [
        ...baseRelevantTimeBlocks.filter(b => {
          if (b.blockType === "LUNCH") return false;
          // For pure Middle teachers (no SECONDARY grades): remove SECONDARY CLASS blocks
          // that share the same startTime as a LOW_SECONDARY CLASS block
          // e.g. removes 10:45–11:45 (HIGH) when 10:45–11:30 (MIDDLE) exists
          if (hasLowSec && !hasSecondary && b.blockType === "CLASS" && b.level === "SECONDARY") {
            const hasLowSecConflict = baseRelevantTimeBlocks.some(
              x => x.level === "LOW_SECONDARY" && x.blockType === "CLASS" && x.startTime === b.startTime
            );
            if (hasLowSecConflict) return false;
            // Also remove SECONDARY CLASS blocks that fall inside the Middle lunch window (11:30–12:00)
            // e.g. removes the 11:45 HIGH-only block that shouldn't appear for Middle teachers
            if (b.startTime >= "11:30" && b.startTime < "12:00") return false;
          }
          return true;
        }),
        ...[1, 2, 3, 4, 5].flatMap(day => {
          const blocks: TimeBlock[] = [];
          if (secondaryGroups.has("MIDDLE")) {
            blocks.push({ id: `middle-lunch-${day}`, dayOfWeek: day, startTime: "11:30", endTime: "12:00", duration: "30", blockType: "LUNCH", level: "SECONDARY" });
          }
          if (secondaryGroups.has("HIGH")) {
            blocks.push({ id: `high-lunch-${day}`, dayOfWeek: day, startTime: "12:45", endTime: "13:15", duration: "30", blockType: "LUNCH", level: "SECONDARY" });
          }
          return blocks;
        }),
      ]
    : baseRelevantTimeBlocks;

  // Only show rows that have assignments OR are non-CLASS blocks within the teacher's active range
  const assignmentStartTimes = new Set(assignments.map(a => a.timeBlock.startTime));
  const sortedAssignmentTimes = [...assignmentStartTimes].sort();
  const firstTime = sortedAssignmentTimes[0] ?? "";
  const lastTime  = sortedAssignmentTimes[sortedAssignmentTimes.length - 1] ?? "";
  const uniqueStartTimes = Array.from(
    new Set(relevantTimeBlocks.map((b) => b.startTime))
  ).sort().filter(st => {
    const blocksAtTime = relevantTimeBlocks.filter(b => b.startTime === st);
    // Skip malformed blocks with zero duration (endTime === startTime, e.g. "7:00-7:00")
    if (blocksAtTime.every(b => b.endTime === b.startTime)) return false;
    const hasClassBlock = blocksAtTime.some(b => b.blockType === "CLASS");
    // Always show 07:15 REGISTRATION row if teacher has any assignments
    const isRegistration0715 = st === "07:15" && blocksAtTime.some(b => b.blockType === "REGISTRATION");
    if (isRegistration0715 && assignments.length > 0) return true;
    if (hasClassBlock) {
      if (assignmentStartTimes.has(st)) return true;
      // Teacher view: show empty CLASS rows from start of day up to last class (so free slots are visible)
      if (viewType === "teacher" && assignments.length > 0 && lastTime && st <= lastTime) return true;
      return false;
    }
    // Always show non-CLASS rows that have assignments (e.g. Arrival Duty at 07:15 REGISTRATION)
    if (assignmentStartTimes.has(st)) return true;
    // For BREAK/LUNCH/REGISTRATION with no assignments: show if within active range OR immediately before firstTime
    if (assignments.length === 0) return true;
    // Show BREAK/LUNCH that are immediately before the first class (e.g., BREAK 09:30 before first class at 09:45)
    const isImmediatelyBeforeFirst = st < firstTime && blocksAtTime.some(b => b.blockType === "BREAK" || b.blockType === "LUNCH");
    if (isImmediatelyBeforeFirst) return true;
    if (!(st > firstTime && st < lastTime)) return false;
    // Suppress duplicate LUNCH slots: if another LUNCH slot without assignments is already in range,
    // only keep the one that matches the teacher's actual lunch time (closest to assignments)
    const blockType = blocksAtTime[0]?.blockType;
    if (blockType === "LUNCH" && !isMixedSecondary) {
      // Check if there's already another LUNCH slot in the visible times that also has no assignment
      const otherLunchInRange = relevantTimeBlocks
        .filter(b => b.blockType === "LUNCH" && b.startTime !== st)
        .some(b => b.startTime > firstTime && b.startTime < lastTime && !assignmentStartTimes.has(b.startTime));
      if (otherLunchInRange) {
        // Keep only the LUNCH slot that is closer to the teacher's assignments
        const assignedTimes = sortedAssignmentTimes;
        const distSt = Math.min(...assignedTimes.map(t => Math.abs(parseInt(st.replace(":", "")) - parseInt(t.replace(":", "")))));
        const closerExists = relevantTimeBlocks
          .filter(b => b.blockType === "LUNCH" && b.startTime !== st && b.startTime > firstTime && b.startTime < lastTime && !assignmentStartTimes.has(b.startTime))
          .some(b => {
            const d = Math.min(...assignedTimes.map(t => Math.abs(parseInt(b.startTime.replace(":", "")) - parseInt(t.replace(":", "")))));
            return d < distSt;
          });
        if (closerExists) return false;
      }
    }
    return true;
  });

  const getAssignmentsForSlot = (dayOfWeek: number, startTime: string) => {
    return assignments.filter(
      (a) => a.timeBlock.dayOfWeek === dayOfWeek && a.timeBlock.startTime === startTime
    );
  };

  // Calculate total teaching minutes (CLASS blocks only, exclude duties)
  const DUTY_KEYWORDS = ["Duty", "Resource Room Support", "Homeroom"];
  const isDuty = (name: string) => DUTY_KEYWORDS.some(k => name.includes(k));
  const teachingAssignments = assignments.filter(a =>
    a.timeBlock.blockType === "CLASS" && !isDuty(a.subject.name)
  );
  // Deduplicate by (dayOfWeek, startTime) — a slot shared by 2 grades only counts once
  const uniqueSlots = Array.from(
    new Map(teachingAssignments.map(a => [`${a.timeBlock.dayOfWeek}-${a.timeBlock.startTime}`, a])).values()
  );
  const totalMinutes = uniqueSlots.reduce((sum, a) => {
    const dur = parseFloat(String(a.timeBlock.duration ?? 0));
    return sum + (isNaN(dur) ? 0 : dur);
  }, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;
  const hoursLabel = remainingMins > 0 ? `${totalHours}h ${remainingMins}min` : `${totalHours}h`;

  // Per-day breakdown (also deduplicated)
  const dayTotals = [1,2,3,4,5].map(d => {
    const seen = new Set<string>();
    const mins = teachingAssignments
      .filter(a => a.timeBlock.dayOfWeek === d)
      .reduce((sum, a) => {
        const key = a.timeBlock.startTime;
        if (seen.has(key)) return sum;
        seen.add(key);
        return sum + parseFloat(String(a.timeBlock.duration ?? 0));
      }, 0);
    return { day: d, mins };
  });

  const getBlockInfo = (startTime: string) => {
    const lunchBlk = relevantTimeBlocks.find(b => b.startTime === startTime && b.blockType === "LUNCH");
    return lunchBlk ?? relevantTimeBlocks.find(b => b.startTime === startTime);
  };

  // A row is "special" (BREAK/LUNCH/etc) only if every time block at that time is non-CLASS
  // AND no assignments exist for that row across all days
  const isRowSpecial = (startTime: string) => {
    const hasAnyAssignment = [1,2,3,4,5].some(d => getAssignmentsForSlot(d, startTime).length > 0);
    if (hasAnyAssignment) return false;
    const blocksAtTime = relevantTimeBlocks.filter(b => b.startTime === startTime);
    return blocksAtTime.every(b => b.blockType !== "CLASS");
  };


  return (
    <TooltipProvider>
      <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
        <div className="overflow-x-auto w-full">
        <Table className="border-collapse min-w-[600px]">
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-900">
              <TableHead className="w-[70px] md:w-[100px] border-r font-bold text-slate-900 dark:text-slate-100 text-xs md:text-sm">{t.schedule.grid.time}</TableHead>
              {t.timeBlocks.days.map((dayLabel: string, index: number) => (
                <TableHead key={index + 1} className="text-center font-bold text-slate-900 dark:text-slate-100 border-r last:border-r-0 text-xs md:text-sm">
                  <span className="hidden sm:inline">{dayLabel.toUpperCase()}</span>
                  <span className="sm:hidden">{dayLabel.slice(0, 3).toUpperCase()}</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {uniqueStartTimes.map((startTime) => {
              const blockInfo = getBlockInfo(startTime);
              const rowSpecial = isRowSpecial(startTime);

              return (
                <TableRow key={startTime} className={`h-auto ${rowSpecial ? "print:h-4" : "print:h-auto"}`}>
                  <TableCell className="font-medium border-r bg-slate-50 dark:bg-slate-900 align-middle py-1 print:py-[2px] print:w-24">
                    <div className="text-xs font-bold print:text-[11px] whitespace-nowrap flex items-center gap-1">
                      {formatTimeRange(startTime, blockInfo?.endTime)}
                      {isMixedSecondary && (() => {
                        const MIDDLE_EXCLUSIVE = ["10:45", "11:30", "12:00", "13:00", "14:00"];
                        const HIGH_EXCLUSIVE   = ["11:45", "12:45", "13:15", "14:15"];
                        if (MIDDLE_EXCLUSIVE.includes(startTime)) {
                          return <span className="ml-1 px-1 py-0.5 rounded text-[9px] font-bold bg-lime-100 text-lime-700 border border-lime-300 print:hidden">M</span>;
                        }
                        if (HIGH_EXCLUSIVE.includes(startTime)) {
                          return <span className="ml-1 px-1 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-300 print:hidden">H</span>;
                        }
                        return null;
                      })()}
                    </div>
                  </TableCell>
                  
                  {[1, 2, 3, 4, 5].map((dayValue) => {
                    const slotAssignments = getAssignmentsForSlot(dayValue, startTime);
                    const hasConflict = slotAssignments.some(a => a.status === "CONFLICT");
                    const dropKey = `${dayValue}-${startTime}`;
                    const isDropTarget = dropTarget === dropKey && isDragging;

                    return (
                      <TableCell
                        key={dropKey}
                        className={`border-r last:border-r-0 p-1 print:p-0.5 align-top transition-colors ${
                          isDropTarget ? "bg-blue-100 dark:bg-blue-900/40 ring-2 ring-inset ring-blue-400" :
                          blockInfo?.blockType === "BREAK" ? "bg-slate-100 dark:bg-slate-700" :
                          blockInfo?.blockType === "LUNCH" ? "bg-amber-50/40 dark:bg-amber-950/20" :
                          blockInfo?.blockType === "REGISTRATION" ? "bg-slate-50 dark:bg-slate-900" :
                          ""
                        }`}
                        onDragOver={canManage && viewType === "teacher" ? (e) => { e.preventDefault(); setDropTarget(dropKey); } : undefined}
                        onDragLeave={canManage && viewType === "teacher" ? () => setDropTarget(null) : undefined}
                        onDrop={canManage && viewType === "teacher" ? (e) => { e.preventDefault(); handleDrop(dayValue, startTime); } : undefined}
                      >
                        {slotAssignments.length === 0 && (blockInfo?.blockType === "LUNCH" || blockInfo?.blockType === "BREAK" || blockInfo?.blockType === "REGISTRATION") ? (() => {
                          const isMiddleLunchRow = blockInfo?.blockType === "LUNCH" && startTime < "12:00";
                          const isHighLunchRow   = blockInfo?.blockType === "LUNCH" && startTime >= "12:00";
                          const dutyAreas = supervisionDuties
                            ? supervisionDuties
                                .filter(d => {
                                  if (!(DUTY_DAY_MAP[d.dayPattern] ?? []).includes(dayValue)) return false;
                                  if (isMiddleLunchRow) return d.startTime >= "11:00" && d.startTime < "12:00";
                                  if (isHighLunchRow)   return d.startTime >= "12:00";
                                  return d.startTime < "11:00"; // BREAK row
                                })
                                .map(d => d.area)
                            : [];
                          return (
                          <div className="flex flex-col items-center justify-center py-1 print:py-0 gap-0.5">
                            <span className={`text-xs font-bold tracking-widest uppercase print:text-[8px] ${
                              blockInfo?.blockType === "BREAK" ? "text-slate-500 dark:text-slate-400" :
                              blockInfo?.blockType === "LUNCH" ? "text-amber-600" :
                              "text-slate-400"
                            }`}>
                              {t.timeBlocks.types[blockInfo?.blockType as keyof typeof t.timeBlocks.types] || blockInfo?.blockType}
                            </span>
                            {dutyAreas.map((area, i) => (
                              <span key={i} className="text-[10px] font-bold text-white bg-sky-500 rounded px-1.5 py-0.5 text-center leading-tight max-w-full truncate print:text-[8px] print:bg-sky-500 print:text-white">
                                ⚠ {area}
                              </span>
                            ))}
                          </div>
                          );
                        })()
                        : slotAssignments.length === 0 && blockInfo?.blockType === "CLASS" ? (
                          // Empty CLASS slot - show + button for teachers
                          <div className="flex items-center justify-center h-16 print:hidden">
                            {viewType === "teacher" && (
                              <AssignmentForm
                                prefilledTimeBlock={{ dayOfWeek: dayValue, startTime }}
                                onSuccess={() => onRefresh ? onRefresh() : window.location.reload()}
                                trigger={
                                  <button className="w-8 h-8 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 hover:text-blue-700 flex items-center justify-center transition-colors border border-blue-300 hover:border-blue-400">
                                    <span className="text-xl font-bold">+</span>
                                  </button>
                                }
                              />
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 print:gap-[1px]">
                            {slotAssignments.map((a) => (
                              <AssignmentForm
                                key={a.id}
                                initialData={a}
                                onSuccess={() => onRefresh ? onRefresh() : window.location.reload()}
                                trigger={
                                  <Card
                                    draggable={canManage && viewType === "teacher"}
                                    onDragStart={canManage && viewType === "teacher" ? (e) => { dragAssignmentId.current = a.id; setIsDragging(true); e.dataTransfer.effectAllowed = "move"; } : undefined}
                                    onDragEnd={canManage && viewType === "teacher" ? () => { setIsDragging(false); setDropTarget(null); } : undefined}
                                    className={`p-2 print:p-[2px] print:leading-none text-xs print:text-[12px] border shadow-none relative group transition-colors ${
                                      canManage && viewType === "teacher" ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                                    } ${
                                      a.status === "CONFLICT"
                                        ? "border-red-300 bg-red-50 dark:bg-red-900/30 dark:border-red-500 hover:brightness-110"
                                        : a.subject.name.startsWith("Lunch Duty") || a.subject.name.startsWith("Arrival Duty") || a.subject.name.startsWith("Dismissal Duty") || a.subject.name === "Resource Room Support"
                                        ? "border-orange-400 bg-orange-100 dark:bg-orange-900/40 dark:border-orange-400 hover:brightness-110"
                                        : a.subject.name === "Homeroom"
                                        ? "border-purple-300 bg-purple-50 dark:bg-purple-900/30 dark:border-purple-500 hover:brightness-110"
                                        : `${getGradeColor(a.grade?.name)} hover:brightness-110`
                                    }`}
                                  >
                                    {a.status === "CONFLICT" && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="absolute top-1 right-1 text-red-500 cursor-help print:hidden">
                                            <AlertCircle className="w-3 h-3" />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <div className="space-y-1">
                                            <p className="font-bold">{t.schedule.grid.conflicts}</p>
                                            {a.conflicts.map((c, i) => {
                                              const key = c.description.replace("validations.", "") as keyof typeof t.validations;
                                              const msg = (t.validations as any)[key] ?? c.description;
                                              return <p key={i} className="text-xs">• {msg}</p>;
                                            })}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    <div className="font-bold text-blue-900 dark:text-blue-300 truncate flex items-center gap-1 print:leading-none">
                                      {isMixedSecondary && a.grade && getSecondaryGroup(a.grade.name) && (
                                        <span className={`inline-flex items-center justify-center text-[9px] font-extrabold rounded px-1 leading-tight ${
                                          getSecondaryGroup(a.grade.name) === "MIDDLE"
                                            ? "bg-lime-200 text-lime-800"
                                            : "bg-blue-200 text-blue-800"
                                        }`}>
                                          {getSecondaryGroup(a.grade.name) === "MIDDLE" ? "M" : "H"}
                                        </span>
                                      )}
                                      <span className="truncate">
                                        {viewType === "teacher" && a.grade
                                          ? `${a.grade.name}${a.grade.section ?? ""}`
                                          : a.subject.name}
                                      </span>
                                    </div>
                                    <div className="flex flex-col text-slate-600 dark:text-slate-200 print:text-slate-700 print:leading-none print:mt-[1px]">
                                      {viewType === "teacher" && showSubject !== false && (
                                        <span className="truncate">{a.subject.name}</span>
                                      )}
                                      {viewType !== "teacher" && viewType !== "grade" && (
                                        <span className="truncate">{a.grade ? `${t.schedule.types.grade}: ${a.grade.name}${a.grade.section ?? ""}` : ""}</span>
                                      )}
                                      {a.note && (
                                        <span className="text-xs text-slate-400 dark:text-slate-300">({a.note})</span>
                                      )}
                                      {viewType !== "teacher" && (
                                        <span className="truncate font-medium text-slate-700 dark:text-slate-300">{a.teacher.name}</span>
                                      )}
                                      {viewType !== "room" && viewType !== "teacher" && a.room && (
                                        <span className="truncate">{t.schedule.types.room}: {a.room.name}</span>
                                      )}
                                    </div>
                                  </Card>
                                }
                              />
                            ))}
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Hours summary — visible on screen only */}
      {assignments.length > 0 && (
        <div className="mt-3 print:hidden border rounded-lg bg-slate-50 dark:bg-slate-900 px-4 py-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
            <Clock className="w-4 h-4 print:hidden text-blue-600" />
            <span>Total semanal:</span>
            <span className="text-blue-700 dark:text-blue-300 text-base print:text-[10px] font-extrabold">{hoursLabel}</span>
          </div>
          <div className="flex gap-3 text-slate-500 dark:text-slate-400 flex-wrap">
            {dayTotals.map(({ day, mins }) => {
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              const label = m > 0 ? `${h}h${m}` : `${h}h`;
              const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie"];
              return mins > 0 ? (
                <span key={day} className="whitespace-nowrap">
                  <span className="font-medium text-slate-600 dark:text-slate-300">{dayNames[day - 1]}:</span> {label}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}


