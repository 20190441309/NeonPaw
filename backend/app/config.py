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

TTS_ENABLED = os.getenv("TTS_ENABLED", "true").lower() == "true"
TTS_MODEL = os.getenv("TTS_MODEL", "CosyVoice-300M")
TTS_DEFAULT_VOICE = os.getenv("TTS_DEFAULT_VOICE", "default")

SPEECH_FALLBACK_TO_BROWSER = os.getenv("SPEECH_FALLBACK_TO_BROWSER", "true").lower() == "true"
