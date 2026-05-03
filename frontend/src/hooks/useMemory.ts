"use client";
import { useState, useCallback, useEffect } from "react";
import { MemoryEntry } from "@/lib/types";

const STORAGE_KEY = "neon_paw_memories";
const MAX_MEMORIES = 30;

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

  useEffect(() => {
    setMemories(loadMemories());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) persistMemories(memories);
  }, [memories, hydrated]);

  const addMemory = useCallback((content: string) => {
    if (!content.trim()) return;
    setMemories((prev) => {
      // Deduplicate: skip if same content already exists
      if (prev.some((m) => m.content === content.trim())) return prev;
      return [
        ...prev,
        { content: content.trim(), createdAt: new Date().toISOString() },
      ].slice(-MAX_MEMORIES);
    });
  }, []);

  const removeMemory = useCallback((index: number) => {
    setMemories((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return { memories, addMemory, removeMemory };
}
