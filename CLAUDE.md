# CLAUDE.md

## Project Overview

项目名称：**NEON PAW**

项目定位：一个复古终端风格的 AI 电子宠物 MVP。它通过语音输入与用户对话，具有基本宠物状态、ASCII/像素风动画反馈、TTS 语音回复和单 Agent 大脑。当前 MVP 阶段优先实现“语音对话体验闭环”，暂不强制实现真正的多 Agent 编排，但代码结构需要为后续 Google ADK 多 Agent 扩展预留空间。

项目英文描述：

> NEON PAW is an ADK-ready AI terminal pet. It combines voice interaction, a single-agent pet brain, a lightweight pet state engine, ASCII-style animation, and speech feedback to create a cyber digital companion.

---

## Core Goal

MVP 的核心目标不是先做复杂多 Agent，而是先完成一个稳定的交互闭环：

```text
用户语音输入
  ↓
浏览器 STT 语音识别
  ↓
前端发送文本到后端
  ↓
单一主控 Agent / LLM 生成结构化响应
  ↓
宠物状态机更新
  ↓
前端切换 ASCII 宠物动画
  ↓
浏览器 TTS 语音播放回复
```

MVP 必须做到：

1. 用户可以点击麦克风按钮说话；MVP 阶段暂不实现常驻语音唤醒，语音唤醒词功能作为 V2 扩展。
2. 系统能够把语音识别成文本；
3. 后端根据用户文本生成宠物回复；
4. 回复必须是结构化 JSON；
5. 前端根据 JSON 更新宠物表情、动作和状态；
6. 宠物可以用 TTS 把回复读出来；
7. 页面整体风格是黑色终端、青绿色扫描线、复古电子宠物。

---

## Development Principle

当前版本遵循以下开发原则：

1. **先做语音交互体验，不急着做真正多 Agent。**
2. **先用单 Agent Brain，但输出结构化 JSON。**
3. **前端负责动画和表现，Agent 只负责决策。**
4. **宠物状态由代码状态机维护，不完全交给 LLM。**
5. **所有模块都要为后续 ADK 多 Agent 拆分预留接口。**
6. **MVP 优先可运行、可展示、响应快，而不是架构过度复杂。**

---

## Recommended Tech Stack

### Frontend

使用：

```text
Next.js + React + TypeScript + Tailwind CSS
```

可选：

```text
Framer Motion
```

用于宠物动画、扫描线、状态切换动效。

### Backend

使用：

```text
FastAPI + Python
```

后端负责：

1. `/api/chat`：接收用户文本，调用 LLM / Agent Brain，返回结构化 JSON；
2. `/api/state`：读取和更新宠物状态；
3. 后续可扩展 `/api/stt` 和 `/api/tts`，但 MVP 第一版可以先用浏览器原生 STT/TTS。

### Speech Input

MVP 第一版优先使用浏览器原生：

```text
Web Speech API
```

原因：

1. 开发快；
2. 不需要上传音频；
3. 适合快速跑通 Demo；
4. 能优先验证产品体验。

后续再替换成：

```text
Whisper / Gemini STT / Google Speech-to-Text / FunASR
```

### Speech Output

MVP 第一版优先使用浏览器原生：

```text
SpeechSynthesis API
```

后续再替换成：

```text
Edge TTS / Google TTS / OpenAI TTS / ElevenLabs / Gemini TTS
```

### LLM

第一版可通过环境变量配置模型服务，不要把模型 API Key 写死在代码里。

建议 `.env`：

```env
LLM_PROVIDER=gemini
LLM_API_KEY=your_api_key_here
LLM_MODEL=gemini-2.0-flash
```

如果后续改成 DeepSeek、Kimi、GLM，只需要改 provider 适配层。

---

## MVP Feature Scope

### P0 Must Have

1. 复古终端风主界面；
2. ASCII / 像素风电子宠物；
3. 点击唤醒；
4. 麦克风语音输入；
5. 浏览器 STT；
6. 单 Agent 宠物大脑；
7. 宠物状态机；
8. TTS 语音回复；
9. 宠物动作切换；
10. 基础对话记录。

### P1 Should Have

1. Agent Trace 面板；
2. 简单长期记忆；
3. 本地持久化状态；
4. 电子音效；
5. 更丰富宠物表情；
6. 开发者模式。

### P2 Later

