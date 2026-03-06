"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type ActionType = "MOVE" | "EDIT" | "DELETE" | "CREATE";

export interface HistoryEntry {
  id: string;            // assignment id
  actionType: ActionType;
  description: string;   // human readable, e.g. "Moved Reading and Phonics (Mon 08:00)"
  // snapshot before the action — used to undo
  before: {
    teacherId: string;
    subjectId: string;
    gradeId: string | null;
    roomId: string | null;
    timeBlockId: string;
  } | null;              // null = assignment was created (undo = delete)
  // snapshot after the action — used to redo
  after: {
    teacherId: string;
    subjectId: string;
    gradeId: string | null;
    roomId: string | null;
    timeBlockId: string;
  } | null;              // null = assignment was deleted (redo = delete)
}

interface HistoryContextType {
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  pushAction: (entry: HistoryEntry) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
}

const HistoryContext = createContext<HistoryContextType>({
  undoStack: [], redoStack: [],
  pushAction: () => {},
  undo: async () => {},
  redo: async () => {},
  canUndo: false, canRedo: false,
});

const MAX_HISTORY = 20;

async function applySnapshot(
  id: string,
  snapshot: HistoryEntry["before"] | HistoryEntry["after"],
  isDelete: boolean
): Promise<boolean> {
  if (isDelete) {
    const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" });
    return res.ok;
  }
  if (!snapshot) return false;
  const res = await fetch(`/api/assignments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snapshot),
  });
  return res.ok;
}

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);

  const pushAction = useCallback((entry: HistoryEntry) => {
    setUndoStack(prev => [...prev.slice(-MAX_HISTORY + 1), entry]);
    setRedoStack([]); // clear redo on new action
  }, []);

  const undo = useCallback(async () => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const entry = prev[prev.length - 1];
      const rest = prev.slice(0, -1);
      // Apply reverse
      const isDelete = entry.before === null; // was CREATE → undo = delete
      applySnapshot(entry.id, entry.before, isDelete).then(ok => {
        if (ok) {
          setRedoStack(r => [...r, entry]);
          // Trigger global refresh via custom event
          window.dispatchEvent(new CustomEvent("schedule-refresh"));
        }
      });
      return rest;
    });
  }, []);

  const redo = useCallback(async () => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const entry = prev[prev.length - 1];
      const rest = prev.slice(0, -1);
      const isDelete = entry.after === null; // was DELETE → redo = delete again
      applySnapshot(entry.id, entry.after, isDelete).then(ok => {
        if (ok) {
          setUndoStack(u => [...u, entry]);
          window.dispatchEvent(new CustomEvent("schedule-refresh"));
        }
      });
      return rest;
    });
  }, []);

  return (
    <HistoryContext.Provider value={{
      undoStack, redoStack, pushAction, undo, redo,
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
    }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  return useContext(HistoryContext);
}
