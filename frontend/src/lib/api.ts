import { ChatRequest, ChatResponse } from "./types";

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
