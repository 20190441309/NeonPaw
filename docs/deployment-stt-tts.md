# NEON PAW 后端语音服务部署指南

> 本文档介绍如何部署 FunASR (STT) 和 CosyVoice (TTS) 语音服务。

---

## 前置要求

### 硬件

- **GPU**: NVIDIA GPU，显存 >= 4GB（推荐 8GB+）
- **内存**: >= 16GB RAM
- **硬盘**: >= 10GB 可用空间（模型文件）

### 软件

- **操作系统**: Windows 10/11, Ubuntu 20.04+, macOS (CPU only)
- **Python**: 3.10 或 3.11（推荐 3.10）
- **CUDA**: 11.8 或 12.1（需与 PyTorch 版本匹配）
- **Git**: 用于克隆 CosyVoice 仓库

---

## 第一步：安装 CUDA 和 cuDNN

### Windows

1. 检查 GPU 型号和驱动版本：
```bash
nvidia-smi
```

2. 下载并安装 [CUDA Toolkit](https://developer.nvidia.com/cuda-toolkit-archive)
   - 推荐版本: CUDA 11.8 或 12.1

3. 下载并安装 [cuDNN](https://developer.nvidia.com/cudnn)
   - 需要注册 NVIDIA 开发者账号

### Linux (Ubuntu)

```bash
# 安装 CUDA 11.8
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.0-1_all.deb
sudo dpkg -i cuda-keyring_1.0-1_all.deb
sudo apt-get update
sudo apt-get install cuda-11-8

# 安装 cuDNN
sudo apt-get install libcudnn8 libcudnn8-dev

# 添加环境变量
echo 'export PATH=/usr/local/cuda-11.8/bin:$PATH' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH=/usr/local/cuda-11.8/lib64:$LD_LIBRARY_PATH' >> ~/.bashrc
source ~/.bashrc
```

### 验证安装

```bash
nvcc --version
nvidia-smi
```

---

## 第二步：创建 Python 虚拟环境

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 升级 pip
pip install --upgrade pip
```

---

## 第三步：安装 PyTorch (GPU 版本)

**重要**: 必须先安装 PyTorch，再安装其他依赖。

### CUDA 11.8

```bash
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### CUDA 12.1

```bash
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
```

### 验证 PyTorch GPU

```python
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}')"
```

预期输出：
```
CUDA available: True
GPU: NVIDIA GeForce RTX 3060
```

---

## 第四步：安装 FunASR (STT)

```bash
pip install funasr
```

FunASR 模型会在首次使用时自动下载到 `~/.cache/modelscope/` 目录。

### 预下载模型（可选）

```python
from funasr import AutoModel

# 下载模型
model = AutoModel(
    model="paraformer-zh",
    vad_model="fsmn-vad",
    punc_model="ct-punc",
    device="cuda"
)
print("FunASR model downloaded successfully")
```

---

## 第五步：安装 CosyVoice (TTS)

### 5.1 克隆仓库

```bash
# 在 backend 目录外克隆
cd ..
git clone https://github.com/FunAudioLLM/CosyVoice.git
cd CosyVoice
```

### 5.2 安装依赖

```bash
pip install -r requirements.txt
```

### 5.3 下载预训练模型

```bash
# 方式一：使用 Git LFS（推荐）
git lfs install
git clone https://huggingface.co/FunAudioLLM/CosyVoice-300M pretrained_models/CosyVoice-300M

# 方式二：使用 ModelScope（国内推荐）
pip install modelscope
python -c "
from modelscope import snapshot_download
snapshot_download('iic/CosyVoice-300M', local_dir='pretrained_models/CosyVoice-300M')
"
```

### 5.4 验证 CosyVoice

```python
import sys
sys.path.insert(0, 'path/to/CosyVoice')  # 替换为实际路径

from cosyvoice import CosyVoice
model = CosyVoice('pretrained_models/CosyVoice-300M', device='cuda')
print("CosyVoice loaded successfully")
```

---

## 第六步：安装项目依赖

```bash
cd backend
pip install -r requirements.txt
```

---

## 第七步：配置环境变量

### 7.1 复制配置文件

```bash
cp .env.example .env
```

### 7.2 编辑 `.env` 文件

```env
# LLM 配置
LLM_PROVIDER=deepseek
LLM_API_KEY=your_api_key_here
LLM_MODEL=deepseek-chat
LLM_BASE_URL=https://api.deepseek.com

# STT 配置
STT_ENABLED=true
STT_MODEL=paraformer-zh
STT_VAD_MODEL=fsmn-vad
STT_PUNC_MODEL=ct-punc
STT_DEVICE=cuda

# TTS 配置
TTS_ENABLED=true
TTS_MODEL=path/to/CosyVoice/pretrained_models/CosyVoice-300M
TTS_DEFAULT_VOICE=default
TTS_DEVICE=cuda
TTS_SAMPLE_RATE=22050
TTS_CHANNELS=1
TTS_SAMPLE_WIDTH=2

# 语音配置
SPEECH_FALLBACK_TO_BROWSER=true
SPEECH_MAX_UPLOAD_BYTES=10485760
```

---

## 第八步：验证安装

### 8.1 运行后端测试

```bash
cd backend
python -m pytest tests/ -v
```

预期输出：大部分测试通过（可能有 1-2 个预先存在的失败）。

### 8.2 启动后端服务

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 8.3 测试语音端点

```bash
# 检查语音服务状态
curl http://localhost:8000/api/speech/status

# 预期返回：
# {
#   "stt": {"available": true, "engine": "funasr", "model": "paraformer-zh", ...},
#   "tts": {"available": true, "engine": "cosyvoice", "model": "...", ...}
# }
```

---

## 常见问题

### Q1: CUDA 不可用

```
RuntimeError: CUDA is not available
```

**解决方案：**
1. 检查 `nvidia-smi` 是否正常
2. 确认 PyTorch 版本与 CUDA 版本匹配
3. 设置 `STT_DEVICE=cpu` 和 `TTS_DEVICE=cpu` 使用 CPU 模式

### Q2: FunASR 模型下载失败

```
ConnectionError: Failed to download model
```

**解决方案：**
1. 检查网络连接
2. 使用代理或镜像源
3. 手动下载模型到 `~/.cache/modelscope/`

### Q3: CosyVoice 导入失败

```
ModuleNotFoundError: No module named 'cosyvoice'
```

**解决方案：**
1. 确认已克隆 CosyVoice 仓库
2. 在 `config.py` 中添加 CosyVoice 路径到 `sys.path`
3. 或者将 CosyVoice 安装到 Python 环境

### Q4: 内存不足 (OOM)

```
RuntimeError: CUDA out of memory
```

**解决方案：**
1. 关闭其他占用 GPU 的程序
2. 使用更小的模型
3. 设置 `STT_DEVICE=cpu` 使用 CPU（较慢但不占 GPU 内存）

### Q5: WebM 格式不支持

FunASR 默认支持 WAV 格式。如果前端发送 WebM，需要安装 ffmpeg：

```bash
# Ubuntu
sudo apt install ffmpeg

# Windows (使用 conda)
conda install ffmpeg

# 或下载: https://ffmpeg.org/download.html
```

---

## CPU 模式部署

如果没有 GPU，可以使用 CPU 模式：

```env
STT_DEVICE=cpu
TTS_DEVICE=cpu
```

**注意：** CPU 模式下语音处理会明显变慢（5-10倍）。

---

## Docker 部署（可选）

```dockerfile
FROM pytorch/pytorch:2.1.0-cuda11.8-cudnn8-runtime

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y git ffmpeg

# 安装 Python 依赖
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

# 克隆并安装 CosyVoice
RUN git clone https://github.com/FunAudioLLM/CosyVoice.git /opt/cosyvoice
RUN cd /opt/cosyvoice && pip install -r requirements.txt

# 复制应用代码
COPY backend/ .

# 下载模型（可选，会增加镜像大小）
# RUN python -c "from funasr import AutoModel; AutoModel(model='paraformer-zh')"

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 性能优化

### 1. 模型预加载

在 `config.py` 中设置 `STT_ENABLED=true` 和 `TTS_ENABLED=true`，服务启动时会预加载模型。

### 2. 使用 SSD

将模型文件放在 SSD 上可以加快加载速度。

### 3. 批处理

对于批量语音处理，可以修改服务支持批处理以提高吞吐量。

---

## 监控

### 健康检查

```bash
curl http://localhost:8000/api/health
curl http://localhost:8000/api/speech/status
```

### 日志

后端日志会显示模型加载状态和错误信息：

```
INFO:app.services.stt_service:Loading FunASR model: paraformer-zh
INFO:app.services.stt_service:FunASR model loaded successfully
INFO:app.services.tts_service:Loading CosyVoice model: ...
INFO:app.services.tts_service:CosyVoice model loaded successfully
```

---

## 更新

### 更新 FunASR

```bash
pip install --upgrade funasr
```

### 更新 CosyVoice

```bash
cd CosyVoice
git pull
pip install -r requirements.txt
```

---

## 获取帮助

- FunASR: https://github.com/modelscope/FunASR
- CosyVoice: https://github.com/FunAudioLLM/CosyVoice
- Issues: https://github.com/20190441309/NeonPaw/issues