1. 真正 Google ADK 多 Agent；
2. 后端 STT；
3. 后端 TTS；
4. Electron 桌面版；
5. PWA 手机版；
6. MCP 工具调用；
7. 日程提醒、学习陪伴、资料助手等能力。
8. 语音唤醒词，例如 “Hey NEON PAW” / “NEON PAW，醒醒”。
---

## Project Structure

建议项目结构：

```text
neon-paw/
├── CLAUDE.md
├── README.md
├── .env.example
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/
│       │   ├── TerminalShell.tsx
│       │   ├── TerminalPet.tsx
│       │   ├── ASCIIPet.tsx
│       │   ├── VoiceButton.tsx
│       │   ├── ChatTranscript.tsx
│       │   ├── PetStatusPanel.tsx
│       │   └── AgentTracePanel.tsx
│       ├── hooks/
│       │   ├── useSpeechRecognition.ts
│       │   ├── useSpeechSynthesis.ts
│       │   └── usePetState.ts
│       ├── lib/
│       │   ├── api.ts
│       │   ├── petFrames.ts
│       │   └── types.ts
│       └── styles/
│           └── globals.css
│
└── backend/
    ├── requirements.txt
    ├── .env.example
    ├── app/
    │   ├── main.py
    │   ├── schemas.py
    │   ├── config.py
    │   ├── routers/
    │   │   ├── chat.py
    │   │   └── state.py
    │   ├── services/
    │   │   ├── llm_service.py
    │   │   ├── pet_brain.py
    │   │   ├── pet_state_service.py
    │   │   └── memory_service.py
    │   ├── agents/
    │   │   ├── root_agent.py
    │   │   └── prompts.py
    │   └── db/
    │       └── storage.py
    └── data/
        └── neon_paw.sqlite
```

---

## Frontend Design Requirements

整体视觉风格参考：

1. 黑色或深蓝黑背景；
2. 青绿色荧光文字；
3. 轻微扫描线；
4. 终端 UI；
5. 像素猫 / ASCII 宠物；
6. 状态标签：`BOOTING`、`SLEEPING`、`LISTENING`、`THINKING`、`SPEAKING`、`ONLINE`；
7. 底部显示提示语：`TAP SCREEN TO ACTIVATE MICROPHONE`；
8. 页面可显示宠物名：`NEON PAW`；
9. 可以有开发者日志面板，显示 Agent 的决策过程摘要。

主界面布局建议：

```text
┌────────────────────────────────────────────┐
│ BOOTING                         PET MODE   │
│                                            │
│              CLICK TO WAKE                 │
│                                            │
│                 /\_/\                      │
│                ( o.o )                     │
│                 > ^ <                      │
│                                            │
│       TAP SCREEN TO ACTIVATE MICROPHONE    │
│                                            │
│ NEON PAW · ADK-READY TERMINAL PET          │
└────────────────────────────────────────────┘
```

---

## Pet States

宠物状态字段建议：

```ts
export type PetMode =
  | "booting"
  | "sleeping"
  | "awake"
  | "listening"
  | "thinking"
  | "speaking"
  | "error";

export type PetEmotion =
  | "neutral"
  | "happy"
  | "sad"
  | "sleepy"
  | "curious"
  | "comforting"
  | "glitch";

export interface PetState {
  name: string;
  mode: PetMode;
  emotion: PetEmotion;
  energy: number;
  mood: number;
  affinity: number;
  hunger: number;
  stability: number;
  lastInteractionAt: string;
}
```

初始状态：

```json
{
  "name": "NEON PAW",
  "mode": "sleeping",
  "emotion": "sleepy",
  "energy": 80,
  "mood": 70,
  "affinity": 20,
  "hunger": 30,
  "stability": 95,
  "lastInteractionAt": ""
}
```

状态范围：

```text
energy: 0-100
mood: 0-100
affinity: 0-100
hunger: 0-100
stability: 0-100
```

---

## Pet State Update Rules

MVP 阶段使用简单状态机规则：

### User talks to pet

```text
energy -2
mood +2
affinity +2
hunger +1
```

### User wakes pet

```text
mode = awake
emotion = curious
energy -1
affinity +1
```

### Pet gives comforting reply

```text
mood +5
affinity +3
energy -2
```

### Pet is ignored for long time

```text
mode = sleeping
energy +5
mood -1
```

### State Safety

所有数值必须 clamp 到 0-100：

```text
value = max(0, min(100, value))
```

---

## Agent Brain Design

MVP 阶段使用单一主控 Agent：

