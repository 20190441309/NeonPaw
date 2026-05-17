import pytest
from app.services.stt_service import STTService


def test_stt_service_init():
    """Test STTService can be initialized."""
    service = STTService()
    assert service is not None


def test_stt_service_status():
    """Test STTService returns status."""
    service = STTService()
    status = service.get_status()
    assert "available" in status
    assert "engine" in status
    assert status["engine"] == "funasr"
