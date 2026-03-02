"use client";

import { TableHead } from "@/components/ui/table";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export type SortDir = "asc" | "desc" | null;

interface SortableHeadProps {
  label: string;
  field: string;
  sortField: string | null;
  sortDir: SortDir;
  onSort: (field: string) => void;
  className?: string;
}

export function SortableHead({ label, field, sortField, sortDir, onSort, className = "" }: SortableHeadProps) {
  const active = sortField === field;
  return (
    <TableHead
      className={`cursor-pointer select-none hover:bg-slate-100 transition-colors ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {active && sortDir === "asc"  && <ChevronUp className="w-3.5 h-3.5 text-blue-600" />}
        {active && sortDir === "desc" && <ChevronDown className="w-3.5 h-3.5 text-blue-600" />}
        {!active && <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />}
      </div>
    </TableHead>
  );
}

export function useSorting<T>(items: T[], sortField: string | null, sortDir: SortDir): T[] {
  if (!sortField || !sortDir) return items;
  return [...items].sort((a: any, b: any) => {
    const av = a[sortField] ?? "";
    const bv = b[sortField] ?? "";
    const cmp = typeof av === "number" && typeof bv === "number"
      ? av - bv
      : String(av).localeCompare(String(bv), undefined, { sensitivity: "base" });
    return sortDir === "asc" ? cmp : -cmp;
  });
}