```text
Root Agent / Pet Brain
```

它负责：

1. 理解用户输入；
2. 判断用户大致情绪；
3. 生成宠物回复；
4. 选择宠物动作；
5. 选择宠物情绪；
6. 给出状态变化建议；
7. 判断是否需要写入记忆。

后续再拆成：

```text
Root Agent
├── Emotion Agent
├── Persona Agent
├── State Agent
├── Action Agent
├── Memory Agent
└── Voice Agent
```

当前代码目录可以先保留 `agents/` 文件夹，但只实现 `root_agent.py`。

---

## Agent Response Contract

后端 `/api/chat` 必须返回如下结构：

```json
{
  "reply": "检测到你的声音信号……NEON PAW 已经醒啦。",
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
      "message": "Detected greeting intent and selected wake action."
    }
  ]
}
```

前端只依赖这些字段：

1. `reply`：显示文本和 TTS 播放；
2. `emotion`：切换宠物表情；
3. `action`：触发动画；
4. `state_delta`：更新状态条；
5. `trace`：显示开发者日志。

不要让 LLM 直接生成前端代码、CSS、动画代码或音频代码。

---

## Allowed Actions

Agent 只能输出以下动作之一：

```text
wake
sleep
listen
think
speak
happy
comfort
idle
glitch
error
```

动作含义：

| action | meaning |
|---|---|
| wake | 宠物被叫醒 |
| sleep | 宠物睡觉 |
| listen | 宠物正在听用户说话 |
| think | 宠物正在思考 |
| speak | 宠物正在说话 |
| happy | 开心反馈 |
| comfort | 安慰用户 |
| idle | 普通待机 |
| glitch | 故障风反馈 |
| error | 出错状态 |

---

## Allowed Emotions

Agent 只能输出以下情绪之一：

```text
neutral
happy
sad
sleepy
curious
comforting
glitch
```

---

## Root Agent Prompt

后端应使用类似如下系统提示词：

```text
你是 NEON PAW，一个住在终端屏幕里的 AI 电子宠物。
你的风格是：赛博、可爱、轻微电子感、陪伴感强，但不要过度油腻。
你不是普通 AI 助手，而是一个有状态、有情绪、有记忆倾向的数字宠物。

你需要根据用户输入和当前宠物状态，生成结构化 JSON。

你必须遵守：
1. 只能输出合法 JSON；
2. 不要输出 Markdown；
3. 不要解释你的推理过程；
4. reply 要自然、简短、有宠物感；
5. action 必须是允许动作之一；
6. emotion 必须是允许情绪之一；
7. state_delta 的每个值建议在 -10 到 +10 之间；
8. 如果用户情绪低落，优先 comfort；
9. 如果用户只是打招呼，优先 wake 或 happy；
10. 如果用户提出任务请求，可以简短回应并进入 think/speak；
11. 不要编造不存在的长期记忆；
12. memory.should_save 只有在用户提供稳定偏好、长期目标、名字、习惯时才为 true。

输出 JSON 格式：
{
  "reply": "...",
  "emotion": "happy",
  "action": "speak",
  "voice_style": "soft_robotic",
  "state_delta": {
    "energy": -2,
    "mood": 2,
    "affinity": 2,
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
      "message": "Short decision summary."
    }
  ]
}
```

---

## API Design

### POST `/api/chat`

Request:

```json
{
  "message": "你醒了吗？",
  "pet_state": {
    "name": "NEON PAW",
    "mode": "awake",
    "emotion": "neutral",
    "energy": 80,
    "mood": 70,
    "affinity": 20,
    "hunger": 30,
    "stability": 95,
    "lastInteractionAt": "2026-05-02T20:30:00"
  },
  "conversation_history": [
    {
      "role": "user",
      "content": "你好"
    },
    {
      "role": "assistant",
      "content": "信号接入成功，NEON PAW 已上线。"
    }
  ]
}
```

Response:

