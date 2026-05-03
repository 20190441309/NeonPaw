"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Default true so SSR and initial client render match.
  // Updated to real value after hydration in useEffect.
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

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
    (onResult: (text: string) => void) => {
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
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += t;
          } else {
            interim += t;
          }
        }
        if (final) {
          setTranscript(final);
          setInterimTranscript("");
          onResult(final);
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

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    start,
    stop,
  };
}
