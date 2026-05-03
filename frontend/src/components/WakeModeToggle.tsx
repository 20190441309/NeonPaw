"use client";

interface Props {
  enabled: boolean;
  onToggle: () => void;
  isSupported: boolean;
  error?: string | null;
}

export default function WakeModeToggle({
  enabled,
  onToggle,
  isSupported,
  error,
}: Props) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      disabled={!isSupported}
      className={`
        text-[10px] tracking-wider px-2 py-0.5 border rounded-sm transition-all duration-200
        ${
          !isSupported
            ? "border-gray-600 opacity-30 cursor-not-allowed"
            : error
              ? "border-red-500/60 text-red-400/70"
              : enabled
                ? "border-[var(--terminal-text)] text-[var(--terminal-text)] bg-[var(--terminal-text)]/10"
                : "border-[var(--terminal-border)] opacity-50 hover:opacity-80"
        }
      `}
      title={
        !isSupported
          ? "浏览器不支持语音识别"
          : error || (enabled ? "点击关闭唤醒词" : "点击开启唤醒词")
      }
    >
      {error ? "ERR" : enabled ? "WAKE:ON" : "WAKE"}
    </button>
  );
}