```json
{
  "reply": "我醒啦，正在接收你的声音信号。",
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

### GET `/api/state`

返回当前宠物状态。

### POST `/api/state`

更新当前宠物状态。

---

## Frontend Behavior

### Click to Wake

当用户点击屏幕或点击 `CLICK TO WAKE`：

1. 将 `mode` 改为 `awake`；
2. 将 `emotion` 改为 `curious`；
3. 播放启动音效；
4. 显示 `ONLINE`；
5. 可以调用 `/api/chat` 发送一条系统消息：`User clicked to wake the pet.`

### Voice Input

用户点击麦克风按钮后：

1. `mode = listening`；
2. 页面显示 `LISTENING...`；
3. 启动 Web Speech API；
4. 识别完成后显示用户文本；
5. `mode = thinking`；
6. 调用后端 `/api/chat`；
7. 收到回复后 `mode = speaking`；
8. 显示回复文本；
9. 播放 TTS；
10. TTS 结束后 `mode = awake` 或 `idle`。

### Error Handling

如果语音识别失败：

```text
mode = error
emotion = glitch
reply = "信号断裂……我刚刚没有听清。可以再说一次吗？"
```

如果后端请求失败：

```text
mode = error
emotion = glitch
reply = "核心引擎短暂离线……请稍后再试。"
```

---

## ASCII Pet Frames

前端应准备静态帧，不要让 LLM 生成 ASCII。MVP 第一版不要只使用简单三行猫图，而应使用更美观的“复杂 ASCII 场景帧”：电子宠物不是孤立头像，而是住在一个复古终端设备、宠物舱、通讯面板或小型操作台里。

设计目标：接近视频中的 `FULLSCREEN_ASCII` 质感，而不是普通命令行字符画。

核心原则：

1. ASCII 帧由前端静态维护，不由 LLM 动态生成；
2. Agent 只输出 `action` / `emotion`，前端根据状态切换对应帧；
3. 每个帧是一个完整小场景，而不是单独宠物头像；
4. 帧风格保持终端、赛博、青绿色荧光、扫描线；
5. 所有帧宽度尽量统一，避免切换时页面明显抖动；
6. 推荐使用 monospace 字体，并设置 `white-space: pre`；
7. 复杂帧可以分为 `simpleFrames` 和 `sceneFrames` 两套，MVP 默认使用 `sceneFrames`；
8. 尽量使用 box drawing 字符、键盘、屏幕、状态栏、波形、进度条等元素增强观感。

建议实现更精致的 ASCII 场景系统：

```ts
export type PetFrameKey =
  | "booting"
  | "sleeping"
  | "awake"
  | "listening"
  | "thinking"
  | "speaking"
  | "happy"
  | "comforting"
  | "glitch"
  | "error";

