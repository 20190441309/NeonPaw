// frontend/src/hooks/useSettings.ts
"use client";

import { useState, useCallback, useEffect } from "react";
import {
  type LLMProvider,
  type TraceMode,
  type SpeechLanguageCode,
  getLLMProvider, setLLMProvider,
  getLLMApiKey, setLLMApiKey,
  getLLMModel, setLLMModel,
  getSpeechLanguage, setSpeechLanguage,
  getWakeMode, setWakeMode,
  getTraceMode, setTraceMode,
  getDevMode, setDevMode,
} from "@/lib/settings";

export interface SettingsState {
  llmProvider: LLMProvider;
  llmApiKey: string;
  llmModel: string;
  language: SpeechLanguageCode;
  wakeMode: boolean;
  traceMode: TraceMode;
  devMode: boolean;
}

export function useSettings() {
  const [settings, setSettings] = useState<SettingsState>({
    llmProvider: "deepseek",
    llmApiKey: "",
    llmModel: "",
    language: "zh-CN",
    wakeMode: false,
    traceMode: "simple",
    devMode: false,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSettings({
      llmProvider: getLLMProvider(),
      llmApiKey: getLLMApiKey(),
      llmModel: getLLMModel(),
      language: getSpeechLanguage(),
      wakeMode: getWakeMode(),
      traceMode: getTraceMode(),
      devMode: getDevMode(),
    });
    setLoaded(true);
  }, []);

  const update = useCallback(<K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    switch (key) {
      case "llmProvider": setLLMProvider(value as LLMProvider); break;
      case "llmApiKey": setLLMApiKey(value as string); break;
      case "llmModel": setLLMModel(value as string); break;
      case "language": setSpeechLanguage(value as SpeechLanguageCode); break;
      case "wakeMode": setWakeMode(value as boolean); break;
      case "traceMode": setTraceMode(value as TraceMode); break;
      case "devMode": setDevMode(value as boolean); break;
    }
  }, []);

  return { settings, update, loaded };
}
