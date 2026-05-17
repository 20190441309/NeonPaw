<div align="center">

```text
╭────────────────────────────────────────────────────────────╮
│  NEON PAW // TERMINAL PET OS                       ONLINE  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│              /\_/\                                         │
│             ( o.o )        signal locked                   │
│             /  ^  \        user nearby                     │
│                                                            │
│        ADK-READY AI TERMINAL PET                           │
│        voice in / pet brain / ASCII out / voice back        │
│                                                            │
╰────────────────────────────────────────────────────────────╯
```

**一只住在终端屏幕里的 AI 电子宠物。**

黑底青光、语音对话、ASCII 宠物舱、结构化 Agent 大脑，还有一点点赛博小脾气。

</div>

---

## 它是什么？

NEON PAW 不是一个把聊天框换成猫耳朵的普通助手。

它更像一个迷你数字伙伴：蜷在复古终端里，等你点亮屏幕；你说话，它会听；它思考，它会切换表情；它回复你时，会用 TTS 把文字念出来。与此同时，它有自己的能量、心情、亲密度、饥饿值和稳定性。

简单说：

```text
你对屏幕说一句话
  ↓
NEON PAW 竖起耳朵
  ↓
Root Brain 生成结构化 JSON
  ↓
状态机更新宠物状态
  ↓
ASCII 宠物舱切到对应动画
  ↓
它用软软的电子声音回你一句
```

它会醒、会困、会开心、会安慰你，也会在信号不稳时露出一点 glitch 味。

---

## 一分钟小剧场

```text
USER > NEON PAW，醒醒。

PET  > 检测到你的声音信号……我醒啦。
       action: wake
       emotion: happy
       mood +5 / affinity +3 / energy -2

USER > 今天有点累。

PET  > 收到低电量人类信号。先慢慢呼吸一下，我陪你待机一会儿。
       action: comfort
       emotion: comforting
```

前端负责表演，后端负责决策。Agent 不直接生成 UI，不写 CSS，不乱改动画，只输出约定好的动作、情绪和状态变化。

---

## 已经会做什么

| 模块 | 状态 | 说明 |
|---|---:|---|
| 终端主界面 | done | 黑底青绿色、扫描线、glow、复古设备感 |
| ASCII 宠物场景 | done | 多套完整场景帧，不只是三行猫猫头像 |
| 点击说话 | done | 浏览器 Web Speech API 识别语音 |
| 唤醒词模式 | done | 可选开启，支持 "Hey NEON PAW" / "NEON PAW，醒醒" |
| 免提会话 | done | 唤醒后可持续听下一句，不必每轮点按钮 |
| STT 纠错 | done | 低置信度语音会先弹确认栏 |
| 语音信号可视化 | done | 终端风格信号面板，录音时显示波形 |
| 语音语言切换 | done | 支持中文、英文、自动检测 |
| 单 Agent 大脑 | done | Root Brain 统一生成结构化响应 |
| 宠物状态机 | done | energy / mood / affinity / hunger / stability |
| 情绪与动作 | done | happy、curious、comforting、glitch 等状态切换 |
| TTS 回复 | done | 浏览器 SpeechSynthesis 播放回复 |
| 后端 STT | done | FunASR paraformer-zh，支持 GPU 加速 |
| 后端 TTS | done | CosyVoice-300M，支持 GPU 加速 |
| 健康检查 | done | `/api/health` 返回 LLM 配置、服务状态 |
| Agent Trace | done | 开发者面板展示决策摘要 |
| 本地记忆 | done | localStorage 记住偏好、名字、长期信息 |
| Mock / Fallback | done | 没有可用模型时也能跑 Demo |

---

## 宠物仪表盘

```text
MODE
  booting -> sleeping -> awake -> listening -> thinking -> speaking -> awake
                                             \-> error

EMOTION
  neutral | happy | sad | sleepy | curious | comforting | glitch

STATS
  energy     [████████░░] 80
  mood       [███████░░░] 70
  affinity   [██░░░░░░░░] 20
  hunger     [███░░░░░░░] 30
  stability  [█████████░] 95
```

和它多聊几句，亲密度会上升；你情绪低落时，它会优先进入安慰模式；如果长期没人理它，它会回到低功耗睡眠。

---

## 技术栈

```text
Frontend                         Backend
────────                         ───────
Next.js 16                       FastAPI
React 19                         Pydantic
TypeScript                       Root Brain agent layer
Tailwind CSS 4                   LLM provider config
Web Speech API                   JSON response contract
SpeechSynthesis API              FunASR (STT) + CosyVoice (TTS)
localStorage memory              Fallback / mock mode
                                 pytest coverage
```

当前是单 Agent MVP，但目录和响应合约都给后续 Google ADK / 多 Agent 拆分留了接口。

---

## 快速启动

### 1. 启动后端

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

`.env` 里可以配置模型服务：

```env
LLM_PROVIDER=deepseek
LLM_API_KEY=your_api_key_here
LLM_MODEL=deepseek-chat
LLM_BASE_URL=https://api.deepseek.com
```

没有 API Key 时，项目仍会走 fallback / mock 体验，适合先看界面和交互闭环。

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，点亮屏幕，点击麦克风，开始和 NEON PAW 对话。

---

## 项目结构

