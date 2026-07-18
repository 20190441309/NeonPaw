# NEON PAW Android App

复古终端风格 AI 电子宠物的 Android 原生版本，基于 **Kotlin + Jetpack Compose** 开发。

能力与 Web 前端 MVP 对齐：语音对话、ASCII 宠物舱、状态机、TTS、Agent Trace、本地持久化。

## 项目结构

```
android/
├── settings.gradle.kts
├── build.gradle.kts
├── gradle.properties
├── app/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/neonpaw/app/
│       │   ├── NeonPawApplication.kt
│       │   ├── MainActivity.kt
│       │   ├── Config.kt                 # API 地址 / 语言 / 超时
│       │   ├── model/
│       │   │   ├── PetTypes.kt           # PetState / ChatResponse 等
│       │   │   └── PetFrames.kt          # 10 个 ASCII 场景帧
│       │   ├── data/
│       │   │   ├── APIClient.kt          # POST /api/chat
│       │   │   ├── PetStateStore.kt      # SharedPreferences 持久化
│       │   │   └── PetStateManager.kt    # 宠物状态机 ViewModel
│       │   ├── speech/
│       │   │   ├── SpeechManager.kt                 # STT（SpeechRecognizer）
│       │   │   ├── SpeechSynthesizerManager.kt      # TTS（TextToSpeech）
│       │   │   ├── WakeWordManager.kt               # 唤醒词 + 免提会话
│       │   │   └── WakePhrases.kt                   # 唤醒 / 停止短语
│       │   └── ui/
│       │       ├── MainScreen.kt
│       │       ├── TerminalShell.kt
│       │       ├── ScanlineOverlay.kt
│       │       ├── ASCIIPet.kt
│       │       ├── VoiceButton.kt
│       │       ├── WakeModeToggle.kt
│       │       ├── PetStatusPanel.kt
│       │       ├── ChatTranscript.kt
│       │       └── AgentTracePanel.kt
│       └── res/
└── README.md
```

## 运行步骤

### 1. 用 Android Studio 打开

```bash
# 打开 android/ 目录
# File → Open → NeonPaw/android
```

建议：

- Android Studio Ladybug / Koala 或更新版本
- JDK 17
- Android SDK 35
- 模拟器 API 26+ 或真机

首次打开会自动下载 Gradle Wrapper 与依赖。

### 2. 配置后端地址

默认模拟器走本机：

```text
http://10.0.2.2:8000
```

`10.0.2.2` 是 Android 模拟器访问宿主机 localhost 的特殊地址。

#### 方式 A：改 BuildConfig（推荐）

```bash
./gradlew :app:assembleDebug -PAPI_BASE_URL=http://192.168.1.100:8000
```

或在 `android/app/build.gradle.kts` 的 `defaultConfig` 里改默认值。

#### 方式 B：直接改源码

编辑 `Config.kt` / `BuildConfig.API_BASE_URL` 对应配置：

| 环境 | 地址 |
|------|------|
| 模拟器本地后端 | `http://10.0.2.2:8000` |
| 真机局域网 | `http://192.168.x.x:8000` |
| 生产 | `https://your-domain.com` |

### 3. 启动后端

```bash
cd backend
source venv/bin/activate   # Windows: venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

真机调试时必须 `--host 0.0.0.0`，手机和电脑需同一 Wi‑Fi。

### 4. 运行 App

- 选模拟器或真机
- Run `app`

## 权限说明

首次点击麦克风会请求：

1. **麦克风**（`RECORD_AUDIO`）— 用于语音输入  
2. 系统语音识别服务（通常随 Google 语音服务提供）

开发环境允许 HTTP cleartext（见 `network_security_config.xml`）。上架 Play 建议改用 HTTPS。

## 技术要点

| 能力 | 实现 |
|------|------|
| 语音识别 (STT) | **优先后端** `POST /api/speech/stt`（WAV 录音上传）；不可用时回退 `SpeechRecognizer` |
| 语音合成 (TTS) | **优先后端** `POST /api/speech/tts`（WAV → MediaPlayer）；不可用时回退 `TextToSpeech` |
| 能力探测 | 启动时 `GET /api/speech/status`，UI 显示 `STT:…` / `TTS:…` |
| 状态持久化 | `SharedPreferences` + kotlinx.serialization |
| 扫描线效果 | Compose `Canvas` 动画 |
| ASCII 渲染 | Monospace + 青绿 glow |
| 网络 | OkHttp + kotlinx.serialization |
| 状态管理 | `ViewModel` + `StateFlow` |

## 与 Web 前端的对应

| 前端 (React) | Android (Kotlin) |
|--------------|------------------|
| `usePetState` | `PetStateManager` |
| `useSpeechRecognition` | `SpeechManager` |
| `useSpeechSynthesis` | `SpeechSynthesizerManager` |
| `localStorage` | `PetStateStore` (SharedPreferences) |
| `lib/api.ts` | `APIClient` |
| `lib/types.ts` | `model/PetTypes.kt` |
| `lib/petFrames.ts` | `model/PetFrames.kt` |
| `page.tsx` | `ui/MainScreen.kt` |
| `TerminalShell.tsx` | `ui/TerminalShell.kt` |

## 交互闭环

```text
点屏幕唤醒
  → 点麦克风说话
  → [后端 STT 可用] 录 WAV → POST /api/speech/stt
    [否则] SpeechRecognizer
  → POST /api/chat
  → 更新状态 + ASCII 帧
  → [后端 TTS 可用] POST /api/speech/tts → 播放 WAV
    [否则] TextToSpeech
  → 回到 awake / 空闲超时后 sleeping
```

### 后端 STT / TTS

启动时请求 `GET /api/speech/status`：

| 状态 | 行为 |
|------|------|
| `stt.available=true` | 麦克风 **点按开始录音 / 再点结束并上传**（最长 15s） |
| `stt.available=false` | 设备 `SpeechRecognizer` 自动断句 |
| `tts.available=true` | 用后端 WAV 播放 reply |
| `tts.available=false` | 设备 `TextToSpeech` |

后端 FunASR / CosyVoice 未部署时会自动走设备回退，App 仍可完整演示。  
部署说明见仓库 `docs/deployment-stt-tts.md`。

界面有 `SPEECH STT:… TTS:…` 徽章：高亮表示正在用后端引擎。

### 唤醒词 / 免提会话

界面底部 **WAKE MODE** 开关（默认 OFF，状态会本地持久化）：

1. 打开后持续监听唤醒词：`小爪醒醒` / `NEON PAW` / `hey neon paw` 等  
2. 支持「唤醒 + 指令」一句话：`小爪醒醒，今天怎么样`  
3. 也可先唤醒，再单独说下一句  
4. 进入免提会话后可持续多轮，直到超时或说停止词（`再见` / `结束` / `bye` 等）  
5. 点击麦克风手动说话时，会暂时暂停唤醒监听；对话/TTS 结束后自动恢复

## 最低系统要求

- Android 8.0 (API 26)+
- 推荐安装 Google 语音识别 / 中文 TTS 语音包
