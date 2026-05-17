import os
from dotenv import load_dotenv

load_dotenv()

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "deepseek")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "deepseek-chat")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.deepseek.com")
LLM_TIMEOUT = int(os.getenv("LLM_TIMEOUT", "30"))

# Speech Services
STT_ENABLED = os.getenv("STT_ENABLED", "true").lower() == "true"
STT_MODEL = os.getenv("STT_MODEL", "paraformer-zh")
STT_VAD_MODEL = os.getenv("STT_VAD_MODEL", "fsmn-vad")
STT_PUNC_MODEL = os.getenv("STT_PUNC_MODEL", "ct-punc")
STT_DEVICE = os.getenv("STT_DEVICE", "cuda")

TTS_ENABLED = os.getenv("TTS_ENABLED", "true").lower() == "true"
TTS_MODEL = os.getenv("TTS_MODEL", "CosyVoice-300M")
TTS_DEFAULT_VOICE = os.getenv("TTS_DEFAULT_VOICE", "default")
TTS_DEVICE = os.getenv("TTS_DEVICE", "cuda")

SPEECH_FALLBACK_TO_BROWSER = os.getenv("SPEECH_FALLBACK_TO_BROWSER", "true").lower() == "true"

# TTS WAV output parameters
TTS_SAMPLE_RATE = int(os.getenv("TTS_SAMPLE_RATE", "22050"))
TTS_CHANNELS = int(os.getenv("TTS_CHANNELS", "1"))
TTS_SAMPLE_WIDTH = int(os.getenv("TTS_SAMPLE_WIDTH", "2"))

# Upload limits
SPEECH_MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