```text
NeonPaw/
├── frontend/
│   └── src/
│       ├── app/                      # Next.js app router
│       ├── components/
│       │   ├── TerminalShell.tsx      # 终端外壳
│       │   ├── ASCIIPet.tsx          # ASCII 场景渲染
│       │   ├── VoiceButton.tsx       # 麦克风按钮
│       │   ├── ChatTranscript.tsx    # 对话记录
│       │   ├── PetStatusPanel.tsx    # 宠物状态面板
│       │   ├── AgentTracePanel.tsx   # Agent 决策日志
│       │   ├── MemoryPanel.tsx       # 本地记忆
│       │   ├── WakeModeToggle.tsx    # 唤醒词模式
│       │   ├── SpeechConfirmBar.tsx  # 语音确认栏
│       │   ├── SpeechSignalPanel.tsx # 语音信号面板
│       │   ├── StatusHint.tsx        # 状态/连接提示
│       │   └── LanguageSelector.tsx  # 语音语言切换
│       ├── hooks/
│       │   ├── useSpeechRecognition.ts
│       │   ├── useSpeechSynthesis.ts
│       │   ├── usePetState.ts
│       │   ├── useWakeWord.ts
│       │   ├── useMemory.ts
│       │   ├── useHealthCheck.ts
│       │   └── useSpeechLanguage.ts
│       └── lib/
│           ├── api.ts
│           ├── types.ts
│           ├── petFrames.ts
│           ├── speechUtils.ts
│           ├── speechLanguages.ts
│           ├── speechRecognitionTypes.ts
│           ├── stopPhrases.ts
│           └── wakePhrases.ts
│
└── backend/
    ├── app/
    │   ├── main.py
    │   ├── schemas.py
    │   ├── config.py
    │   ├── routers/
    │   │   ├── chat.py
    │   │   ├── health.py
    │   │   └── speech.py
    │   ├── agents/
    │   │   ├── root_brain.py
    │   │   ├── intent.py
    │   │   ├── emotion.py
    │   │   ├── persona.py
    │   │   ├── action.py
    │   │   ├── state_delta.py
    │   │   └── memory_decision.py
    │   └── services/
    │       ├── pet_brain.py
    │       ├── prompts.py
    │       ├── stt_service.py
    │       └── tts_service.py
    └── tests/
```

---

## API 端点

### POST `/api/chat`

核心对话接口，接收用户文本和宠物状态，返回结构化 JSON。

```json
{
  "reply": "信号接入成功，NEON PAW 已上线。",
  "emotion": "happy",
  "action": "wake",
  "voice_style": "soft_robotic",
  "state_delta": {
    "energy": -2,
    "mood": 5,
    "affinity": 3,
    "hunger": 1,
    "stability": 0
  },
  "memory": {
    "should_save": false,
    "content": ""
  },
  "trace": [
    {
      "module": "root_agent",
      "message": "Greeting detected. Wake action selected."
    }
  ]
}
```

### GET `/api/health`

返回后端运行状态，包括 LLM 配置、语音服务可用性、内存后端状态。

### GET `/api/speech/status`

返回 STT/TTS 服务可用性和引擎信息。

### POST `/api/speech/stt`

上传 WAV 音频，返回 FunASR 转写结果。

### POST `/api/speech/tts`

传入文本，返回 CosyVoice 合成的 WAV 音频流。

---

## 设计原则

1. 先把语音对话闭环做顺，再逐步扩展复杂 Agent 编排。
2. 宠物状态由代码状态机维护，LLM 只给建议，不直接接管生命体征。
3. ASCII 帧由前端静态维护，避免模型临场画图导致风格漂移。
4. 所有 Agent 输出必须是合法 JSON，前端不解析散文。
5. Demo 要快、稳、有记忆点。架构可以成长，但体验先亮起来。

---

## Speech Services Setup

MVP 默认使用浏览器原生 Web Speech API 进行语音识别和合成。后端已集成 FunASR (STT) 和 CosyVoice (TTS)，可通过环境变量启用。

### FunASR (STT)

```bash
pip install funasr
```

Models auto-download on first use. Default model is `paraformer-zh` with VAD (`fsmn-vad`) and punctuation (`ct-punc`).

### CosyVoice (TTS)

```bash
git clone https://github.com/FunAudioLLM/CosyVoice.git
cd CosyVoice
pip install -r requirements.txt
```

### GPU Support

Both services use GPU by default. Set `STT_DEVICE=cpu` and `TTS_DEVICE=cpu` for CPU-only mode.

### Config

Set in `.env` (copy from `.env.example`):

- `STT_ENABLED=true` - Enable backend STT
- `TTS_ENABLED=true` - Enable backend TTS
- `SPEECH_FALLBACK_TO_BROWSER=true` - Use browser API if backend unavailable

详细的部署说明参考 [STT/TTS Deployment Guide](docs/deployment-stt-tts.md)。

---

## 接下来想给它加什么

详细优先级已经整理到 [Development Roadmap](docs/roadmap.md)。

P0 地基收尾已完成：lint、Next.js 构建警告、语音类型、文档一致性。<br>
P1 语音体验已增强：唤醒词模糊匹配、语音置信度可视化、语音语言切换。<br>
P2 后端能力已就绪：FunASR STT、CosyVoice TTS、健康检查接口。<br>
下一步：LLM Provider 适配层、服务端记忆、Google ADK 多 Agent、MCP 工具调用、PWA、Electron 桌面宠物版。

---

## License

MIT

---

```text
╭────────────────────────────────────────────────────────────╮
│  NEON PAW                                                  │
│  tiny companion, terminal soul, currently accepting input.  │
╰────────────────────────────────────────────────────────────╯
```
