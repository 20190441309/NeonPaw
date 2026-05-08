"use client";

import TerminalShell from "@/components/TerminalShell";
import ASCIIPet from "@/components/ASCIIPet";
import PetStatusPanel from "@/components/PetStatusPanel";
import ChatTranscript from "@/components/ChatTranscript";
import VoiceButton from "@/components/VoiceButton";
import AgentTracePanel from "@/components/AgentTracePanel";
import StatusHint from "@/components/StatusHint";
import MemoryPanel from "@/components/MemoryPanel";
import MemoryNotification from "@/components/MemoryNotification";
import FirstTimeMemoryNotice from "@/components/FirstTimeMemoryNotice";
import WakeModeToggle from "@/components/WakeModeToggle";
import SpeechConfirmBar from "@/components/SpeechConfirmBar";
import { useCallback, useRef, useState, useEffect } from "react";
import { usePetState } from "@/hooks/usePetState";
import { useMemory } from "@/hooks/useMemory";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useWakeWord, type WakeResult } from "@/hooks/useWakeWord";
import { callChatApi } from "@/lib/api";
import { isLowConfidenceSpeech, normalizeSpeechText } from "@/lib/speechUtils";

interface PendingSpeech {
  text: string;
  isLowConfidence: boolean;
  confidence: number | null;
  /** Which flow triggered this: click, inline wake, or session */
  source: "click" | "inline" | "session";
}

