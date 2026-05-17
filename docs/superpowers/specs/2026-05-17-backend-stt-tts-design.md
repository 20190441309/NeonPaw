# P2 Backend STT/TTS Design Spec

**Date:** 2026-05-17
**Status:** Draft
**Scope:** Add backend speech recognition (STT) and synthesis (TTS) using FunASR and CosyVoice

---

## Overview

Replace browser-native Web Speech API with backend-powered speech services:
- **STT**: FunASR (Alibaba's open-source ASR)
- **TTS**: CosyVoice (Alibaba's open-source TTS)

Both services will be integrated directly into the FastAPI backend using their Python SDKs.

---

## Architecture

```text
Frontend (Next.js)
    │
    ├─ Record audio (MediaRecorder API)
    │
    ▼
Backend (FastAPI)
    ├─ POST /api/stt ─→ FunASR SDK ─→ Return text
    ├─ POST /api/tts ─→ CosyVoice SDK ─→ Return audio
    └─ GET /api/speech/status ─→ Return service availability
    │
    ▼
Fallback: Browser Web Speech API (if backend unavailable)
```

---

## Backend API Design

### POST /api/stt

Speech-to-Text endpoint.

**Request:**
- Content-Type: `multipart/form-data`
- Body: Audio file (WAV, WebM, MP3, etc.)

**Response:**
```json
{
  "text": "你好呀",
  "confidence": 0.95,
  "engine": "funasr"
}
```

**Error Response:**
```json
{
  "error": "STT service unavailable",
  "detail": "FunASR model not loaded"
}
```

### POST /api/tts

Text-to-Speech endpoint.

**Request:**
- Content-Type: `application/json`
- Body:
```json
{
  "text": "你好呀",
  "voice": "default"
}
```

**Response:**
- Content-Type: `audio/wav`
- Body: WAV audio file

### GET /api/speech/status

Check speech service availability.

**Response:**
```json
{
  "stt": {
    "available": true,
    "engine": "funasr",
    "model": "paraformer-zh"
  },
  "tts": {
    "available": true,
    "engine": "cosyvoice",
    "model": "CosyVoice-300M"
  }
}
```

---

## FunASR Integration

### Model Configuration

```python
# Default models
STT_MODEL = "paraformer-zh"
STT_VAD_MODEL = "fsmn-vad"
STT_PUNC_MODEL = "ct-punc"
```

### Implementation

```python
from funasr import AutoModel

class STTService:
    def __init__(self):
        self.model = AutoModel(
            model=STT_MODEL,
            vad_model=STT_VAD_MODEL,
            punc_model=STT_PUNC_MODEL,
        )

    async def transcribe(self, audio_path: str) -> dict:
        result = self.model.generate(input=audio_path)
        return {
            "text": result[0]["text"],
            "confidence": 0.95,  # FunASR doesn't provide confidence
        }
```

### Environment Variables

```env
STT_MODEL=paraformer-zh
STT_VAD_MODEL=fsmn-vad
STT_PUNC_MODEL=ct-punc
```

---

## CosyVoice Integration

### Model Configuration

```python
# Default model
TTS_MODEL = "CosyVoice-300M"
TTS_DEFAULT_VOICE = "default"
```

### Implementation

```python
from cosyvoice import CosyVoice

class TTSService:
    def __init__(self):
        self.model = CosyVoice(TTS_MODEL)

    async def synthesize(self, text: str, voice: str = "default") -> bytes:
        # Generate audio
        audio = self.model.inference_sft(text, voice)
        # Return WAV bytes
        return audio_to_wav_bytes(audio)
```

### Environment Variables

```env
TTS_MODEL=CosyVoice-300M
TTS_DEFAULT_VOICE=default
```

---

## Frontend Changes

### Audio Recording

Use MediaRecorder API to capture audio from microphone:

```typescript
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus'
});

// Collect audio chunks
const chunks: Blob[] = [];
mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

// On stop, send to backend
mediaRecorder.onstop = async () => {
  const audioBlob = new Blob(chunks, { type: 'audio/webm' });
  const text = await callSttApi(audioBlob);
};
```

### Speech Hook Updates

Modify `useSpeechRecognition.ts`:
- Try backend STT first
- If fails, fallback to browser Web Speech API

Modify `useSpeechSynthesis.ts`:
- Try backend TTS first
- If fails, fallback to browser SpeechSynthesis API

### Health Check Integration

Update health check to include speech service status:
- Check `/api/speech/status` on startup
- Show speech engine status in StatusHint component

---

## File Changes

### New Files

| File | Purpose |
|---|---|
| `backend/app/services/stt_service.py` | FunASR wrapper |
| `backend/app/services/tts_service.py` | CosyVoice wrapper |
| `backend/app/routers/speech.py` | STT/TTS API endpoints |

### Modified Files

| File | Change |
|---|---|
| `backend/app/main.py` | Register speech router |
| `backend/app/config.py` | Add STT/TTS config variables |
| `backend/requirements.txt` | Add funasr, cosyvoice dependencies |
| `frontend/src/hooks/useSpeechRecognition.ts` | Add backend STT with fallback |
| `frontend/src/hooks/useSpeechSynthesis.ts` | Add backend TTS with fallback |
| `frontend/src/lib/api.ts` | Add `callSttApi()`, `callTtsApi()` |
| `frontend/src/lib/types.ts` | Add speech API types |

---

## Dependencies

### Backend (requirements.txt additions)

```
funasr>=1.0.0
cosyvoice>=0.1.0
torch>=2.0.0
torchaudio>=2.0.0
soundfile>=0.12.0
```

### Frontend

No new dependencies - uses native MediaRecorder API.

---

## Configuration

### .env additions

```env
# Speech Services
STT_ENABLED=true
STT_MODEL=paraformer-zh
STT_VAD_MODEL=fsmn-vad
STT_PUNC_MODEL=ct-punc

TTS_ENABLED=true
TTS_MODEL=CosyVoice-300M
TTS_DEFAULT_VOICE=default

# Fallback
SPEECH_FALLBACK_TO_BROWSER=true
```

---

## Error Handling

1. **Model not loaded**: Return 503 Service Unavailable
2. **Audio format error**: Return 400 Bad Request
3. **Synthesis fails**: Return 500 with error detail
4. **Frontend fallback**: If backend returns error, use browser API

---

## Testing

### Backend Tests

1. Test STT with sample audio files
2. Test TTS with various text inputs
3. Test `/api/speech/status` returns correct status
4. Test error handling for invalid audio

### Frontend Tests

1. Test audio recording works
2. Test fallback to browser API
3. Test speech status display

---

## Deployment Notes

### Local Development

1. Install FunASR: `pip install funasr`
2. Install CosyVoice: Follow GitHub instructions
3. Models auto-download on first use

### Production

1. Pre-download models to avoid cold start
2. Consider GPU for faster inference
3. Monitor memory usage (models can be large)

---

## Success Criteria

1. `POST /api/stt` correctly transcribes Chinese audio
2. `POST /api/tts` generates clear Chinese speech
3. Frontend records audio and sends to backend
4. Fallback to browser API works when backend unavailable
5. Speech status shows in health check
6. All existing tests still pass
