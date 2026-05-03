"use client";

interface Props {
  isListening: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  onClick: () => void;
}

export default function VoiceButton({
  isListening,
  isThinking,
  isSpeaking,
  isSupported,
  onClick,
}: Props) {
  const isDisabled = isThinking || isSpeaking || !isSupported;

  return (
    <div className="flex justify-center flex-col items-center mt-4">
      <button
        onClick={onClick}
        disabled={isDisabled}
        className={`
          w-14 h-14 rounded-full border-2 flex items-center justify-center
          transition-all duration-300 text-lg
          ${
            !isSupported
              ? "border-gray-600 opacity-30 cursor-not-allowed"
              : isListening
                ? "border-red-500 bg-red-500/20 animate-pulse"
                : isDisabled
                  ? "border-gray-600 opacity-40 cursor-not-allowed"
                  : "border-[var(--terminal-text)] hover:bg-[var(--terminal-text)]/10 cursor-pointer"
          }
        `}
        aria-label={isListening ? "停止录音" : "开始说话"}
      >
        {isThinking ? "⏳" : isListening ? "🔴" : "🎤"}
      </button>
      <div className={`text-xs mt-2 ${isSupported ? "invisible" : "opacity-50"}`}>
        语音识别需要 Chrome 或 Edge 浏览器
      </div>
    </div>
  );
}
