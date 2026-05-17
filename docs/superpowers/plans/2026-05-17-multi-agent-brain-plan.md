# Multi-Agent Brain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rule-based mock pipeline with a single LLM call using chain-of-thought prompting, where each agent step (Intent, Emotion, Action, State Delta, Persona, Memory) produces intelligent, reasoned decisions.

**Architecture:** One LLM call with a structured system prompt requiring step-by-step reasoning before JSON output. The LLM's reasoning steps are extracted as Agent Trace entries. No fallback to mock logic — failures return a glitch response.

**Tech Stack:** Python, FastAPI, OpenAI-compatible API (DeepSeek), Pydantic

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `backend/app/services/prompts.py` | **Rewrite** | New CoT system prompt with 6-step reasoning structure |
| `backend/app/agents/root_brain.py` | **Rewrite** | Remove mock path, implement CoT parsing and validation |
| `backend/app/schemas.py` | No change | Response contract unchanged |
| `backend/app/routers/chat.py` | No change | API endpoint unchanged |
| `backend/app/agents/intent.py` | No change | Keep as reference, no longer called |
| `backend/app/agents/emotion.py` | No change | Keep as reference, no longer called |
| `backend/app/agents/action.py` | No change | Keep as reference, no longer called |
| `backend/app/agents/state_delta.py` | No change | Keep as reference, no longer called |
| `backend/app/agents/memory_decision.py` | No change | Keep as reference, no longer called |
| `backend/app/agents/persona.py` | No change | Keep as reference, no longer called |

---

### Task 1: Write the New CoT System Prompt

**Files:**
- Rewrite: `backend/app/services/prompts.py`

- [ ] **Step 1: Read the current prompts.py**

Run: `cat backend/app/services/prompts.py`
Expected: See the old `SYSTEM_PROMPT` string (37 lines).

- [ ] **Step 2: Replace with new CoT system prompt**

Replace the entire content of `backend/app/services/prompts.py` with:

