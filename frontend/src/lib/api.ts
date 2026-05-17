import { ChatRequest, ChatResponse, HealthStatus, SttResponse, SpeechStatus } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function callChatApi(request: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    return {
      reply: "核心信号有点不稳定……但我还在这里。",
      emotion: "glitch",
      action: "glitch",
      voice_style: "soft_robotic",
      state_delta: { energy: -1, mood: -1, affinity: 0, hunger: 0, stability: -3 },
      memory: { should_save: false, content: "" },
      trace: [{ module: "fallback", message: `HTTP ${res.status}` }],
    };
  }

  return res.json();
}

export async function callHealthApi(): Promise<HealthStatus | null> {
  try {
    const res = await fetch(`${API_URL}/api/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function callSttApi(audioBlob: Blob): Promise<SttResponse | null> {
  try {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");

    const res = await fetch(`${API_URL}/api/speech/stt`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function callTtsApi(text: string, voice: string = "default"): Promise<Blob | null> {
  try {
    const res = await fetch(`${API_URL}/api/speech/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return null;
    return res.blob();
  } catch {
    return null;
  }
}

export async function callSpeechStatusApi(): Promise<SpeechStatus | null> {
  try {
    const res = await fetch(`${API_URL}/api/speech/status`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
