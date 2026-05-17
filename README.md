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
| 记忆系统 | done | 服务端 SQLite + 本地 localStorage 双模式，分类/置顶/导入导出 |
| LLM Provider | done | 多模型适配层（DeepSeek / Gemini / Kimi / GLM / Qwen / OpenAI） |
| 设置面板 | done | 右侧抽屉面板：LLM 配置、语音、记忆、后端状态、开发者选项 |
| PWA 支持 | done | 可安装、离线回退、Service Worker 缓存、移动端适配 |
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
Tailwind CSS 4                   LLM provider config (6 providers)
Web Speech API                   JSON response contract
SpeechSynthesis API              FunASR (STT) + CosyVoice (TTS)
Service Worker (PWA)             Memory service (SQLite)
localStorage memory              Fallback / mock mode
                                 pytest coverage (122 tests)
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
```

支持的 provider：`deepseek`、`gemini`、`kimi`、`glm`、`qwen`、`openai`。模型名和 base_url 会根据 provider 自动填充。

没有 API Key 时，项目仍会走 fallback / mock 体验，适合先看界面和交互闭环。

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，点亮屏幕，点击麦克风，开始和 NEON PAW 对话。

---

## PWA 手机安装指南

NEON PAW 支持 PWA（Progressive Web App），可以像原生 App 一样安装到手机桌面，全屏运行，离线也能看到宠物。

### 前置条件

1. 后端服务需要运行（提供 API）或者前端能独立运行（mock 模式）
2. 手机和电脑在**同一局域网**（或使用 ngrok / cloudflared 暴露服务）

### 方式一：同一局域网（推荐开发调试）

```bash
# 后端
cd backend && python -m uvicorn app.main:app --reload --port 8000 --host 0.0.0.0

# 前端
cd frontend && npm run dev -- -H 0.0.0.0
```

手机浏览器打开 `http://<你电脑的局域网IP>:3000`。

### 方式二：使用 ngrok 暴露服务

```bash
# 先启动后端和前端
ngrok http 8000    # 暴露后端
ngrok http 3000    # 暴露前端
```

把 ngrok 给的 HTTPS 地址填入前端的 `NEXT_PUBLIC_API_URL` 环境变量。

### 方式三：生产部署

```bash
cd frontend
npm run build
npm run start
```

配合 nginx / Caddy 反代，确保 HTTPS（PWA 必须 HTTPS 或 localhost）。

### 手机安装步骤

#### iPhone (Safari)

1. 用 Safari 打开 NEON PAW 页面
2. 点击底部 **分享按钮**（方框+向上箭头）
3. 滚动找到 **"添加到主屏幕"**
4. 点击 **"添加"**
5. 桌面上会出现 NEON PAW 图标，打开即全屏运行

#### Android (Chrome)

1. 用 Chrome 打开 NEON PAW 页面
2. 点击右上角 **三个点菜单**
3. 选择 **"添加到主屏幕"** 或 **"安装应用"**
4. 确认 **"安装"**
5. 桌面上会出现 NEON PAW 图标，打开即全屏运行

或者，当页面检测到可安装时，底部会弹出 **终端风格的安装横幅**：

```text
┌─────────────────────────────────────────┐
│ 📦 INSTALL NEON PAW  │  [INSTALL] [X]  │
└─────────────────────────────────────────┘
```

点击 INSTALL 即可一键安装。

#### 离线使用

安装后，NEON PAW 支持离线访问。断网后打开 App 会显示离线回退页面：

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

恢复网络后自动刷新。

---

## 项目结构

