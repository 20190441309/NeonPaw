"use client";

import { TraceEntry } from "@/lib/types";

interface Props {
  trace: TraceEntry[];
  isConnected: boolean;
  memoryCount?: number;
}

export default function StatusHint({ trace, isConnected, memoryCount }: Props) {
  const isFallback = trace.some((t) => t.module === "fallback");
  const isLlm = trace.some(
    (t) => t.module === "root_agent" && t.message.includes("LLM")
  );

  const backendLabel = !isConnected
    ? "OFFLINE"
    : isFallback
      ? "FALLBACK"
      : "ONLINE";

  const backendColor = !isConnected
    ? "text-red-400"
    : isFallback
      ? "text-yellow-400/70"
      : "text-[var(--terminal-text)]/50";

  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1">
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            isConnected ? "bg-[var(--terminal-text)]/50 status-dot-blink" : "bg-red-400/50"
          }`}
        />
        <span className={backendColor}>{backendLabel}</span>
      </span>
      {isLlm && (
        <span className="opacity-30">LLM</span>
      )}
      {memoryCount != null && memoryCount > 0 && (
        <span className="opacity-30">MEM:{memoryCount}</span>
      )}
    </div>
  );
}
