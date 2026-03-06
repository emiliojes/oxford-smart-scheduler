"use client";

import { useEffect } from "react";
import { useHistory } from "@/context/HistoryContext";
import { Button } from "@/components/ui/button";
import { Undo2, Redo2 } from "lucide-react";
import { toast } from "sonner";

export function UndoRedoBar() {
  const { canUndo, canRedo, undo, redo, undoStack } = useHistory();

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        if (canUndo) { e.preventDefault(); undo().then(() => toast.info("Deshacer: " + undoStack[undoStack.length - 1]?.description)); }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        if (canRedo) { e.preventDefault(); redo().then(() => toast.info("Rehacer")); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canUndo, canRedo, undo, redo, undoStack]);

  if (!canUndo && !canRedo) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-slate-900 text-white rounded-full shadow-xl px-3 py-1.5 no-print">
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-white hover:bg-slate-700 disabled:opacity-30 gap-1"
        disabled={!canUndo}
        onClick={() => {
          const last = undoStack[undoStack.length - 1];
          undo().then(() => toast.success(`Deshecho: ${last?.description ?? ""}`));
        }}
        title="Deshacer (Ctrl+Z)"
      >
        <Undo2 className="w-4 h-4" />
        <span className="text-xs">Deshacer</span>
      </Button>
      <div className="w-px h-4 bg-slate-600" />
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-white hover:bg-slate-700 disabled:opacity-30 gap-1"
        disabled={!canRedo}
        onClick={() => {
          redo().then(() => toast.success("Rehecho"));
        }}
        title="Rehacer (Ctrl+Y)"
      >
        <Redo2 className="w-4 h-4" />
        <span className="text-xs">Rehacer</span>
      </Button>
    </div>
  );
}
