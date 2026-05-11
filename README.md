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

它更像一个迷你数字伙伴：蜷在复古终端里，等你点亮屏幕；你说话，它会听；它思考，它会切换表情；它回复你时，会用浏览器 TTS 把文字念出来。与此同时，它有自己的能量、心情、亲密度、饥饿值和稳定性。

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
| 单 Agent 大脑 | done | Root Brain 统一生成结构化响应 |
| 宠物状态机 | done | energy / mood / affinity / hunger / stability |
| 情绪与动作 | done | happy、curious、comforting、glitch 等状态切换 |
| TTS 回复 | done | 使用浏览器 SpeechSynthesis 播放回复 |
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
SpeechSynthesis API              Fallback response
localStorage memory              pytest coverage
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
│       │   └── WakeModeToggle.tsx    # 唤醒词模式
│       ├── hooks/
│       │   ├── useSpeechRecognition.ts
│       │   ├── useSpeechSynthesis.ts
│       │   ├── usePetState.ts
│       │   ├── useWakeWord.ts
│       │   └── useMemory.ts
│       └── lib/
│           ├── api.ts
│           ├── types.ts
│           ├── petFrames.ts
│           └── speechUtils.ts
│
└── backend/
    ├── app/
    │   ├── main.py
    │   ├── schemas.py
    │   ├── config.py
    │   ├── routers/
    │   │   └── chat.py
    │   └── agents/
    │       ├── root_brain.py
    │       ├── intent.py
    │       ├── emotion.py
    │       ├── persona.py
    │       ├── action.py
    │       ├── state_delta.py
    │       └── memory_decision.py
    └── tests/
```

---

## Agent 响应合约

后端 `/api/chat` 始终返回结构化 JSON：

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

前端只关心这些字段：

```text
reply        -> 显示文本 + TTS 播放
emotion      -> 切换表情
action       -> 触发动画
state_delta  -> 更新状态条
memory       -> 决定是否写入长期记忆
trace        -> 展示开发者日志
```

---

## 设计原则

1. 先把语音对话闭环做顺，再逐步扩展复杂 Agent 编排。
2. 宠物状态由代码状态机维护，LLM 只给建议，不直接接管生命体征。
3. ASCII 帧由前端静态维护，避免模型临场画图导致风格漂移。
4. 所有 Agent 输出必须是合法 JSON，前端不解析散文。
5. Demo 要快、稳、有记忆点。架构可以成长，但体验先亮起来。

---

## 接下来想给它加什么

- Google ADK 多 Agent 编排
- 后端 STT：Whisper / Gemini / Google Speech-to-Text
- 后端 TTS：Edge TTS / OpenAI TTS / ElevenLabs
- Electron 桌面宠物版
- PWA 手机版
- MCP 工具调用
- 日程提醒、学习陪伴、资料助手
- 更丰富的像素音效和隐藏状态

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
