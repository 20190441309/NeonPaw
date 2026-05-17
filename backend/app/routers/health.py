import time
from fastapi import APIRouter
from app.config import LLM_PROVIDER, LLM_API_KEY, LLM_MODEL, LLM_BASE_URL

router = APIRouter(tags=["health"])

_start_time = time.time()


@router.get("/api/health")
def health_check():
    has_api_key = bool(LLM_API_KEY and LLM_API_KEY.strip())

    return {
        "status": "ok",
        "uptime_seconds": round(time.time() - _start_time, 1),
        "llm": {
            "provider": LLM_PROVIDER,
            "model": LLM_MODEL,
            "base_url": LLM_BASE_URL,
            "configured": has_api_key,
            "mode": "llm" if has_api_key else "mock",
        },
        "speech": {
            "stt": "browser",
            "tts": "browser",
            "backend_stt": None,
            "backend_tts": None,
        },
        "memory": {
            "backend": "localStorage",
            "server_storage": False,
        },
    }
