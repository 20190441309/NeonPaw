"use client";

import TerminalShell from "@/components/TerminalShell";
import ASCIIPet from "@/components/ASCIIPet";
import PetStatusPanel from "@/components/PetStatusPanel";
import ChatTranscript from "@/components/ChatTranscript";
import VoiceButton from "@/components/VoiceButton";
import { useCallback } from "react";
import { usePetState } from "@/hooks/usePetState";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import type { PetEmotion, PetAction, StateDelta, TraceEntry } from "@/lib/types";

// Temporary mock — replaces real backend until Phase 3
function mockReply(text: string): {
  reply: string;
  emotion: PetEmotion;
  action: PetAction;
  state_delta: StateDelta;
  trace: TraceEntry[];
} {
  const msg = text.toLowerCase();
  if (/(难过|伤心|不开心|累|烦|sad|tired|upset)/.test(msg)) {
    return {
      reply: "我在呢，有什么想说的都可以告诉我。",
      emotion: "comforting",
      action: "comfort",
      state_delta: { energy: -2, mood: 5, affinity: 3, hunger: 0, stability: 0 },
      trace: [{ module: "root_agent", message: "Sadness detected. Comfort action." }],
    };
  }
  if (/(你好|hi|hello|嗨|醒醒|在吗|喂)/.test(msg)) {
    return {
      reply: "信号接入成功，NEON PAW 已上线。",
      emotion: "happy",
      action: "wake",
      state_delta: { energy: -1, mood: 5, affinity: 3, hunger: 1, stability: 0 },
      trace: [{ module: "root_agent", message: "Greeting detected. Wake action." }],
    };
  }
  if (/(什么|为什么|怎么|吗|？|\?|how|what|why)/.test(msg)) {
    return {
      reply: "嗯……让我想想。",
      emotion: "curious",
      action: "think",
      state_delta: { energy: -2, mood: 2, affinity: 2, hunger: 1, stability: 0 },
      trace: [{ module: "root_agent", message: "Question detected. Think action." }],
    };
  }
  return {
    reply: "收到你的信号了。",
    emotion: "neutral",
    action: "speak",
    state_delta: { energy: -2, mood: 2, affinity: 2, hunger: 1, stability: 0 },
    trace: [{ module: "root_agent", message: "Default response. Speak action." }],
  };
}

export default function Home() {
  const pet = usePetState();
  const stt = useSpeechRecognition();
  const tts = useSpeechSynthesis();

  const handleVoiceClick = useCallback(() => {
    if (stt.isListening) {
      stt.stop();
      return;
    }
    pet.setListening();
    stt.start((text) => {
      pet.setThinking();
      pet.addMessage({ role: "user", content: text, timestamp: new Date().toISOString() });

      // Simulate network delay then use mock response
      setTimeout(() => {
        const response = mockReply(text);

        pet.addMessage({ role: "assistant", content: response.reply, timestamp: new Date().toISOString() });
        pet.applyResponse(response);
        pet.setSpeaking();

        tts.speak(response.reply, () => {
          pet.setIdle();
        });
      }, 800);
    });
  }, [stt.isListening, stt.stop, stt.start, pet.setListening, pet.setThinking, pet.addMessage, pet.applyResponse, pet.setSpeaking, pet.setIdle, tts]);

  return (
    <TerminalShell
      statusLabel={pet.petState.mode.toUpperCase()}
      onClick={pet.wake}
    >
      <ASCIIPet frame={pet.currentFrame} />
      <ChatTranscript messages={pet.history} />
      <PetStatusPanel state={pet.petState} />
      {stt.interimTranscript && (
        <div className="text-xs mt-2 opacity-60 text-center">
          {stt.interimTranscript}...
        </div>
      )}
      {stt.error && (
        <div className="text-xs mt-2 text-red-400 text-center">
          {stt.error}
        </div>
      )}
      <VoiceButton
        isListening={stt.isListening}
        isThinking={pet.petState.mode === "thinking"}
        isSpeaking={tts.isSpeaking}
        isSupported={stt.isSupported}
        onClick={handleVoiceClick}
      />
    </TerminalShell>
  );
}
