<div align="center">

<a href="https://github.com/20190441309/NeonPaw">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:0a0a0a,50:00ffcc,100:00ffcc&height=220&section=header&text=NEON%20PAW&fontSize=80&fontColor=00ffcc&fontAlignY=35&desc=ADK-Ready%20AI%20Terminal%20Pet&descSize=18&descAlignY=55&animation=fadeIn" width="100%">
</a>

<br>

![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=22&duration=3000&pause=1000&color=00FFCC&center=true&vCenter=true&multiline=true&repeat=true&width=600&height=100&lines=Welcome+to+NEON+PAW;A+Cyber+Terminal+Pet+Living+Inside+Your+Screen;Voice+In.+Pet+Brain.+ASCII+Out.+Voice+Back.)

<br>

![License](https://img.shields.io/github/license/20190441309/NeonPaw?style=for-the-badge&color=00ffcc&labelColor=0a0a0a)
![Stars](https://img.shields.io/github/stars/20190441309/NeonPaw?style=for-the-badge&color=FFD700&labelColor=0a0a0a)
![Forks](https://img.shields.io/github/forks/20190441309/NeonPaw?style=for-the-badge&color=00ffcc&labelColor=0a0a0a)
![Issues](https://img.shields.io/github/issues/20190441309/NeonPaw?style=for-the-badge&color=FF6B6B&labelColor=0a0a0a)
![Last Commit](https://img.shields.io/github/last-commit/20190441309/NeonPaw?style=for-the-badge&color=00ffcc&labelColor=0a0a0a)

<br>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

</div>

---

## 🔮 What Is NEON PAW?

<div align="center">

> **不是把聊天框换成猫耳朵的普通助手。**
> 
> 它是蜷在复古终端里的迷你数字伙伴——竖起耳朵听你说话，切换表情回应你的情绪，用软软的电子声线回你一句。

</div>

```text
╭──────────────────────────────────────────────────────────────────────╮
│                                                                      │
│   👤  USER                                                            │
│    │                                                                  │
│    ▼                                                                  │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │  🎙️  Web Speech API (STT)                                   │    │
│   │     "NEON PAW，今天有点累。"                                  │    │
│   └─────────────────────┬───────────────────────────────────────┘    │
│                         ▼                                            │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │  🧠  Root Brain (CoT + Sub-Agent Validation)                │    │
│   │     intent → emotion → action → state_delta → memory        │    │
│   └─────────────────────┬───────────────────────────────────────┘    │
│                         ▼                                            │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │  🐾  Pet State Engine                                       │    │
│   │     energy / mood / affinity / hunger / stability            │    │
│   └─────────────────────┬───────────────────────────────────────┘    │
│                         ▼                                            │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │  🎭  ASCII Pet Scene Renderer                               │    │
│   │     sleeping → awake → listening → thinking → speaking       │    │
│   └─────────────────────┬───────────────────────────────────────┘    │
│                         ▼                                            │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │  🔊  TTS Voice Output                                       │    │
│   │     "收到低电量人类信号。我陪你待机一会儿。"                   │    │
│   └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
╰──────────────────────────────────────────────────────────────────────╯
```

---

## 🎬 Live Demo — 一分钟小剧场

<div align="center">

```text
┌──────────────────────────────────────────────────────────┐
│  USER > NEON PAW，醒醒。                                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  PET  > 检测到你的声音信号……我醒啦。                        │
│                                                          │
│         action  : wake      🐱                            │
│         emotion : happy     ✨                            │
│         mood    +5          ████████████░░░ +             │
│         affinity +3         ████░░░░░░░░░░ +              │
│         energy  -2          ████████████░░░ -             │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  USER > 今天有点累。                                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  PET  > 收到低电量人类信号。                                │
│         先慢慢呼吸一下，我陪你待机一会儿。                    │
│                                                          │
│         action  : comfort   🫂                            │
│         emotion : comforting 💜                           │
│         mood    +5                                     │
│         affinity +3                                     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

</div>

---

## ✨ Features

<div align="center">

<table>
<tr>
<td width="50%" valign="top">

### 🎙️ Voice Interaction
- Browser Web Speech API
- Backend FunASR (GPU)
- Wake word detection
- Continuous hands-free mode
- Confidence visualization
- Low-confidence confirm bar
- Multi-language (ZH/EN/Auto)

</td>
<td width="50%" valign="top">

### 🧠 Pet Brain
- Root Brain CoT orchestrator
- Intent → Emotion → Action pipeline
- Structured JSON response
- State delta engine
- Memory write decisions
- Glitch fallback on LLM failure

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🎭 Visual Feedback
- Full ASCII scene frames (not just cat head)
- Mode-based animations
- Emotion-driven expressions
- Terminal scanlines & glow
- Retro cyber aesthetic
- Device scene frame

</td>
<td width="50%" valign="top">

### 💾 Memory System
- Server-side SQLite storage
- LocalStorage fallback
- 6 categories (name/pref/goal/habit/project/custom)
- Pin important memories
- Export & Import JSON
- Category filtering

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🔧 Settings Panel
- LLM provider switching
- 6 providers (DeepSeek/Gemini/Kimi/GLM/Qwen/OpenAI)
- Voice language config
- Memory management
- Backend status monitor
- Developer trace mode

</td>
<td width="50%" valign="top">

### 📱 PWA Ready
- Install to home screen
- Offline fallback page
- Service Worker caching
- Mobile viewport optimization
- Touch highlight removal
- Safe area padding (notch)

</td>
</tr>
</table>

</div>

---

## 🛠️ Tech Stack

<div align="center">

### Frontend

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

<br>

### Backend

![FastAPI](https://img.shields.io/badge/FastAPI-0-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Pydantic](https://img.shields.io/badge/Pydantic-2-E92063?style=for-the-badge&logo=pydantic&logoColor=white)

<br>

### AI & Speech

![OpenAI](https://img.shields.io/badge/OpenAI-Compatible-412991?style=for-the-badge&logo=openai&logoColor=white)
![FunASR](https://img.shields.io/badge/FunASR-STT-FF6B35?style=for-the-badge&logoColor=white)
![CosyVoice](https://img.shields.io/badge/CosyVoice-TTS-FF6B35?style=for-the-badge&logoColor=white)

<br>

### Tools & Platform

![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-Passed-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)
![Pytest](https://img.shields.io/badge/Pytest-122_passed-0A9EDC?style=for-the-badge&logo=pytest&logoColor=white)

</div>

---

## 📊 Pet Dashboard

<div align="center">

```text
╭─────────────────────────────────────────────────────────────╮
│                    🐾  NEON PAW STATUS                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  MODE        EMOTION              STATE                     │
│  ─────       ───────              ─────                     │
│  [AWAKE]     [happy]                                     │
│                                                             │
│  energy     ████████░░  80   ▲ +2                        │
│  mood       ███████░░░  70   ▲ +5                        │
│  affinity   ██░░░░░░░░  20   ▲ +3                        │
│  hunger     ███░░░░░░░  30   ▼ +1                        │
│  stability  █████████░  95   ─ ──                         │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│  VOICE LINK: ● ACTIVE    STT: ● ONLINE    TTS: ● ONLINE  │
│  LLM: ● deepseek-chat    MEMORY: ● SERVER (SQLite)        │
│                                                             │
╰─────────────────────────────────────────────────────────────╯
```

</div>

---

## 🚀 Quick Start

### Prerequisites

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)
![Git](https://img.shields.io/badge/Git-2+-F05032?style=flat-square&logo=git&logoColor=white)

### 1️⃣ Clone & Backend

```bash
git clone https://github.com/20190441309/NeonPaw.git
cd NeonPaw/backend

pip install -r requirements.txt
cp .env.example .env        # Edit .env with your LLM provider

python -m uvicorn app.main:app --reload --port 8000
```

### 2️⃣ Frontend

```bash
cd ../frontend
npm install
npm run dev
```

### 3️⃣ Open

> 🌐 **http://localhost:3000**
> 
> Click the screen to wake up NEON PAW. Click the mic to talk.

<details>
<summary>🔧 .env Configuration</summary>

```env
# LLM Provider (deepseek / gemini / kimi / glm / qwen / openai)
LLM_PROVIDER=deepseek
LLM_API_KEY=your_api_key_here

# Speech Services (optional)
STT_ENABLED=true
TTS_ENABLED=true
STT_DEVICE=cuda
TTS_DEVICE=cuda
```

No API Key? No problem — NEON PAW runs in mock mode with pre-built responses.

</details>

---

## 📱 PWA — Install on Mobile

<div align="center">

> **把 NEON PAW 装到手机桌面，像原生 App 一样使用。**

</div>

### 🌐 Step 1: Expose Your Service

```bash
# Start with network access
cd backend  && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
cd frontend && npm run dev -- -H 0.0.0.0

# Or use ngrok for HTTPS
ngrok http 3000
```

### 📲 Step 2: Install on Phone

<table>
<tr>
<td width="50%" align="center">

**🍎 iPhone (Safari)**

1. Open in Safari
2. Tap **Share** button
3. Scroll → **Add to Home Screen**
4. Tap **Add**

</td>
<td width="50%" align="center">

**🤖 Android (Chrome)**

1. Open in Chrome
2. Tap **⋮ Menu**
3. Select **Install App**
4. Tap **Install**

</td>
</tr>
</table>

> Or tap the **📦 INSTALL NEON PAW** banner that appears at the bottom of the page.

### 📴 Step 3: Offline Mode

After installation, NEON PAW works offline:

```text
╭────────────────────────────────────────╮
│  NEON PAW // OFFLINE                   │
├────────────────────────────────────────┤
│     /\_/\                              │
│    ( -.- )    SIGNAL LOST              │
│     > ^ <                              │
│  Check your connection and try again.  │
╰────────────────────────────────────────╯
```

Auto-retries when connection is restored.

---

## 🏗️ Project Structure

<details>
<summary>📂 Click to expand full project tree</summary>

```text
NeonPaw/
├── frontend/
│   ├── public/
│   │   ├── sw.js                    # Service Worker
│   │   ├── offline.html             # Offline fallback
│   │   ├── icon-192.png             # PWA icon
│   │   └── icon-512.png             # PWA icon
│   └── src/
│       ├── app/
│       │   ├── layout.tsx           # Root layout + viewport
│       │   ├── page.tsx             # Main page
│       │   ├── manifest.ts          # PWA manifest
│       │   └── globals.css          # Styles + mobile polish
│       ├── components/
│       │   ├── TerminalShell.tsx     # Terminal frame
│       │   ├── ASCIIPet.tsx         # ASCII scene renderer
│       │   ├── VoiceButton.tsx      # Microphone button
│       │   ├── ChatTranscript.tsx   # Chat history
│       │   ├── PetStatusPanel.tsx   # Pet stats
│       │   ├── AgentTracePanel.tsx  # Agent decisions
│       │   ├── MemoryPanel.tsx      # Memory bank
│       │   ├── SettingsPanel.tsx    # Settings drawer
│       │   ├── InstallBanner.tsx    # PWA install prompt
│       │   └── ...                  # 10+ more components
│       ├── hooks/
│       │   ├── useSpeechRecognition.ts
│       │   ├── useSpeechSynthesis.ts
│       │   ├── usePetState.ts
│       │   ├── useMemory.ts
│       │   ├── useSettings.ts
│       │   ├── useInstallPrompt.ts
│       │   └── ...
│       └── lib/
│           ├── api.ts               # API layer
│           ├── types.ts             # TypeScript types
│           ├── settings.ts          # Settings persistence
│           ├── petFrames.ts         # ASCII frames
│           └── ...
│
└── backend/
    ├── app/
    │   ├── main.py                  # FastAPI app
    │   ├── schemas.py               # Pydantic models
    │   ├── config.py                # Environment config
    │   ├── routers/
    │   │   ├── chat.py              # POST /api/chat
    │   │   ├── health.py            # GET /api/health
    │   │   ├── memory.py            # CRUD /api/memory
    │   │   └── speech.py            # STT/TTS endpoints
    │   ├── agents/
    │   │   ├── root_brain.py        # CoT orchestrator
    │   │   ├── intent.py            # Intent detection
    │   │   ├── emotion.py           # Emotion mapping
    │   │   ├── persona.py           # Reply generation
    │   │   ├── action.py            # Action selection
    │   │   ├── state_delta.py       # State calculations
    │   │   └── memory_decision.py   # Memory decisions
    │   └── services/
    │       ├── llm_provider.py      # 6-provider adapter
    │       ├── memory_service.py    # SQLite memory
    │       ├── stt_service.py       # FunASR STT
    │       └── tts_service.py       # CosyVoice TTS
    └── tests/                       # 122 tests, 3 skipped
```

</details>

---

## 🔌 API Reference

<div align="center">

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | `POST` | Core chat — structured JSON response |
| `/api/health` | `GET` | Backend status & service health |
| `/api/memory` | `GET/POST` | List & create memories |
| `/api/memory/{id}` | `PUT/DELETE` | Update & delete memory |
| `/api/memory/export` | `GET` | Export all memories as JSON |
| `/api/memory/import` | `POST` | Import memories from JSON |
| `/api/speech/status` | `GET` | STT/TTS availability |
| `/api/speech/stt` | `POST` | Audio → Text (FunASR) |
| `/api/speech/tts` | `POST` | Text → Audio (CosyVoice) |

</div>

---

## 🧪 Testing

<div align="center">

![Backend Tests](https://img.shields.io/badge/Backend-122%20passed-00CC00?style=for-the-badge&labelColor=0a0a0a)
![Lint](https://img.shields.io/badge/Lint-0%20errors-00CC00?style=for-the-badge&labelColor=0a0a0a)
![Build](https://img.shields.io/badge/Build-Passing-00CC00?style=for-the-badge&labelColor=0a0a0a)

</div>

```bash
# Backend tests
cd backend && python -m pytest tests -v

# Frontend lint & build
cd frontend && npm run lint && npm run build
```

---

## 🗺️ Roadmap

<div align="center">

| Phase | Status | Feature |
|-------|--------|---------|
| P0 | ✅ | Terminal UI, ASCII pet, voice input, agent brain, TTS |
| P1 | ✅ | Wake word, confidence viz, language switching |
| P2 | ✅ | FunASR STT, CosyVoice TTS, health endpoint |
| P3 | ✅ | Memory export/import, category, pinned |
| P4 | ✅ | Backend STT/TTS, speech service integration |
| P5 | ✅ | Settings panel, PWA support, mobile polish |
| P6 | 🔜 | Task-oriented companion modes |
| P7 | 🔜 | Google ADK multi-agent orchestration |
| P8 | 🔜 | MCP tool calling |
| P9 | 🔜 | Electron desktop pet |

</div>

---

## 🤝 Contributing

Contributions welcome! Feel free to open issues and PRs.

```bash
git clone https://github.com/20190441309/NeonPaw.git
git checkout -b feature/amazing-feature
git commit -m "feat: add amazing feature"
git push origin feature/amazing-feature
```

---

## 📄 License

<div align="center">

![License: MIT](https://img.shields.io/badge/License-MIT-00ffcc?style=for-the-badge&labelColor=0a0a0a)

</div>

---

<div align="center">

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

**Made with 💜 and a lot of terminal glow**

<br>

![Visitor Count](https://komarev.com/ghpvc/?username=20190441309&repo=NeonPaw&style=for-the-badge&color=00ffcc&label=PROFILE+VIEWS&labelColor=0a0a0a)

<br>

```text
╭────────────────────────────────────────────────────────────╮
│                                                            │
│        /\_/\     NEON PAW                                  │
│       ( o.o )    tiny companion, terminal soul,            │
│       /  ^  \    currently accepting input.                │
│                                                            │
╰────────────────────────────────────────────────────────────╯
```

</div>
