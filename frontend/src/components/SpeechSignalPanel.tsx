"use client";

interface Props {
  isActive: boolean;
  mode: string;
  confidence: number | null;
  interimTranscript: string;
  isLowConfidence?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function bar(level: number): string {
  const filled = clamp(level, 0, 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

function modeLabel(mode: string): string {
  switch (mode) {
    case "click":
      return "CLICK MIC";
    case "wake_listening":
      return "WAKE SCAN";
    case "command_listening":
      return "COMMAND";
    case "session_listening":
      return "SESSION";
    case "confirm":
      return "CONFIRM";
    default:
      return "VOICE LINK";
  }
}

export default function SpeechSignalPanel({
  isActive,
  mode,
  confidence,
  interimTranscript,
  isLowConfidence,
}: Props) {
  if (!isActive) return null;

  const confidenceLevel =
    confidence == null ? null : clamp(Math.round(confidence * 10), 0, 10);
  const signalLevel =
    confidenceLevel ?? (interimTranscript.length > 0 ? 7 : mode === "wake_listening" ? 3 : 5);
  const confidenceLabel =
    confidence == null ? "WAITING" : `${Math.round(confidence * 100)}%`;

  return (
    <div className="mt-3 border border-[var(--terminal-border)] rounded-sm px-3 py-2 text-[10px] tracking-wider">
      <div className="flex items-center justify-between gap-3">
        <span className="opacity-50">{modeLabel(mode)}</span>
        <span className={isLowConfidence ? "text-yellow-400/80" : "opacity-50"}>
          CONF {confidenceLabel}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 font-mono">
        <span className={isLowConfidence ? "text-yellow-400/80" : "text-[var(--terminal-text)]"}>
          {bar(signalLevel)}
        </span>
        <span className="opacity-40">
          {isLowConfidence ? "VERIFY" : interimTranscript ? "HEARING" : "STANDBY"}
        </span>
      </div>
      {interimTranscript && (
        <div className="mt-2 text-xs opacity-50 text-center glow-subtle">
          {interimTranscript}...
        </div>
      )}
    </div>
  );
}
