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
  grade: { name: string; section: string | null };
  room: { name: string };
  timeBlock: {
    dayOfWeek: number;
    startTime: string;
    duration: string;
    blockType: string;
  };
  status: string;
  conflicts: Array<{ description: string }>;
}

interface TimeBlock {
  id: string;
  dayOfWeek: number;
  startTime: string;
  duration: string;
  blockType: string;
}

interface ScheduleGridProps {
  assignments: Assignment[];
  timeBlocks: TimeBlock[];
  viewType: "teacher" | "grade" | "room";
}

const DAYS = [
  { value: 1, label: "MONDAY" },
  { value: 2, label: "TUESDAY" },
  { value: 3, label: "WEDNESDAY" },
  { value: 4, label: "THURSDAY" },
  { value: 5, label: "FRIDAY" },
];

export function ScheduleGrid({ assignments, timeBlocks, viewType }: ScheduleGridProps) {
  const { t } = useLanguage();
  // Organizar bloques por hora de inicio única para las filas
  const uniqueStartTimes = Array.from(
    new Set(timeBlocks.map((b) => b.startTime))
  ).sort();

  const getAssignmentsForSlot = (dayOfWeek: number, startTime: string) => {
    return assignments.filter(
      (a) => a.timeBlock.dayOfWeek === dayOfWeek && a.timeBlock.startTime === startTime
    );
  };

  const getBlockInfo = (startTime: string) => {
    return timeBlocks.find((b) => b.startTime === startTime);
  };

  return (
    <TooltipProvider>
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <Table className="border-collapse">
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[120px] border-r font-bold text-slate-900">{t.schedule.grid.time}</TableHead>
              {t.timeBlocks.days.map((dayLabel: string, index: number) => (
                <TableHead key={index + 1} className="text-center font-bold text-slate-900 border-r last:border-r-0">
                  {dayLabel.toUpperCase()}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {uniqueStartTimes.map((startTime) => {
              const blockInfo = getBlockInfo(startTime);
              const isSpecialBlock = blockInfo?.blockType !== "CLASS";

              return (
                <TableRow key={startTime} className="h-24">
                  <TableCell className="font-medium border-r bg-slate-50 align-top py-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold">{startTime}</span>
                      <span className="text-xs text-slate-500">
                        {t.subjects.durations[blockInfo?.duration as keyof typeof t.subjects.durations]}
                      </span>
                    </div>
                  </TableCell>
                  
                  {[1, 2, 3, 4, 5].map((dayValue) => {
                    const slotAssignments = getAssignmentsForSlot(dayValue, startTime);
                    const hasConflict = slotAssignments.some(a => a.status === "CONFLICT");

                    return (
                      <TableCell 
                        key={`${dayValue}-${startTime}`} 
                        className={`border-r last:border-r-0 p-1 align-top ${
                          isSpecialBlock ? "bg-slate-50/50" : ""
                        }`}
                      >
                        {isSpecialBlock && slotAssignments.length === 0 ? (
                          <div className="h-full flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">
                              {t.timeBlocks.types[blockInfo?.blockType as keyof typeof t.timeBlocks.types] || blockInfo?.blockType}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {slotAssignments.map((a) => (
                              <AssignmentForm
                                key={a.id}
                                initialData={a}
                                onSuccess={() => window.location.reload()}
                                trigger={
                                  <Card 
                                    className={`p-2 text-xs border shadow-none relative group cursor-pointer hover:border-blue-400 transition-colors ${
                                      a.status === "CONFLICT" 
                                        ? "border-red-200 bg-red-50" 
                                        : "border-blue-100 bg-blue-50/50"
                                    }`}
                                  >
                                    {a.status === "CONFLICT" && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="absolute top-1 right-1 text-red-500 cursor-help">
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
                                    
                                    <div className="font-bold text-blue-900 truncate">
                                      {a.subject.name}
                                    </div>
                                    <div className="flex flex-col text-slate-600 mt-1">
                                      {viewType !== "grade" && (
                                        <span className="truncate">{t.schedule.types.grade}: {a.grade.name}{a.grade.section}</span>
                                      )}
                                      {viewType !== "teacher" && (
                                        <span className="truncate">{t.schedule.types.teacher}: {a.teacher.name}</span>
                                      )}
                                      {viewType !== "room" && (
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
    </TooltipProvider>
  );
}
