"use client";

import TerminalShell from "@/components/TerminalShell";
import ASCIIPet from "@/components/ASCIIPet";
import PetStatusPanel from "@/components/PetStatusPanel";
import ChatTranscript from "@/components/ChatTranscript";
import VoiceButton from "@/components/VoiceButton";
import AgentTracePanel from "@/components/AgentTracePanel";
import StatusHint from "@/components/StatusHint";
import { useCallback, useRef, useState } from "react";
import { usePetState } from "@/hooks/usePetState";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { callChatApi } from "@/lib/api";

export default function Home() {
  const pet = usePetState();
  const stt = useSpeechRecognition();
  const tts = useSpeechSynthesis();
  const [isConnected, setIsConnected] = useState(true);

  // Refs for values needed inside the async callback but not as deps
  const petStateRef = useRef(pet.petState);
  const historyRef = useRef(pet.history);
  petStateRef.current = pet.petState;
  historyRef.current = pet.history;

  const handleVoiceClick = useCallback(() => {
    if (stt.isListening) {
      stt.stop();
      return;
    }
    pet.setListening();
    stt.start(async (text) => {
      pet.setThinking();
      pet.addMessage({ role: "user", content: text, timestamp: new Date().toISOString() });

      try {
        const response = await callChatApi({
          message: text,
          pet_state: petStateRef.current,
          conversation_history: historyRef.current,
        });

        setIsConnected(true);
        pet.addMessage({ role: "assistant", content: response.reply, timestamp: new Date().toISOString() });
        pet.applyResponse(response);
        pet.setSpeaking();

        tts.speak(response.reply, () => {
          pet.setIdle();
        });
      } catch {
        setIsConnected(false);
        pet.setError();
        pet.addMessage({
          role: "assistant",
          content: "核心信号有点不稳定……但我还在这里。",
          timestamp: new Date().toISOString(),
        });
      }
    });
  }, [stt.isListening, stt.stop, stt.start, pet.setListening, pet.setThinking, pet.addMessage, pet.applyResponse, pet.setSpeaking, pet.setIdle, pet.setError, tts]);

  const isError = pet.petState.mode === "error";

  return (
    <TerminalShell
      statusLabel={pet.petState.mode.toUpperCase()}
      statusHint={<StatusHint trace={pet.trace} isConnected={isConnected} />}
      onClick={pet.wake}
    >
      <ASCIIPet frame={pet.currentFrame} />
      <ChatTranscript messages={pet.history} />
      <PetStatusPanel state={pet.petState} />
      <AgentTracePanel trace={pet.trace} />
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
        onClick={handleVoiceClick}
      />
    </TerminalShell>
  );
}
