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
import SpeechSignalPanel from "@/components/SpeechSignalPanel";
import SettingsButton from "@/components/SettingsButton";
import SettingsPanel from "@/components/SettingsPanel";
import InstallBanner from "@/components/InstallBanner";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useCallback, useRef, useState, useEffect, useSyncExternalStore } from "react";
import { usePetState } from "@/hooks/usePetState";
import { useMemory } from "@/hooks/useMemory";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useSpeechLanguage } from "@/hooks/useSpeechLanguage";
import { useWakeWord, type WakeResult } from "@/hooks/useWakeWord";
import { useSettings } from "@/hooks/useSettings";
import { useHealthCheck } from "@/hooks/useHealthCheck";
import { callChatApi } from "@/lib/api";
import { isLowConfidenceSpeech, normalizeSpeechText } from "@/lib/speechUtils";

interface PendingSpeech {
  text: string;
  isLowConfidence: boolean;
  confidence: number | null;
  /** Which flow triggered this: click, inline wake, or session */
  source: "click" | "inline" | "session";
}

const WAKE_MODE_STORAGE_KEY = "neon_paw_settings_wake_mode";
const WAKE_MODE_CHANGE_EVENT = "neon_paw_wake_mode_change";

function getWakeModeSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(WAKE_MODE_STORAGE_KEY) === "true";
}

function getWakeModeServerSnapshot(): boolean {
  return false;
}

function subscribeWakeMode(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(WAKE_MODE_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(WAKE_MODE_CHANGE_EVENT, onStoreChange);
  };
}

function persistWakeMode(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(WAKE_MODE_STORAGE_KEY, String(enabled));
  window.dispatchEvent(new Event(WAKE_MODE_CHANGE_EVENT));
}

export default function Home() {
  const pet = usePetState();
  const memory = useMemory();
  const speechLanguage = useSpeechLanguage();
  const stt = useSpeechRecognition(speechLanguage.languageCode);
  const tts = useSpeechSynthesis(speechLanguage.languageCode);
  const healthCheck = useHealthCheck();
  const [isConnected, setIsConnected] = useState(true);

  // Wake mode state — persisted, default OFF
  const wakeWordEnabled = useSyncExternalStore(
    subscribeWakeMode,
    getWakeModeSnapshot,
    getWakeModeServerSnapshot,
  );
  const [wakeStatus, setWakeStatus] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);

  // Phase 10D: pending speech confirmation
  const [pendingSpeech, setPendingSpeech] = useState<PendingSpeech | null>(null);

  // Memory import result
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);

  // Settings
  const { settings, update: updateSettings } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Refs for values needed inside async callbacks
  const petStateRef = useRef(pet.petState);
  const historyRef = useRef(pet.history);
  const memoriesRef = useRef(memory.memories);
  const wakeWordControlsRef = useRef<ReturnType<typeof useWakeWord> | null>(null);

  useEffect(() => {
    petStateRef.current = pet.petState;
    historyRef.current = pet.history;
    memoriesRef.current = memory.memories;
  }, [pet.petState, pet.history, memory.memories]);

  // Register PWA service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

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
        wakeWordControlsRef.current?.resume();
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
      wakeWordControlsRef.current?.resume();
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
        wakeWordControlsRef.current?.pause();
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
    isSupported: stt.isSupported,
    language: speechLanguage.languageCode,
  });

  // Keep a ref to wakeWord for use in callbacks
  useEffect(() => {
    wakeWordControlsRef.current = wakeWord;
  }, [wakeWord]);

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
    wakeWordControlsRef.current?.pause();
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
  }, [stt, pet, startVoiceInteraction, handleLowConfidence, pendingSpeech]);

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
    if (wakeWordEnabled) {
      wakeWordControlsRef.current?.resume();
    }
  }, [wakeWordEnabled]);

  // Dismiss pending speech
  const handleDismissSpeech = useCallback(() => {
    setPendingSpeech(null);
    // Resume wake listener
    if (wakeWordEnabled) {
      wakeWordControlsRef.current?.resume();
    }
    pet.setIdle();
  }, [wakeWordEnabled, pet]);

  const isError = pet.petState.mode === "error";

  // Determine display status for the header
  const displayMode = wakeStatus || pet.petState.mode.toUpperCase();
  const voiceSignalActive = stt.isListening || wakeWord.isActive || pendingSpeech != null;
  const voiceSignalMode = pendingSpeech
    ? "confirm"
    : stt.isListening
      ? "click"
      : wakeWord.mode;
  const voiceSignalConfidence = pendingSpeech?.confidence ?? stt.lastConfidence;

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
      statusHint={<StatusHint trace={pet.trace} isConnected={isConnected} memoryCount={memory.memories.length} health={healthCheck.health} />}
      footerHint={footerHint}
      headerAction={
        <div className="flex items-center gap-2">
          <SettingsButton onClick={() => setSettingsOpen(true)} />
          <LanguageSelector
            currentLanguage={speechLanguage.languageCode}
            onLanguageChange={speechLanguage.setLanguage}
            compact
          />
          <WakeModeToggle
            enabled={wakeWordEnabled}
            onToggle={() => persistWakeMode(!wakeWordEnabled)}
            isSupported={stt.isSupported}
            error={wakeWord.error}
          />
        </div>
      }
      onClick={pet.wake}
    >
      <ASCIIPet frame={pet.currentFrame} />
      <SpeechSignalPanel
        isActive={voiceSignalActive}
        mode={voiceSignalMode}
        confidence={voiceSignalConfidence}
        interimTranscript={pendingSpeech ? "" : stt.interimTranscript}
        isLowConfidence={pendingSpeech?.isLowConfidence}
      />
      <ChatTranscript messages={pet.history} />
      <PetStatusPanel state={pet.petState} />
      <AgentTracePanel trace={pet.trace} traceMode={settings.traceMode} />
      <MemoryPanel
        memories={memory.memories}
        backendAvailable={memory.backendAvailable}
        onRemove={memory.removeMemory}
        onUpdate={memory.updateMemory}
        onClearAll={memory.clearMemories}
        onExport={memory.exportMemories}
        onImport={async (file) => {
          setImportResult(null);
          const result = await memory.importMemories(file);
          setImportResult(result);
          if (result) setTimeout(() => setImportResult(null), 4000);
        }}
        importResult={importResult}
      />
      <MemoryNotification content={memory.lastSaved} onDismiss={memory.clearLastSaved} />
      {memory.firstTimeNotice && (
        <FirstTimeMemoryNotice onDismiss={memory.clearFirstTimeNotice} />
      )}
      {stt.error && (
        <div className="text-[10px] mt-2 text-red-400/70 text-center">
          {stt.error}
        </div>
      )}
      {pendingSpeech ? (
        <SpeechConfirmBar
          key={`${pendingSpeech.source}:${pendingSpeech.text}`}
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
      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        onUpdate={updateSettings}
        onClose={() => setSettingsOpen(false)}
      />
      <InstallBanner />
    </TerminalShell>
  );
}
