"use client";

import { useState } from "react";
import { MemoryEntry } from "@/lib/types";

interface Props {
  memories: MemoryEntry[];
  onRemove?: (index: number) => void;
  onClearAll?: () => void;
}

export default function MemoryPanel({ memories, onRemove, onClearAll }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  if (memories.length === 0) return null;

  return (
    <div className="mt-3 text-[10px] border border-[var(--terminal-border)]/50 rounded-sm bg-[var(--terminal-accent)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 opacity-40 hover:opacity-70 transition-opacity tracking-wider"
      >
        <span>MEMORY BANK</span>
        <span className="text-[8px]">{memories.length} ENTRIES {open ? "▼" : "▶"}</span>
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-1 border-t border-[var(--terminal-border)]/30 max-h-28 overflow-y-auto terminal-scroll">
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
          {onClearAll && (
            <div className="pt-1 border-t border-[var(--terminal-border)]/20">
              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="opacity-30 hover:opacity-60 transition-opacity text-[8px] tracking-wider"
                >
                  CLEAR ALL
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="opacity-40 text-[8px]">CONFIRM?</span>
                  <button
                    type="button"
                    onClick={() => { onClearAll(); setConfirmClear(false); }}
                    className="text-red-400/60 hover:text-red-400 transition-colors text-[8px]"
                  >
                    YES, CLEAR
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="opacity-40 hover:opacity-70 transition-opacity text-[8px]"
                  >
                    CANCEL
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
