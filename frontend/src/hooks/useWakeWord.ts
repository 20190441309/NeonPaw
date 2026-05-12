"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  getSpeechRecognitionConstructor,
  type SpeechRecognitionErrorEventLike,
  type SpeechRecognitionEventLike,
  type SpeechRecognitionLike,
} from "@/lib/speechRecognitionTypes";
import { normalizeWakeText, splitWakePhraseAndCommand } from "@/lib/wakePhrases";

const STOP_PHRASES = ["先这样", "不用了", "结束对话", "退出", "stop", "sleep"];

const COMMAND_TIMEOUT_MS = 10000;   // 10s to say a command after wake
const SESSION_TIMEOUT_MS = 25000;   // 25s silence ends session
const COMMAND_MAX_RETRIES = 3;
const SESSION_MAX_RETRIES = 3;
const RETRY_DELAY_MS = 600;

export interface WakeResult {
  mode: "inline" | "followup";
  command?: string;
  isFuzzy?: boolean;
  phrase?: string;
  distance?: number;
}

function extractCommand(transcript: string): WakeResult | null {
  const match = splitWakePhraseAndCommand(transcript);
  if (!match.hasWakeWord) return null;

  if (match.command.length > 0) {
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[WAKE] inline command mode, extracted command:",
        match.command,
        "fuzzy:",
        match.isFuzzy,
        "phrase:",
        match.phrase ?? "(unknown)",
        "distance:",
        match.distance,
      );
    }
    return {
      mode: "inline",
      command: match.command,
      isFuzzy: match.isFuzzy,
      phrase: match.phrase,
      distance: match.distance,
    };
  }

  if (process.env.NODE_ENV === "development") {
    console.log(
      "[WAKE] follow-up listening mode",
      "fuzzy:",
      match.isFuzzy,
      "phrase:",
      match.phrase ?? "(unknown)",
      "distance:",
      match.distance,
    );
  }
  return {
    mode: "followup",
    isFuzzy: match.isFuzzy,
    phrase: match.phrase,
    distance: match.distance,
  };
}

function isStopPhrase(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  return STOP_PHRASES.some((p) => trimmed === p || trimmed.includes(p));
}

interface Options {
  enabled: boolean;
  onWake: (result: WakeResult) => void;
  onCommand: (text: string) => void;
  onCommandTimeout: () => void;
  isSupported: boolean;
}

export type WakeMode = "idle" | "wake_listening" | "command_listening" | "session_listening";

type StartListeningFn = () => void;

