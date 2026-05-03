"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const WAKE_PHRASES = [
  "neon paw",
  "小爪",
  "小爪醒醒",
  "醒醒",
  "小抓",
  "小抓醒醒",
  "小早",
  "小早醒醒",
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\.,!?;:'"，。！？；：""''、·\-_~`@#\$%\^&\*\(\)\[\]\{\}\/\\|<>=+]/g, "")
    .trim();
}

function matchesWakePhrase(transcript: string): boolean {
  const normalized = normalizeText(transcript);
  if (process.env.NODE_ENV === "development") {
    console.log("[WAKE] raw transcript:", transcript);
    console.log("[WAKE] normalized:", normalized);
  }
  const matched = WAKE_PHRASES.some((phrase) => normalized.includes(phrase));
  if (process.env.NODE_ENV === "development") {
    console.log("[WAKE] matched:", matched);
  }
  return matched;
}

interface Options {
  enabled: boolean;
  onWakePhrase: () => void;
  isSupported: boolean;
}

export function useWakeWord({ enabled, onWakePhrase, isSupported }: Options) {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const enabledRef = useRef(enabled);
  const onWakeRef = useRef(onWakePhrase);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeMatchedRef = useRef(false);

  enabledRef.current = enabled;
  onWakeRef.current = onWakePhrase;

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
    if (typeof window === "undefined" || !enabledRef.current) return;

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
        if (matchesWakePhrase(transcript)) {
          wakeMatchedRef.current = true;
          // Stop listening and fire callback
          try {
            recognition.stop();
          } catch {}
          if (process.env.NODE_ENV === "development") {
            console.log("[WAKE] wake phrase detected, firing callback");
          }
          onWakeRef.current();
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
        return; // Don't restart
      }
      // no-speech, aborted, etc. — will restart via onend
    };

    recognition.onend = () => {
      setIsActive(false);
      if (process.env.NODE_ENV === "development") {
        console.log("[WAKE] recognition ended, wakeMatched:", wakeMatchedRef.current, "enabled:", enabledRef.current);
      }
      // Don't restart if wake phrase was just matched (handing off to main STT)
      if (wakeMatchedRef.current) {
        if (process.env.NODE_ENV === "development") {
          console.log("[WAKE] not restarting — wake phrase matched, handing off to main STT");
        }
        return;
      }
      // Restart if still enabled and no permission error
      if (enabledRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (enabledRef.current) {
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

  // Start/stop when enabled changes
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[WAKE] enabled changed:", enabled, "isSupported:", isSupported);
    }
    if (enabled && isSupported) {
      startListening();
    } else {
      stopListening();
    }
    return () => stopListening();
  }, [enabled, isSupported, startListening, stopListening]);

  return { isActive, error };
}
