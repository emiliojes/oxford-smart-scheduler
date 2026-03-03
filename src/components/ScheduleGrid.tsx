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
import { AssignmentForm } from "./AssignmentForm";

interface Assignment {
  id: string;
  teacher: { name: string };
  subject: { name: string };
  grade: { name: string; section: string | null } | null;
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

interface ScheduleGridProps {
  assignments: Assignment[];
  timeBlocks: TimeBlock[];
  viewType: "teacher" | "grade" | "room";
  onRefresh?: () => void;
}

const DAYS = [
  { value: 1, label: "MONDAY" },
  { value: 2, label: "TUESDAY" },
  { value: 3, label: "WEDNESDAY" },
  { value: 4, label: "THURSDAY" },
  { value: 5, label: "FRIDAY" },
];

export function ScheduleGrid({ assignments, timeBlocks, viewType, onRefresh }: ScheduleGridProps) {
  const { t } = useLanguage();
  const { canManage } = useAuth();
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
      if (res.ok && onRefresh) onRefresh();
    } catch (e) {
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
  // If teacher has PRIMARY grades mixed with LOW_SECONDARY (e.g. Omely: 4B,5A,6B), use PRIMARY.
  // Pure LOW_SECONDARY teachers (grades 7-8 only) use SECONDARY time blocks.
  // Pure SECONDARY (9-12) stays SECONDARY.
  const hasPrimary   = (levelCounts["PRIMARY"] ?? 0) > 0;
  const hasLowSec    = (levelCounts["LOW_SECONDARY"] ?? 0) > 0;
  const hasSecondary = (levelCounts["SECONDARY"] ?? 0) > 0;
  // For fully mixed teachers (PRIMARY + SECONDARY grades), include all time blocks
  // so assignments at SECONDARY slots (14:15, etc.) are visible alongside PRIMARY ones.
  const isFullyMixed = hasPrimary && (hasLowSec || hasSecondary);
  const tbLevel = isFullyMixed
    ? null                                              // show all time blocks
    : (hasPrimary && hasLowSec)
    ? "PRIMARY"                                         // mixed PRIMARY+LOW_SEC -> PRIMARY schedule
    : dominantLevel === "LOW_SECONDARY" ? "SECONDARY"   // pure 7-8 -> SECONDARY schedule
    : dominantLevel;
  // Filter time blocks to only the relevant level (or BOTH), falling back to all if unclear
  const relevantTimeBlocks = tbLevel
    ? timeBlocks.filter(b => b.level === tbLevel || b.level === "BOTH")
    : timeBlocks;

  // Only show rows that have assignments OR are non-CLASS blocks within the teacher's active range
  const assignmentStartTimes = new Set(assignments.map(a => a.timeBlock.startTime));
  const sortedAssignmentTimes = [...assignmentStartTimes].sort();
  const firstTime = sortedAssignmentTimes[0] ?? "";
  const lastTime  = sortedAssignmentTimes[sortedAssignmentTimes.length - 1] ?? "";
  const uniqueStartTimes = Array.from(
    new Set(relevantTimeBlocks.map((b) => b.startTime))
  ).sort().filter(st => {
    const blocksAtTime = relevantTimeBlocks.filter(b => b.startTime === st);
    const hasClassBlock = blocksAtTime.some(b => b.blockType === "CLASS");
    if (hasClassBlock) return assignmentStartTimes.has(st);
    // Always show non-CLASS rows that have assignments (e.g. Arrival Duty at 07:15 REGISTRATION)
    if (assignmentStartTimes.has(st)) return true;
    // For BREAK/LUNCH/REGISTRATION with no assignments: only show strictly within active range
    if (assignments.length === 0) return true;
    if (!(st > firstTime && st < lastTime)) return false;
    // Suppress duplicate LUNCH slots: if another LUNCH slot without assignments is already in range,
    // only keep the one that matches the teacher's actual lunch time (closest to assignments)
    const blockType = blocksAtTime[0]?.blockType;
    if (blockType === "LUNCH") {
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

  const getBlockInfo = (startTime: string) => {
    return timeBlocks.find((b) => b.startTime === startTime);
  };

  // A row is "special" (BREAK/LUNCH/etc) only if every time block at that time is non-CLASS
  // AND no assignments exist for that row across all days
  const isRowSpecial = (startTime: string) => {
    const hasAnyAssignment = [1,2,3,4,5].some(d => getAssignmentsForSlot(d, startTime).length > 0);
    if (hasAnyAssignment) return false;
    const blocksAtTime = timeBlocks.filter(b => b.startTime === startTime);
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
                <TableRow key={startTime} className={`h-auto ${rowSpecial ? "print:h-6" : "print:h-auto"}`}>
                  <TableCell className="font-medium border-r bg-slate-50 dark:bg-slate-900 align-middle py-1 print:py-0.5 print:w-20">
                    <div className="text-xs font-bold print:text-[9px] whitespace-nowrap">
                      {blockInfo?.endTime ? `${startTime} - ${blockInfo.endTime}` : startTime}
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
                          blockInfo?.blockType === "LUNCH" ? "bg-amber-50" :
                          blockInfo?.blockType === "REGISTRATION" ? "bg-slate-50 dark:bg-slate-900" :
                          ""
                        }`}
                        onDragOver={canManage && viewType === "teacher" ? (e) => { e.preventDefault(); setDropTarget(dropKey); } : undefined}
                        onDragLeave={canManage && viewType === "teacher" ? () => setDropTarget(null) : undefined}
                        onDrop={canManage && viewType === "teacher" ? (e) => { e.preventDefault(); handleDrop(dayValue, startTime); } : undefined}
                      >
                        {slotAssignments.length === 0 && (blockInfo?.blockType === "LUNCH" || blockInfo?.blockType === "BREAK" || blockInfo?.blockType === "REGISTRATION") ? (
                          <div className="flex items-center justify-center py-1 print:py-0">
                            <span className={`text-xs font-bold tracking-widest uppercase print:text-[8px] ${
                              blockInfo?.blockType === "BREAK" ? "text-slate-500 dark:text-slate-400" :
                              blockInfo?.blockType === "LUNCH" ? "text-amber-600" :
                              "text-slate-400"
                            }`}>
                              {t.timeBlocks.types[blockInfo?.blockType as keyof typeof t.timeBlocks.types] || blockInfo?.blockType}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 print:gap-0">
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
                                    className={`p-2 print:p-0.5 text-xs print:text-[8px] border shadow-none relative group transition-colors ${
                                      canManage && viewType === "teacher" ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                                    } ${
                                      a.status === "CONFLICT"
                                        ? "border-red-300 bg-red-50 dark:bg-red-900/30 dark:border-red-500 hover:border-red-400"
                                        : a.subject.name.startsWith("Lunch Duty") || a.subject.name.startsWith("Arrival Duty") || a.subject.name.startsWith("Dismissal Duty") || a.subject.name === "Resource Room Support"
                                        ? "border-amber-300 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-500 hover:border-amber-400"
                                        : a.subject.name === "Homeroom"
                                        ? "border-purple-300 bg-purple-50 dark:bg-purple-900/30 dark:border-purple-500 hover:border-purple-400"
                                        : "border-blue-300 bg-blue-50 dark:bg-blue-900/40 dark:border-blue-500 hover:border-blue-400"
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
                                            {a.conflicts.map((c, i) => (
                                              <p key={i} className="text-xs">• {c.description}</p>
                                            ))}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    <div className="font-bold text-blue-900 dark:text-blue-300 truncate">{a.subject.name}</div>
                                    <div className="flex flex-col text-slate-600 dark:text-slate-200 print:text-slate-700">
                                      {viewType !== "grade" && (
                                        <span className="truncate">{a.grade ? `${t.schedule.types.grade}: ${a.grade.name}${a.grade.section ?? ""}` : ""}</span>
                                      )}
                                      {a.note && (
                                        <span className="text-xs text-slate-400 dark:text-slate-300">({a.note})</span>
                                      )}
                                      {viewType !== "teacher" && (
                                        <span className="truncate font-medium text-slate-700 dark:text-slate-300">{a.teacher.name}</span>
                                      )}
                                      {viewType !== "room" && a.room && (
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
    </TooltipProvider>
  );
}


