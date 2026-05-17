export type PetMode =
  | "booting"
  | "sleeping"
  | "awake"
  | "listening"
  | "thinking"
  | "speaking"
  | "error";

export type PetEmotion =
  | "neutral"
  | "happy"
  | "sad"
  | "sleepy"
  | "curious"
  | "comforting"
  | "glitch";

export type PetAction =
  | "wake"
  | "sleep"
  | "listen"
  | "think"
  | "speak"
  | "happy"
  | "comfort"
  | "idle"
  | "glitch"
  | "error";

export interface PetState {
  name: string;
  mode: PetMode;
  emotion: PetEmotion;
  energy: number;
  mood: number;
  affinity: number;
  hunger: number;
  stability: number;
  lastInteractionAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface TraceEntry {
  module: string;
  message: string;
  level?: "info" | "warning" | "error";
}

export interface StateDelta {
  energy: number;
  mood: number;
  affinity: number;
  hunger: number;
  stability: number;
}

export interface ChatResponse {
  reply: string;
  emotion: PetEmotion;
  action: PetAction;
  voice_style: string;
  state_delta: StateDelta;
  memory: { should_save: boolean; content: string };
  trace: TraceEntry[];
}

export type MemoryCategory = "name" | "preference" | "goal" | "habit" | "project" | "custom";

export interface MemoryEntry {
  id?: number;
  content: string;
  createdAt: string;
  created_at?: string;
  category?: MemoryCategory;
  pinned?: boolean;
}

export interface ChatRequest {
  message: string;
  pet_state: PetState;
  conversation_history: ChatMessage[];
  memories: MemoryEntry[];
}

export interface HealthStatus {
  status: string;
  uptime_seconds: number;
  llm: {
    provider: string;
    model: string;
    base_url: string;
    configured: boolean;
    mode: "llm" | "mock";
  };
  speech: {
    stt: string;
    tts: string;
    backend_stt: string | null;
    backend_tts: string | null;
  };
  memory: {
    backend: string;
    server_storage: boolean;
  };
}

export interface SttResponse {
  text: string;
  confidence: number;
  engine: string;
}

export interface SpeechServiceStatus {
  available: boolean;
  engine: string;
  model: string;
}

export interface SpeechStatus {
  stt: SpeechServiceStatus;
  tts: SpeechServiceStatus;
}

export const DEFAULT_PET_STATE: PetState = {
  name: "NEON PAW",
  mode: "sleeping",
  emotion: "sleepy",
  energy: 80,
  mood: 70,
  affinity: 20,
  hunger: 30,
  stability: 95,
  lastInteractionAt: "",
};
