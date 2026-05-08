"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { normalizeSpeechText, isLowConfidenceSpeech } from "@/lib/speechUtils";

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastConfidence, setLastConfidence] = useState<number | null>(null);
  const [lastRawTranscript, setLastRawTranscript] = useState("");
  // Default true so SSR and initial client render match.
  // Updated to real value after hydration in useEffect.
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Refs for callback access inside onresult
  const onResultRef = useRef<((text: string, confidence: number | null) => void) | null>(null);
  const onLowConfidenceRef = useRef<((text: string, confidence: number | null) => void) | null>(null);
  const lastUserMessageRef = useRef<string | undefined>(undefined);
  const lastMessageTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    setIsSupported(supported);

    if (process.env.NODE_ENV === "development") {
      console.log("[STT] typeof window:", typeof window);
      console.log("[STT] window.SpeechRecognition:", typeof window !== "undefined" && Boolean((window as any).SpeechRecognition));
      console.log("[STT] window.webkitSpeechRecognition:", typeof window !== "undefined" && Boolean((window as any).webkitSpeechRecognition));
      console.log("[STT] isSupported:", supported);
    }
  }, []);

  const start = useCallback(
    (
      onResult: (text: string, confidence: number | null) => void,
      onLowConfidence?: (text: string, confidence: number | null) => void,
    ) => {
      if (typeof window === "undefined") return;
      if (!isSupported) {
        setError("语音识别需要 Chrome 或 Edge 浏览器");
        return;
      }

      const SpeechRecognitionCtor =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognitionCtor) {
        setError("语音识别需要 Chrome 或 Edge 浏览器");
        setIsSupported(false);
        return;
      }

      onResultRef.current = onResult;
      onLowConfidenceRef.current = onLowConfidence || null;

      const recognition = new SpeechRecognitionCtor();
      recognition.lang = "zh-CN";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript("");
        setInterimTranscript("");
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let finalText = "";
        let finalConfidence: number | null = null;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const t = result[0].transcript;
          if (result.isFinal) {
            finalText += t;
            // Read confidence (may be undefined in some browsers)
            if (result[0].confidence != null) {
              finalConfidence = result[0].confidence;
            }
          } else {
            interim += t;
          }
        }
        if (finalText) {
          const rawText = finalText;
          const normalized = normalizeSpeechText(rawText);
          setTranscript(normalized);
          setInterimTranscript("");
          setLastRawTranscript(rawText);
          setLastConfidence(finalConfidence);

          if (process.env.NODE_ENV === "development") {
            console.log("[STT] final:", rawText, "→ normalized:", normalized, "confidence:", finalConfidence);
          }

          // Check if low confidence
          const low = isLowConfidenceSpeech(
            normalized,
            finalConfidence,
            lastUserMessageRef.current,
            lastMessageTimeRef.current,
          );

          if (low && onLowConfidenceRef.current) {
            if (process.env.NODE_ENV === "development") {
              console.log("[STT] low confidence, deferring to confirmation");
            }
            onLowConfidenceRef.current?.(normalized, finalConfidence);
          } else {
            if (process.env.NODE_ENV === "development") {
              console.log("[STT] high confidence, auto-sending");
            }
            lastUserMessageRef.current = normalized;
            lastMessageTimeRef.current = Date.now();
            onResultRef.current?.(normalized, finalConfidence);
          }
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = (event: any) => {
        if (process.env.NODE_ENV === "development") {
          console.log("[STT] recognition error:", event.error);
        }
        if (event.error === "not-allowed") {
          setError("请允许麦克风访问权限");
        } else if (event.error === "no-speech") {
          setError("我没有听清，再说一次？");
        } else {
          setError(`语音识别出错: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    },
    [isSupported]
  );

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  /**
   * Update the last user message reference (call after confirmed send).
   */
  const markMessageSent = useCallback((text: string) => {
    lastUserMessageRef.current = text;
    lastMessageTimeRef.current = Date.now();
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    lastConfidence,
    lastRawTranscript,
    start,
    stop,
    markMessageSent,
  };
}