export default function Home() {
  const pet = usePetState();
  const memory = useMemory();
  const stt = useSpeechRecognition();
  const tts = useSpeechSynthesis();
  const [isConnected, setIsConnected] = useState(true);

  // Wake mode state — persisted, default OFF
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const [wakeWordReady, setWakeWordReady] = useState(false);
  const [wakeStatus, setWakeStatus] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);

  // Phase 10D: pending speech confirmation
  const [pendingSpeech, setPendingSpeech] = useState<PendingSpeech | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("neon_paw_wake_mode");
    if (saved === "true") setWakeWordEnabled(true);
    setWakeWordReady(true);
  }, []);

  useEffect(() => {
    if (wakeWordReady) {
      localStorage.setItem("neon_paw_wake_mode", String(wakeWordEnabled));
    }
  }, [wakeWordEnabled, wakeWordReady]);

  // Refs for values needed inside async callbacks
  const petStateRef = useRef(pet.petState);
  const historyRef = useRef(pet.history);
  const memoriesRef = useRef(memory.memories);
  petStateRef.current = pet.petState;
  historyRef.current = pet.history;
  memoriesRef.current = memory.memories;

  // Track last user message for duplicate detection
  const lastSentMessageRef = useRef<string | undefined>(undefined);
  const lastSentTimeRef = useRef<number | undefined>(undefined);

  // Shared voice interaction flow — resumes wake listener after TTS
  const startVoiceInteraction = useCallback((text: string) => {
    const normalized = normalizeSpeechText(text);
    if (normalized.length === 0) return;

    setPendingSpeech(null);
    pet.setThinking();
    lastSentMessageRef.current = normalized;
    lastSentTimeRef.current = Date.now();
    stt.markMessageSent(normalized);

    if (process.env.NODE_ENV === "development") {
      console.log("[PAGE] sending to chat:", normalized);
    }
    pet.addMessage({ role: "user", content: normalized, timestamp: new Date().toISOString() });

    callChatApi({
      message: normalized,
      pet_state: petStateRef.current,
      conversation_history: historyRef.current,
      memories: memoriesRef.current,
    }).then((response) => {
      setIsConnected(true);
      if (response.memory.should_save && response.memory.content) {
        memory.addMemory(response.memory.content);
      }
      pet.addMessage({ role: "assistant", content: response.reply, timestamp: new Date().toISOString() });
      pet.applyResponse(response);
      pet.setSpeaking();

      tts.speak(response.reply, () => {
        pet.setIdle();
        // Resume wake listener after TTS finishes
        if (wakeWordRef.current) {
          wakeWordRef.current.resume();
        }
        setWakeStatus(null);
      });
    }).catch(() => {
      setIsConnected(false);
      pet.setError();
      pet.addMessage({
        role: "assistant",
        content: "核心信号有点不稳定……但我还在这里。",
        timestamp: new Date().toISOString(),
      });
      // Resume wake listener on error too
      if (wakeWordRef.current) {
        wakeWordRef.current.resume();
      }
      setWakeStatus(null);
    });
  }, [pet, tts, memory, stt]);

  // Handle low-confidence speech — show confirmation bar
  const handleLowConfidence = useCallback((
    text: string,
    confidence: number | null,
    source: PendingSpeech["source"],
  ) => {
    if (process.env.NODE_ENV === "development") {
      console.log("[PAGE] low confidence speech:", text, "confidence:", confidence, "source:", source);
    }
    // Set pet to curious on low confidence (not error)
    if (pet.petState.mode === "listening") {
      pet.setIdle();
    }
    setPendingSpeech({ text, isLowConfidence: true, confidence, source });
  }, [pet]);

  // Wake word hook — manages wake/command/session listening states
  const wakeWord = useWakeWord({
    enabled: wakeWordEnabled && (pet.petState.mode === "sleeping" || pet.petState.mode === "awake" || sessionActive),
    onWake: useCallback((result: WakeResult) => {
      if (result.mode === "inline") {
        setWakeStatus("PROCESSING COMMAND");
        setSessionActive(true);
        if (process.env.NODE_ENV === "development") {
          console.log("[PAGE] inline command:", result.command);
        }
        if (pet.petState.mode === "sleeping") {
          pet.wake();
        }
        // Low-confidence check on inline command
        setTimeout(() => {
          const cmd = result.command!;
          const low = isLowConfidenceSpeech(cmd, null, lastSentMessageRef.current, lastSentTimeRef.current);
          if (low) {
            handleLowConfidence(cmd, null, "inline");
          } else {
            startVoiceInteraction(cmd);
          }
        }, 300);
      } else {
        setWakeStatus("LISTENING FOR COMMAND");
        if (process.env.NODE_ENV === "development") {
          console.log("[PAGE] follow-up mode, wake hook capturing command");
        }
        if (pet.petState.mode === "sleeping") {
          pet.wake();
        }
      }
    }, [pet, startVoiceInteraction, handleLowConfidence]),
    onCommand: useCallback((text: string) => {
      setWakeStatus("PROCESSING COMMAND");
      setSessionActive(true);
      if (process.env.NODE_ENV === "development") {
        console.log("[PAGE] command captured:", text);
      }
      // Low-confidence check on session command
      const low = isLowConfidenceSpeech(text, null, lastSentMessageRef.current, lastSentTimeRef.current);
      if (low) {
        // Pause wake listener while showing confirmation
        if (wakeWordRef.current) {
          wakeWordRef.current.pause();
        }
        handleLowConfidence(text, null, "session");
      } else {
        startVoiceInteraction(text);
      }
    }, [startVoiceInteraction, handleLowConfidence]),
    onCommandTimeout: useCallback(() => {
      if (process.env.NODE_ENV === "development") {
        console.log("[PAGE] command/session timeout");
      }
      setSessionActive(false);
      setPendingSpeech(null);
      setWakeStatus("SESSION TIMEOUT // WAKE WORD ACTIVE");
      pet.setIdle();
      setTimeout(() => setWakeStatus(null), 3000);
    }, [pet]),
    isSupported: stt.isSupported && wakeWordReady,
  });

  // Keep a ref to wakeWord for use in callbacks
  const wakeWordRef = useRef(wakeWord);
  wakeWordRef.current = wakeWord;

  // Pause wake listener when main STT starts (e.g. from click-to-talk)
  useEffect(() => {
    if (stt.isListening && wakeWordEnabled) {
      wakeWord.pause();
    }
  }, [stt.isListening, wakeWordEnabled, wakeWord]);

  // Click-to-talk handler
  const handleVoiceClick = useCallback(() => {
    if (stt.isListening) {
      stt.stop();
      return;
    }
    if (pendingSpeech) return; // Don't restart while pending confirmation

    // Pause wake listener during click-to-talk
    if (wakeWordRef.current) {
      wakeWordRef.current.pause();
    }
    pet.setListening();
    stt.start(
      // onResult — high confidence, auto-send
      (text, confidence) => {
        if (process.env.NODE_ENV === "development") {
          console.log("[PAGE] click-to-talk auto-send:", text, "confidence:", confidence);
        }
        startVoiceInteraction(text);
      },
      // onLowConfidence — show confirmation
      (text, confidence) => {
        handleLowConfidence(text, confidence, "click");
      },
    );
  }, [stt.isListening, stt.stop, stt.start, pet.setListening, startVoiceInteraction, handleLowConfidence, pendingSpeech, stt, pet]);

  // Confirm pending speech — send edited text
  const handleConfirmSpeech = useCallback((editedText: string) => {
    if (process.env.NODE_ENV === "development") {
      console.log("[PAGE] speech confirmed:", editedText);
    }
    startVoiceInteraction(editedText);
  }, [startVoiceInteraction]);

  // Retry pending speech — clear and restart mic
  const handleRetrySpeech = useCallback(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[PAGE] speech retry");
    }
    setPendingSpeech(null);
    // Resume wake listener if it was active
    if (wakeWordEnabled && wakeWordRef.current) {
      wakeWordRef.current.resume();
    }
  }, [wakeWordEnabled]);

  // Dismiss pending speech
  const handleDismissSpeech = useCallback(() => {
    setPendingSpeech(null);
    // Resume wake listener
    if (wakeWordEnabled && wakeWordRef.current) {
      wakeWordRef.current.resume();
    }
    pet.setIdle();
  }, [wakeWordEnabled, pet]);

  const isError = pet.petState.mode === "error";

  // Determine display status for the header
  const displayMode = wakeStatus || pet.petState.mode.toUpperCase();

  const footerHint =
    pendingSpeech?.isLowConfidence ? "LOW CONFIDENCE // 可能没听清" :
    pendingSpeech ? "HEARD: 等待确认" :
    pet.petState.mode === "sleeping" && wakeWordEnabled ? 'SAY "NEON PAW" OR "小爪醒醒"' :
    pet.petState.mode === "awake" && wakeWordEnabled && sessionActive ? (wakeStatus || "SESSION LISTENING") :
    pet.petState.mode === "awake" && wakeWordEnabled ? (wakeStatus || "WAKE WORD ACTIVE") :
    pet.petState.mode === "sleeping" ? "TAP SCREEN TO WAKE" :
    pet.petState.mode === "awake" ? "TAP MICROPHONE TO TALK" :
    pet.petState.mode === "listening" ? "LISTENING..." :
    pet.petState.mode === "thinking" && sessionActive ? "SESSION // THINKING..." :
    pet.petState.mode === "thinking" ? "PET BRAIN PROCESSING..." :
    pet.petState.mode === "speaking" && sessionActive ? "SESSION // SPEAKING..." :
    pet.petState.mode === "speaking" ? "NEON PAW IS TALKING..." :
    pet.petState.mode === "error" ? "SIGNAL ERROR // RETRY" :
    "TAP SCREEN TO WAKE";

  return (
    <TerminalShell
      statusLabel={displayMode}
      statusHint={<StatusHint trace={pet.trace} isConnected={isConnected} memoryCount={memory.memories.length} />}
      footerHint={footerHint}
      headerAction={
        <WakeModeToggle
          enabled={wakeWordEnabled}
          onToggle={() => setWakeWordEnabled((v) => !v)}
          isSupported={stt.isSupported && wakeWordReady}
          error={wakeWord.error}
        />
      }
      onClick={pet.wake}
    >
      <ASCIIPet frame={pet.currentFrame} />
      <ChatTranscript messages={pet.history} />
      <PetStatusPanel state={pet.petState} />
      <AgentTracePanel trace={pet.trace} />
      <MemoryPanel memories={memory.memories} onRemove={memory.removeMemory} onClearAll={memory.clearMemories} />
      <MemoryNotification content={memory.lastSaved} onDismiss={memory.clearLastSaved} />
      {memory.firstTimeNotice && (
        <FirstTimeMemoryNotice onDismiss={memory.clearFirstTimeNotice} />
      )}
      {stt.interimTranscript && !pendingSpeech && (
        <div className="text-xs mt-2 opacity-50 text-center glow-subtle">
          {stt.interimTranscript}...
        </div>
      )}
      {stt.error && (
        <div className="text-[10px] mt-2 text-red-400/70 text-center">
          {stt.error}
        </div>
      )}
      {pendingSpeech ? (
        <SpeechConfirmBar
          text={pendingSpeech.text}
          isLowConfidence={pendingSpeech.isLowConfidence}
          confidence={pendingSpeech.confidence}
          onConfirm={handleConfirmSpeech}
          onRetry={handleRetrySpeech}
          onDismiss={handleDismissSpeech}
        />
      ) : (
        <VoiceButton
          isListening={stt.isListening}
          isThinking={pet.petState.mode === "thinking"}
          isSpeaking={tts.isSpeaking}
          isError={isError}
          isSupported={stt.isSupported}
          isWakeWordActive={wakeWord.isActive}
          onClick={handleVoiceClick}
        />
      )}
      {wakeWordEnabled && !pendingSpeech && (
        <div className="text-[9px] mt-2 text-center opacity-30 tracking-wider">
          WAKE MODE: BROWSER MIC ONLY · ACTIVE WHILE PAGE IS OPEN
        </div>
      )}
    </TerminalShell>
  );
}
