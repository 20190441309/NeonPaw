"use client";
import { useState, useCallback, useEffect } from "react";
import { MemoryEntry } from "@/lib/types";

const STORAGE_KEY = "neon_paw_memories";
const FIRST_SAVE_KEY = "neon_paw_memory_first_saved";
const MAX_MEMORIES = 30;

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function loadMemories(): MemoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is MemoryEntry =>
        typeof m === "object" &&
        typeof m.content === "string" &&
        typeof m.createdAt === "string"
    );
  } catch {
    return [];
  }
}

function persistMemories(memories: MemoryEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memories.slice(-MAX_MEMORIES)));
}

function hasSeenFirstSave(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(FIRST_SAVE_KEY) === "1";
}

function markFirstSaveSeen() {
  if (typeof window === "undefined") return;
  localStorage.setItem(FIRST_SAVE_KEY, "1");
}

export function useMemory() {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [firstTimeNotice, setFirstTimeNotice] = useState(false);

  useEffect(() => {
    setMemories(loadMemories());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) persistMemories(memories);
  }, [memories, hydrated]);

  const addMemory = useCallback((content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return false;
    const norm = normalize(trimmed);
    const isFirst = !hasSeenFirstSave();
    setMemories((prev) => {
      if (prev.some((m) => normalize(m.content) === norm)) return prev;
      setLastSaved(trimmed);
      if (isFirst) {
        setFirstTimeNotice(true);
        markFirstSaveSeen();
      }
      return [...prev, { content: trimmed, createdAt: new Date().toISOString() }].slice(-MAX_MEMORIES);
    });
    return true;
  }, []);

  const removeMemory = useCallback((index: number) => {
    setMemories((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearMemories = useCallback(() => {
    setMemories([]);
  }, []);

  const clearLastSaved = useCallback(() => {
    setLastSaved(null);
  }, []);

  const clearFirstTimeNotice = useCallback(() => {
    setFirstTimeNotice(false);
  }, []);

  return { memories, addMemory, removeMemory, clearMemories, lastSaved, clearLastSaved, firstTimeNotice, clearFirstTimeNotice };
}
