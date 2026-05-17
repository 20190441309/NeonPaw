"use client";

import { TraceEntry, HealthStatus } from "@/lib/types";

interface Props {
  trace: TraceEntry[];
  isConnected: boolean;
  memoryCount?: number;
  health?: HealthStatus | null;
}

export default function StatusHint({ trace, isConnected, memoryCount, health }: Props) {
  const isFallback = trace.some((t) => t.module === "fallback");

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

  const llmMode = health?.llm.mode;
  const llmProvider = health?.llm.provider;
  const uptime = health?.uptime_seconds;

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
      {llmMode && (
        <span className={llmMode === "mock" ? "text-yellow-400/50" : "text-[var(--terminal-text)]/30"}>
          {llmMode === "mock" ? "MOCK" : (llmProvider?.toUpperCase() ?? "LLM")}
        </span>
      )}
      {uptime != null && uptime > 0 && (
        <span className="opacity-20">
          {uptime >= 3600
            ? `${Math.floor(uptime / 3600)}h`
            : uptime >= 60
              ? `${Math.floor(uptime / 60)}m`
              : `${Math.floor(uptime)}s`}
        </span>
      )}
      {memoryCount != null && memoryCount > 0 && (
        <span className="opacity-30">MEM:{memoryCount}</span>
      )}
    </div>
  );
}
