"use client";

interface Props {
  isListening: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  isError?: boolean;
  isSupported: boolean;
  isWakeWordActive?: boolean;
  isPendingConfirm?: boolean;
  isLowConfidence?: boolean;
  onClick: () => void;
}

export default function VoiceButton({
  isListening,
  isThinking,
  isSpeaking,
  isError,
  isSupported,
  isWakeWordActive,
  isPendingConfirm,
  isLowConfidence,
  onClick,
}: Props) {
  const isDisabled = isThinking || isSpeaking || !isSupported || isPendingConfirm;

  const stateLabel = !isSupported
    ? "浏览器不支持语音"
    : isError
      ? "信号异常"
      : isPendingConfirm
        ? "等待确认..."
        : isListening
          ? "正在听..."
          : isThinking
            ? "思考中..."
            : isSpeaking
              ? "回复中..."
              : isWakeWordActive
                ? "唤醒监听中..."
                : "点击说话";

  return (
    <div className="flex justify-center flex-col items-center mt-4 gap-2">
      <button
        onClick={onClick}
        disabled={isDisabled}
        className={`
          relative w-14 h-14 rounded-full border-2 flex items-center justify-center
          transition-all duration-300 text-lg
          ${
            !isSupported
              ? "border-gray-600 opacity-30 cursor-not-allowed"
              : isError
                ? "border-red-500/60 bg-red-500/10 cursor-pointer"
                : isPendingConfirm
                  ? isLowConfidence
                    ? "border-yellow-500/60 bg-yellow-500/10 cursor-not-allowed"
                    : "border-yellow-400/60 bg-yellow-400/5 cursor-not-allowed"
                  : isListening
                    ? "border-red-500 bg-red-500/20 voice-pulse cursor-pointer"
                    : isThinking
                      ? "border-[var(--terminal-text)] opacity-60 cursor-not-allowed"
                      : isSpeaking
                        ? "border-[var(--terminal-text)] bg-[var(--terminal-text)]/10 cursor-not-allowed"
                        : isWakeWordActive
                          ? "border-green-500/60 bg-green-500/5 cursor-pointer"
                          : "border-[var(--terminal-text)]/60 hover:border-[var(--terminal-text)] hover:bg-[var(--terminal-text)]/10 cursor-pointer"
          }
        `}
        aria-label={isListening ? "停止录音" : "开始说话"}
      >
        {isThinking ? (
          <span className="voice-spin text-[var(--terminal-text)]">◎</span>
        ) : isSpeaking ? (
          <span className="voice-wave">
            <span /><span /><span /><span />
          </span>
        ) : isPendingConfirm ? (
          <span className="text-yellow-400">?</span>
        ) : isListening ? (
          <span className="text-red-500">●</span>
        ) : isWakeWordActive ? (
          <span className="text-green-500">●</span>
        ) : isError ? (
          <span className="text-red-400">!</span>
        ) : (
          <span className="opacity-70">🎤</span>
        )}
      </button>

      <div className={`text-[10px] tracking-wider ${!isSupported ? "opacity-50" : isError ? "text-red-400 opacity-70" : isPendingConfirm ? "text-yellow-400/60" : "opacity-40"}`}>
        {stateLabel}
      </div>
    </div>
  );
}
