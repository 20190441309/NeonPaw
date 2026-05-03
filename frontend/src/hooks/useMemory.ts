"use client";
import { useState, useCallback, useEffect } from "react";
import { MemoryEntry } from "@/lib/types";

const STORAGE_KEY = "neon_paw_memories";
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

export function useMemory() {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

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
    setMemories((prev) => {
      if (prev.some((m) => normalize(m.content) === norm)) return prev;
      setLastSaved(trimmed);
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

  return { memories, addMemory, removeMemory, clearMemories, lastSaved, clearLastSaved };
}
