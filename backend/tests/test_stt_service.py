import pytest
from unittest.mock import patch, MagicMock

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


@pytest.mark.asyncio
async def test_transcribe_happy_path():
    """Test transcribe returns text when model.generate succeeds."""
    service = STTService()

    mock_model = MagicMock()
    mock_model.generate.return_value = [{"text": "hello world"}]

    with patch.object(service, "_model", mock_model), \
         patch.object(service, "_loaded", True), \
         patch.object(service, "_load_error", None):
        result = await service.transcribe(b"fake audio bytes")

    assert result["success"] is True
    assert result["text"] == "hello world"
    assert result["error"] is None
    mock_model.generate.assert_called_once_with(input=b"fake audio bytes")


@pytest.mark.asyncio
async def test_transcribe_empty_result():
    """Test transcribe handles empty result from model."""
    service = STTService()

    mock_model = MagicMock()
    mock_model.generate.return_value = []

    with patch.object(service, "_model", mock_model), \
         patch.object(service, "_loaded", True), \
         patch.object(service, "_load_error", None):
        result = await service.transcribe(b"fake audio bytes")

    assert result["success"] is True
    assert result["text"] == ""
    assert result["error"] is None


@pytest.mark.asyncio
async def test_transcribe_model_unavailable():
    """Test transcribe returns error dict when model is not loaded."""
    service = STTService()

    with patch.object(service, "_model", None), \
         patch.object(service, "_loaded", True), \
         patch.object(service, "_load_error", "STT is disabled in configuration."):
        result = await service.transcribe(b"fake audio bytes")

    assert result["success"] is False
    assert result["text"] == ""
    assert "STT is disabled" in result["error"]


@pytest.mark.asyncio
async def test_transcribe_generate_raises_exception():
    """Test transcribe returns error dict when model.generate raises."""
    service = STTService()

    mock_model = MagicMock()
    mock_model.generate.side_effect = RuntimeError("GPU out of memory")

    with patch.object(service, "_model", mock_model), \
         patch.object(service, "_loaded", True), \
         patch.object(service, "_load_error", None):
        result = await service.transcribe(b"fake audio bytes")

    assert result["success"] is False
    assert result["text"] == ""
    assert "GPU out of memory" in result["error"]
