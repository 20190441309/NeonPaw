"""Tests for the /api/speech endpoints."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock

from app.main import app

client = TestClient(app)


def test_speech_status_endpoint():
    """Test /api/speech/status returns valid response."""
    response = client.get("/api/speech/status")
    assert response.status_code == 200
    data = response.json()
    assert "stt" in data
    assert "tts" in data
    assert "available" in data["stt"]
    assert "engine" in data["stt"]
    assert "available" in data["tts"]
    assert "engine" in data["tts"]


def test_stt_endpoint_no_file():
    """Test /api/speech/stt returns 422 when no file provided."""
    response = client.post("/api/speech/stt")
    assert response.status_code == 422


def test_tts_endpoint_no_body():
    """Test /api/speech/tts returns 422 when no body provided."""
    response = client.post("/api/speech/tts")
    assert response.status_code == 422


def test_tts_endpoint_empty_text():
    """Test /api/speech/tts returns 422 when text is empty."""
    response = client.post("/api/speech/tts", json={"text": ""})
    assert response.status_code == 422


def test_stt_endpoint_service_unavailable():
    """Test /api/speech/stt returns 503 when STT service is unavailable."""
    mock_stt = MagicMock()
    mock_stt.get_status.return_value = {
        "available": False,
        "engine": "funasr",
        "error": "FunASR package is not installed.",
    }

    with patch("app.routers.speech.get_stt_service", return_value=mock_stt):
        response = client.post(
            "/api/speech/stt",
            files={"file": ("test.wav", b"fake audio", "audio/wav")},
        )
    assert response.status_code == 503


def test_tts_endpoint_service_unavailable():
    """Test /api/speech/tts returns 503 when TTS service is unavailable."""
    mock_tts = MagicMock()
    mock_tts.get_status.return_value = {
        "available": False,
        "engine": "cosyvoice",
        "error": "CosyVoice package is not installed.",
    }

    with patch("app.routers.speech.get_tts_service", return_value=mock_tts):
        response = client.post("/api/speech/tts", json={"text": "hello"})
    assert response.status_code == 503


# ---------------------------------------------------------------------------
# Success path and failure tests
# ---------------------------------------------------------------------------


def test_stt_success():
    """Test /api/speech/stt returns 200 with transcription on success."""
    mock_stt = MagicMock()
    mock_stt.get_status.return_value = {
        "available": True,
        "engine": "funasr",
    }
    mock_stt.transcribe = AsyncMock(
        return_value={"success": True, "text": "hello world"}
    )

    with patch("app.routers.speech.get_stt_service", return_value=mock_stt):
        response = client.post(
            "/api/speech/stt",
            files={"file": ("test.wav", b"fake audio data", "audio/wav")},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["text"] == "hello world"
    assert data["error"] is None


def test_tts_success():
    """Test /api/speech/tts returns 200 with WAV bytes on success."""
    mock_tts = MagicMock()
    mock_tts.get_status.return_value = {
        "available": True,
        "engine": "cosyvoice",
    }
    # Return raw PCM bytes; the endpoint wraps them in WAV
    mock_tts.synthesize = AsyncMock(
        return_value={"success": True, "audio": b"\x00\x00" * 100}
    )

    with patch("app.routers.speech.get_tts_service", return_value=mock_tts):
        response = client.post("/api/speech/tts", json={"text": "hello"})
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    # Verify the response is valid WAV (starts with RIFF header)
    assert response.content[:4] == b"RIFF"


def test_stt_failure():
    """Test /api/speech/stt returns 500 when transcribe reports failure."""
    mock_stt = MagicMock()
    mock_stt.get_status.return_value = {
        "available": True,
        "engine": "funasr",
    }
    mock_stt.transcribe = AsyncMock(
        return_value={"success": False, "text": "", "error": "model crash"}
    )

    with patch("app.routers.speech.get_stt_service", return_value=mock_stt):
        response = client.post(
            "/api/speech/stt",
            files={"file": ("test.wav", b"fake audio data", "audio/wav")},
        )
    assert response.status_code == 500


def test_tts_failure():
    """Test /api/speech/tts returns 500 when synthesize reports failure."""
    mock_tts = MagicMock()
    mock_tts.get_status.return_value = {
        "available": True,
        "engine": "cosyvoice",
    }
    mock_tts.synthesize = AsyncMock(
        return_value={"success": False, "audio": b"", "error": "synthesis error"}
    )

    with patch("app.routers.speech.get_tts_service", return_value=mock_tts):
        response = client.post("/api/speech/tts", json={"text": "hello"})
    assert response.status_code == 500


def test_stt_file_too_large():
    """Test /api/speech/stt returns 413 when file exceeds size limit."""
    mock_stt = MagicMock()
    mock_stt.get_status.return_value = {
        "available": True,
        "engine": "funasr",
    }

    # Create a file just over 10 MB
    oversized = b"\x00" * (10 * 1024 * 1024 + 1)

    with patch("app.routers.speech.get_stt_service", return_value=mock_stt):
        response = client.post(
            "/api/speech/stt",
            files={"file": ("big.wav", oversized, "audio/wav")},
        )
    assert response.status_code == 413
