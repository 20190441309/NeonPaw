"use client";

import { type SpeechLanguageCode, SPEECH_LANGUAGES } from "@/lib/speechLanguages";

interface LanguageSelectorProps {
  currentLanguage: SpeechLanguageCode;
  onLanguageChange: (code: SpeechLanguageCode) => void;
  compact?: boolean;
}

export function LanguageSelector({
  currentLanguage,
  onLanguageChange,
  compact = false,
}: LanguageSelectorProps) {
  if (compact) {
    // Compact mode: single button that cycles through languages
    const current = SPEECH_LANGUAGES.find((l) => l.code === currentLanguage) || SPEECH_LANGUAGES[0];
    return (
      <button
        onClick={() => {
          const currentIndex = SPEECH_LANGUAGES.findIndex((l) => l.code === currentLanguage);
          const nextIndex = (currentIndex + 1) % SPEECH_LANGUAGES.length;
          onLanguageChange(SPEECH_LANGUAGES[nextIndex].code);
        }}
        className="px-2 py-0.5 text-xs font-mono border rounded
                   border-terminal-text/30 text-terminal-text/70
                   hover:border-cyber-green hover:text-cyber-green
                   transition-colors cursor-pointer"
        title="Switch speech language"
      >
        {current.flag} {current.name}
      </button>
    );
  }

  // Full mode: radio-style selector
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-terminal-text/50 mr-1">LANG:</span>
      {SPEECH_LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onLanguageChange(lang.code)}
          className={`px-1.5 py-0.5 text-xs font-mono border rounded transition-colors cursor-pointer
            ${
              currentLanguage === lang.code
                ? "border-cyber-green text-cyber-green bg-cyber-green/10"
                : "border-terminal-text/30 text-terminal-text/50 hover:border-terminal-text/50"
            }`}
        >
          {lang.flag} {lang.name}
        </button>
      ))}
    </div>
  );
}
