"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
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
  const hasPrimary = (levelCounts["PRIMARY"] ?? 0) > 0;
  const hasLowSec  = (levelCounts["LOW_SECONDARY"] ?? 0) > 0;
  const tbLevel = (hasPrimary && hasLowSec)
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
    // For BREAK/LUNCH/REGISTRATION: only show if within teacher's active time range
    if (assignments.length === 0) return true;
    // Must be strictly between first and last assignment (not after last)
    return st > firstTime && st < lastTime;
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
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto w-full">
        <Table className="border-collapse min-w-[600px]">
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[70px] md:w-[100px] border-r font-bold text-slate-900 text-xs md:text-sm">{t.schedule.grid.time}</TableHead>
              {t.timeBlocks.days.map((dayLabel: string, index: number) => (
                <TableHead key={index + 1} className="text-center font-bold text-slate-900 border-r last:border-r-0 text-xs md:text-sm">
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
                  <TableCell className="font-medium border-r bg-slate-50 align-middle py-1 print:py-0.5 print:w-20">
                    <div className="text-xs font-bold print:text-[9px] whitespace-nowrap">
                      {blockInfo?.endTime ? `${startTime} - ${blockInfo.endTime}` : startTime}
                    </div>
                  </TableCell>
                  
                  {[1, 2, 3, 4, 5].map((dayValue) => {
                    const slotAssignments = getAssignmentsForSlot(dayValue, startTime);
                    const hasConflict = slotAssignments.some(a => a.status === "CONFLICT");

                    return (
                      <TableCell
                        key={`${dayValue}-${startTime}`}
                        className={`border-r last:border-r-0 p-1 print:p-0.5 align-top ${
                          blockInfo?.blockType === "BREAK" ? "bg-slate-100" :
                          blockInfo?.blockType === "LUNCH" ? "bg-amber-50" :
                          blockInfo?.blockType === "REGISTRATION" ? "bg-slate-50" :
                          ""
                        }`}
                      >
                        {slotAssignments.length === 0 && (blockInfo?.blockType === "LUNCH" || blockInfo?.blockType === "BREAK" || blockInfo?.blockType === "REGISTRATION") ? (
                          <div className="flex items-center justify-center py-1 print:py-0">
                            <span className={`text-xs font-bold tracking-widest uppercase print:text-[8px] ${
                              blockInfo?.blockType === "BREAK" ? "text-slate-500" :
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
                                    className={`p-2 print:p-0.5 text-xs print:text-[8px] border shadow-none relative group cursor-pointer transition-colors ${
                                      a.status === "CONFLICT"
                                        ? "border-red-200 bg-red-50 hover:border-red-400"
                                        : a.subject.name.startsWith("Lunch Duty")
                                        ? "border-amber-200 bg-amber-50 hover:border-amber-400"
                                        : a.subject.name === "Dismissal Duty"
                                        ? "border-orange-200 bg-orange-50 hover:border-orange-400"
                                        : a.subject.name === "Homeroom"
                                        ? "border-purple-200 bg-purple-50 hover:border-purple-400"
                                        : "border-blue-100 bg-blue-50/50 hover:border-blue-400"
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
                                    <div className="font-bold text-blue-900 truncate">{a.subject.name}</div>
                                    <div className="flex flex-col text-slate-600 print:text-slate-700">
                                      {viewType !== "grade" && (
                                        <span className="truncate">{a.grade ? `${t.schedule.types.grade}: ${a.grade.name}${a.grade.section ?? ""}` : ""}</span>
                                      )}
                                      {a.note && (
                                        <span className="text-xs text-slate-400">({a.note})</span>
                                      )}
                                      {viewType !== "teacher" && (
                                        <span className="truncate font-medium text-slate-700">{a.teacher.name}</span>
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
