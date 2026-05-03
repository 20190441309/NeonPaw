# Phase 6 Checkpoint: Lightweight Memory System

**Date:** 2026-05-03
**Status:** Complete
**Commit:** 844a134

---

## Completed Files

```
frontend/src/lib/types.ts                 # MemoryEntry interface, memories in ChatRequest
frontend/src/hooks/useMemory.ts           # NEW — localStorage memory hook (add/remove/dedup)
frontend/src/components/MemoryPanel.tsx    # NEW — collapsible memory panel with hover-delete
frontend/src/app/page.tsx                 # Wire useMemory, pass memories to API, handle should_save
backend/app/schemas.py                    # MemoryEntry model, memories in ChatRequest
backend/app/services/pet_brain.py         # Inject [User Memories] into LLM context
backend/app/services/prompts.py           # Rule 9: reference user memories naturally
backend/app/routers/chat.py               # Pass memories to generate_response
```

## Architecture

```
User says "记住，我叫小野"
  ↓
Frontend sends message + pet_state + history + memories[] to /api/chat
  ↓
Backend injects memories as [User Memories] system message into LLM context
  ↓
LLM returns { memory: { should_save: true, content: "用户叫小野" } }
  ↓
Frontend saves memory to localStorage (neon_paw_memories)
  ↓
Next request includes the new memory → LLM can reference "小野" naturally
```

## Key Design Decisions

| Decision | Choice | Why |
|---|---|---|
| Storage | localStorage only | No DB dependency, MVP simplicity |
| Cap | 30 entries | Prevent unbounded growth |
| Dedup | By exact content match | Avoid redundant memories |
| Injection | System message | LLM sees memories before conversation |
| UI | Collapsible panel | Secondary to main pet UI |
| Delete | Hover-reveal DEL button | Clean look, easy cleanup |

## How to Verify

1. Start backend + frontend
2. With DeepSeek key: say "记住，我叫小野"
3. MEMORY BANK panel appears with "用户叫小野"
4. Say "我叫什么？" — pet answers "小野"
5. Refresh page — memories persist in localStorage
6. Hover a memory entry — DEL button appears for removal
7. Without DeepSeek: memories persist and are sent, but mock won't reference them

## Review Checklist (All Passed)

- [x] MemoryEntry type matches frontend ↔ backend
- [x] localStorage under `neon_paw_memories`
- [x] Dedup + cap at 30
- [x] `should_save` → `addMemory`
- [x] Memories sent every request via ref
- [x] Backend injects into LLM context
- [x] MemoryPanel secondary to main UI
- [x] Manual removal works
- [x] Frontend build passes
- [x] Backend validation passes
- [x] No forbidden features added