```text
NeonPaw/
├── frontend/
│   ├── public/
│   │   ├── sw.js                   # Service Worker (PWA 缓存策略)
│   │   ├── offline.html            # 离线回退页面
│   │   ├── icon-192.png            # PWA 图标
│   │   └── icon-512.png            # PWA 图标
│   └── src/
│       ├── app/
│       │   ├── layout.tsx          # 根布局 + viewport 配置
│       │   ├── page.tsx            # 主页面
│       │   ├── manifest.ts         # PWA Web App Manifest
│       │   └── globals.css         # 全局样式 + 移动端适配
│       ├── components/
│       │   ├── TerminalShell.tsx    # 终端外壳
│       │   ├── ASCIIPet.tsx        # ASCII 场景渲染
│       │   ├── VoiceButton.tsx     # 麦克风按钮
│       │   ├── ChatTranscript.tsx  # 对话记录
│       │   ├── PetStatusPanel.tsx  # 宠物状态面板
│       │   ├── AgentTracePanel.tsx # Agent 决策日志
│       │   ├── MemoryPanel.tsx     # 记忆面板（分类/编辑/导入导出）
│       │   ├── SettingsPanel.tsx   # 设置抽屉面板
│       │   ├── SettingsButton.tsx  # 设置入口按钮
│       │   ├── InstallBanner.tsx   # PWA 安装横幅
│       │   ├── WakeModeToggle.tsx  # 唤醒词模式
│       │   ├── SpeechConfirmBar.tsx# 语音确认栏
│       │   ├── SpeechSignalPanel.tsx # 语音信号面板
│       │   ├── StatusHint.tsx      # 状态/连接提示
│       │   └── LanguageSelector.tsx# 语音语言切换
│       ├── hooks/
│       │   ├── useSpeechRecognition.ts
│       │   ├── useSpeechSynthesis.ts
│       │   ├── usePetState.ts
│       │   ├── useWakeWord.ts
│       │   ├── useMemory.ts        # 记忆管理（服务端+本地双模式）
│       │   ├── useSettings.ts      # 设置管理
│       │   ├── useInstallPrompt.ts # PWA 安装检测
│       │   ├── useHealthCheck.ts
│       │   └── useSpeechLanguage.ts
│       └── lib/
│           ├── api.ts              # API 层（chat/health/memory/speech）
│           ├── types.ts            # TypeScript 类型定义
│           ├── settings.ts         # 设置持久化 helpers
│           ├── petFrames.ts        # ASCII 场景帧
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
    │   │   ├── memory.py           # 记忆 CRUD + 导入导出
    │   │   └── speech.py
    │   ├── agents/
    │   │   ├── root_brain.py       # CoT 主控 Agent + fallback
    │   │   ├── intent.py           # 意图识别
    │   │   ├── emotion.py          # 情绪映射
    │   │   ├── persona.py          # 回复生成（丰富模板）
    │   │   ├── action.py           # 动作选择
    │   │   ├── state_delta.py      # 状态变化计算
    │   │   └── memory_decision.py  # 记忆写入决策
    │   └── services/
    │       ├── pet_brain.py
    │       ├── prompts.py
    │       ├── stt_service.py      # FunASR STT
    │       ├── tts_service.py      # CosyVoice TTS
    │       ├── llm_provider.py     # 多 provider 适配层
    │       └── memory_service.py   # SQLite 记忆服务
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
    "energy": -2, "mood": 5, "affinity": 3, "hunger": 1, "stability": 0
  },
  "memory": { "should_save": false, "content": "" },
  "trace": [{ "module": "root_agent", "message": "Greeting detected." }]
}
```

### GET `/api/health`

返回后端运行状态，包括 LLM 配置、语音服务可用性、记忆后端状态。

### GET/POST/PUT/DELETE `/api/memory`

服务端记忆 CRUD 接口。支持分类（name / preference / goal / habit / project / custom）、置顶、导入导出。

### GET `/api/speech/status`

返回 STT/TTS 服务可用性和引擎信息。

### POST `/api/speech/stt`

上传 WAV 音频，返回 FunASR 转写结果。

### POST `/api/speech/tts`

传入文本，返回 CosyVoice 合成的 WAV 音频流。

---

## 设置面板

点击右上角齿轮按钮打开设置面板，可以配置：

- **LLM 配置**：切换 Provider（DeepSeek / Gemini / Kimi / GLM / Qwen / OpenAI）、填写 API Key、覆盖模型名
- **语音**：切换语音语言（中文 / 英文 / 自动）、开关唤醒词模式
- **记忆**：查看存储位置、导入导出记忆数据
- **后端状态**：实时显示 LLM、语音、记忆后端连接状态
- **开发者**：Agent Trace 模式切换（简单 / 开发者）

所有设置自动保存到 localStorage。

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

已完成：
- P0 地基收尾：lint、构建、类型、文档
- P1 语音体验：唤醒词、置信度可视化、语言切换
- P2 后端能力：FunASR STT、CosyVoice TTS、健康检查
- P3 记忆系统：服务端 SQLite、分类、置顶、导入导出
- P4 语音增强：后端 STT/TTS、语音服务集成
- P5 设置面板：LLM 配置、语音、记忆、开发者选项
- P5 PWA 支持：安装提示、离线回退、移动端适配

下一步：
- 任务型陪伴模式（学习陪伴、日程提醒、资料助手）
- Google ADK 多 Agent 编排
- MCP 工具调用
- Electron 桌面宠物版

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
