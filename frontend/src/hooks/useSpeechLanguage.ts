"use client";

import { useState, useCallback, useEffect } from "react";
import {
  type SpeechLanguageCode,
  type SpeechLanguage,
  getSavedLanguage,
  saveLanguage,
  getLanguageConfig,
  SPEECH_LANGUAGES,
} from "@/lib/speechLanguages";

export function useSpeechLanguage() {
  const [languageCode, setLanguageCode] = useState<SpeechLanguageCode>("zh-CN");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved language on mount
  useEffect(() => {
    const saved = getSavedLanguage();
    setLanguageCode(saved);
    setIsLoaded(true);
  }, []);

  const setLanguage = useCallback((code: SpeechLanguageCode) => {
    setLanguageCode(code);
    saveLanguage(code);
    if (process.env.NODE_ENV === "development") {
      console.log("[LANG] language changed:", code);
    }
  }, []);

  const cycleLanguage = useCallback(() => {
    const currentIndex = SPEECH_LANGUAGES.findIndex((l) => l.code === languageCode);
    const nextIndex = (currentIndex + 1) % SPEECH_LANGUAGES.length;
    const nextCode = SPEECH_LANGUAGES[nextIndex].code;
    setLanguage(nextCode);
  }, [languageCode]);

  const config: SpeechLanguage = getLanguageConfig(languageCode);

  return {
    languageCode,
    config,
    isLoaded,
    setLanguage,
    cycleLanguage,
    languages: SPEECH_LANGUAGES,
  };
}
