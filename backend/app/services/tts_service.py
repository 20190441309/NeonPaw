"""CosyVoice TTS service wrapper with GPU support."""

import asyncio
import logging
from typing import Any, Dict, Optional

from app import config

logger = logging.getLogger(__name__)

# Try to import CosyVoice — may not be installed
try:
    from cosyvoice.cli.cosyvoice import CosyVoice

    COSYVOICE_AVAILABLE = True
except ImportError:
    COSYVOICE_AVAILABLE = False
    logger.warning("CosyVoice is not installed. TTS service will be unavailable.")


class TTSService:
    """Wraps CosyVoice text-to-speech model with lazy loading and status reporting."""

    def __init__(self) -> None:
        self._model: Optional[Any] = None
        self._loaded = False
        self._load_error: Optional[str] = None

    def _load_model(self) -> None:
        """Load CosyVoice model using config settings.

        Called lazily on first synthesis or explicitly via get_status().
        Errors during loading are captured rather than raised.
        """
        if self._loaded:
            return

        if not COSYVOICE_AVAILABLE:
            self._load_error = "CosyVoice package is not installed."
            self._loaded = True
            return

        if not config.TTS_ENABLED:
            self._load_error = "TTS is disabled in configuration."
            self._loaded = True
            return

        try:
            logger.info(
                "Loading CosyVoice model: %s (device=%s)",
                config.TTS_MODEL,
                config.TTS_DEVICE,
            )
            self._model = CosyVoice(config.TTS_MODEL, device=config.TTS_DEVICE)
            self._loaded = True
            logger.info("CosyVoice model loaded successfully on %s.", config.TTS_DEVICE)
        except Exception as exc:
            self._load_error = str(exc)
            self._loaded = True
            logger.error("Failed to load CosyVoice model: %s", exc)

    def get_status(self) -> Dict[str, Any]:
        """Return current status of the TTS service.

        Returns:
            Dict with keys: available, engine, model, device, error.
        """
        self._load_model()

        available = COSYVOICE_AVAILABLE and config.TTS_ENABLED and self._model is not None
        return {
            "available": available,
            "engine": "cosyvoice",
            "model": config.TTS_MODEL,
            "device": config.TTS_DEVICE,
            "error": self._load_error,
        }

    async def synthesize(
        self,
        text: str,
        voice: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Synthesize text to audio bytes.

        Args:
            text: The text to convert to speech.
            voice: Optional voice/speaker override. Uses TTS_DEFAULT_VOICE if None.

        Returns:
            Dict with keys: success, audio (bytes), error.
        """
        self._load_model()

        if self._model is None:
            return {
                "success": False,
                "audio": b"",
                "error": self._load_error or "Model not available.",
            }

        speaker = voice or config.TTS_DEFAULT_VOICE

        try:
            audio_chunks: list[bytes] = []

            def _run_synthesis() -> None:
                for chunk in self._model.inference_sft(text, speaker):
                    audio_chunks.append(chunk["tts_speech"])

            await asyncio.to_thread(_run_synthesis)

            if not audio_chunks:
                return {"success": True, "audio": b"", "error": None}

            # Concatenate all audio chunks
            import torch

            full_audio = torch.cat(audio_chunks, dim=1)
            audio_bytes = full_audio.numpy().tobytes()

            return {"success": True, "audio": audio_bytes, "error": None}
        except Exception as exc:
            logger.error("TTS synthesis failed: %s", exc)
            return {"success": False, "audio": b"", "error": str(exc)}


# Singleton instance
_tts_service: Optional[TTSService] = None


def get_tts_service() -> TTSService:
    """Return the singleton TTSService instance."""
    global _tts_service
    if _tts_service is None:
        _tts_service = TTSService()
    return _tts_service