export function useWakeWord({ enabled, onWake, onCommand, onCommandTimeout, isSupported }: Options) {
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<WakeMode>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const enabledRef = useRef(enabled);
  const onWakeRef = useRef(onWake);
  const onCommandRef = useRef(onCommand);
  const onCommandTimeoutRef = useRef(onCommandTimeout);
  const pausedRef = useRef(false);
  const modeRef = useRef<WakeMode>("idle");
  const sessionActiveRef = useRef(false);
  const wakeMatchedRef = useRef(false);

  // Timers
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commandRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Retry counters
  const emptyRetriesRef = useRef(0);
  const commandRetriesRef = useRef(0);
  const sessionRetriesRef = useRef(0);
  const startWakeListeningRef = useRef<StartListeningFn>(() => {});
  const startCommandCaptureRef = useRef<StartListeningFn>(() => {});
  const startSessionListeningRef = useRef<StartListeningFn>(() => {});
  const stopListeningRef = useRef<StartListeningFn>(() => {});

  useEffect(() => {
    enabledRef.current = enabled;
    onWakeRef.current = onWake;
    onCommandRef.current = onCommand;
    onCommandTimeoutRef.current = onCommandTimeout;
  }, [enabled, onWake, onCommand, onCommandTimeout]);

  // ── Helpers ──────────────────────────────────────────────────────────

  const setModeState = useCallback((m: WakeMode) => {
    modeRef.current = m;
    setMode(m);
    if (process.env.NODE_ENV === "development") {
      console.log("[WAKE] mode:", m);
    }
  }, []);

  const setSessionState = useCallback((active: boolean) => {
    sessionActiveRef.current = active;
    setSessionActive(active);
    if (process.env.NODE_ENV === "development") {
      console.log("[WAKE] session active:", active);
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    const timers = [restartTimerRef, commandTimerRef, commandRetryTimerRef, sessionTimerRef, sessionRetryTimerRef];
    for (const ref of timers) {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
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
    setSessionState(false);
    emptyRetriesRef.current = 0;
    commandRetriesRef.current = 0;
    sessionRetriesRef.current = 0;
  }, [clearAllTimers, stopRecognition, setModeState, setSessionState]);

  // ── Start Recognition Builder ───────────────────────────────────────

  const createRecognition = useCallback((
    lang: string,
    continuous: boolean,
    interimResults: boolean,
    onresult: (event: SpeechRecognitionEventLike) => void,
    onstart?: () => void,
  ) => {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) return null;

    const r = new Ctor();
    r.lang = lang;
    r.continuous = continuous;
    r.interimResults = interimResults;

    r.onstart = () => {
      setIsActive(true);
      setError(null);
      onstart?.();
    };

    r.onresult = onresult;

    r.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (process.env.NODE_ENV === "development") {
        console.log("[WAKE] recognition error:", event.error, "mode:", modeRef.current);
      }
      if (event.error === "not-allowed") {
        setError("麦克风权限被拒绝");
        setIsActive(false);
        setModeState("idle");
        setSessionState(false);
        clearAllTimers();
      }
    };

    r.onend = () => {
      setIsActive(false);
    };

    return r;
  }, [setModeState, setSessionState, clearAllTimers]);

  // ── Wake Listening ──────────────────────────────────────────────────

  const startWakeListening = useCallback(() => {
    if (typeof window === "undefined" || !enabledRef.current || pausedRef.current) return;

    stopRecognition();
    clearAllTimers();
    wakeMatchedRef.current = false;
    emptyRetriesRef.current = 0;

    setModeState("wake_listening");

    const recognition = createRecognition(
      "zh-CN", true, true,
      (event: SpeechRecognitionEventLike) => {
        if (pausedRef.current || modeRef.current !== "wake_listening") return;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (process.env.NODE_ENV === "development") {
            console.log("[WAKE] raw transcript:", transcript);
            console.log("[WAKE] normalized:", normalizeWakeText(transcript));
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
              setSessionState(true); // Activate session — resume() will use session_listening
              setModeState("idle");
              onWakeRef.current(result);
            } else {
              setModeState("command_listening");
              onWakeRef.current(result);
              setTimeout(() => {
                if (enabledRef.current && !pausedRef.current && modeRef.current === "command_listening") {
                  startCommandCaptureRef.current();
                }
              }, 300);
            }
            return;
          }
        }
      },
      () => {
        if (process.env.NODE_ENV === "development") {
          console.log("[WAKE] recognition started, mode: wake_listening");
        }
      },
    );

    if (!recognition) return;
    recognition.onend = () => {
      setIsActive(false);
      if (process.env.NODE_ENV === "development") {
        console.log("[WAKE] recognition ended, wakeMatched:", wakeMatchedRef.current, "paused:", pausedRef.current, "mode:", modeRef.current);
      }
      if (wakeMatchedRef.current || pausedRef.current || !enabledRef.current) return;
      if (modeRef.current === "wake_listening") {
        emptyRetriesRef.current++;
        const delay = Math.min(800 * emptyRetriesRef.current, 5000);
        if (process.env.NODE_ENV === "development") {
          console.log("[WAKE] restarting in", delay, "ms (retry", emptyRetriesRef.current, ")");
        }
        restartTimerRef.current = setTimeout(() => {
          if (enabledRef.current && !pausedRef.current && modeRef.current === "wake_listening") {
            startWakeListeningRef.current();
          }
        }, delay);
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch { setIsActive(false); }
  }, [stopRecognition, clearAllTimers, setModeState, setSessionState, createRecognition]);

  // ── Command Capture (one-shot after wake phrase) ────────────────────

  const startCommandCapture = useCallback(() => {
    if (typeof window === "undefined" || !enabledRef.current || pausedRef.current) return;

    stopRecognition();
    clearAllTimers();
    commandRetriesRef.current = 0;

    if (process.env.NODE_ENV === "development") {
      console.log("[WAKE] starting command capture, timeout:", COMMAND_TIMEOUT_MS, "ms");
    }

    commandTimerRef.current = setTimeout(() => {
      if (modeRef.current === "command_listening") {
        if (process.env.NODE_ENV === "development") {
          console.log("[WAKE] command timeout — no command heard");
        }
        setModeState("idle");
        onCommandTimeoutRef.current();
        if (enabledRef.current && !pausedRef.current) {
          setTimeout(() => startWakeListeningRef.current(), 300);
        }
      }
    }, COMMAND_TIMEOUT_MS);

    const recognition = createRecognition(
      "zh-CN", false, false,
      (event: SpeechRecognitionEventLike) => {
        if (pausedRef.current || modeRef.current !== "command_listening") return;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript.trim();
            if (transcript.length > 0) {
              if (process.env.NODE_ENV === "development") {
                console.log("[WAKE] command captured:", transcript);
              }
              clearAllTimers();
              stopRecognition();
              // Activate session — after TTS, we'll enter session_listening
              setSessionState(true);
              setModeState("idle");
              onCommandRef.current(transcript);
              return;
            }
          }
        }
      },
      () => {
        if (process.env.NODE_ENV === "development") {
          console.log("[WAKE] command capture started");
        }
      },
    );

    if (!recognition) return;
    recognition.onend = () => {
      setIsActive(false);
      if (process.env.NODE_ENV === "development") {
        console.log("[WAKE] command capture ended, mode:", modeRef.current);
      }
      if (modeRef.current !== "command_listening" || pausedRef.current || !enabledRef.current) return;

      commandRetriesRef.current++;
      if (commandRetriesRef.current <= COMMAND_MAX_RETRIES) {
        if (process.env.NODE_ENV === "development") {
          console.log("[WAKE] command capture retry", commandRetriesRef.current, "/", COMMAND_MAX_RETRIES);
        }
        commandRetryTimerRef.current = setTimeout(() => {
          if (enabledRef.current && !pausedRef.current && modeRef.current === "command_listening") {
            startCommandCaptureRef.current();
          }
        }, RETRY_DELAY_MS);
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch { setIsActive(false); }
  }, [stopRecognition, clearAllTimers, setModeState, setSessionState, createRecognition]);

  // ── Session Listening (continuous conversation) ─────────────────────

  const startSessionListening = useCallback(() => {
    if (typeof window === "undefined" || !enabledRef.current || pausedRef.current) return;

    stopRecognition();
    clearAllTimers();
    sessionRetriesRef.current = 0;

    if (process.env.NODE_ENV === "development") {
      console.log("[WAKE] starting session listening, timeout:", SESSION_TIMEOUT_MS, "ms");
    }

    setModeState("session_listening");

    sessionTimerRef.current = setTimeout(() => {
      if (modeRef.current === "session_listening") {
        if (process.env.NODE_ENV === "development") {
          console.log("[WAKE] session timeout — no speech for", SESSION_TIMEOUT_MS, "ms");
        }
        setSessionState(false);
        setModeState("idle");
        onCommandTimeoutRef.current();
        if (enabledRef.current && !pausedRef.current) {
          setTimeout(() => startWakeListeningRef.current(), 300);
        }
      }
    }, SESSION_TIMEOUT_MS);

    const recognition = createRecognition(
      "zh-CN", false, false,
      (event: SpeechRecognitionEventLike) => {
        if (pausedRef.current || modeRef.current !== "session_listening") return;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript.trim();
            if (transcript.length > 0) {
              if (process.env.NODE_ENV === "development") {
                console.log("[WAKE] session transcript:", transcript);
              }

              // Reset session timeout on speech
              sessionRetriesRef.current = 0;
              if (sessionTimerRef.current) {
                clearTimeout(sessionTimerRef.current);
                sessionTimerRef.current = null;
              }

              // Check for stop phrase
              if (isStopPhrase(transcript)) {
                if (process.env.NODE_ENV === "development") {
                  console.log("[WAKE] session ended by stop phrase:", transcript);
                }
                clearAllTimers();
                stopRecognition();
                setSessionState(false);
                setModeState("idle");
                // Resume wake listening after a brief pause
                setTimeout(() => {
                  if (enabledRef.current && !pausedRef.current) {
                    startWakeListeningRef.current();
                  }
                }, 500);
                return;
              }

              // Normal command — send to chat
              if (process.env.NODE_ENV === "development") {
                console.log("[WAKE] sending session command:", transcript);
              }
              clearAllTimers();
              stopRecognition();
              setModeState("idle");
              onCommandRef.current(transcript);
              return;
            }
          }
        }
      },
      () => {
        if (process.env.NODE_ENV === "development") {
          console.log("[WAKE] session listening started");
        }
      },
    );

    if (!recognition) return;
    recognition.onend = () => {
      setIsActive(false);
      if (process.env.NODE_ENV === "development") {
        console.log("[WAKE] session recognition ended, mode:", modeRef.current, "session:", sessionActiveRef.current);
      }
      if (modeRef.current !== "session_listening" || pausedRef.current || !enabledRef.current) return;

      sessionRetriesRef.current++;
      if (sessionRetriesRef.current <= SESSION_MAX_RETRIES) {
        if (process.env.NODE_ENV === "development") {
          console.log("[WAKE] session retry", sessionRetriesRef.current, "/", SESSION_MAX_RETRIES);
        }
        sessionRetryTimerRef.current = setTimeout(() => {
          if (enabledRef.current && !pausedRef.current && modeRef.current === "session_listening") {
            startSessionListeningRef.current();
          }
        }, RETRY_DELAY_MS);
      } else {
        // Exhausted retries — end session
        if (process.env.NODE_ENV === "development") {
          console.log("[WAKE] session retries exhausted, ending session");
        }
        clearAllTimers();
        setSessionState(false);
        setModeState("idle");
        if (enabledRef.current && !pausedRef.current) {
          setTimeout(() => startWakeListeningRef.current(), 500);
        }
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch { setIsActive(false); }
  }, [stopRecognition, clearAllTimers, setModeState, setSessionState, createRecognition]);

  // ── Pause / Resume ──────────────────────────────────────────────────

  const pause = useCallback(() => {
    pausedRef.current = true;
    clearAllTimers();
    stopRecognition();
    if (process.env.NODE_ENV === "development") {
      console.log("[WAKE] paused");
    }
  }, [clearAllTimers, stopRecognition]);

  const resume = useCallback(() => {
    pausedRef.current = false;
    emptyRetriesRef.current = 0;
    commandRetriesRef.current = 0;
    sessionRetriesRef.current = 0;
    if (enabledRef.current && isSupported) {
      const target = sessionActiveRef.current ? "session_listening" : "wake_listening";
      if (process.env.NODE_ENV === "development") {
        console.log("[WAKE] resumed, resume target:", target);
      }
      if (sessionActiveRef.current) {
        startSessionListeningRef.current();
      } else {
        startWakeListeningRef.current();
      }
    }
  }, [isSupported]);

  useEffect(() => {
    startWakeListeningRef.current = startWakeListening;
    startCommandCaptureRef.current = startCommandCapture;
    startSessionListeningRef.current = startSessionListening;
    stopListeningRef.current = stopListening;
  }, [startWakeListening, startCommandCapture, startSessionListening, stopListening]);

  // ── Lifecycle ───────────────────────────────────────────────────────

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[WAKE] enabled changed:", enabled, "isSupported:", isSupported);
    }
    if (enabled && isSupported) {
      pausedRef.current = false;
      startWakeListeningRef.current();
    } else {
      queueMicrotask(() => stopListeningRef.current());
    }
    return () => {
      stopListeningRef.current();
    };
  }, [enabled, isSupported]);

  return { isActive, mode, error, sessionActive, pause, resume };
}
