import { ChatRequest, ChatResponse, HealthStatus, MemoryEntry, MemoryCategory, SttResponse, SpeechStatus } from "./types";

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

// ---------------------------------------------------------------------------
// Memory API
// ---------------------------------------------------------------------------

export interface MemoryListResponse {
  memories: MemoryEntry[];
  total: number;
  categories: string[];
}

export async function callMemoryListApi(category?: string): Promise<MemoryListResponse | null> {
  try {
    const url = category
      ? `${API_URL}/api/memory?category=${encodeURIComponent(category)}`
      : `${API_URL}/api/memory`;
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function callMemoryCreateApi(content: string, category: MemoryCategory = "custom"): Promise<MemoryEntry | null> {
  try {
    const res = await fetch(`${API_URL}/api/memory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, category }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function callMemoryUpdateApi(
  id: number,
  patch: { content?: string; category?: MemoryCategory; pinned?: boolean },
): Promise<MemoryEntry | null> {
  try {
    const res = await fetch(`${API_URL}/api/memory/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function callMemoryDeleteApi(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/memory/${id}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function callMemoryClearApi(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/memory`, {
      method: "DELETE",
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface MemoryExportData {
  version: number;
  memories: { content: string; category: string; pinned: boolean }[];
}

export interface MemoryImportResult {
  imported: number;
  skipped: number;
  total: number;
}

export async function callMemoryExportApi(): Promise<MemoryExportData | null> {
  try {
    const res = await fetch(`${API_URL}/api/memory/export`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function callMemoryImportApi(
  memories: { content: string; category: string; pinned: boolean }[],
): Promise<MemoryImportResult | null> {
  try {
    const res = await fetch(`${API_URL}/api/memory/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memories }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
