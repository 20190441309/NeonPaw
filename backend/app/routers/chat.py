from fastapi import APIRouter
from app.schemas import ChatRequest, ChatResponse
from app.agents.root_brain import generate_response, fallback_response

router = APIRouter()


@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        response = await generate_response(
            message=request.message,
            pet_state=request.pet_state,
            history=request.conversation_history,
            memories=request.memories,
        )
        return response
    except Exception:
        return fallback_response()
