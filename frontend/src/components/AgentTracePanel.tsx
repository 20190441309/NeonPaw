"use client";
import { useState, useMemo } from "react";
import { TraceEntry } from "@/lib/types";

interface Props {
  trace: TraceEntry[];
  traceMode?: "simple" | "developer";
}

// Modules shown in simple mode (key decisions only)
const SIMPLE_MODULES = new Set(["intent", "emotion", "action", "fallback"]);

// Level → color mapping
const LEVEL_COLORS: Record<string, string> = {
  info: "text-[var(--terminal-text)]/50",
  warning: "text-yellow-400/60",
  error: "text-red-400/60",
};

// Module → display label
const MODULE_LABELS: Record<string, string> = {
  intent: "INTENT",
  emotion: "EMOTION",
  action: "ACTION",
  state_delta: "STATE",
  persona: "REPLY",
  memory: "MEMORY",
  validation: "VALID",
  fallback: "FALLBACK",
  root_agent: "AGENT",
};

export default function AgentTracePanel({ trace, traceMode = "simple" }: Props) {
  const [open, setOpen] = useState(false);

  const simpleTrace = useMemo(
    () => trace.filter((t) => SIMPLE_MODULES.has(t.module)),
    [trace],
  );

  const displayTrace = traceMode === "simple" ? simpleTrace : trace;

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
        <span className="text-[8px] flex items-center gap-2">
          <span className="opacity-50">{trace.length} STEPS</span>
          <span>{open ? "▼" : "▶"}</span>
        </span>
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-1 border-t border-[var(--terminal-border)]/30 max-h-48 overflow-y-auto terminal-scroll">
          {/* Mode indicator */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[8px] tracking-wider opacity-50">
              {traceMode === "simple" ? "SIMPLE" : "DEVELOPER"}
            </span>
            {traceMode === "simple" && simpleTrace.length < trace.length && (
              <span className="opacity-20 text-[8px]">
                ({trace.length - simpleTrace.length} hidden)
              </span>
            )}
          </div>

          {/* Trace entries */}
          {displayTrace.map((t, i) => {
            const level = t.level || "info";
            const color = LEVEL_COLORS[level] || LEVEL_COLORS.info;
            const label = MODULE_LABELS[t.module] || t.module.toUpperCase();

            return (
              <div key={i} className="flex gap-2 leading-relaxed">
                <span className="shrink-0 opacity-30 text-[8px]">[{label}]</span>
                <span className={`${color} break-all`}>{t.message}</span>
              </div>
            );
          })}

          {displayTrace.length === 0 && (
            <div className="opacity-20 text-[8px] pt-1">
              No key decisions in this response.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
