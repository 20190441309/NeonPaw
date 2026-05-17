# P2 Backend STT/TTS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add backend speech recognition (FunASR) and synthesis (CosyVoice) with fallback to browser Web Speech API.

**Architecture:** Integrate FunASR and CosyVoice Python SDKs directly into FastAPI backend. Frontend records audio via MediaRecorder, sends to backend, and plays returned audio. Falls back to browser APIs if backend unavailable.

**Tech Stack:** FunASR, CosyVoice, FastAPI, MediaRecorder API, Next.js

---

## File Structure

### Backend (New)

| File | Responsibility |
|---|---|
| `backend/app/services/stt_service.py` | FunASR wrapper - load model, transcribe audio |
| `backend/app/services/tts_service.py` | CosyVoice wrapper - load model, synthesize speech |
| `backend/app/routers/speech.py` | STT/TTS API endpoints |
| `backend/tests/test_speech.py` | Speech API tests |

### Backend (Modified)

| File | Change |
|---|---|
| `backend/app/config.py` | Add STT/TTS config variables |
| `backend/app/main.py` | Register speech router |
| `backend/requirements.txt` | Add funasr, cosyvoice, torch, torchaudio, soundfile |

### Frontend (Modified)

| File | Change |
|---|---|
| `frontend/src/lib/api.ts` | Add `callSttApi()`, `callTtsApi()`, `callSpeechStatusApi()` |
| `frontend/src/lib/types.ts` | Add `SttResponse`, `SpeechStatus` types |
| `frontend/src/hooks/useSpeechRecognition.ts` | Add backend STT with fallback |
| `frontend/src/hooks/useSpeechSynthesis.ts` | Add backend TTS with fallback |

---

## Task 1: Backend Config Setup

**Files:**
- Modify: `backend/app/config.py`
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add config variables to config.py**

```python
# Add after existing LLM config

# Speech Services
STT_ENABLED = os.getenv("STT_ENABLED", "true").lower() == "true"
STT_MODEL = os.getenv("STT_MODEL", "paraformer-zh")
STT_VAD_MODEL = os.getenv("STT_VAD_MODEL", "fsmn-vad")
STT_PUNC_MODEL = os.getenv("STT_PUNC_MODEL", "ct-punc")

TTS_ENABLED = os.getenv("TTS_ENABLED", "true").lower() == "true"
TTS_MODEL = os.getenv("TTS_MODEL", "CosyVoice-300M")
TTS_DEFAULT_VOICE = os.getenv("TTS_DEFAULT_VOICE", "default")

SPEECH_FALLBACK_TO_BROWSER = os.getenv("SPEECH_FALLBACK_TO_BROWSER", "true").lower() == "true"
```

- [ ] **Step 2: Update requirements.txt**

Add these lines to `backend/requirements.txt`:

```
funasr>=1.0.0
torch>=2.0.0
torchaudio>=2.0.0
soundfile>=0.12.0
librosa>=0.10.0
```

Note: CosyVoice installation is more complex and requires cloning the repo. We'll handle that separately.

- [ ] **Step 3: Commit**

```bash
git add backend/app/config.py backend/requirements.txt
git commit -m "feat: add STT/TTS config variables and dependencies"
```

---

## Task 2: STT Service (FunASR)

**Files:**
- Create: `backend/app/services/stt_service.py`
- Test: `backend/tests/test_stt_service.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_stt_service.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_stt_service.py -v`
Expected: FAIL with "ModuleNotFoundError: No module named 'app.services.stt_service'"

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/services/stt_service.py
"""FunASR Speech-to-Text service."""

from __future__ import annotations

import logging
import tempfile
from pathlib import Path

from app import config

logger = logging.getLogger(__name__)