```python
SYSTEM_PROMPT = """你是 NEON PAW 的大脑。你需要按以下 6 个步骤分析用户输入，逐步推理，最后输出 JSON。

## 步骤 1: Intent（意图）
分析用户消息的意图，选择最匹配的类别：
- greeting：问候（你好、hi、醒醒）
- farewell：告别（再见、拜拜、先这样）
- thanks：感谢（谢谢、感谢）
- complaint：抱怨（好烦、无聊、讨厌）
- request：请求（帮我...、能不能...、我想...）
- question：提问（什么是...、为什么...、怎么...）
- chitchat：闲聊（今天天气...、你觉得呢）
- encourage：鼓励/夸奖（你真棒、加油）
- sad：伤感（难过、不开心、压力大）
- command：指令（睡觉、安静、停止）
- default：无法归类

用 [INTENT: 类别] 格式输出，然后用一句话说明理由。

## 步骤 2: Emotion（情绪）
基于消息内容、对话上下文和宠物当前状态，判断情绪：
- neutral / happy / sad / sleepy / curious / comforting / glitch
给出情绪强度（1-5，其中 1=微弱 5=强烈）。

用 [EMOTION: 情绪, 强度N] 格式输出，然后说明判断依据。

## 步骤 3: Action（动作）
根据意图和情绪，选择宠物动作：
- wake / sleep / listen / think / speak / happy / comfort / idle / glitch / error

用 [ACTION: 动作] 格式输出，然后说明选择理由。

## 步骤 4: State Delta（状态变化）
根据情绪强度和场景，计算宠物状态变化。每个值必须是 -5 到 +5 的整数。
- energy：体力变化（互动消耗体力）
- mood：心情变化（正面/负面情绪影响）
- affinity：亲密度变化（互动增加亲密度）
- hunger：饥饿变化（互动增加饥饿感）
- stability：稳定性变化（负面事件降低稳定性）

用 [STATE: energy=N, mood=N, affinity=N, hunger=N, stability=N] 格式输出。

## 步骤 5: Reply（回复）
以 NEON PAW 的身份生成回复。风格要求：
- 赛博宠物风格，可爱但不过度油腻
- 1-3 句话，简短有宠物感
- 可以使用少量符号（~、...、!）
- 根据情绪调整语气：开心时活泼，安慰时温柔，好奇时提问
- 如果用户信息中有 [User Memories]，自然地引用

用 [REPLY: 回复内容] 格式输出。

## 步骤 6: Memory（记忆）
判断是否需要记住用户说的内容。只有以下情况才标记保存：
- 用户说出自己的名字或昵称
- 用户表达稳定偏好（喜欢/不喜欢某事物）
- 用户提到长期目标或计划
- 用户描述 recurring 习惯
- 用户提供重要项目背景
不保存：一次性情绪、临时问题、已有记忆中的重复信息。

用 [MEMORY: save/no] 格式输出，如果 save 则附带记忆内容。

## 最终输出
完成所有步骤后，输出一个空行，然后输出以下 JSON（不要用 Markdown 代码块包裹）：
{
  "reply": "步骤5的回复内容",
  "emotion": "步骤2的情绪",
  "action": "步骤3的动作",
  "voice_style": "soft_robotic",
  "state_delta": {
    "energy": 步骤4的值,
    "mood": 步骤4的值,
    "affinity": 步骤4的值,
    "hunger": 步骤4的值,
    "stability": 步骤4的值
  },
  "memory": {
    "should_save": true或false,
    "content": "记忆内容或空字符串"
  },
  "trace": [
    {"module": "intent", "message": "步骤1的理由"},
    {"module": "emotion", "message": "步骤2的理由"},
    {"module": "action", "message": "步骤3的理由"},
    {"module": "state_delta", "message": "步骤4的理由"},
    {"module": "persona", "message": "步骤5的理由"},
    {"module": "memory", "message": "步骤6的理由"}
  ]
}

注意：
1. JSON 必须合法，用双引号，无尾逗号
2. trace 中的 message 使用中文
3. action 和 emotion 必须是上述白名单中的值
4. state_delta 每个值必须是 -5 到 +5 的整数
"""
```

- [ ] **Step 3: Verify the file is valid Python**

Run: `cd backend && python -c "from app.services.prompts import SYSTEM_PROMPT; print(len(SYSTEM_PROMPT), 'chars')"`
Expected: Output shows character count (should be ~2000+).

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/prompts.py
git commit -m "feat: rewrite system prompt with CoT 6-step reasoning structure"
```

---

### Task 2: Rewrite root_brain.py — Core Logic

**Files:**
- Rewrite: `backend/app/agents/root_brain.py`

- [ ] **Step 1: Read the current root_brain.py**

Run: `cat backend/app/agents/root_brain.py`
Expected: See the old 292-line file with mock and LLM paths.

- [ ] **Step 2: Replace with new implementation**

Replace the entire content of `backend/app/agents/root_brain.py` with:

```python
"""Root Brain — CoT-powered multi-agent orchestrator.

Uses a single LLM call with chain-of-thought prompting to produce
intelligent per-agent decisions. Each reasoning step becomes a trace entry.

No mock fallback — LLM failure returns a glitch response.
"""

from __future__ import annotations

import json
import logging
import re

from openai import AsyncOpenAI

from app.schemas import (
    ChatResponse,
    ConversationMessage,
    Memory,
    MemoryEntry,
    PetState,
    StateDelta,
    TraceEntry,
)
from app.services.prompts import SYSTEM_PROMPT

logger = logging.getLogger(__name__)

VALID_ACTIONS = {"wake", "sleep", "listen", "think", "speak", "happy", "comfort", "idle", "glitch", "error"}
VALID_EMOTIONS = {"neutral", "happy", "sad", "sleepy", "curious", "comforting", "glitch"}


