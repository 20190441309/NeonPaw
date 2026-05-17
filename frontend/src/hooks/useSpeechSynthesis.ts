"use client";

import { useState, useCallback, useEffect } from "react";
import { callTtsApi, callSpeechStatusApi } from "@/lib/api";
import { type SpeechLanguageCode, getLanguageConfig } from "@/lib/speechLanguages";

export function useSpeechSynthesis(language: SpeechLanguageCode = "zh-CN") {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);

  const isBrowserSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  // Check backend speech service availability on mount
  useEffect(() => {
    callSpeechStatusApi().then(status => {
      setBackendAvailable(status?.tts?.available ?? false);
    });
  }, []);

  // Browser TTS fallback
  const speakWithBrowser = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!isBrowserSupported) {
        onEnd?.();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const langConfig = getLanguageConfig(language);
      utterance.lang = langConfig.ttsCode;
      utterance.rate = 1.0;
      utterance.pitch = 1.1;

      // Find appropriate voice for the selected language
      const voices = window.speechSynthesis.getVoices();
      const langPrefix = langConfig.ttsCode.split("-")[0];
      const matchingVoice = voices.find((v) => v.lang.startsWith(langPrefix));
      if (matchingVoice) utterance.voice = matchingVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        onEnd?.();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    },
    [isBrowserSupported, language],
  );

  // Public speak: tries backend first, falls back to browser TTS
  const speak = useCallback(
    async (text: string, onEnd?: () => void) => {
      if (backendAvailable) {
        try {
          const audioBlob = await callTtsApi(text);
          if (audioBlob) {
            const url = URL.createObjectURL(audioBlob);
            const audio = new Audio(url);
            setIsSpeaking(true);

            audio.onended = () => {
              setIsSpeaking(false);
              URL.revokeObjectURL(url);
              onEnd?.();
            };
            audio.onerror = () => {
              setIsSpeaking(false);
              URL.revokeObjectURL(url);
              // Fallback to browser TTS on playback error
              speakWithBrowser(text, onEnd);
            };

            await audio.play();
            return;
          }
        } catch (err) {
          console.error("[TTS] backend TTS failed, falling back to browser:", err);
        }
      }

      // Fallback to browser TTS
      speakWithBrowser(text, onEnd);
    },
    [backendAvailable, speakWithBrowser],
  );

  const cancel = useCallback(() => {
    if (isBrowserSupported) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, [isBrowserSupported]);

  return { isSpeaking, isSupported: isBrowserSupported, backendAvailable, speak, cancel };
}