export const sceneFrames: Record<PetFrameKey, string> = {
  booting: String.raw`
╭────────────────────────────────────────────────────────────╮
│  NEON PAW // TERMINAL PET OS                       BOOTING │
├────────────────────────────────────────────────────────────┤
│                                                            │
│        ╭────────────────────────────────────────╮          │
│        │  initializing cyber companion core...  │          │
│        │                                        │          │
│        │  pet_core.sys        [████████░░░░]    │          │
│        │  voice_link.mod      [██████░░░░░░]    │          │
│        │  memory_seed.db      [█████░░░░░░░]    │          │
│        │  emotion_bus         [███░░░░░░░░░]    │          │
│        ╰────────────────────────────────────────╯          │
│                                                            │
│                  SYSTEM SIGNAL: ▂▃▅▆▇▆▅▃▂                 │
╰────────────────────────────────────────────────────────────╯
  `,

  sleeping: String.raw`
╭────────────────────────────────────────────────────────────╮
│  PET CAPSULE // SLEEP MODE                         IDLE   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│              z       z        z                            │
│        ╭────────────────────────────────────────╮          │
│        │                                        │          │
│        │              /\_/\\                    │          │
│        │             ( -.- )    low power       │          │
│        │             /  ^  \                    │          │
│        │          ─────────────                 │          │
│        │        capsule temperature: stable     │          │
│        ╰────────────────────────────────────────╯          │
│                                                            │
│        TAP SCREEN TO WAKE  │  DREAM CACHE: ACTIVE          │
╰────────────────────────────────────────────────────────────╯
  `,

  awake: String.raw`
╭────────────────────────────────────────────────────────────╮
│  NEON PAW // ONLINE                               AWAKE   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│        ╭────────────────────────────────────────╮          │
│        │              /\_/\\                    │          │
│        │             ( o.o )                    │          │
│        │             /  ^  \                    │          │
│        │                                        │          │
│        │      signal locked: user nearby        │          │
│        │      companion core: responsive        │          │
│        ╰────────────────────────────────────────╯          │
│                                                            │
│        STATUS: STABLE  │  MOOD: CALM  │  LINK: READY       │
╰────────────────────────────────────────────────────────────╯
  `,

  listening: String.raw`
╭────────────────────────────────────────────────────────────╮
│  VOICE LINK // ACTIVE                          LISTENING  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│        ╭────────────────────────────────────────╮          │
│        │              /\_/\\        )))         │          │
│        │             ( o.o )                    │          │
│        │             /  ^  \                    │          │
│        │                                        │          │
│        │      microphone stream detected        │          │
│        │      input wave: ▂▃▅▇▆▅▃▂▃▅▆▇▅        │          │
│        ╰────────────────────────────────────────╯          │
│                                                            │
│        SAY SOMETHING  │  STT BUFFER: RECORDING             │
╰────────────────────────────────────────────────────────────╯
  `,

  thinking: String.raw`
╭────────────────────────────────────────────────────────────╮
│  PET BRAIN // ROOT AGENT                         THINKING │
├────────────────────────────────────────────────────────────┤
│                                                            │
│        ╭────────────────────────────────────────╮          │
│        │              /\_/\\                    │          │
│        │             ( o_o )     ?              │          │
│        │             /  ^  \                    │          │
│        │                                        │          │
│        │   root_agent     → parsing intent      │          │
│        │   state_core     → mood delta          │          │
│        │   action_bus     → frame select        │          │
│        ╰────────────────────────────────────────╯          │
│                                                            │
│        INTERNAL TRACE:  [ intent ][ emotion ][ action ]    │
╰────────────────────────────────────────────────────────────╯
  `,

  speaking: String.raw`
╭────────────────────────────────────────────────────────────╮
│  SYNTH VOICE // OUTPUT                           SPEAKING │
├────────────────────────────────────────────────────────────┤
│                                                            │
│        ╭────────────────────────────────────────╮          │
│        │              /\_/\\                    │          │
│        │             ( o.o )  )))               │          │
│        │             /  ^  \                    │          │
│        │                                        │          │
│        │      audio out: ▂▂▃▅▇▅▃▂▂             │          │
│        │      tone profile: soft_robotic        │          │
│        ╰────────────────────────────────────────╯          │
│                                                            │
│        NEON PAW IS TALKING  │  TTS STREAM: ACTIVE          │
╰────────────────────────────────────────────────────────────╯
  `,

  happy: String.raw`
╭────────────────────────────────────────────────────────────╮
│  EMOTION CORE // POSITIVE                         HAPPY   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│        ╭────────────────────────────────────────╮          │
│        │              /\_/\\          ✦         │          │
│        │             ( ^.^ )     ✦              │          │
│        │             /  ^  \                    │          │
│        │                                        │          │
│        │      mood       + + +                  │          │
│        │      affinity   + +                    │          │
│        ╰────────────────────────────────────────╯          │
│                                                            │
│        SIGNAL GLOW: ACTIVE  │  COMPANION LINK: WARM        │
╰────────────────────────────────────────────────────────────╯
  `,

  comforting: String.raw`
╭────────────────────────────────────────────────────────────╮
│  COMPANION MODE // SOFT SIGNAL                   COMFORT  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│        ╭────────────────────────────────────────╮          │
│        │              /\_/\\                    │          │
│        │             ( ._. )       ♡            │          │
│        │             /  ^  \                    │          │
│        │                                        │          │
│        │      response mode: gentle             │          │
│        │      stay with user: true              │          │
│        ╰────────────────────────────────────────╯          │
│                                                            │
│        SOFT TONE ENABLED  │  PRESSURE LEVEL: REDUCING      │
╰────────────────────────────────────────────────────────────╯
  `,

  glitch: String.raw`
╭────────────────────────────────────────────────────────────╮
│  SIGNAL ERROR // GLITCH                         UNSTABLE  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│        ╭──────────────#─────────────────────────╮          │
│        │              /\_/\\                    │          │
│        │             ( x_x )       !!           │          │
│        │             /  #  \                    │          │
│        │                                        │          │
│        │      c0re_s1gnal: unstable             │          │
│        │      attempting self repair...         │          │
│        ╰────────────────────────#───────────────╯          │
│                                                            │
│        ERROR TRACE: 0xPAW-404  │  RECOVERY: RETRY          │
╰────────────────────────────────────────────────────────────╯
  `,

  error: String.raw`
╭────────────────────────────────────────────────────────────╮
│  NEON PAW // CORE ERROR                            ERROR   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│        ╭────────────────────────────────────────╮          │
│        │              /\_/\\                    │          │
│        │             ( x.x )                    │          │
│        │             /  !  \                    │          │
│        │                                        │          │
│        │      core engine offline               │          │
│        │      hint: retry voice input           │          │
│        ╰────────────────────────────────────────╯          │
│                                                            │
│        FALLBACK RESPONSE READY  │  SAFE MODE: ENABLED      │
╰────────────────────────────────────────────────────────────╯
  `
};
```

额外提供一个更接近视频截图风格的“电脑/写作终端场景”，可用于 `fullscreen_ascii`、`thinking` 或特殊彩蛋模式：

```ts
export const deviceSceneFrame = String.raw`
              ╭────────────────────────────────────────────╮
              │ [o_o]  NEON PAW IS WRITING...              │
              │                                            │
              │  Back in 2026, I booted a tiny soul        │
              │  inside a terminal screen.                 │
              ╰────────────────────────────────────────────╯
                    │                                │
        ╭───────────┴────────────────────────────────┴───────────╮
        │                                                         │
        │   [Q][W][E][R][T][Y][U][I][O][P]                       │
        │     [A][S][D][F][G][H][J][K][L]                        │
        │       [Z][X][C][V][B][N][M]                            │
        │                                                         │
        │   ─────────────────────────────────────────────────     │
        │                                                         │
        ╰─────────────────────────────────────────────────────────╯
`;
```

如果想进一步增强美观度，可以准备三套帧：

```ts
export const framePacks = {
  compact: simpleFrames,
  scene: sceneFrames,
  device: deviceFrames
};
```

实现要求：

1. `ASCIIPet.tsx` 根据 `petState.mode`、`petState.emotion` 和后端返回的 `action` 选择帧；
2. 帧选择优先级建议为：`action` > `emotion` > `mode`；
3. 复杂帧应放在 `frontend/src/lib/petFrames.ts`；
4. `ASCIIPet.tsx` 只负责渲染，不要把大段 ASCII 写在组件内部；
5. 为复杂帧容器添加横向滚动或自适应缩放，避免移动端溢出；
6. 可以给 ASCII 帧增加轻微 flicker / glow / scanline 效果；
7. 不要为了复杂 ASCII 帧牺牲交互速度，帧切换必须保持即时；
8. 复杂 ASCII 中可以包含英文短句，但不要放太长正文，避免小屏幕阅读困难。
```

