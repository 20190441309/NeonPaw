"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const WAKE_PHRASES = [
  "小爪醒醒",
  "小抓醒醒",
  "小早醒醒",
  "小爪",
  "小抓",
  "小早",
  "醒醒",
  "neon paw",
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\.,!?;:'"，。！？；：""''、·\-_~`@#\$%\^&\*\(\)\[\]\{\}\/\\|<>=+]/g, "")
    .trim();
}

function normalizeForStrip(text: string): string {
  // Lighter normalization for extracting the command after the wake phrase
  // Keep Chinese characters and letters, just trim whitespace and leading punctuation
  return text.replace(/^[,，。!！?？\s]+/, "").trim();
}

export interface WakeResult {
  mode: "inline" | "followup";
  command?: string;
}

function extractCommand(transcript: string): WakeResult | null {
  const lower = transcript.toLowerCase();

  for (const phrase of WAKE_PHRASES) {
    const idx = lower.indexOf(phrase);
    if (idx !== -1) {
      const after = transcript.slice(idx + phrase.length);
      const command = normalizeForStrip(after);
      if (command.length > 0) {
        if (process.env.NODE_ENV === "development") {
          console.log("[WAKE] inline command mode, extracted command:", command);
        }
        return { mode: "inline", command };
      }
      if (process.env.NODE_ENV === "development") {
        console.log("[WAKE] follow-up listening mode (wake phrase only)");
      }
      return { mode: "followup" };
    }
  }

  // Fallback: normalized substring match
  const normalized = normalizeText(transcript);
  const matched = WAKE_PHRASES.some((phrase) => normalized.includes(phrase));
  if (matched) {
    if (process.env.NODE_ENV === "development") {
      console.log("[WAKE] follow-up listening mode (normalized match, no command extracted)");
    }
    return { mode: "followup" };
  }

  return null;
}

interface Options {
  enabled: boolean;
  onWake: (result: WakeResult) => void;
  isSupported: boolean;
}

export function useWakeWord({ enabled, onWake, isSupported }: Options) {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const enabledRef = useRef(enabled);
  const onWakeRef = useRef(onWake);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeMatchedRef = useRef(false);
  const pausedRef = useRef(false);

  enabledRef.current = enabled;
  onWakeRef.current = onWake;

  const stopListening = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {}
    recognitionRef.current = null;
    setIsActive(false);
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === "undefined" || !enabledRef.current || pausedRef.current) return;

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      if (process.env.NODE_ENV === "development") {
        console.log("[WAKE] SpeechRecognition not available");
      }
      return;
    }

    // Stop existing instance
    try {
      recognitionRef.current?.stop();
    } catch {}

    wakeMatchedRef.current = false;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsActive(true);
      setError(null);
      if (process.env.NODE_ENV === "development") {
        console.log("[WAKE] recognition started");
      }
    };

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (process.env.NODE_ENV === "development") {
          console.log("[WAKE] raw transcript:", transcript);
          console.log("[WAKE] normalized:", normalizeText(transcript));
        }
        const result = extractCommand(transcript);
        if (result) {
          wakeMatchedRef.current = true;
          try {
            recognition.stop();
          } catch {}
          if (process.env.NODE_ENV === "development") {
            console.log("[WAKE] wake detected, mode:", result.mode, "command:", result.command ?? "(none)");
          }
          onWakeRef.current(result);
          return;
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (process.env.NODE_ENV === "development") {
        console.log("[WAKE] recognition error:", event.error);
      }
      if (event.error === "not-allowed") {
        setError("麦克风权限被拒绝");
        setIsActive(false);
        return;
      }
    };

    recognition.onend = () => {
      setIsActive(false);
      if (process.env.NODE_ENV === "development") {
        console.log("[WAKE] recognition ended, wakeMatched:", wakeMatchedRef.current, "enabled:", enabledRef.current, "paused:", pausedRef.current);
      }
      if (wakeMatchedRef.current) {
        if (process.env.NODE_ENV === "development") {
          console.log("[WAKE] not restarting — wake matched, handing off");
        }
        return;
      }
      if (enabledRef.current && !pausedRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (enabledRef.current && !pausedRef.current) {
            if (process.env.NODE_ENV === "development") {
              console.log("[WAKE] restarting recognition");
            }
            startListening();
          }
        }, 800);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsActive(false);
    }
  }, []);

  /** Pause wake listener (e.g. during main STT / thinking / speaking) */
  const pause = useCallback(() => {
    pausedRef.current = true;
    stopListening();
    if (process.env.NODE_ENV === "development") {
      console.log("[WAKE] paused");
    }
  }, [stopListening]);

  /** Resume wake listener after main interaction finishes */
  const resume = useCallback(() => {
    pausedRef.current = false;
    if (enabledRef.current && isSupported) {
      if (process.env.NODE_ENV === "development") {
        console.log("[WAKE] resumed");
      }
      startListening();
    }
  }, [startListening, isSupported]);

  // Start/stop when enabled changes
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[WAKE] enabled changed:", enabled, "isSupported:", isSupported);
    }
    if (enabled && isSupported) {
      pausedRef.current = false;
      startListening();
    } else {
      pausedRef.current = false;
      stopListening();
    }
    return () => stopListening();
  }, [enabled, isSupported, startListening, stopListening]);

  return { isActive, error, pause, resume };
}