def _clamp_delta(value: int) -> int:
    """Clamp a state delta value to -5..+5 range."""
    return max(-5, min(5, value))


def _clamp_state(value: int) -> int:
    """Clamp a pet state value to 0..100 range."""
    return max(0, min(100, value))


def glitch_response(error_message: str) -> ChatResponse:
    """Return a glitch response when LLM fails."""
    return ChatResponse(
        reply="核心信号有点不稳定……但我还在这里。",
        emotion="glitch",
        action="glitch",
        voice_style="soft_robotic",
        state_delta=StateDelta(energy=-1, mood=-1, affinity=0, hunger=0, stability=-3),
        memory=Memory(),
        trace=[TraceEntry(module="root_agent", message=error_message)],
    )


def _extract_reasoning_steps(content: str) -> list[TraceEntry]:
    """Extract CoT reasoning steps as trace entries from LLM response."""
    patterns = {
        "intent": r"\[INTENT:\s*\w+\]\s*(.+?)(?=\[|$)",
        "emotion": r"\[EMOTION:\s*\w+(?:,\s*强度\d+)?\]\s*(.+?)(?=\[|$)",
        "action": r"\[ACTION:\s*\w+\]\s*(.+?)(?=\[|$)",
        "state_delta": r"\[STATE:\s*[^\]]+\]\s*(.+?)(?=\[|$)",
        "persona": r"\[REPLY:\s*.+?\]\s*(.+?)(?=\[|$)",
        "memory": r"\[MEMORY:\s*\w+\]\s*(.+?)(?=\[|$)",
    }

    trace = []
    for module, pattern in patterns.items():
        match = re.search(pattern, content, re.DOTALL)
        if match:
            reason = match.group(1).strip()
            # Take first line only for trace conciseness
            first_line = reason.split("\n")[0].strip()
            if first_line:
                trace.append(TraceEntry(module=module, message=first_line))

    # If no reasoning steps found, return a minimal trace
    if not trace:
        trace.append(TraceEntry(module="root_agent", message="LLM response parsed (no reasoning steps extracted)"))

    return trace


def _extract_json(content: str) -> dict | None:
    """Extract JSON from LLM response content."""
    # Try to find JSON after all reasoning steps
    # Look for the last JSON object in the content
    json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
    matches = re.findall(json_pattern, content, re.DOTALL)

    for match in reversed(matches):
        try:
            data = json.loads(match)
            # Verify it has the required fields
            if "reply" in data and "emotion" in data and "action" in data:
                return data
        except json.JSONDecodeError:
            continue

    # If no nested JSON found, try the entire content as JSON
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return None


def _validate_and_build_response(data: dict, trace: list[TraceEntry]) -> ChatResponse:
    """Validate LLM JSON output and build ChatResponse."""
    action = data.get("action", "speak")
    emotion = data.get("emotion", "neutral")

    # Validate action and emotion against whitelists
    if action not in VALID_ACTIONS:
        trace.append(TraceEntry(module="validation", message=f"action '{action}' not in whitelist, using 'glitch'"))
        action = "glitch"
    if emotion not in VALID_EMOTIONS:
        trace.append(TraceEntry(module="validation", message=f"emotion '{emotion}' not in whitelist, using 'glitch'"))
        emotion = "glitch"

    # Parse and clamp state delta
    raw_delta = data.get("state_delta", {})
    try:
        state_delta = StateDelta(
            energy=_clamp_delta(int(raw_delta.get("energy", 0))),
            mood=_clamp_delta(int(raw_delta.get("mood", 0))),
            affinity=_clamp_delta(int(raw_delta.get("affinity", 0))),
            hunger=_clamp_delta(int(raw_delta.get("hunger", 0))),
            stability=_clamp_delta(int(raw_delta.get("stability", 0))),
        )
    except (ValueError, TypeError):
        trace.append(TraceEntry(module="validation", message="state_delta parse error, using zeros"))
        state_delta = StateDelta()

    # Parse memory
    raw_memory = data.get("memory", {})
    memory = Memory(
        should_save=bool(raw_memory.get("should_save", False)),
        content=str(raw_memory.get("content", "")),
    )

    return ChatResponse(
        reply=str(data.get("reply", "...")),
        emotion=emotion,
        action=action,
        voice_style=str(data.get("voice_style", "soft_robotic")),
        state_delta=state_delta,
        memory=memory,
        trace=trace,
    )