---

## Styling Requirements

Tailwind 风格方向：

```text
background: near-black
primary text: cyan/green
border: neon green
font: monospace
effects: scanline, glow, flicker
```

需要实现：

1. 终端边框；
2. 扫描线 overlay；
3. 轻微文字 glow；
4. 宠物 ASCII 居中；
5. 移动端基本适配；
6. 麦克风按钮突出；
7. 状态条简洁。

不要做成普通聊天网页。

---

## Persistence

MVP 可以先用浏览器 localStorage 保存：

1. pet_state；
2. conversation_history；
3. 简单 memories。

后端 SQLite 可以作为 P1。

如果同时实现后端 SQLite，则表结构建议：

```sql
CREATE TABLE pet_state (
    id INTEGER PRIMARY KEY,
    name TEXT,
    mode TEXT,
    emotion TEXT,
    energy INTEGER,
    mood INTEGER,
    affinity INTEGER,
    hunger INTEGER,
    stability INTEGER,
    updated_at TEXT
);

CREATE TABLE conversation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT,
    content TEXT,
    created_at TEXT
);

CREATE TABLE memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    created_at TEXT
);

CREATE TABLE agent_traces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module TEXT,
    message TEXT,
    created_at TEXT
);
```

---

## Later ADK Migration Plan

当前 MVP 可以先不引入真正 ADK。但代码要按 ADK-ready 方式写：

1. `backend/app/agents/root_agent.py` 只暴露一个统一函数；
2. 函数输入为 `message + pet_state + history + memories`；
3. 函数输出为标准 Agent Response Contract；
4. 后续可以把内部实现替换成 Google ADK root agent；
5. 前端和 API 不需要改变。

后续多 Agent 设计：

```text
Root Agent
├── Intent Agent：识别用户意图
├── Emotion Agent：判断用户情绪
├── Persona Agent：控制宠物说话风格
├── State Agent：建议状态变化
├── Action Agent：选择动画和动作
├── Memory Agent：检索与写入长期记忆
└── Voice Agent：决定语音风格
```

