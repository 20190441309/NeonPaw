"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface Props {
  text: string;
  isLowConfidence: boolean;
  confidence?: number | null;
  onConfirm: (editedText: string) => void;
  onRetry: () => void;
  onDismiss: () => void;
}

export default function SpeechConfirmBar({
  text,
  isLowConfidence,
  confidence,
  onConfirm,
  onRetry,
  onDismiss,
}: Props) {
  const [editedText, setEditedText] = useState(text);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update edited text when prop changes
  useEffect(() => {
    setEditedText(text);
  }, [text]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleConfirm = useCallback(() => {
    const trimmed = editedText.trim();
    if (trimmed.length > 0) {
      onConfirm(trimmed);
    }
  }, [editedText, onConfirm]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleConfirm();
      }
      if (e.key === "Escape") {
        onDismiss();
      }
    },
    [handleConfirm, onDismiss]
  );

  return (
    <div className="mt-3 border border-[var(--terminal-border)] rounded-sm p-3 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center text-[10px] tracking-wider mb-2">
        <span className="text-[var(--terminal-text)] opacity-60">
          HEARD
        </span>
        <span
          className={`${
            isLowConfidence ? "text-yellow-400/80" : "text-[var(--terminal-text)] opacity-40"
          }`}
        >
          {isLowConfidence
            ? "LOW CONFIDENCE"
            : confidence != null
              ? `CONF: ${(confidence * 100).toFixed(0)}%`
              : "READY"}
        </span>
      </div>

      {/* Editable text input */}
      <input
        ref={inputRef}
        type="text"
        value={editedText}
        onChange={(e) => setEditedText(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent border border-[var(--terminal-border)] rounded-sm px-2 py-1.5 text-sm text-[var(--terminal-text)] outline-none focus:border-[var(--terminal-text)] font-mono"
        placeholder="识别文本..."
      />

      {/* Low confidence warning */}
      {isLowConfidence && (
        <div className="text-[10px] text-yellow-400/60 mt-2 tracking-wider">
          我可能没有听清，你可以修改后发送，或者重新说一遍。
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleConfirm}
          disabled={editedText.trim().length === 0}
          className={`flex-1 text-[11px] tracking-wider py-1.5 border rounded-sm transition-colors ${
            editedText.trim().length > 0
              ? "border-[var(--terminal-text)] text-[var(--terminal-text)] hover:bg-[var(--terminal-text)]/10 cursor-pointer"
              : "border-gray-600 text-gray-600 cursor-not-allowed"
          }`}
        >
          &gt; SEND
        </button>
        <button
          onClick={onRetry}
          className="flex-1 text-[11px] tracking-wider py-1.5 border border-[var(--terminal-border)] text-[var(--terminal-text)] opacity-60 hover:opacity-100 hover:bg-[var(--terminal-text)]/5 rounded-sm transition-opacity cursor-pointer"
        >
          RETRY
        </button>
      </div>
    </div>
  );
}