def _build_messages(
    message: str,
    pet_state: PetState,
    history: list[ConversationMessage],
    memories: list[MemoryEntry] | None = None,
) -> list[dict[str, str]]:
    """Build the messages array for the LLM API call."""
    state_context = (
        f"[Pet State] mode={pet_state.mode}, emotion={pet_state.emotion}, "
        f"energy={pet_state.energy}, mood={pet_state.mood}, "
        f"affinity={pet_state.affinity}, hunger={pet_state.hunger}, "
        f"stability={pet_state.stability}"
    )

    messages: list[dict[str, str]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": state_context},
    ]

    if memories:
        mem_lines = "\n".join(f"- {m.content}" for m in memories)
        messages.append({
            "role": "system",
            "content": f"[User Memories]\n{mem_lines}",
        })

    for msg in history[-5:]:
        messages.append({"role": msg.role, "content": msg.content})

    messages.append({"role": "user", "content": message})
    return messages


async def generate_response(
    message: str,
    pet_state: PetState,
    history: list[ConversationMessage],
    memories: list[MemoryEntry] | None = None,
) -> ChatResponse:
    """Main entry point — single LLM call with CoT reasoning."""
    from app import config

    if not config.LLM_API_KEY:
        logger.warning("No LLM_API_KEY set, returning glitch response")
        return glitch_response("LLM_API_KEY not configured")

    client = AsyncOpenAI(
        api_key=config.LLM_API_KEY,
        base_url=config.LLM_BASE_URL,
        timeout=config.LLM_TIMEOUT,
    )

    messages = _build_messages(message, pet_state, history, memories)

    try:
        completion = await client.chat.completions.create(
            model=config.LLM_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )
    except Exception as e:
        logger.exception("LLM call failed")
        return glitch_response(f"LLM 调用失败: {type(e).__name__}")

    content = completion.choices[0].message.content
    if not content or not content.strip():
        logger.warning("LLM returned empty content")
        return glitch_response("LLM 返回空内容")

    content = content.strip()
    logger.debug("LLM raw output:\n%s", content)

    # Extract reasoning steps as trace
    trace = _extract_reasoning_steps(content)

    # Extract JSON from response
    data = _extract_json(content)
    if data is None:
        logger.warning("Failed to extract JSON from LLM response: %s", content[:200])
        return glitch_response("LLM 返回无效 JSON")

    return _validate_and_build_response(data, trace)
```

- [ ] **Step 3: Verify imports are correct**

Run: `cd backend && python -c "from app.agents.root_brain import generate_response; print('import ok')"`
Expected: `import ok`

- [ ] **Step 4: Commit**

```bash
git add backend/app/agents/root_brain.py
git commit -m "feat: rewrite root_brain with CoT reasoning and no mock fallback"
```

---

### Task 3: Update chat.py Router

**Files:**
- Modify: `backend/app/routers/chat.py`

- [ ] **Step 1: Update import**

The router currently imports `fallback_response` from `root_brain`. This function no longer exists — it's replaced by `glitch_response`. Update the import.

Replace the entire content of `backend/app/routers/chat.py` with:

```python
from fastapi import APIRouter
from app.schemas import ChatRequest, ChatResponse
from app.agents.root_brain import generate_response, glitch_response

router = APIRouter()


