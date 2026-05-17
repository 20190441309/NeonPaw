"use client";

import { useState, useCallback } from "react";
import {
  type SpeechLanguageCode,
  type SpeechLanguage,
  getSavedLanguage,
  saveLanguage,
  getLanguageConfig,
  SPEECH_LANGUAGES,
} from "@/lib/speechLanguages";

export function useSpeechLanguage() {
  const [languageCode, setLanguageCode] = useState<SpeechLanguageCode>(() => getSavedLanguage());

  const setLanguage = useCallback((code: SpeechLanguageCode) => {
    setLanguageCode(code);
    saveLanguage(code);
    if (process.env.NODE_ENV === "development") {
      console.log("[LANG] language changed:", code);
    }
  }, []);

  const cycleLanguage = useCallback(() => {
    setLanguageCode((prev) => {
      const currentIndex = SPEECH_LANGUAGES.findIndex((l) => l.code === prev);
      const nextIndex = (currentIndex + 1) % SPEECH_LANGUAGES.length;
      const nextCode = SPEECH_LANGUAGES[nextIndex].code;
      saveLanguage(nextCode);
      return nextCode;
    });
  }, []);

  const config: SpeechLanguage = getLanguageConfig(languageCode);

  return {
    languageCode,
    config,
    setLanguage,
    cycleLanguage,
    languages: SPEECH_LANGUAGES,
  };
}
