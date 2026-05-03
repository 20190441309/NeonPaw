"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const WAKE_PHRASES = ["neon paw", "小爪", "小爪醒醒", "醒醒"];

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

    if (!SpeechRecognitionCtor) return;

    // Stop existing instance
    try {
      recognitionRef.current?.stop();
    } catch {}

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsActive(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        const matched = WAKE_PHRASES.some((phrase) =>
          transcript.includes(phrase)
        );
        if (matched) {
          // Stop listening and fire callback
          try {
            recognition.stop();
          } catch {}
          onWakeRef.current();
          return;
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        setError("麦克风权限被拒绝");
        setIsActive(false);
        return; // Don't restart
      }
      // no-speech, aborted, etc. — will restart via onend
    };

    recognition.onend = () => {
      setIsActive(false);
      // Restart if still enabled and no permission error
      if (enabledRef.current && error !== "麦克风权限被拒绝") {
        restartTimerRef.current = setTimeout(() => {
          if (enabledRef.current) {
            startListening();
          }
        }, 500);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsActive(false);
    }
  }, [error]);

  // Start/stop when enabled changes
  useEffect(() => {
    if (enabled && isSupported) {
      startListening();
    } else {
      stopListening();
    }
    return () => stopListening();
  }, [enabled, isSupported, startListening, stopListening]);

  return { isActive, error };
}
