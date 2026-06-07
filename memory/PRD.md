# PETER AI v5.1 — Product Requirements Document

## Original problem statement
Build "PETER AI" — a Jarvis-class AI assistant platform with intelligent multi-model routing, CrewAI orchestration, and local-first deployment (Docker Compose). Frontend Next.js / React, backend FastAPI, PostgreSQL + Redis + ChromaDB + Ollama. Phase 1 local self-host; Phase 2 cloud-ready.

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
  - `script_studio.py` — Prompts 14/17/18 (script gen, eval, genius-prompt loop).
  - `i18n.py` — Backend localisation (Accept-Language → agent roles/goals).
  - `memory.py` — Strategist Memory (ChromaDB).
  - `server.py` — REST API surface.

## Models (preview tier mapping)
| Tier      | Self-host                  | Preview substitute            | Provider   | $/1K   |
| --------- | -------------------------- | ----------------------------- | ---------- | ------ |
| FREE      | Ollama llama3.3            | gemini-3-flash-preview        | gemini     | 0.0000 |
| CHEAP     | Claude Haiku 4.5           | claude-haiku-4-5-20251001     | anthropic  | 0.0010 |
| SMART     | Claude Sonnet 4.5          | claude-sonnet-4-5-20250929    | anthropic  | 0.0150 |
| CRITICAL  | Claude Opus 4.5            | claude-opus-4-5-20251101      | anthropic  | 0.1500 |

## Implemented

### v5.1 · Feb 2026 — Studio→Crew Handoff + Target-Language Genius Loop (THIS SESSION)
- ✅ **Genius-Prompt target_language** — `/api/genius-prompt/generate` now accepts `target_language` and propagates through the meta-prompt engineer + sample-script gen + evaluation so the saved prompt and evolution scripts are written in the user's chosen language (verified for ID + EN heuristic).
- ✅ **"Open in Crew" handoff** — Studio's evaluation card has `data-testid='open-in-crew-original-btn'` (gold treatment ≥8.0, secondary <8.0) + per-variant `open-in-crew-variant-{A,B,C}-btn` (rendered when projected ≥8). Click writes `localStorage.peter_ai.crew_handoff = {brief, source, topic, platform, style, at}` then navigates to `/crew`.
- ✅ **CrewView consumer** — Lazy `useState` initializer at `CrewView.js:77-89` reads + removes the localStorage key on first paint (no `set-state-in-effect`), pre-filling the requirements textarea with the auto-composed production brief.
- ✅ **`GET /api/genius-prompts/{id}`** now returns `language` field.
- ✅ ESLint blocker resolved (lazy initializer pattern). Frontend compiles green.
- ✅ Pytest backend suite: `tests/test_studio_language.py` (4/4 pass).
- ✅ End-to-end frontend handoff test verified (iteration_4.json — 100% pass).

### v5.0 · 8-Jun-2026 — Script Studio (Prompts 14 + 17 + 18)
- ✅ `script_studio.py` module + `/api/script/generate`, `/api/script/evaluate`, `/api/genius-prompt/generate`, `GET /api/genius-prompts`, `GET /api/genius-prompts/{id}`.
- ✅ `StudioView.js` — Topic/Platform/Style/Language inputs · Generate/Evaluate/Genius-Loop · 5-dimension score bars · 3 optimised variants · genius prompt panel with evolution + Apply.
- ✅ Localised in 5 locales.

### v4.x — i18n, Cost Dashboard, Memory
- ✅ Multi-language UI (EN, ID, ZH, ES, AR) via react-i18next + RTL.
- ✅ Backend i18n (`Accept-Language` → translated agent role/goal for `/api/agents`).
- ✅ "Did you mean" drift heuristic + floating session translator.
- ✅ Workspace-aware cost dashboard with per-tier sparklines (`/api/stats/sparkline`).
- ✅ Strategist Memory (ChromaDB) — `/memory` view.

## Roadmap

### P0 — Next (recommended sequence)
1. **SSE-stream Genius Loop** — refactor `/api/genius-prompt/generate` to stream iteration-by-iteration so iterations >1 escape the ~100s proxy timeout. Frontend StreamingFetch consumer with live progress display.

### P1
2. **Prompt 19: Revenue Prediction & Strategy** — predictive LLM analysis against historical video metrics (deferred until TikTok/IG/YouTube publishing integration lands).
3. **Script Library Deletion UX** — delete buttons on saved scripts + genius prompts.

### P2
4. **React Hook Dependency audit** — `ChatView`, `WorkspacesView`, `MemoryView`, `CrewView`, `CostView` exhaustive-deps cleanup.
5. **ChatView.js refactor** — break 500+ line component into smaller pieces.
6. **A11y warnings cleanup** — `Markdown.js` jsx-a11y/heading-has-content + anchor-has-content.
7. **React Router v7 future flags**.
8. **Per-session system-prompt versioning**.
9. **WorkspaceSelector outside-click close**.
10. **"Clear override" UX on Chat session badges**.

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
**Green.** Backend + frontend compile clean. Lint passes. Latest test iteration (`iteration_4.json`) 100% pass on both stacks. Known cost concern: genius-prompt loop iter=1 still takes 50-110s in practice and occasionally hits the 100s proxy cap → next P0 task is SSE streaming refactor.
