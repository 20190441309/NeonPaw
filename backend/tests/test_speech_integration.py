"""Integration tests for speech services."""
import pytest
from app.services.stt_service import get_stt_service, STTService
from app.services.tts_service import get_tts_service, TTSService


def test_stt_service_singleton():
    """Test STT service is singleton."""
    s1 = get_stt_service()
    s2 = get_stt_service()
    assert s1 is s2


def test_tts_service_singleton():
    """Test TTS service is singleton."""
    s1 = get_tts_service()
    s2 = get_tts_service()
    assert s1 is s2


def test_stt_service_status_structure():
    """Test STT service status has correct structure."""
    service = STTService()
    status = service.get_status()
    assert isinstance(status["available"], bool)
    assert isinstance(status["engine"], str)
    assert isinstance(status["model"], str)


def test_tts_service_status_structure():
    """Test TTS service status has correct structure."""
    service = TTSService()
    status = service.get_status()
    assert isinstance(status["available"], bool)
    assert isinstance(status["engine"], str)
    assert isinstance(status["model"], str)
