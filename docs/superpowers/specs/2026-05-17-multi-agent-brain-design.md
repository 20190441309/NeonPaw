# Multi-Agent Brain Design

**Date:** 2026-05-17
**Status:** Approved
**Scope:** Upgrade the pet brain from rule-based lookup tables to LLM-powered intelligent agents

---

## Problem

The current backend has two execution paths:

1. **Mock path:** 6 modules (intent, emotion, action, state_delta, memory_decision, persona), but most are trivial lookup tables (`dict.get()`). Only `intent.py` has real logic (regex classification).
2. **LLM path:** A single LLM call generates everything at once. Sub-modules are bypassed entirely — the LLM decides reply, emotion, action, state_delta, and memory in one shot.

Neither path produces truly intelligent per-agent decisions. The mock path is mechanical; the LLM path treats all decisions as a monolith.

---

## Goal

Make each agent (Intent, Emotion, Action, State Delta, Persona, Memory) genuinely intelligent by using LLM-powered reasoning for each step, while keeping a single LLM call for latency and cost efficiency.

---

## Approach: Single LLM Call + Chain-of-Thought Prompt

One LLM request with a structured system prompt that requires step-by-step reasoning before outputting the final JSON. Each step corresponds to one agent's decision. The reasoning steps serve as the Agent Trace.

---

## Intent Taxonomy

Expanded from 4 to 11 categories:

| Intent | Description | Example |
|---|---|---|
| `greeting` | Greetings | "你好", "hi", "醒醒" |
| `farewell` | Goodbyes | "再见", "拜拜", "先这样" |
| `thanks` | Gratitude | "谢谢", "感谢", "太好了" |
| `complaint` | Complaints | "好烦", "无聊", "讨厌" |
| `request` | Requests | "帮我...", "能不能...", "我想..." |
| `question` | Questions | "什么是...", "为什么...", "怎么..." |
| `chitchat` | Casual chat | "今天天气...", "你觉得呢" |
| `encourage` | Praise/encouragement | "你真棒", "加油", "不错" |
| `sad` | Sadness | "难过", "不开心", "压力大" |
| `command` | Commands | "睡觉", "安静", "停止" |
| `default` | Fallback | Unclassifiable input |

Intent is determined by LLM based on message content and context, not regex.

---

## Emotion Analysis

### Dimensions
- Message text sentiment
- Conversation context (emotional trajectory)
- Pet current state (e.g., low affinity → more restrained response)

### Output
- Emotion label (7 options, whitelist unchanged): `neutral`, `happy`, `sad`, `sleepy`, `curious`, `comforting`, `glitch`
- Emotion intensity (1-5): used to scale state_delta magnitude

### Key Changes
- Same message text can produce different emotions based on context
- "谢谢" after a complaint → `comforting` (not `happy`)
- "随便吧" → possibly `sad` (passive-aggressive) rather than `neutral`
- LLM explains reasoning in the trace

---

## Action Selection

Whitelist unchanged (10 actions): `wake`, `sleep`, `listen`, `think`, `speak`, `happy`, `comfort`, `idle`, `glitch`, `error`

### Key Changes
- LLM selects action based on intent + emotion + context (not fixed mapping)
- User complaint → could be `comfort` or `think` depending on situation
- User praise → could be `happy` or `speak` depending on context
- LLM explains reasoning in the trace

---

## State Delta Dynamic Calculation

### Rules
- Based on emotion_intensity (1-5) as the base magnitude
- Each attribute change range: **-5 to +5** (integer)
- LLM distributes values reasonably per scenario

### Examples

| Scenario | intensity | energy | mood | affinity | hunger | stability |
|---|---|---|---|---|---|---|
| Happy greeting | 4 | -1 | +4 | +3 | 0 | 0 |
| Slightly sad | 2 | -1 | -2 | +1 | 0 | 0 |
| Deep complaint | 5 | -2 | -5 | +2 | +1 | -1 |
| Casual chitchat | 1 | -1 | +1 | +1 | 0 | 0 |

### Safety
- Backend clamps all values to 0-100 after LLM output
- All values must be integers
- LLM explains reasoning in the trace

---

## Persona Dynamic Reply

### Personality Constraints (in system prompt)
- Cyber pet style, cute but not overly saccharine
- Short replies (1-3 sentences)
- Can use light emoticons/symbols (~, ..., !)
- Adjusts tone by emotion: lively when happy, gentle when comforting, questioning when curious
- Avoids long-winded AI assistant style

### Dynamic Factors
- High affinity → more intimate, more talkative
- Low affinity → more polite, more brief
- Low energy → sleepy-sounding replies
- High hunger → mentions being hungry

### Example

| Scenario | Fixed (old) | Dynamic (new) |
|---|---|---|
| Greeting | "信号接入成功，NEON PAW 已上线。" | "嘿~ 你来啦！信号刚接上，等你好久了..." |
| Comfort | "NEON PAW 在这里陪着你。" | "听起来今天不太顺利...没关系，我在这呢" |
| Chitchat | "NEON PAW 正在接收你的信号..." | "嗯嗯，然后呢？我觉得挺有意思的~" |

