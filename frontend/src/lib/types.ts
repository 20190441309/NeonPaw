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

export interface ChatRequest {
  message: string;
  pet_state: PetState;
  conversation_history: ChatMessage[];
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