class STTService:
    """FunASR wrapper for speech recognition."""

    def __init__(self):
        self._model = None
        self._available = False
        self._load_model()

    def _load_model(self):
        """Load FunASR model."""
        if not config.STT_ENABLED:
            logger.info("STT disabled via config")
            return

        try:
            from funasr import AutoModel

            logger.info("Loading FunASR model: %s", config.STT_MODEL)
            self._model = AutoModel(
                model=config.STT_MODEL,
                vad_model=config.STT_VAD_MODEL,
                punc_model=config.STT_PUNC_MODEL,
            )
            self._available = True
            logger.info("FunASR model loaded successfully")
        except Exception as e:
            logger.warning("Failed to load FunASR model: %s", e)
            self._available = False

    def get_status(self) -> dict:
        """Return STT service status."""
        return {
            "available": self._available,
            "engine": "funasr",
            "model": config.STT_MODEL,
        }

    async def transcribe(self, audio_data: bytes, format: str = "wav") -> dict:
        """Transcribe audio to text.

        Args:
            audio_data: Raw audio bytes
            format: Audio format (wav, webm, mp3, etc.)

        Returns:
            dict with "text" and "confidence" keys
        """
        if not self._available or self._model is None:
            raise RuntimeError("STT service not available")

        # Write audio to temp file
        with tempfile.NamedTemporaryFile(suffix=f".{format}", delete=False) as f:
            f.write(audio_data)
            temp_path = f.name

        try:
            result = self._model.generate(input=temp_path)
            text = result[0]["text"] if result else ""
            return {
                "text": text,
                "confidence": 0.95,  # FunASR doesn't provide confidence scores
                "engine": "funasr",
            }
        finally:
            Path(temp_path).unlink(missing_ok=True)


# Singleton instance
_stt_service: STTService | None = None


def get_stt_service() -> STTService:
    """Get or create STT service singleton."""
    global _stt_service
    if _stt_service is None:
        _stt_service = STTService()
    return _stt_service
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_stt_service.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/stt_service.py backend/tests/test_stt_service.py
git commit -m "feat: add FunASR STT service"
```

---

## Task 3: TTS Service (CosyVoice)

**Files:**
- Create: `backend/app/services/tts_service.py`
- Test: `backend/tests/test_tts_service.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_tts_service.py
import pytest
from app.services.tts_service import TTSService


def test_tts_service_init():
    """Test TTSService can be initialized."""
    service = TTSService()
    assert service is not None


def test_tts_service_status():
    """Test TTSService returns status."""
    service = TTSService()
    status = service.get_status()
    assert "available" in status
    assert "engine" in status
    assert status["engine"] == "cosyvoice"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_tts_service.py -v`
Expected: FAIL with "ModuleNotFoundError: No module named 'app.services.tts_service'"

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/services/tts_service.py
"""CosyVoice Text-to-Speech service."""

from __future__ import annotations

import io
import logging

import numpy as np
import soundfile as sf

from app import config

logger = logging.getLogger(__name__)


class TTSService:
    """CosyVoice wrapper for speech synthesis."""

    def __init__(self):
        self._model = None
        self._available = False
        self._load_model()

    def _load_model(self):
        """Load CosyVoice model."""
        if not config.TTS_ENABLED:
            logger.info("TTS disabled via config")
            return

        try:
            from cosyvoice import CosyVoice

            logger.info("Loading CosyVoice model: %s", config.TTS_MODEL)
            self._model = CosyVoice(config.TTS_MODEL)
            self._available = True
            logger.info("CosyVoice model loaded successfully")
        except Exception as e:
            logger.warning("Failed to load CosyVoice model: %s", e)
            self._available = False

    def get_status(self) -> dict:
        """Return TTS service status."""
        return {
            "available": self._available,
            "engine": "cosyvoice",
            "model": config.TTS_MODEL,
        }

    async def synthesize(self, text: str, voice: str = "default") -> bytes:
        """Synthesize speech from text.

        Args:
            text: Text to synthesize
            voice: Voice ID or "default"

        Returns:
            WAV audio bytes
        """
        if not self._available or self._model is None:
            raise RuntimeError("TTS service not available")

        if voice == "default":
            voice = config.TTS_DEFAULT_VOICE

        # Generate audio
        audio_chunks = []
        for chunk in self._model.inference_sft(text, voice):
            audio_chunks.append(chunk["tts_speech"])

        # Concatenate chunks
        audio = np.concatenate(audio_chunks, axis=1)

        # Convert to WAV bytes
        buffer = io.BytesIO()
        sf.write(buffer, audio.squeeze().numpy(), 22050, format="WAV")
        buffer.seek(0)
        return buffer.read()


# Singleton instance
_tts_service: TTSService | None = None


def get_tts_service() -> TTSService:
    """Get or create TTS service singleton."""
    global _tts_service
    if _tts_service is None:
        _tts_service = TTSService()
    return _tts_service
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_tts_service.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/tts_service.py backend/tests/test_tts_service.py
git commit -m "feat: add CosyVoice TTS service"
```

---

## Task 4: Speech API Router

