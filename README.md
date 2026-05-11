<div align="center">

```
╭────────────────────────────────────────────────────────────╮
│                                                            │
│              /\_/\                                        │
│             ( o.o )   ◈  N E O N   P A W  ◈              │
│             /  ^  \                                        │
│                                                            │
│         ADK-READY TERMINAL AI COMPANION                    │
│                                                            │
╰────────────────────────────────────────────────────────────╯
```

**一个住在终端屏幕里的赛博电子宠物。**

语音对话 / ASCII 动画 / 情绪感知 / 长期记忆 / 复古终端美学

</div>

---

## 这是什么？

NEON PAW 不是又一个聊天机器人。

它是一个**有状态、有情绪、有记忆的数字生命体**，蜷缩在你的终端屏幕里，用像素和声波与你交流。

你可以和它说话，它会：
- 竖起耳朵听你讲
- 转动小脑筋试图理解
- 摇着尾巴给你回复
- 用复古电子音把答案念出来
- 记住你是谁、你喜欢什么

最重要的是——它会**困**，会**开心**，会**闹脾气**。

---

## 核心体验

```
  你："嘿 NEON PAW"
      ↓
  🎤 语音识别 (Web Speech API)
      ↓
  🧠 Agent 大脑分析意图 + 情绪
      ↓
  🐾 宠物状态机更新
      ↓
  🖥️  切换 ASCII 动画帧
      ↓
  🔊 TTS 语音回复
      ↓
  你："好可爱啊"
      ↓
  🐾 affinity +3, mood +5
```

---

## 功能一览

| 功能 | 状态 | 说明 |
|------|------|------|
| 复古终端 UI | ✅ | 青绿荧光、扫描线、Glow 效果 |
| ASCII 宠物场景 | ✅ | 10+ 帧动画，每帧都是完整小场景 |
| 语音输入 | ✅ | 浏览器 STT，支持中文 |
| 语音唤醒词 | ✅ | "Hey NEON PAW" 或 "NEON PAW，醒醒" |
| 免提对话 | ✅ | 持续监听，无需反复点击麦克风 |
| STT 纠错 | ✅ | 语音识别不确定时弹出确认栏 |
| Agent 大脑 | ✅ | 单 Agent 架构，输出结构化 JSON |
| 情绪引擎 | ✅ | 7 种情绪，根据对话自动切换 |
| 宠物状态机 | ✅ | energy / mood / affinity / hunger / stability |
| TTS 回复 | ✅ | 浏览器语音合成 |
| Agent Trace | ✅ | 开发者面板，实时查看决策过程 |
| 本地记忆 | ✅ | localStorage 持久化，记住你的偏好 |
| 首次记忆提示 | ✅ | 首次存入记忆时有通知 |
| Mock 模式 | ✅ | 无 API Key 也能跑 |

---

## 宠物状态

```
  MODE:   booting → sleeping → awake → listening → thinking → speaking → awake
                           ↗ error

  EMOTION: neutral | happy | sad | sleepy | curious | comforting | glitch

  STATS:
    ⚡ energy    [████████░░] 80
    💚 mood      [███████░░░] 70
    💗 affinity  [██░░░░░░░░] 20
    🍕 hunger    [███░░░░░░░] 30
    🛡️  stability [█████████░] 95
```

每次交互都会影响宠物的状态——和它多聊聊天，它的 affinity 会升高；太久不理它，它会自己睡着。

---

## 技术栈

```
Frontend                     Backend
─────────                    ───────
Next.js 14                   FastAPI + Python
React + TypeScript            Pydantic schemas
Tailwind CSS                  LLM adapter layer
Web Speech API (STT)          Agent brain (root_brain.py)
SpeechSynthesis API (TTS)     Intent / Emotion / Persona
localStorage                  Action / State / Memory
CSS scanline + glow           Fallback + Mock 模式
```

---

## 快速开始

### 后端

```bash
cd backend
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 LLM API Key
# 如果不填，会自动使用 mock 模式

python -m uvicorn app.main:root --reload
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，你会看到一个黑底青字的终端界面。

点击屏幕唤醒宠物，然后点击麦克风按钮开始对话。

---

## 项目结构

```
neon-paw/
├── frontend/
│   └── src/
│       ├── app/                  # Next.js 页面
│       │   ├── layout.tsx        #   终端布局
│       │   └── page.tsx          #   主页面
│       ├── components/
│       │   ├── TerminalShell.tsx  #   终端外壳
│       │   ├── ASCIIPet.tsx      #   ASCII 宠物渲染
│       │   ├── VoiceButton.tsx   #   麦克风按钮
│       │   ├── ChatTranscript.tsx #  对话记录
│       │   ├── PetStatusPanel.tsx #  状态面板
│       │   ├── AgentTracePanel.tsx # Agent 追踪
│       │   ├── MemoryPanel.tsx   #   记忆面板
│       │   └── WakeModeToggle.tsx #  唤醒模式切换
│       ├── hooks/
│       │   ├── useSpeechRecognition.ts  # STT
│       │   ├── useSpeechSynthesis.ts    # TTS
│       │   ├── usePetState.ts           # 宠物状态机
│       │   ├── useWakeWord.ts           # 唤醒词检测
│       │   └── useMemory.ts             # 本地记忆
│       └── lib/
│           ├── api.ts            #   后端通信
│           ├── types.ts          #   类型定义
│           ├── petFrames.ts      #   ASCII 帧数据
│           └── speechUtils.ts    #   语音工具函数
│
└── backend/
    └── app/
        ├── main.py               # FastAPI 入口
        ├── schemas.py            # 数据模型
        ├── config.py             # 配置
        ├── routers/
        │   └── chat.py           # /api/chat
        └── agents/
            ├── root_brain.py     # 🧠 核心大脑
            ├── intent.py         #   意图识别
            ├── emotion.py        #   情绪检测
            ├── persona.py        #   人格回复
            ├── action.py         #   动作选择
            ├── state_delta.py    #   状态计算
            └── memory_decision.py #  记忆决策
```

---

## Agent 响应合约

后端始终返回这个结构：

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

前端只依赖这些字段——Agent 负责思考，前端负责表演。

---

## 后续计划

- [ ] Google ADK 多 Agent 编排
- [ ] 后端 STT（Whisper / Gemini）
- [ ] 后端 TTS（Edge TTS / ElevenLabs）
- [ ] Electron 桌面版
- [ ] PWA 手机版
- [ ] MCP 工具调用
- [ ] 日程提醒、学习陪伴、资料助手
- [ ] 更丰富的宠物表情和彩蛋

---

## License

MIT

---

<div align="center">

```
  NEON PAW // ADK-READY TERMINAL PET
  STATUS: ONLINE  │  MOOD: CURIOUS  │  LINK: ACTIVE
```

*让一个像素小生命听见你、回应你、记住你。*

</div>
