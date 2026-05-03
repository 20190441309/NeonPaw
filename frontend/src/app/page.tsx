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
import { useCallback, useRef, useState, useEffect } from "react";
import { usePetState } from "@/hooks/usePetState";
import { useMemory } from "@/hooks/useMemory";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useWakeWord } from "@/hooks/useWakeWord";
import { callChatApi } from "@/lib/api";

export default function Home() {
  const pet = usePetState();
  const memory = useMemory();
  const stt = useSpeechRecognition();
  const tts = useSpeechSynthesis();
  const [isConnected, setIsConnected] = useState(true);

  // Wake mode state — persisted, default OFF
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const [wakeWordReady, setWakeWordReady] = useState(false);

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

  // Refs for values needed inside the async callback but not as deps
  const petStateRef = useRef(pet.petState);
  const historyRef = useRef(pet.history);
  const memoriesRef = useRef(memory.memories);
  const sttStartRef = useRef(stt.start);
  petStateRef.current = pet.petState;
  historyRef.current = pet.history;
  memoriesRef.current = memory.memories;
  sttStartRef.current = stt.start;

  // Shared voice interaction flow
  const startVoiceInteraction = useCallback((text: string) => {
    pet.setThinking();
    pet.addMessage({ role: "user", content: text, timestamp: new Date().toISOString() });

    callChatApi({
      message: text,
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
      });
    }).catch(() => {
      setIsConnected(false);
      pet.setError();
      pet.addMessage({
        role: "assistant",
        content: "核心信号有点不稳定……但我还在这里。",
        timestamp: new Date().toISOString(),
      });
    });
  }, [pet, tts, memory]);

  // Wake phrase handler — wake pet then start voice flow
  const handleWakePhrase = useCallback(() => {
    if (pet.petState.mode === "sleeping") {
      pet.wake();
    }
    // Small delay to let pet transition to awake
    setTimeout(() => {
      pet.setListening();
      sttStartRef.current((text: string) => {
        startVoiceInteraction(text);
      });
    }, 300);
  }, [pet, startVoiceInteraction]);

  // Wake word hook — only active when enabled and pet is idle
  const isIdleForWake = pet.petState.mode === "sleeping" || pet.petState.mode === "awake";
  const wakeWord = useWakeWord({
    enabled: wakeWordEnabled && isIdleForWake && !stt.isListening,
    onWakePhrase: handleWakePhrase,
    isSupported: stt.isSupported && wakeWordReady,
  });

  const handleVoiceClick = useCallback(() => {
    if (stt.isListening) {
      stt.stop();
      return;
    }
    pet.setListening();
    stt.start((text) => {
      startVoiceInteraction(text);
    });
  }, [stt.isListening, stt.stop, stt.start, pet.setListening, startVoiceInteraction]);

  const isError = pet.petState.mode === "error";

  const footerHint =
    pet.petState.mode === "sleeping" ? (wakeWordEnabled ? "SAY \"NEON PAW\" TO WAKE" : "TAP SCREEN TO WAKE") :
    pet.petState.mode === "awake" ? (wakeWordEnabled ? "WAKE WORD ACTIVE" : "TAP MICROPHONE TO TALK") :
    pet.petState.mode === "listening" ? "LISTENING..." :
    pet.petState.mode === "thinking" ? "PET BRAIN PROCESSING..." :
    pet.petState.mode === "speaking" ? "NEON PAW IS TALKING..." :
    pet.petState.mode === "error" ? "SIGNAL ERROR // RETRY" :
    "TAP SCREEN TO WAKE";

  return (
    <TerminalShell
      statusLabel={pet.petState.mode.toUpperCase()}
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
      {stt.interimTranscript && (
        <div className="text-xs mt-2 opacity-50 text-center glow-subtle">
          {stt.interimTranscript}...
        </div>
      )}
      {stt.error && (
        <div className="text-[10px] mt-2 text-red-400/70 text-center">
          {stt.error}
        </div>
      )}
      <VoiceButton
        isListening={stt.isListening}
        isThinking={pet.petState.mode === "thinking"}
        isSpeaking={tts.isSpeaking}
        isError={isError}
        isSupported={stt.isSupported}
        isWakeWordActive={wakeWord.isActive}
        onClick={handleVoiceClick}
      />
      {wakeWordEnabled && (
        <div className="text-[9px] mt-2 text-center opacity-30 tracking-wider">
          WAKE MODE: BROWSER MIC ONLY · ACTIVE WHILE PAGE IS OPEN
        </div>
      )}
    </TerminalShell>
  );
}
