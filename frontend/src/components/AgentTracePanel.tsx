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
    <div className="mt-3 text-xs border border-[var(--terminal-border)] rounded-sm">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="w-full flex items-center justify-between px-3 py-1.5 opacity-60 hover:opacity-100 transition-opacity"
      >
        <span>AGENT TRACE</span>
        <span>{open ? "▼" : "▶"}</span>
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-1 border-t border-[var(--terminal-border)]">
          {trace.map((t, i) => (
            <div key={i} className="flex gap-2">
              <span className="shrink-0 opacity-40">[{t.module}]</span>
              <span className="opacity-70">{t.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
