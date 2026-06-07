# PETER AI v5.2 — Product Requirements Document

## Original problem statement
Build "PETER AI" — a Jarvis-class AI assistant platform with intelligent multi-model routing, CrewAI orchestration, and local-first deployment (Docker Compose). Frontend React, backend FastAPI, PostgreSQL + Redis + ChromaDB + Ollama. Phase 1 local self-host; Phase 2 cloud-ready.

## User choices (verbatim)
1. Platform/Stack: **(c) Parallel-track** — live MVP on Emergent stack + docker-compose artifacts for self-host.
2. AI Models: **(c) Emergent Universal Key + Ollama-style FREE tier simulated locally.**
3. CrewAI Workflow: **(a) Full 7-agent app-builder crew**.
4. Auth: **(c) Skip auth in MVP.**
5. UI Direction: PETER AI brand — Deep Black + Champagne Gold, glass-morphism with gold accents, Cormorant Garamond + Montserrat, luxury strategist's command center feel.
6. Languages: EN, ID, ZH, ES, AR (with full RTL for AR).

## Architecture
- **Frontend** `/app/frontend` — React + Tailwind + React Router + React Flow + Recharts + Framer Motion + @phosphor-icons/react + react-i18next.
- **Backend** `/app/backend` — FastAPI + Motor (MongoDB) + emergentintegrations + ChromaDB.
  - `ai_router.py` — pattern + heuristic classifier → 4 tiers (FREE/CHEAP/SMART/CRITICAL).
  - `crew_manager.py` — sequential 7-agent orchestration.
  - `script_studio.py` — Prompts 14/17/18 (script gen, eval, genius-prompt loop + streaming generator).
  - `i18n.py` — Backend localisation (Accept-Language → agent roles/goals).
  - `memory.py` — Strategist Memory (ChromaDB).
  - `server.py` — REST API surface + **job-queue + reconnecting-SSE pattern** for long LLM jobs.

## Models (preview tier mapping)
| Tier      | Self-host                  | Preview substitute            | Provider   | $/1K   |
| --------- | -------------------------- | ----------------------------- | ---------- | ------ |
| FREE      | Ollama llama3.3            | gemini-3-flash-preview        | gemini     | 0.0000 |
| CHEAP     | Claude Haiku 4.5           | claude-haiku-4-5-20251001     | anthropic  | 0.0010 |
| SMART     | Claude Sonnet 4.5          | claude-sonnet-4-5-20250929    | anthropic  | 0.0150 |
| CRITICAL  | Claude Opus 4.5            | claude-opus-4-5-20251101      | anthropic  | 0.1500 |

## Implemented

### v5.2 · Feb 2026 — Job-Queue Streaming + Library Deletion UX (THIS SESSION)
- ✅ **Job-queue + reconnecting-SSE for the Genius Loop** — root-caused a HARD ~60s max-duration cap on streaming HTTP responses imposed by the cluster ingress. Heartbeats alone could not solve it.
  - `POST /api/genius-prompt/jobs` → spawns background `asyncio.Task`, returns `{job_id}` in <1s.
  - `GET /api/genius-prompt/jobs/{id}/events?cursor=N` → short-lived SSE that flushes buffered events from cursor N, heartbeats every 10s, **proactively closes with `event: pause {cursor:K}` at 50s** before the proxy cuts.
  - Client (`geniusPromptStream` in `lib/api.js`) drives a reconnect loop, re-opening with the new cursor until `event: end`.
  - `GET /api/genius-prompt/jobs/{id}` → snapshot for debugging / polling fallback.
  - In-memory `_STUDIO_JOBS` registry with 30-min TTL (single-replica preview env; swap for Redis in production).
  - Legacy `POST /api/genius-prompt/stream` kept for backward compat but deprecated.
- ✅ **Studio Live Stream UX** — new `studio-stream-progress` card renders iteration-by-iteration timeline with status + best-marker + error banner. Verified iter1 happy-path renders within ~55s (single connection), iter2+ exercises the reconnect loop.
- ✅ **Script Library Deletion UX** — `DELETE /api/genius-prompts/{id}`, `DELETE /api/scripts/{id}`, plus `GET /api/scripts` + `GET /api/scripts/{id}`. Frontend: Trash-icon on hover for both saved-prompts and saved-scripts cards, `window.confirm` gating, row auto-removal. Clicking a saved-script row loads it back into the Studio editor.
- ✅ **`GET /api/genius-prompts` list now returns `language` field** — UI shows language badge alongside platform/style.
- ✅ Multi-locale strings added in all 5 locales (`geniusLiveStream`, `streamStarting`, `streamIter`, `streamWaiting`, `streamError`, `savedScripts`, `deletePrompt`, `deleteScript`, `confirmDelete*`).
- ✅ Backend pytest 14/14 PASS · Frontend Live-Stream + delete UX 100% PASS (`iteration_7.json`).

### v5.1 · Feb 2026 — Studio→Crew Handoff + Target-Language Genius Loop
- ✅ Genius-prompt `target_language` propagation (ID/EN heuristic verified).
- ✅ "Open in Crew" handoff via `localStorage.peter_ai.crew_handoff` + lazy-`useState` consumer in CrewView.
- ✅ ESLint blocker resolved.

### v5.0 — Script Studio (Prompts 14/17/18) · v4.x — i18n, Cost Dashboard, Memory
- See CHANGELOG below.

## Roadmap

### P1
1. **Prompt 19: Revenue Prediction & Strategy** — predictive LLM analysis vs historical video metrics (deferred until TikTok/IG/YouTube publishing integrations land).
2. **Force-reconnect E2E test** — add an iterations=2 pytest fixture that deterministically exercises the SSE `event: pause` reconnect path (currently only the happy-path single-connection is auto-tested).

### P2
3. **React Hook Dependency audit** — `ChatView`, `WorkspacesView`, `MemoryView`, `CrewView`, `CostView` exhaustive-deps cleanup.
4. **`ChatView.js` refactor** — break 500+ line component into smaller pieces.
5. **A11y warnings cleanup** — `Markdown.js` jsx-a11y/heading-has-content + anchor-has-content.
6. **React Router v7 future flags**.
7. **Per-session system-prompt versioning**.
8. **WorkspaceSelector outside-click close**.
9. **"Clear override" UX on Chat session badges**.
10. **Redis-backed `_STUDIO_JOBS`** — for multi-replica horizontal scale.

## DB schema
- `scripts`: `{_id, topic, platform, style, language, content, hook, cta, tags, duration_sec, genius_prompt_id, created_at}`
- `script_evaluations`: `{_id, script, platform, scores{}, overall_score, strengths, weaknesses, variants[], recommendation{}, created_at}`
- `genius_prompts`: `{_id, topic, platform, style, language, target_score, best_iteration, expected_quality_score, genius_prompt, rationale, focus_dimensions, evolution[], confidence, created_at}`
- `sessions`, `messages`, `crew_runs`, `workspaces`, `memories`.

## 3rd-party integrations
- OpenAI / Anthropic / Gemini — Emergent Universal LLM Key (via `emergentintegrations.llm.chat.LlmChat`).
- ChromaDB — local vector store.
- No external auth (MVP).

## Project health
**Green.** Backend + frontend compile clean. Lint passes (0 blocking). Latest test iteration (`iteration_7.json`) reports 100% pass on both stacks. Long-LLM-job timeout regression FULLY RESOLVED via job-queue + reconnect pattern. The genius-prompt loop is now production-stable for arbitrary iteration counts.
