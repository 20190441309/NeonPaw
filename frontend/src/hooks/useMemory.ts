"use client";
import { useState, useCallback, useEffect } from "react";
import { MemoryEntry, MemoryCategory } from "@/lib/types";
import {
  callMemoryListApi,
  callMemoryCreateApi,
  callMemoryUpdateApi,
  callMemoryDeleteApi,
  callMemoryClearApi,
  callMemoryExportApi,
  callMemoryImportApi,
} from "@/lib/api";

const STORAGE_KEY = "neon_paw_memories";
const FIRST_SAVE_KEY = "neon_paw_memory_first_saved";
const MAX_MEMORIES = 30;

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// ---------------------------------------------------------------------------
// localStorage helpers (fallback when backend is unavailable)
// ---------------------------------------------------------------------------

function loadLocalMemories(): MemoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is MemoryEntry =>
        typeof m === "object" && typeof m.content === "string" && typeof m.createdAt === "string",
    );
  } catch {
    return [];
  }
}

function persistLocalMemories(memories: MemoryEntry[]) {
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

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMemory() {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [firstTimeNotice, setFirstTimeNotice] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);

  // Hydrate from backend or localStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Try backend first
      const remote = await callMemoryListApi();
      if (cancelled) return;

      if (remote && remote.memories) {
        setMemories(
          remote.memories.map((m) => ({
            id: m.id,
            content: m.content,
            createdAt: m.createdAt || m.created_at || "",
            category: m.category,
            pinned: m.pinned,
          })),
        );
        setBackendAvailable(true);
      } else {
        // Fallback to localStorage
        setMemories(loadLocalMemories());
        setBackendAvailable(false);
      }
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist to localStorage when not using backend
  useEffect(() => {
    if (hydrated && !backendAvailable) persistLocalMemories(memories);
  }, [memories, hydrated, backendAvailable]);

  const addMemory = useCallback(async (content: string, category: MemoryCategory = "custom") => {
    const trimmed = content.trim();
    if (!trimmed) return false;

    // Dedup check (local)
    const norm = normalize(trimmed);
    const isDuplicate = memories.some((m) => normalize(m.content) === norm);
    if (isDuplicate) return false;

    const isFirst = !hasSeenFirstSave();

    if (backendAvailable) {
      const result = await callMemoryCreateApi(trimmed, category);
      if (result) {
        setMemories((prev) => [result, ...prev].slice(-MAX_MEMORIES));
      } else {
        return false;
      }
    } else {
      const entry: MemoryEntry = {
        content: trimmed,
        createdAt: new Date().toISOString(),
        category,
      };
      setMemories((prev) => [...prev, entry].slice(-MAX_MEMORIES));
    }

    setLastSaved(trimmed);
    if (isFirst) {
      setFirstTimeNotice(true);
      markFirstSaveSeen();
    }
    return true;
  }, [memories, backendAvailable]);

  const removeMemory = useCallback(async (idOrIndex: number) => {
    if (backendAvailable) {
      // idOrIndex is the memory id
      const ok = await callMemoryDeleteApi(idOrIndex);
      if (ok) {
        setMemories((prev) => prev.filter((m) => m.id !== idOrIndex));
      }
    } else {
      // idOrIndex is the array index
      setMemories((prev) => prev.filter((_, i) => i !== idOrIndex));
    }
  }, [backendAvailable]);

  const updateMemory = useCallback(async (id: number, patch: { content?: string; category?: MemoryCategory; pinned?: boolean }) => {
    if (!backendAvailable) return;
    const result = await callMemoryUpdateApi(id, patch);
    if (result) {
      setMemories((prev) => prev.map((m) => (m.id === id ? { ...m, ...result } : m)));
    }
  }, [backendAvailable]);

  const clearMemories = useCallback(async () => {
    if (backendAvailable) {
      await callMemoryClearApi();
    }
    setMemories([]);
  }, [backendAvailable]);

  const clearLastSaved = useCallback(() => setLastSaved(null), []);
  const clearFirstTimeNotice = useCallback(() => setFirstTimeNotice(false), []);

  const exportMemories = useCallback(async (): Promise<boolean> => {
    const data = await callMemoryExportApi();
    if (!data) return false;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neon-paw-memories-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }, []);

  const importMemories = useCallback(async (file: File): Promise<{ imported: number; skipped: number } | null> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || !Array.isArray(data.memories)) return null;
      const items = data.memories
        .filter((m: Record<string, unknown>) => typeof m === "object" && typeof m.content === "string")
        .map((m: Record<string, unknown>) => ({
          content: String(m.content),
          category: typeof m.category === "string" ? m.category : "custom",
          pinned: Boolean(m.pinned),
        }));
      if (items.length === 0) return null;

      if (backendAvailable) {
        const result = await callMemoryImportApi(items);
        if (result) {
          // Refresh from backend
          const remote = await callMemoryListApi();
          if (remote && remote.memories) {
            setMemories(
              remote.memories.map((m) => ({
                id: m.id,
                content: m.content,
                createdAt: m.createdAt || m.created_at || "",
                category: m.category,
                pinned: m.pinned,
              })),
            );
          }
          return { imported: result.imported, skipped: result.skipped };
        }
        return null;
      } else {
        // Local import: dedup against existing
        let imported = 0;
        let skipped = 0;
        const existing = [...memories];
        for (const item of items) {
          const norm = normalize(item.content);
          if (existing.some((m) => normalize(m.content) === norm)) {
            skipped++;
            continue;
          }
          existing.push({
            content: item.content,
            createdAt: new Date().toISOString(),
            category: item.category as MemoryCategory,
            pinned: item.pinned,
          });
          imported++;
        }
        setMemories(existing);
        return { imported, skipped };
      }
    } catch {
      return null;
    }
  }, [backendAvailable, memories]);

  return {
    memories,
    addMemory,
    removeMemory,
    updateMemory,
    clearMemories,
    exportMemories,
    importMemories,
    lastSaved,
    clearLastSaved,
    firstTimeNotice,
    clearFirstTimeNotice,
    backendAvailable,
  };
}
