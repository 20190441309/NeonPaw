"use client";
import { useState } from "react";
import { TraceEntry } from "@/lib/types";

interface Props {
  trace: TraceEntry[];
}

export default function AgentTracePanel({ trace }: Props) {
  const [open, setOpen] = useState(false);

  if (trace.length === 0) return null;

  return (
    <div className="mt-3 text-[10px] border border-[var(--terminal-border)]/50 rounded-sm bg-[var(--terminal-accent)]">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="w-full flex items-center justify-between px-3 py-1.5 opacity-40 hover:opacity-70 transition-opacity tracking-wider"
      >
        <span>AGENT TRACE</span>
        <span className="text-[8px]">{open ? "▼" : "▶"}</span>
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-1 border-t border-[var(--terminal-border)]/30">
          {trace.map((t, i) => (
            <div key={i} className="flex gap-2 leading-relaxed">
              <span className="shrink-0 opacity-30">[{t.module}]</span>
              <span className="opacity-50">{t.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
