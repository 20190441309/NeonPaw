"use client";

import { MemoryEntry } from "@/lib/types";

interface Props {
  memories: MemoryEntry[];
  onRemove?: (index: number) => void;
}

export default function MemoryPanel({ memories, onRemove }: Props) {
  if (memories.length === 0) return null;

  return (
    <div className="mt-3 text-[10px] border border-[var(--terminal-border)]/50 rounded-sm bg-[var(--terminal-accent)]">
      <div className="flex items-center justify-between px-3 py-1.5 opacity-40 tracking-wider">
        <span>MEMORY BANK</span>
        <span className="text-[8px]">{memories.length} ENTRIES</span>
      </div>
      <div className="px-3 pb-2 space-y-1 border-t border-[var(--terminal-border)]/30 max-h-24 overflow-y-auto terminal-scroll">
        {memories.map((m, i) => (
          <div key={i} className="flex items-start justify-between gap-2 leading-relaxed group">
            <span className="opacity-50 break-all">{m.content}</span>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="shrink-0 opacity-0 group-hover:opacity-40 hover:!opacity-70 transition-opacity text-[8px]"
              >
                DEL
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