**Files:**
- Create: `backend/app/routers/speech.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_speech_api.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_speech_api.py
import pytest
from fastapi.testclient import TestClient
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
    """Test /api/stt returns 422 when no file provided."""
    response = client.post("/api/stt")
    assert response.status_code == 422


def test_tts_endpoint_no_body():
    """Test /api/tts returns 422 when no body provided."""
    response = client.post("/api/tts")
    assert response.status_code == 422
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_speech_api.py -v`
Expected: FAIL with various errors

- [ ] **Step 3: Write speech router**

```python
# backend/app/routers/speech.py
"""Speech API endpoints for STT and TTS."""

from __future__ import annotations

import logging

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from app.services.stt_service import get_stt_service
from app.services.tts_service import get_tts_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/speech", tags=["speech"])


class TtsRequest(BaseModel):
    text: str
    voice: str = "default"


class SttResponse(BaseModel):
    text: str
    confidence: float
    engine: str


class SpeechServiceStatus(BaseModel):
    available: bool
    engine: str
    model: str


class SpeechStatusResponse(BaseModel):
    stt: SpeechServiceStatus
    tts: SpeechServiceStatus


@router.get("/status", response_model=SpeechStatusResponse)
async def speech_status():
    """Check speech service availability."""
    stt = get_stt_service()
    tts = get_tts_service()
    return SpeechStatusResponse(
        stt=SpeechServiceStatus(**stt.get_status()),
        tts=SpeechServiceStatus(**tts.get_status()),
    )


@router.post("/stt", response_model=SttResponse)
async def speech_to_text(file: UploadFile = File(...)):
    """Transcribe audio to text."""
    stt = get_stt_service()

    if not stt.get_status()["available"]:
        raise HTTPException(status_code=503, detail="STT service not available")

    # Read audio data
    audio_data = await file.read()

    # Determine format from content type
    format = "wav"
    if file.content_type:
        if "webm" in file.content_type:
            format = "webm"
        elif "mp3" in file.content_type:
            format = "mp3"
        elif "ogg" in file.content_type:
            format = "ogg"

    try:
        result = await stt.transcribe(audio_data, format=format)
        return SttResponse(**result)
    except Exception as e:
        logger.exception("STT failed")
        raise HTTPException(status_code=500, detail=f"STT failed: {str(e)}")


@router.post("/tts")
async def text_to_speech(request: TtsRequest):
    """Synthesize speech from text."""
    tts = get_tts_service()

    if not tts.get_status()["available"]:
        raise HTTPException(status_code=503, detail="TTS service not available")

    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        audio_bytes = await tts.synthesize(request.text, voice=request.voice)
        return Response(content=audio_bytes, media_type="audio/wav")
    except Exception as e:
        logger.exception("TTS failed")
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")
```

- [ ] **Step 4: Register router in main.py**

Add to `backend/app/main.py`:

```python
from app.routers import chat, health, speech  # Add speech

# After other routers:
app.include_router(speech.router)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_speech_api.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/speech.py backend/app/main.py backend/tests/test_speech_api.py
git commit -m "feat: add speech API endpoints"
```

---

## Task 5: Frontend Types and API Functions

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Add types to types.ts**

Add after `HealthStatus` interface:

```typescript
export interface SttResponse {
  text: string;
  confidence: number;
  engine: string;
}

export interface SpeechServiceStatus {
  available: boolean;
  engine: string;
  model: string;
}

export interface SpeechStatus {
  stt: SpeechServiceStatus;
  tts: SpeechServiceStatus;
}
```

- [ ] **Step 2: Add API functions to api.ts**

Add after `callHealthApi`:

```typescript
export async function callSttApi(audioBlob: Blob): Promise<SttResponse | null> {
  try {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");

    const res = await fetch(`${API_URL}/api/speech/stt`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(30000), // 30s timeout for STT
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function callTtsApi(text: string, voice: string = "default"): Promise<Blob | null> {
  try {
    const res = await fetch(`${API_URL}/api/speech/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
      signal: AbortSignal.timeout(30000), // 30s timeout for TTS
    });

    if (!res.ok) return null;
    return res.blob();
  } catch {
    return null;
  }
}

