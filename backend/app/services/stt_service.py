"""FunASR STT service wrapper with GPU support."""

import logging
from typing import Any, Dict, Optional

from app import config

logger = logging.getLogger(__name__)

# Try to import FunASR — may not be installed
try:
    from funasr import AutoModel

    FUNASR_AVAILABLE = True
except ImportError:
    FUNASR_AVAILABLE = False
    logger.warning("FunASR is not installed. STT service will be unavailable.")


class STTService:
    """Wraps FunASR speech-to-text model with lazy loading and status reporting."""

    def __init__(self) -> None:
        self._model: Optional[Any] = None
        self._loaded = False
        self._load_error: Optional[str] = None

    def _load_model(self) -> None:
        """Load FunASR model using config settings.

        Called lazily on first transcription or explicitly via get_status().
        Errors during loading are captured rather than raised.
        """
        if self._loaded:
            return

        if not FUNASR_AVAILABLE:
            self._load_error = "FunASR package is not installed."
            self._loaded = True
            return

        if not config.STT_ENABLED:
            self._load_error = "STT is disabled in configuration."
            self._loaded = True
            return

        try:
            logger.info(
                "Loading FunASR model: %s (vad=%s, punc=%s, device=%s)",
                config.STT_MODEL,
                config.STT_VAD_MODEL,
                config.STT_PUNC_MODEL,
                config.DEVICE,
            )
            self._model = AutoModel(
                model=config.STT_MODEL,
                vad_model=config.STT_VAD_MODEL,
                punc_model=config.STT_PUNC_MODEL,
                device=config.DEVICE,
            )
            self._loaded = True
            logger.info("FunASR model loaded successfully on %s.", config.DEVICE)
        except Exception as exc:
            self._load_error = str(exc)
            self._loaded = True
            logger.error("Failed to load FunASR model: %s", exc)

    def get_status(self) -> Dict[str, Any]:
        """Return current status of the STT service.

        Returns:
            Dict with keys: available, engine, model, device, error.
        """
        self._load_model()

        available = FUNASR_AVAILABLE and config.STT_ENABLED and self._model is not None
        return {
            "available": available,
            "engine": "funasr",
            "model": config.STT_MODEL,
            "device": config.DEVICE,
            "error": self._load_error,
        }

    async def transcribe(
        self,
        audio_data: bytes,
        format: str = "wav",
    ) -> Dict[str, Any]:
        """Transcribe audio data to text.

        Args:
            audio_data: Raw audio bytes.
            format: Audio format (e.g. "wav", "mp3", "pcm").

        Returns:
            Dict with keys: success, text, error.
        """
        self._load_model()

        if self._model is None:
            return {
                "success": False,
                "text": "",
                "error": self._load_error or "Model not available.",
            }

        try:
            result = self._model.generate(input=audio_data)
            text = ""
            if result and len(result) > 0:
                text = result[0].get("text", "")
            return {"success": True, "text": text, "error": None}
        except Exception as exc:
            logger.error("Transcription failed: %s", exc)
            return {"success": False, "text": "", "error": str(exc)}


# Singleton instance
_stt_service: Optional[STTService] = None


def get_stt_service() -> STTService:
    """Return the singleton STTService instance."""
    global _stt_service
    if _stt_service is None:
        _stt_service = STTService()
    return _stt_service
