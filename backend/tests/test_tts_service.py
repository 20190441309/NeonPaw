import pytest
from unittest.mock import patch, MagicMock

from app.services.tts_service import TTSService


def test_tts_service_init():
    """Test TTSService can be initialized."""
    service = TTSService()
    assert service is not None


def test_load_model_passes_device_to_cosyvoice():
    """Test _load_model passes TTS_DEVICE to CosyVoice constructor."""
    mock_cosyvoice_cls = MagicMock()
    mock_instance = MagicMock()
    mock_cosyvoice_cls.return_value = mock_instance

    service = TTSService()

    with patch("app.services.tts_service.COSYVOICE_AVAILABLE", True), \
         patch("app.config.TTS_ENABLED", True), \
         patch("app.config.TTS_MODEL", "CosyVoice-300M"), \
         patch("app.config.TTS_DEVICE", "cuda:1"), \
         patch("app.services.tts_service.CosyVoice", mock_cosyvoice_cls, create=True):
        service._load_model()

    mock_cosyvoice_cls.assert_called_once_with("CosyVoice-300M", device="cuda:1")
    assert service._model is mock_instance


def test_tts_service_status():
    """Test TTSService returns status."""
    service = TTSService()
    status = service.get_status()
    assert "available" in status
    assert "engine" in status
    assert status["engine"] == "cosyvoice"


@pytest.mark.asyncio
async def test_synthesize_happy_path():
    """Test synthesize returns audio when model.inference_sft succeeds."""
    import numpy as np

    service = TTSService()

    mock_model = MagicMock()
    mock_chunk = {"tts_speech": MagicMock()}
    mock_model.inference_sft.return_value = [mock_chunk]

    # Patch torch.cat and numpy to avoid real tensor ops
    mock_torch = MagicMock()
    mock_tensor = MagicMock()
    mock_tensor.numpy.return_value = np.zeros(16000, dtype=np.float32)
    mock_torch.cat.return_value = mock_tensor

    with patch.object(service, "_model", mock_model), \
         patch.object(service, "_loaded", True), \
         patch.object(service, "_load_error", None), \
         patch("app.services.tts_service.torch", mock_torch, create=True):
        # We need to patch the import inside the method
        with patch.dict("sys.modules", {"torch": mock_torch}):
            result = await service.synthesize("hello world", voice="test_voice")

    assert result["success"] is True
    assert result["error"] is None
    assert isinstance(result["audio"], bytes)
    mock_model.inference_sft.assert_called_once_with("hello world", "test_voice")


@pytest.mark.asyncio
async def test_synthesize_default_voice():
    """Test synthesize uses TTS_DEFAULT_VOICE when no voice is provided."""
    import numpy as np

    service = TTSService()

    mock_model = MagicMock()
    mock_chunk = {"tts_speech": MagicMock()}
    mock_model.inference_sft.return_value = [mock_chunk]

    mock_torch = MagicMock()
    mock_tensor = MagicMock()
    mock_tensor.numpy.return_value = np.zeros(16000, dtype=np.float32)
    mock_torch.cat.return_value = mock_tensor

    with patch.object(service, "_model", mock_model), \
         patch.object(service, "_loaded", True), \
         patch.object(service, "_load_error", None), \
         patch("app.config.TTS_DEFAULT_VOICE", "default_speaker"):
        with patch.dict("sys.modules", {"torch": mock_torch}):
            result = await service.synthesize("test text")

    assert result["success"] is True
    mock_model.inference_sft.assert_called_once_with("test text", "default_speaker")


@pytest.mark.asyncio
async def test_synthesize_empty_chunks():
    """Test synthesize handles empty result from model."""
    service = TTSService()

    mock_model = MagicMock()
    mock_model.inference_sft.return_value = []

    with patch.object(service, "_model", mock_model), \
         patch.object(service, "_loaded", True), \
         patch.object(service, "_load_error", None):
        result = await service.synthesize("test text")

    assert result["success"] is True
    assert result["audio"] == b""
    assert result["error"] is None


@pytest.mark.asyncio
async def test_synthesize_model_unavailable():
    """Test synthesize returns error dict when model is not loaded."""
    service = TTSService()

    with patch.object(service, "_model", None), \
         patch.object(service, "_loaded", True), \
         patch.object(service, "_load_error", "TTS is disabled in configuration."):
        result = await service.synthesize("test text")

    assert result["success"] is False
    assert result["audio"] == b""
    assert "TTS is disabled" in result["error"]


@pytest.mark.asyncio
async def test_synthesize_raises_exception():
    """Test synthesize returns error dict when model.inference_sft raises."""
    service = TTSService()

    mock_model = MagicMock()
    mock_model.inference_sft.side_effect = RuntimeError("GPU out of memory")

    with patch.object(service, "_model", mock_model), \
         patch.object(service, "_loaded", True), \
         patch.object(service, "_load_error", None):
        result = await service.synthesize("test text")

    assert result["success"] is False
    assert result["audio"] == b""
    assert "GPU out of memory" in result["error"]
