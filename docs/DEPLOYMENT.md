# NEON PAW 后端部署方案

Android 真机无法访问电脑上的 `localhost`，需要把后端部署到公网，或在同一 Wi‑Fi 下用局域网 IP。本文档提供三种方案，按推荐程度排序。

---

## 方案对比

| 方案 | 成本 | 难度 | 适用场景 |
|------|------|------|----------|
| Fly.io（推荐） | 免费额度足够 MVP | 低 | 快速上线、HTTPS 自动配置 |
| 腾讯云 Lighthouse | ¥30+/月 | 中 | 国内访问快、稳定长期运行 |
| 本地局域网调试 | 免费 | 最低 | 仅模拟器 / 同 WiFi 真机调试 |

---

## 方案一：Fly.io 部署（推荐，免费起步）

### 1. 安装 Fly CLI

```bash
# macOS
brew install flyctl
```

### 2. 登录并创建应用

```bash
cd backend
flyctl auth login
flyctl launch --name neonpaw-api --no-deploy
```

在交互提示中选择：

- Builder: 选择 `Dockerfile` 或让 Fly 自动检测 Python
- Internal port: `8000`

### 3. 配置环境变量

```bash
flyctl secrets set LLM_PROVIDER=deepseek
flyctl secrets set LLM_API_KEY=your_deepseek_api_key
flyctl secrets set LLM_MODEL=deepseek-chat
flyctl secrets set LLM_BASE_URL=https://api.deepseek.com
```

### 4. 创建 Dockerfile

在 `backend/` 目录创建 `Dockerfile`：

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 5. 部署

```bash
flyctl deploy
```

部署成功后会得到地址：`https://neonpaw-api.fly.dev`

### 6. 更新 Android 配置

```bash
cd android
./gradlew :app:assembleDebug -PAPI_BASE_URL=https://neonpaw-api.fly.dev
```

或在 Android Studio 的 Gradle 属性 / `app/build.gradle.kts` 中设置 `API_BASE_URL`。

---

## 方案二：腾讯云 Lighthouse（国内推荐）

### 1. 购买轻量应用服务器

- 腾讯云控制台 → 轻量应用服务器
- 镜像选择 `Ubuntu 22.04` 或 `Python 3.12` 应用镜像
- 规格：2核2G 足够 MVP

### 2. 安装依赖

```bash
ssh ubuntu@your_server_ip
sudo apt update && sudo apt install -y python3.12 python3-pip nginx
```

### 3. 部署代码

```bash
git clone <你的仓库地址> /opt/neonpaw
cd /opt/neonpaw/backend
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. 配置环境变量

```bash
cat > /opt/neonpaw/backend/.env << EOF
LLM_PROVIDER=deepseek
LLM_API_KEY=your_deepseek_api_key
LLM_MODEL=deepseek-chat
LLM_BASE_URL=https://api.deepseek.com
EOF
```

### 5. 用 Systemd 常驻运行

创建 `/etc/systemd/system/neonpaw.service`：

```ini
[Unit]
Description=NEON PAW API
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/opt/neonpaw/backend
EnvironmentFile=/opt/neonpaw/backend/.env
ExecStart=/opt/neonpaw/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable neonpaw
sudo systemctl start neonpaw
```

### 6. 配置 Nginx 反向代理 + HTTPS

```bash
sudo apt install certbot python3-certbot-nginx
```

创建 `/etc/nginx/sites-available/neonpaw`：

```nginx
server {
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/neonpaw /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.yourdomain.com
```

### 7. 更新 Android 配置

```bash
./gradlew :app:assembleDebug -PAPI_BASE_URL=https://api.yourdomain.com
```

---

## 方案三：本地局域网调试（仅开发用）

### 1. 启动后端监听 0.0.0.0

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 2. 查看本机局域网 IP

```bash
# macOS
ipconfig getifaddr en0
# 例如输出 192.168.1.100
```

### 3. 更新 Android 配置

| 运行环境 | API 地址 |
|----------|----------|
| 模拟器 | `http://10.0.2.2:8000`（默认已配置） |
| 真机 | `http://192.168.x.x:8000` |

```bash
./gradlew :app:assembleDebug -PAPI_BASE_URL=http://192.168.1.100:8000
```

> 注意：手机和电脑必须在同一 Wi‑Fi。Android 端已通过 `network_security_config.xml` 允许开发期 HTTP cleartext。

---

## 验证部署

部署完成后，用浏览器或 curl 验证：

```bash
# 健康检查
curl https://your-api-domain/

# 应返回: {"status":"NEON PAW API is running"}

# 测试对话
curl -X POST https://your-api-domain/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "你好",
    "pet_state": {
      "name": "NEON PAW",
      "mode": "sleeping",
      "emotion": "sleepy",
      "energy": 80,
      "mood": 70,
      "affinity": 20,
      "hunger": 30,
      "stability": 95,
      "lastInteractionAt": ""
    },
    "conversation_history": [],
    "memories": []
  }'
```

---

## 安全建议（生产环境）

1. **CORS 收紧**：把 `backend/app/main.py` 的 `allow_origins=["*"]` 改为具体域名
2. **限流**：用 `slowapi` 防止滥用
3. **API Key 保护**：不要把 `.env` 提交到 git
4. **HTTPS 强制**：上架 Google Play 时建议所有网络请求走 HTTPS，并收紧 cleartext 策略

---

## Android 端配置切换

通过 Gradle 属性 `API_BASE_URL` 或 `app/build.gradle.kts`：

| 环境 | 配置值 |
|------|--------|
| 模拟器本地调试 | `http://10.0.2.2:8000` |
| 真机局域网调试 | `http://192.168.x.x:8000` |
| 生产环境 | `https://your-domain.com` |

### 后端 STT / TTS（Android）

Android 客户端与 Web 使用同一套 speech API：

```text
GET  /api/speech/status   → 是否启用后端 STT/TTS
POST /api/speech/stt      → multipart WAV 上传转写
POST /api/speech/tts      → JSON { text } → audio/wav
```

- 后端 FunASR / CosyVoice 未就绪时，Android 自动回退到系统 `SpeechRecognizer` / `TextToSpeech`
- 完整 GPU 部署步骤见 [deployment-stt-tts.md](./deployment-stt-tts.md)
- App 内徽章 `SPEECH STT:… TTS:…` 可确认当前引擎