export async function callSpeechStatusApi(): Promise<SpeechStatus | null> {
  try {
    const res = await fetch(`${API_URL}/api/speech/status`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npm run build`
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/types.ts frontend/src/lib/api.ts
git commit -m "feat: add frontend speech API types and functions"
```

---

## Task 6: Frontend Speech Hook Updates

**Files:**
- Modify: `frontend/src/hooks/useSpeechRecognition.ts`
- Modify: `frontend/src/hooks/useSpeechSynthesis.ts`

- [ ] **Step 1: Update useSpeechRecognition.ts**

Add backend STT with fallback. Key changes:

```typescript
// Add import
import { callSttApi } from "@/lib/api";

// Add state for backend availability
const [backendAvailable, setBackendAvailable] = useState(false);

// Add function to check backend
const checkBackend = useCallback(async () => {
  const status = await callSpeechStatusApi();
  setBackendAvailable(status?.stt?.available ?? false);
}, []);

// Modify start function to use backend when available
const start = useCallback(
  (onResult, onLowConfidence) => {
    if (backendAvailable) {
      // Use MediaRecorder for backend STT
      startBackendRecording(onResult);
    } else {
      // Fallback to browser Web Speech API
      startBrowserRecognition(onResult, onLowConfidence);
    }
  },
  [backendAvailable]
);

// Add backend recording logic
const startBackendRecording = useCallback(async (onResult) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(chunks, { type: "audio/webm" });
      const result = await callSttApi(audioBlob);
      if (result) {
        onResult(result.text, result.confidence);
      }
      stream.getTracks().forEach((t) => t.stop());
    };

    mediaRecorder.start();
    recognitionRef.current = { stop: () => mediaRecorder.stop() };
  } catch (err) {
    console.error("Backend recording failed:", err);
    // Fallback to browser
    startBrowserRecognition(onResult);
  }
}, []);
```

- [ ] **Step 2: Update useSpeechSynthesis.ts**

Add backend TTS with fallback:

```typescript
// Add import
import { callTtsApi } from "@/lib/api";

// Add state for backend availability
const [backendAvailable, setBackendAvailable] = useState(false);

// Modify speak function
const speak = useCallback(
  async (text: string) => {
    if (backendAvailable) {
      // Try backend TTS
      const audioBlob = await callTtsApi(text);
      if (audioBlob) {
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();
        return;
      }
    }

    // Fallback to browser TTS
    speakWithBrowser(text);
  },
  [backendAvailable]
);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npm run build`
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/useSpeechRecognition.ts frontend/src/hooks/useSpeechSynthesis.ts
git commit -m "feat: add backend STT/TTS with browser fallback"
```

---

## Task 7: Integration Testing

**Files:**
- Test: `backend/tests/test_speech_integration.py`

- [ ] **Step 1: Write integration test**

```python
# backend/tests/test_speech_integration.py
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
```

- [ ] **Step 2: Run all tests**

Run: `cd backend && python -m pytest tests/ -v`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_speech_integration.py
git commit -m "test: add speech service integration tests"
```

---

## Task 8: Documentation and Config

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Update .env.example**

Add speech config section:

```env
# Speech Services (Backend STT/TTS)
STT_ENABLED=true
STT_MODEL=paraformer-zh
STT_VAD_MODEL=fsmn-vad
STT_PUNC_MODEL=ct-punc

TTS_ENABLED=true
TTS_MODEL=CosyVoice-300M
TTS_DEFAULT_VOICE=default

SPEECH_FALLBACK_TO_BROWSER=true
```

- [ ] **Step 2: Update README.md**

Add speech setup instructions:

```markdown
## Speech Services Setup

### FunASR (STT)

```bash
pip install funasr
```

Models auto-download on first use.

### CosyVoice (TTS)

```bash
git clone https://github.com/FunAudioLLM/CosyVoice.git
cd CosyVoice
pip install -r requirements.txt
```

### Config

Set in `.env`:

- `STT_ENABLED=true` - Enable backend STT
- `TTS_ENABLED=true` - Enable backend TTS
- `SPEECH_FALLBACK_TO_BROWSER=true` - Use browser API if backend unavailable
```

- [ ] **Step 3: Commit**

```bash
git add .env.example README.md
git commit -m "docs: add speech service setup instructions"
```

---

## Verification Checklist

After completing all tasks:

1. [ ] Backend starts without errors: `cd backend && python -m uvicorn app.main:app`
2. [ ] Speech status endpoint works: `curl http://localhost:8000/api/speech/status`
3. [ ] Frontend builds: `cd frontend && npm run build`
4. [ ] All tests pass: `cd backend && python -m pytest tests/ -v`
5. [ ] Health check shows speech status
6. [ ] Browser fallback works when backend unavailable
