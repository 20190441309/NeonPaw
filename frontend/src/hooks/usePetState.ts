"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  PetState,
  PetMode,
  PetEmotion,
  PetAction,
  ChatMessage,
  TraceEntry,
  StateDelta,
  DEFAULT_PET_STATE,
} from "@/lib/types";
import { sceneFrames, type PetFrameKey } from "@/lib/petFrames";

const STORAGE_KEY = "neon_paw_state";
const IDLE_TIMEOUT_MS = 60_000;
const STATE_STALE_MS = 24 * 60 * 60 * 1000;

// Map PetAction → PetFrameKey (actions and frame keys use different names)
const ACTION_TO_FRAME: Partial<Record<PetAction, PetFrameKey>> = {
  wake: "awake",
  sleep: "sleeping",
  listen: "listening",
  think: "thinking",
  speak: "speaking",
  happy: "happy",
  comfort: "comforting",
  glitch: "glitch",
  error: "error",
};

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function selectFrame(
  mode: PetMode,
  emotion: PetEmotion,
  action?: PetAction
): string {
  // Priority: action > emotion > mode
  if (action && action in ACTION_TO_FRAME) {
    const key = ACTION_TO_FRAME[action]!;
    return sceneFrames[key];
  }
  if (emotion in sceneFrames) {
    return sceneFrames[emotion as PetFrameKey];
  }
  if (mode in sceneFrames) {
    return sceneFrames[mode as PetFrameKey];
  }
  return sceneFrames.sleeping;
}

function isValidPetState(obj: unknown): obj is PetState {
  if (!obj || typeof obj !== "object") return false;
  const s = obj as Record<string, unknown>;
  return (
    typeof s.name === "string" &&
    typeof s.mode === "string" &&
    typeof s.emotion === "string" &&
    typeof s.energy === "number" &&
    typeof s.mood === "number" &&
    typeof s.affinity === "number" &&
    typeof s.hunger === "number" &&
    typeof s.stability === "number"
  );
}

function loadState(): { petState: PetState; history: ChatMessage[] } {
  if (typeof window === "undefined")
    return { petState: DEFAULT_PET_STATE, history: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("no state");
    const stored = JSON.parse(raw);
    const savedAt = new Date(stored.lastSavedAt).getTime();
    if (Date.now() - savedAt > STATE_STALE_MS) throw new Error("stale");
    if (!isValidPetState(stored.petState)) throw new Error("invalid");
    // Transient modes can't survive a refresh — normalize to awake
    const TRANSIENT_MODES: PetMode[] = ["listening", "thinking", "speaking"];
    const petState = TRANSIENT_MODES.includes(stored.petState.mode)
      ? { ...stored.petState, mode: "awake" as PetMode, emotion: "neutral" as PetEmotion }
      : stored.petState;
    return {
      petState,
      history: Array.isArray(stored.conversationHistory)
        ? stored.conversationHistory
        : [],
    };
  } catch {
    return { petState: DEFAULT_PET_STATE, history: [] };
  }
}

function saveState(petState: PetState, history: ChatMessage[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      petState,
      conversationHistory: history.slice(-20),
      lastSavedAt: new Date().toISOString(),
    })
  );
}

export function usePetState() {
  // Always start with defaults to avoid SSR hydration mismatch
  const [petState, setPetState] = useState<PetState>(DEFAULT_PET_STATE);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [trace, setTrace] = useState<TraceEntry[]>([]);
  const [lastAction, setLastAction] = useState<PetAction | undefined>();
  const [hydrated, setHydrated] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load from localStorage after hydration
  useEffect(() => {
    const stored = loadState();
    setPetState(stored.petState);
    setHistory(stored.history);
    setHydrated(true);
  }, []);

  const currentFrame = selectFrame(petState.mode, petState.emotion, lastAction);

  // Persist on change (only after hydration)
  useEffect(() => {
    if (hydrated) saveState(petState, history);
  }, [petState, history, hydrated]);

  // Idle timeout → sleeping
  const resetIdleTimer = useCallback(() => {
    clearTimeout(idleTimer.current);
    if (petState.mode === "awake") {
      idleTimer.current = setTimeout(() => {
        setPetState((s) => ({ ...s, mode: "sleeping", emotion: "sleepy" }));
        setLastAction(undefined);
      }, IDLE_TIMEOUT_MS);
    }
  }, [petState.mode]);

  useEffect(() => {
    resetIdleTimer();
    return () => clearTimeout(idleTimer.current);
  }, [petState.mode, resetIdleTimer]);

  const wake = useCallback(() => {
    if (petState.mode !== "sleeping" && petState.mode !== "awake") return;
    setPetState((s) => ({
      ...s,
      mode: "awake",
      emotion: "curious",
      energy: clamp(s.energy - 1),
      affinity: clamp(s.affinity + 1),
      lastInteractionAt: new Date().toISOString(),
    }));
    setLastAction("wake");
  }, [petState.mode]);

  // Operational modes clear emotion so frame shows the mode, not stale emotion
  const setListening = useCallback(() => {
    setPetState((s) => ({ ...s, mode: "listening", emotion: "neutral" }));
    setLastAction(undefined);
  }, []);

  const setThinking = useCallback(() => {
    setPetState((s) => ({ ...s, mode: "thinking", emotion: "neutral" }));
    setLastAction(undefined);
  }, []);

  const applyResponse = useCallback(
    (resp: {
      emotion: PetEmotion;
      action: PetAction;
      state_delta: StateDelta;
      trace: TraceEntry[];
    }) => {
      setPetState((s) => ({
        ...s,
        emotion: resp.emotion,
        mode: "speaking",
        energy: clamp(s.energy + resp.state_delta.energy),
        mood: clamp(s.mood + resp.state_delta.mood),
        affinity: clamp(s.affinity + resp.state_delta.affinity),
        hunger: clamp(s.hunger + resp.state_delta.hunger),
        stability: clamp(s.stability + resp.state_delta.stability),
        lastInteractionAt: new Date().toISOString(),
      }));
      setLastAction(resp.action);
      setTrace(resp.trace);
    },
    []
  );

  const setSpeaking = useCallback(() => {
    setPetState((s) => ({ ...s, mode: "speaking" }));
  }, []);

  const setIdle = useCallback(() => {
    setPetState((s) => ({ ...s, mode: "awake" }));
    setLastAction(undefined);
  }, []);

  const setError = useCallback(() => {
    setPetState((s) => ({ ...s, mode: "error", emotion: "glitch" }));
    setLastAction("error");
  }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    setHistory((h) => [...h, msg].slice(-20));
  }, []);

  return {
    petState,
    currentFrame,
    history,
    trace,
    lastAction,
    wake,
    setListening,
    setThinking,
    setSpeaking,
    setIdle,
    setError,
    applyResponse,
    addMessage,
  };
}
