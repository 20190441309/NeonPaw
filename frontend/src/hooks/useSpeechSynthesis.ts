"use client";

import { useState, useCallback } from "react";
import { type SpeechLanguageCode, getLanguageConfig } from "@/lib/speechLanguages";

export function useSpeechSynthesis(language: SpeechLanguageCode = "zh-CN") {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!isSupported) {
        onEnd?.();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const langConfig = getLanguageConfig(language);
      utterance.lang = langConfig.ttsCode;
      utterance.rate = 1.0;
      utterance.pitch = 1.1;

      // Find appropriate voice for the selected language
      const voices = window.speechSynthesis.getVoices();
      const langPrefix = langConfig.ttsCode.split("-")[0];
      const matchingVoice = voices.find((v) => v.lang.startsWith(langPrefix));
      if (matchingVoice) utterance.voice = matchingVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        onEnd?.();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    },
    [isSupported]
  );

  const cancel = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, isSupported, speak, cancel };
}
