# Phase 13 Checkpoint: Backend STT/TTS

**Date:** 2026-05-17
**Status:** Complete
**Branch:** main

---

## Summary

Added backend speech recognition (STT) and synthesis (TTS) using FunASR and CosyVoice with GPU support. Frontend now tries backend speech services first, falling back to browser Web Speech API if unavailable.

---

## What Changed

### 1. Backend STT Service (FunASR)

**Files:**
- `backend/app/services/stt_service.py` — FunASR wrapper
- `backend/tests/test_stt_service.py` — 6 tests

**Features:**
- Lazy-loading singleton pattern
- GPU support via `STT_DEVICE` config (default: cuda)
- Async transcription with `asyncio.to_thread()`
- Graceful error handling (service unavailable returns error dict)

### 2. Backend TTS Service (CosyVoice)

**Files:**
- `backend/app/services/tts_service.py` — CosyVoice wrapper
- `backend/tests/test_tts_service.py` — 8 tests

**Features:**
- Lazy-loading singleton pattern
- GPU support via `TTS_DEVICE` config (default: cuda)
- Async synthesis with `asyncio.to_thread()`
- Configurable sample rate, channels, sample width

### 3. Speech API Endpoints

**Files:**
- `backend/app/routers/speech.py` — API router
- `backend/app/main.py` — Router registration
- `backend/tests/test_speech_api.py` — 11 tests

**Endpoints:**
- `GET /api/speech/status` — Service availability
- `POST /api/speech/stt` — Audio → Text (multipart upload)
- `POST /api/speech/tts` — Text → Audio (JSON → WAV)

**Features:**
- 10MB upload size limit
- Proper HTTP status codes (422, 413, 503, 500)
- Pydantic models for type safety

### 4. Frontend Integration

**Files:**
- `frontend/src/lib/types.ts` — Speech types
- `frontend/src/lib/api.ts` — Speech API functions
- `frontend/src/hooks/useSpeechRecognition.ts` — Backend STT with fallback
- `frontend/src/hooks/useSpeechSynthesis.ts` — Backend TTS with fallback

**Behavior:**
- Checks backend availability on mount
- Uses backend speech when available
- Falls back to browser Web Speech API on failure
- Exports `backendAvailable` state

### 5. Configuration

**Files:**
- `backend/app/config.py` — STT/TTS config variables
- `.env.example` — Example environment config
- `README.md` — Speech setup instructions

**New config variables:**
- `STT_ENABLED`, `STT_MODEL`, `STT_VAD_MODEL`, `STT_PUNC_MODEL`, `STT_DEVICE`
- `TTS_ENABLED`, `TTS_MODEL`, `TTS_DEFAULT_VOICE`, `TTS_DEVICE`
- `TTS_SAMPLE_RATE`, `TTS_CHANNELS`, `TTS_SAMPLE_WIDTH`
- `SPEECH_FALLBACK_TO_BROWSER`, `SPEECH_MAX_UPLOAD_BYTES`

---

## Files Changed

| Category | Files |
|---|---|
| Backend new | `services/stt_service.py`, `services/tts_service.py`, `routers/speech.py` |
| Backend modified | `config.py`, `main.py`, `requirements.txt` |
| Backend tests | `test_stt_service.py`, `test_tts_service.py`, `test_speech_api.py`, `test_speech_integration.py` |
| Frontend modified | `types.ts`, `api.ts`, `useSpeechRecognition.ts`, `useSpeechSynthesis.ts` |
| Docs | `.env.example`, `README.md` |

**Total:** ~15 files changed

---

## Verification

1. Backend: 88 tests pass (1 pre-existing failure in test_root_brain)
2. Frontend: `npm run build` succeeds
3. All speech API endpoints respond correctly
4. Browser fallback works when backend unavailable

---

## Deployment Notes

### Prerequisites

1. Install FunASR: `pip install funasr`
2. Install CosyVoice: Clone repo and install dependencies
3. Install PyTorch with CUDA for GPU support

### Environment Variables

```env
STT_ENABLED=true
STT_DEVICE=cuda
TTS_ENABLED=true
TTS_DEVICE=cuda
SPEECH_FALLBACK_TO_BROWSER=true
```

### Architecture

```
Frontend (PWA) → Network → Backend (FastAPI + GPU)
                              ├─ FunASR (STT)
                              └─ CosyVoice (TTS)
```

---

## Known Limitations

1. CosyVoice requires manual repo clone and setup
2. FunASR expects WAV but frontend sends WebM (works via ffmpeg conversion)
3. No audio format validation on STT endpoint
4. Duplicate `/api/speech/status` calls from both hooks on mount
