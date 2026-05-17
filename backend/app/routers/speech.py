"""Speech API endpoints for STT and TTS services."""

import io
import logging
import wave

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.config import (
    SPEECH_MAX_UPLOAD_BYTES,
    TTS_CHANNELS,
    TTS_SAMPLE_RATE,
    TTS_SAMPLE_WIDTH,
)
from app.services.stt_service import get_stt_service
from app.services.tts_service import get_tts_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/speech", tags=["speech"])


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ServiceStatus(BaseModel):
    available: bool
    engine: str
    model: str = ""
    error: str | None = None


class SpeechStatusResponse(BaseModel):
    stt: ServiceStatus
    tts: ServiceStatus


class STTResponse(BaseModel):
    text: str
    confidence: float = 0.95
    engine: str = "funasr"
    success: bool = True
    error: str | None = None


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text to synthesize")
    voice: str | None = Field(None, description="Optional voice/speaker name")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/status", response_model=SpeechStatusResponse)
async def speech_status():
    """Return availability and engine info for STT and TTS services."""
    stt = get_stt_service()
    tts = get_tts_service()

    stt_status = stt.get_status()
    tts_status = tts.get_status()

    return SpeechStatusResponse(
        stt=ServiceStatus(
            available=stt_status["available"],
            engine=stt_status["engine"],
            model=stt_status.get("model", ""),
            error=stt_status.get("error"),
        ),
        tts=ServiceStatus(
            available=tts_status["available"],
            engine=tts_status["engine"],
            model=tts_status.get("model", ""),
            error=tts_status.get("error"),
        ),
    )


@router.post("/stt", response_model=STTResponse)
async def speech_to_text(file: UploadFile = File(...)):
    """Accept an audio file upload and return the transcription.

    The file should be WAV format for best compatibility with FunASR.
    """
    stt = get_stt_service()
    status = stt.get_status()

    if not status["available"]:
        raise HTTPException(
            status_code=503,
            detail=f"STT service unavailable: {status.get('error', 'unknown')}",
        )

    try:
        audio_data = await file.read()
    except Exception as exc:
        logger.error("Failed to read uploaded file: %s", exc)
        raise HTTPException(status_code=400, detail="Failed to read uploaded file.")

    if not audio_data:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")

    if len(audio_data) > SPEECH_MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {SPEECH_MAX_UPLOAD_BYTES} bytes.",
        )

    result = await stt.transcribe(audio_data)

    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {result.get('error', 'unknown')}",
        )

    return STTResponse(
        text=result["text"],
        confidence=result.get("confidence", 0.95),
        engine=status.get("engine", "funasr"),
        success=True,
        error=None,
    )


@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    """Accept text and return synthesized audio as WAV.

    Returns audio/wav stream on success.
    """
    tts = get_tts_service()
    status = tts.get_status()

    if not status["available"]:
        raise HTTPException(
            status_code=503,
            detail=f"TTS service unavailable: {status.get('error', 'unknown')}",
        )

    result = await tts.synthesize(text=request.text, voice=request.voice)

    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=f"Synthesis failed: {result.get('error', 'unknown')}",
        )

    audio_bytes: bytes = result["audio"]
    if not audio_bytes:
        raise HTTPException(status_code=500, detail="Synthesis returned empty audio.")

    # Wrap raw PCM in a WAV container so the response is a valid WAV file.
    wav_buffer = io.BytesIO()
    with wave.open(wav_buffer, "wb") as wf:
        wf.setnchannels(TTS_CHANNELS)
        wf.setsampwidth(TTS_SAMPLE_WIDTH)
        wf.setframerate(TTS_SAMPLE_RATE)
        wf.writeframes(audio_bytes)
    wav_buffer.seek(0)

    return StreamingResponse(
        wav_buffer,
        media_type="audio/wav",
        headers={"Content-Disposition": "inline; filename=speech.wav"},
    )
