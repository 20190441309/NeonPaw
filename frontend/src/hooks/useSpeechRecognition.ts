"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { normalizeSpeechText, isLowConfidenceSpeech } from "@/lib/speechUtils";
import { callSttApi, callSpeechStatusApi } from "@/lib/api";
import {
  getSpeechRecognitionConstructor,
  hasSpeechRecognitionSupport,
  type SpeechRecognitionErrorEventLike,
  type SpeechRecognitionEventLike,
  type SpeechRecognitionLike,
} from "@/lib/speechRecognitionTypes";
import { type SpeechLanguageCode, getLanguageConfig } from "@/lib/speechLanguages";

export function useSpeechRecognition(language: SpeechLanguageCode = "zh-CN") {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastConfidence, setLastConfidence] = useState<number | null>(null);
  const [lastRawTranscript, setLastRawTranscript] = useState("");
  // Default true so SSR and initial client render match.
  // Updated to real value after hydration in useEffect.
  const [isSupported, setIsSupported] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Refs for callback access inside onresult
  const onResultRef = useRef<((text: string, confidence: number | null) => void) | null>(null);
  const onLowConfidenceRef = useRef<((text: string, confidence: number | null) => void) | null>(null);
  const lastUserMessageRef = useRef<string | undefined>(undefined);
  const lastMessageTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const supported = hasSpeechRecognitionSupport();
    queueMicrotask(() => {
      setIsSupported(supported);
    });

    if (process.env.NODE_ENV === "development") {
      console.log("[STT] typeof window:", typeof window);
      console.log("[STT] SpeechRecognition supported:", supported);
      console.log("[STT] isSupported:", supported);
    }
  }, []);

  // Check backend speech service availability on mount
  useEffect(() => {
    callSpeechStatusApi().then(status => {
      setBackendAvailable(status?.stt?.available ?? false);
    });
  }, []);

  // Browser Web Speech API recognition (existing logic)
  const startBrowserRecognition = useCallback(
    (
      onResult: (text: string, confidence: number | null) => void,
      onLowConfidence?: (text: string, confidence: number | null) => void,
    ) => {
      if (typeof window === "undefined") return;
      if (!isSupported) {
        setError("语音识别需要 Chrome 或 Edge 浏览器");
        return;
      }

      const SpeechRecognitionCtor = getSpeechRecognitionConstructor();

      if (!SpeechRecognitionCtor) {
        setError("语音识别需要 Chrome 或 Edge 浏览器");
        setIsSupported(false);
        return;
      }

      onResultRef.current = onResult;
      onLowConfidenceRef.current = onLowConfidence || null;

      const recognition = new SpeechRecognitionCtor();
      const langConfig = getLanguageConfig(language);
      recognition.lang = langConfig.sttCode;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript("");
        setInterimTranscript("");
        setError(null);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
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
            console.log("[STT] final:", rawText, "-> normalized:", normalized, "confidence:", finalConfidence);
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

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
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
    [isSupported, language],
  );

  // Backend recording: record audio via MediaRecorder, send to backend STT
  const startBackendRecording = useCallback(
    async (
      onResult: (text: string, confidence: number | null) => void,
      onLowConfidence?: (text: string, confidence: number | null) => void,
    ) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });

        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

        setIsListening(true);
        setTranscript("");
        setInterimTranscript("");
        setError(null);

        mediaRecorder.onstop = async () => {
          setIsListening(false);
          const audioBlob = new Blob(chunks, { type: "audio/webm" });
          stream.getTracks().forEach(t => t.stop());

          const result = await callSttApi(audioBlob);
          if (result && result.text) {
            const normalized = normalizeSpeechText(result.text);
            setTranscript(normalized);
            setLastRawTranscript(result.text);
            setLastConfidence(result.confidence);

            if (process.env.NODE_ENV === "development") {
              console.log("[STT] backend result:", result.text, "-> normalized:", normalized, "confidence:", result.confidence);
            }

            const low = isLowConfidenceSpeech(
              normalized,
              result.confidence,
              lastUserMessageRef.current,
              lastMessageTimeRef.current,
            );

            if (low && onLowConfidence) {
              onLowConfidence(normalized, result.confidence);
            } else {
              lastUserMessageRef.current = normalized;
              lastMessageTimeRef.current = Date.now();
              onResult(normalized, result.confidence);
            }
          } else {
            setError("后端语音识别未返回结果");
          }
        };

        mediaRecorder.onerror = () => {
          setIsListening(false);
          stream.getTracks().forEach(t => t.stop());
          setError("录音出错");
        };

        mediaRecorder.start();

        // Store reference for stopping (compatible with the existing stop() API)
        recognitionRef.current = { stop: () => mediaRecorder.stop() } as SpeechRecognitionLike;
      } catch (err) {
        console.error("[STT] backend recording failed, falling back to browser:", err);
        setError("后端录音失败，使用浏览器识别");
        // Fallback to browser recognition
        startBrowserRecognition(onResult, onLowConfidence);
      }
    },
    [startBrowserRecognition],
  );

  // Public start() - routes to backend or browser based on availability
  const start = useCallback(
    (
      onResult: (text: string, confidence: number | null) => void,
      onLowConfidence?: (text: string, confidence: number | null) => void,
    ) => {
      if (backendAvailable) {
        startBackendRecording(onResult, onLowConfidence);
      } else {
        startBrowserRecognition(onResult, onLowConfidence);
      }
    },
    [backendAvailable, startBackendRecording, startBrowserRecognition],
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
    backendAvailable,
    lastConfidence,
    lastRawTranscript,
    start,
    stop,
    markMessageSent,
  };
}