多 Agent 版本的最终输出仍然必须符合 MVP 的 JSON contract。

---

## Development Tasks

请按以下顺序开发：

### Task 1: 初始化项目

1. 创建 `frontend/` Next.js 项目；
2. 创建 `backend/` FastAPI 项目；
3. 配置 CORS；
4. 创建 `.env.example`；
5. 创建基础 README。

### Task 2: 前端终端界面

实现：

1. `TerminalShell.tsx`；
2. `ASCIIPet.tsx`；
3. `PetStatusPanel.tsx`；
4. 扫描线效果；
5. booting/sleeping/awake 状态切换。

### Task 3: 语音输入

实现：

1. `useSpeechRecognition.ts`；
2. 麦克风按钮；
3. 识别中文；
4. 显示识别结果；
5. 处理识别失败。

### Task 4: 后端 chat API

实现：

1. `POST /api/chat`；
2. `schemas.py`；
3. `pet_brain.py`；
4. mock 模式：没有 API Key 时返回固定 JSON；
5. 有 API Key 时调用 LLM。

### Task 5: 前后端联调

流程：

1. 语音识别到文本；
2. 前端请求 `/api/chat`；
3. 后端返回 JSON；
4. 前端显示 reply；
5. 切换 emotion/action；
6. 更新 pet_state。

### Task 6: TTS 回复

实现：

1. `useSpeechSynthesis.ts`；
2. 播放 reply；
3. 播放时 mode=speaking；
4. 播放结束后 mode=awake。

### Task 7: Agent Trace

实现：

1. `AgentTracePanel.tsx`；
2. 显示 trace；
3. 可折叠；
4. 用于展示“未来多 Agent 大脑”的雏形。

### Task 8: localStorage 持久化

实现：

1. 保存 pet_state；
2. 保存最近 20 条 conversation_history；
3. 刷新页面后恢复。

---

## Coding Rules

1. 使用 TypeScript；
2. 组件保持小而清晰；
3. 所有 API 类型写在 `types.ts`；
4. 不要把 API Key 写死；
5. 前端不要直接调用大模型；
6. 后端必须校验 LLM 输出 JSON；
7. 如果 LLM 输出非法，使用 fallback response；
8. 宠物状态数值必须 clamp 0-100；
9. 不要让 LLM 生成任意动作名；
10. action 和 emotion 必须从白名单中选择。

---

## Fallback Response

如果 LLM 调用失败或 JSON 解析失败，后端返回：

```json
{
  "reply": "核心信号有点不稳定……但我还在这里。",
  "emotion": "glitch",
  "action": "glitch",
  "voice_style": "soft_robotic",
  "state_delta": {
    "energy": -1,
    "mood": -1,
    "affinity": 0,
    "hunger": 0,
    "stability": -3
  },
  "memory": {
    "should_save": false,
    "content": ""
  },
  "trace": [
    {
      "module": "fallback",
      "message": "LLM failed or returned invalid JSON."
    }
  ]
}
```

---

## Success Criteria

MVP 完成标准：

1. 打开网页能看到终端风电子宠物；
2. 点击可以唤醒宠物；
3. 点击麦克风可以说中文；
4. 页面能显示识别出的文本；
5. 后端能返回宠物回复；
6. 宠物能根据 action/emotion 改变 ASCII 表情；
7. 浏览器能读出宠物回复；
8. 状态条会发生变化；
9. 刷新页面后基本状态不丢；
10. 代码结构可以后续无痛升级为 ADK 多 Agent。

---

## Do Not Do in MVP

MVP 暂时不要做：

1. 复杂 3D 模型；
2. Live2D；
3. 真正多 Agent 链式调用；
4. 复杂数据库系统；
5. 用户登录；
6. 支付系统；
7. 社交系统；
8. 摄像头识别；
9. 自动控制电脑；
10. 大规模工具调用。

---

## Final Product Vision

NEON PAW 的最终形态是：

> 一个基于 ADK 的多 Agent AI 电子宠物。它具备语音交互、长期记忆、情绪理解、宠物状态系统、ASCII/像素视觉反馈、语音合成、工具调用和可解释 Agent Trace。用户不是在使用一个普通聊天机器人，而是在和一个住在终端屏幕里的数字生命体互动。

当前版本只需要先做好第一步：

> 让它能听见你、回应你、表现出情绪，并像一个真正的电子宠物一样活起来。
