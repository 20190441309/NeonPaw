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

const COMMAND_TIMEOUT_MS = 10000; // 10 seconds to say a command

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\.,!?;:'"，。！？；：""''、·\-_~`@#\$%\^&\*\(\)\[\]\{\}\/\\|<>=+]/g, "")
    .trim();
}

function normalizeForStrip(text: string): string {
  return text.replace(/^[,，。!！?？\s]+/, "").trim();
}

export interface WakeResult {
  mode: "inline" | "followup";
  command?: string;
}

function extractCommand(transcript: string): WakeResult | null {
  const lower = transcript.toLowerCase();

  // Longest-first match: "小爪醒醒" before "醒醒"
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
      console.log("[WAKE] follow-up listening mode (normalized match)");
    }
    return { mode: "followup" };
  }

  return null;
}

interface Options {
  enabled: boolean;
  onWake: (result: WakeResult) => void;
  onCommand: (text: string) => void;
  onCommandTimeout: () => void;
  isSupported: boolean;
}

export type WakeMode = "idle" | "wake_listening" | "command_listening";

export function useWakeWord({ enabled, onWake, onCommand, onCommandTimeout, isSupported }: Options) {
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<WakeMode>("idle");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const enabledRef = useRef(enabled);
  const onWakeRef = useRef(onWake);
  const onCommandRef = useRef(onCommand);
  const onCommandTimeoutRef = useRef(onCommandTimeout);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeMatchedRef = useRef(false);
  const pausedRef = useRef(false);
  const modeRef = useRef<WakeMode>("idle");
  const emptyRetriesRef = useRef(0);

  enabledRef.current = enabled;
  onWakeRef.current = onWake;
  onCommandRef.current = onCommand;
  onCommandTimeoutRef.current = onCommandTimeout;

  const setModeState = useCallback((m: WakeMode) => {
    modeRef.current = m;
    setMode(m);
    if (process.env.NODE_ENV === "development") {
      console.log("[WAKE] mode:", m);
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (commandTimerRef.current) {
      clearTimeout(commandTimerRef.current);
      commandTimerRef.current = null;
    }
  }, []);

  const stopRecognition = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {}
    recognitionRef.current = null;
    setIsActive(false);
  }, []);

  const stopListening = useCallback(() => {
    clearAllTimers();
    stopRecognition();
    setModeState("idle");
    emptyRetriesRef.current = 0;
  }, [clearAllTimers, stopRecognition, setModeState]);

  const startWakeListening = useCallback(() => {
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
    stopRecognition();
    clearAllTimers();
    wakeMatchedRef.current = false;
    emptyRetriesRef.current = 0;

    setModeState("wake_listening");

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsActive(true);
      setError(null);
      if (process.env.NODE_ENV === "development") {
        console.log("[WAKE] recognition started, mode: wake_listening");
      }
    };

    recognition.onresult = (event: any) => {
      // Guard: ignore results if paused (main STT is active)
      if (pausedRef.current) {
        if (process.env.NODE_ENV === "development") {
          console.log("[WAKE] ignoring result — paused");
        }
        return;
      }
      // Guard: ignore results if not in wake_listening mode
      if (modeRef.current !== "wake_listening") {
        if (process.env.NODE_ENV === "development") {
          console.log("[WAKE] ignoring result — mode is", modeRef.current);
        }
        return;
      }

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (process.env.NODE_ENV === "development") {
          console.log("[WAKE] raw transcript:", transcript);
          console.log("[WAKE] normalized:", normalizeText(transcript));
        }
        const result = extractCommand(transcript);
        if (result) {
          wakeMatchedRef.current = true;
          emptyRetriesRef.current = 0;
          stopRecognition();
          if (process.env.NODE_ENV === "development") {
            console.log("[WAKE] wake detected, mode:", result.mode, "command:", result.command ?? "(none)");
          }
          if (result.mode === "inline" && result.command) {
            // Inline command: send directly
            setModeState("idle");
            onWakeRef.current(result);
          } else {
            // Follow-up: switch to command_listening
            setModeState("command_listening");
            onWakeRef.current(result);
          }
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
        setModeState("idle");
        return;
      }
    };

    recognition.onend = () => {
      setIsActive(false);
      if (process.env.NODE_ENV === "development") {
        console.log("[WAKE] recognition ended, wakeMatched:", wakeMatchedRef.current, "paused:", pausedRef.current, "mode:", modeRef.current);
      }
      // Don't restart if paused, matched, or not enabled
      if (wakeMatchedRef.current || pausedRef.current || !enabledRef.current) {
        return;
      }
      // Backoff restart for empty results
      if (modeRef.current === "wake_listening") {
        emptyRetriesRef.current++;
        const delay = Math.min(800 * emptyRetriesRef.current, 5000);
        if (process.env.NODE_ENV === "development") {
          console.log("[WAKE] restarting in", delay, "ms (retry", emptyRetriesRef.current, ")");
        }
        restartTimerRef.current = setTimeout(() => {
          if (enabledRef.current && !pausedRef.current && modeRef.current === "wake_listening") {
            startWakeListening();
          }
        }, delay);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsActive(false);
    }
  }, [stopRecognition, clearAllTimers, setModeState]);

  /** Start command_listening mode — wake hook stays quiet, main STT handles it */
  const startCommandListening = useCallback(() => {
    setModeState("command_listening");
    emptyRetriesRef.current = 0;

    if (process.env.NODE_ENV === "development") {
      console.log("[WAKE] command_listening started, timeout:", COMMAND_TIMEOUT_MS, "ms");
    }

    // Command timeout — return to wake_listening if no command heard
    commandTimerRef.current = setTimeout(() => {
      if (modeRef.current === "command_listening") {
        if (process.env.NODE_ENV === "development") {
          console.log("[WAKE] command timeout — returning to wake_listening");
        }
        setModeState("idle");
        onCommandTimeoutRef.current();
        // Resume wake listening
        if (enabledRef.current && !pausedRef.current) {
          startWakeListening();
        }
      }
    }, COMMAND_TIMEOUT_MS);
  }, [setModeState, startWakeListening]);

  /** Pause wake listener completely (e.g. during click-to-talk) */
  const pause = useCallback(() => {
    pausedRef.current = true;
    clearAllTimers();
    stopRecognition();
    if (process.env.NODE_ENV === "development") {
      console.log("[WAKE] paused");
    }
  }, [clearAllTimers, stopRecognition]);

  /** Resume wake listener after main interaction finishes */
  const resume = useCallback(() => {
    pausedRef.current = false;
    emptyRetriesRef.current = 0;
    if (enabledRef.current && isSupported) {
      if (process.env.NODE_ENV === "development") {
        console.log("[WAKE] resumed");
      }
      startWakeListening();
    }
  }, [startWakeListening, isSupported]);

  /** Complete command — called after main STT finishes or inline command sent */
  const completeCommand = useCallback(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[WAKE] command completed");
    }
    clearAllTimers();
    setModeState("idle");
    // Wake listening will be resumed by resume() after TTS
  }, [clearAllTimers, setModeState]);

  // Start/stop when enabled changes
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[WAKE] enabled changed:", enabled, "isSupported:", isSupported);
    }
    if (enabled && isSupported) {
      pausedRef.current = false;
      startWakeListening();
    } else {
      stopListening();
    }
    return () => stopListening();
  }, [enabled, isSupported, startWakeListening, stopListening]);

  return { isActive, mode, error, pause, resume, startCommandListening, completeCommand };
}
