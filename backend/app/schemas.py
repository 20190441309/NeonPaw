from pydantic import BaseModel


class StateDelta(BaseModel):
    energy: int = 0
    mood: int = 0
    affinity: int = 0
    hunger: int = 0
    stability: int = 0


class PetState(BaseModel):
    name: str = "NEON PAW"
    mode: str = "sleeping"
    emotion: str = "sleepy"
    energy: int = 80
    mood: int = 70
    affinity: int = 20
    hunger: int = 30
    stability: int = 95
    lastInteractionAt: str = ""


class ConversationMessage(BaseModel):
    role: str
    content: str


class Memory(BaseModel):
    should_save: bool = False
    content: str = ""


class TraceEntry(BaseModel):
    module: str
    message: str


class MemoryEntry(BaseModel):
    content: str
    createdAt: str = ""


class ChatRequest(BaseModel):
    message: str
    pet_state: PetState
    conversation_history: list[ConversationMessage] = []
    memories: list[MemoryEntry] = []


class ChatResponse(BaseModel):
    reply: str
    emotion: str
    action: str
    voice_style: str = "soft_robotic"
    state_delta: StateDelta
    memory: Memory
    trace: list[TraceEntry]