@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        response = await generate_response(
            message=request.message,
            pet_state=request.pet_state,
            history=request.conversation_history,
            memories=request.memories,
        )
        return response
    except Exception:
        return glitch_response("Unexpected error in chat endpoint")
```

- [ ] **Step 2: Verify the router loads**

Run: `cd backend && python -c "from app.routers.chat import router; print('router ok')"`
Expected: `router ok`

- [ ] **Step 3: Commit**

```bash
git add backend/app/routers/chat.py
git commit -m "fix: update chat router import from fallback_response to glitch_response"
```

---

### Task 4: Integration Test — Backend Starts and Responds

**Files:**
- Test: manual verification

- [ ] **Step 1: Start the backend**

Run: `cd backend && venv/Scripts/uvicorn app.main:app --port 8000`
Expected: Server starts without errors.

- [ ] **Step 2: Test health endpoint**

Run: `curl -s http://localhost:8000/api/health | python -m json.tool`
Expected: 200 OK with health status JSON.

- [ ] **Step 3: Test chat endpoint with a greeting (mock mode — no API key)**

Run:
```bash
curl -s -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"你好","pet_state":{"name":"NEON PAW","mode":"sleeping","emotion":"sleepy","energy":80,"mood":70,"affinity":20,"hunger":30,"stability":95,"lastInteractionAt":""},"conversation_history":[],"memories":[]}' | python -m json.tool
```
Expected: Glitch response with trace showing "LLM_API_KEY not configured".

- [ ] **Step 4: Test chat endpoint with LLM (if API key available)**

If `LLM_API_KEY` is set in `.env`, test with a real message:

Run:
```bash
curl -s -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"你好呀","pet_state":{"name":"NEON PAW","mode":"sleeping","emotion":"sleepy","energy":80,"mood":70,"affinity":20,"hunger":30,"stability":95,"lastInteractionAt":""},"conversation_history":[],"memories":[]}' | python -m json.tool
```
Expected: Response with:
- `reply`: A short, pet-style greeting
- `emotion`: `happy` or `curious`
- `action`: `wake` or `happy`
- `trace`: Array with 6 entries (intent, emotion, action, state_delta, persona, memory), each with a Chinese reasoning message
- `state_delta`: Values in -5..+5 range

- [ ] **Step 5: Verify trace contains CoT reasoning**

Check that the trace array has entries with `module` values: `intent`, `emotion`, `action`, `state_delta`, `persona`, `memory`. Each `message` should be a Chinese sentence explaining the reasoning.

- [ ] **Step 6: Verify state_delta values are in range**

Check that all state_delta values (energy, mood, affinity, hunger, stability) are integers between -5 and +5.

- [ ] **Step 7: Stop the backend**

Press Ctrl+C or kill the process.

- [ ] **Step 8: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: integration test fixes"
```

---

### Task 5: Frontend Smoke Test

**Files:**
- Test: manual verification in browser

- [ ] **Step 1: Start backend**

Run: `cd backend && venv/Scripts/uvicorn app.main:app --port 8000`

- [ ] **Step 2: Start frontend**

Run: `cd frontend && npm run dev`

- [ ] **Step 3: Open browser and test interaction**

Navigate to `http://localhost:3000`. Click screen to wake pet, then:
1. Click microphone and say "你好" → verify pet responds with dynamic reply
2. Check Agent Trace panel shows 6 reasoning steps in Chinese
3. Check pet status bars update with dynamic state deltas
4. Verify no console errors

- [ ] **Step 4: Test error case**

Stop the backend, then send a message in the frontend. Verify:
- Pet shows glitch/error state
- Reply says "核心信号有点不稳定……但我还在这里。"
- Trace shows error message

- [ ] **Step 5: Restart backend and verify recovery**

Start backend again, send another message. Verify pet responds normally.

- [ ] **Step 6: Stop both servers**

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: multi-agent brain with CoT reasoning complete"
```