---

## System Prompt Structure

```
你是 NEON PAW 的大脑。请按以下步骤分析用户输入，最后输出 JSON。

## 步骤 1: Intent（意图）
分析用户消息，选择最匹配的意图类别：
greeting / farewell / thanks / complaint / request /
question / chitchat / encourage / sad / command / default
说明理由。

## 步骤 2: Emotion（情绪）
基于消息内容、对话上下文、宠物当前状态，判断情绪：
neutral / happy / sad / sleepy / curious / comforting / glitch
给出情绪强度（1-5）和判断依据。

## 步骤 3: Action（动作）
根据 intent + emotion + 上下文，选择动作：
wake / sleep / listen / think / speak / happy / comfort / idle / glitch / error
说明选择理由。

## 步骤 4: State Delta（状态变化）
根据 emotion_intensity 和场景，计算状态变化：
energy / mood / affinity / hunger / stability（每个 -5 到 +5 的整数）
说明变化原因。

## 步骤 5: Reply（回复）
以 NEON PAW 的身份生成回复（1-3 句话，赛博宠物风格）。

## 步骤 6: Memory（记忆）
判断是否需要记住用户说的内容。

## 输出
严格按照以下 JSON 格式输出，不要输出其他内容：
{ "reply": "...", "emotion": "...", "action": "...", "voice_style": "...",
  "state_delta": {...}, "memory": {...}, "trace": [...] }
```

### User Message Contains
- User's current message
- Recent 5 conversation messages
- Current pet state
- Saved memories (if any)

---

## Response Contract

Unchanged from current contract:

```json
{
  "reply": "...",
  "emotion": "happy",
  "action": "speak",
  "voice_style": "soft_robotic",
  "state_delta": { "energy": -1, "mood": 4, "affinity": 3, "hunger": 0, "stability": 0 },
  "memory": { "should_save": false, "content": "" },
  "trace": [
    { "module": "intent", "message": "用户说'你好烦'，归类为 complaint" },
    { "module": "emotion", "message": "消息带有消极情绪，强度 4/5" },
    { "module": "action", "message": "用户需要安慰，选择 comfort" },
    { "module": "state_delta", "message": "高强度消极情绪，mood -4，affinity +2" },
    { "module": "persona", "message": "生成温柔安慰回复" },
    { "module": "memory", "message": "无长期记忆需求" }
  ]
}
```

### Trace
- LLM reasoning steps are extracted as trace entries
- Each step's reasoning becomes one trace entry with the module name

---

## Error Handling

No fallback to mock logic. Direct glitch response on failure:

| Error | Response |
|---|---|
| LLM timeout/network error | Glitch response + trace records error |
| LLM returns invalid JSON | Glitch response + trace records parse failure |
| action/emotion not in whitelist | Glitch response + trace records validation failure |
| state_delta out of range | Clamp to 0-100, continue (safety measure, not an error) |

### Glitch Response Template

```json
{
  "reply": "核心信号有点不稳定……但我还在这里。",
  "emotion": "glitch",
  "action": "glitch",
  "voice_style": "soft_robotic",
  "state_delta": { "energy": -1, "mood": -1, "affinity": 0, "hunger": 0, "stability": -3 },
  "memory": { "should_save": false, "content": "" },
  "trace": [{ "module": "root_agent", "message": "LLM 调用失败: [具体错误]" }]
}
```

---

## Impact on Existing Code

### Files to Modify
- `backend/app/agents/root_brain.py` — Rewrite: remove mock path and old LLM path, implement new CoT prompt logic
- `backend/app/services/prompts.py` — Replace with new multi-agent system prompt
- `backend/app/routers/chat.py` — May need minor adjustments for new response format

### Files to Preserve (reference only)
- `backend/app/agents/intent.py` — Keep as reference, no longer called
- `backend/app/agents/emotion.py` — Keep as reference, no longer called
- `backend/app/agents/action.py` — Keep as reference, no longer called
- `backend/app/agents/state_delta.py` — Keep as reference, no longer called
- `backend/app/agents/memory_decision.py` — Keep as reference, no longer called
- `backend/app/agents/persona.py` — Keep as reference, no longer called

### No Frontend Changes Required
- Response contract is unchanged
- Frontend consumes the same JSON fields
- Trace format is compatible (module + message)

---

## Success Criteria

1. LLM produces step-by-step reasoning visible in trace
2. Intent classification covers all 11 categories with correct reasoning
3. Emotion analysis considers context, not just intent mapping
4. State delta varies based on emotion intensity
5. Reply text is dynamic and personality-aware
6. Error cases return glitch response with trace
7. Frontend works without any changes
8. Latency is acceptable (single LLM call)
