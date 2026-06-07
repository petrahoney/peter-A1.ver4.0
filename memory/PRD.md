# PETER AI v4.0 — Product Requirements Document

## Original problem statement
Build "PETER AI" — a Jarvis-class AI assistant platform with intelligent multi-model routing, CrewAI orchestration, and local-first deployment (Docker Compose). Frontend Next.js, backend FastAPI, PostgreSQL + Redis + ChromaDB + Ollama. Phase 1 local self-host; Phase 2 cloud-ready.

## User choices (verbatim, 7-Jun-2026)
1. Platform/Stack: **(c) Parallel-track strategy** — live MVP on Emergent stack PLUS docker-compose artifacts for self-host.
2. AI Models: **(c) Emergent Universal Key + Ollama-style FREE tier simulated locally for demo.**
3. CrewAI Workflow: **(a) Full 7-agent app-builder crew** (Architect, Frontend, Backend, DBA, DevOps, QA, Documenter).
4. Auth: **(c) Skip auth in MVP.**
5. UI Direction: PETER AI brand — Deep Black + Champagne Gold, subtle glass-morphism with gold accents, Cormorant Garamond + Montserrat, router/agents as luxury flow diagrams. "Luxury strategist's command center" feel.

## Architecture
- **Frontend** `/app/frontend` — React + Tailwind + React Router + React Flow + Recharts + Framer Motion + @phosphor-icons/react.
- **Backend** `/app/backend` — FastAPI + Motor (MongoDB) + emergentintegrations.
  - `ai_router.py` — pattern + heuristic classifier → 4 tiers (FREE/CHEAP/SMART/CRITICAL).
  - `crew_manager.py` — sequential 7-agent orchestration built directly on emergentintegrations.
  - `server.py` — REST API surface.
- **DB** MongoDB collections: `sessions`, `messages`, `crew_runs`.
- **Deploy** `/app/deploy` — full docker-compose stack (Next.js-parallel + Postgres + Redis + ChromaDB + Mongo + Ollama + Nginx) for self-host parity.

## Models (preview tier mapping)
| Tier      | Self-host                  | Preview substitute            | Provider   | $/1K   |
| --------- | -------------------------- | ----------------------------- | ---------- | ------ |
| FREE      | Ollama llama3.3            | gemini-3-flash-preview        | gemini     | 0.0000 |
| CHEAP     | Claude Haiku 4.5           | claude-haiku-4-5-20251001     | anthropic  | 0.0010 |
| SMART     | Claude Sonnet 4.5          | claude-sonnet-4-5-20250929    | anthropic  | 0.0150 |
| CRITICAL  | Claude Opus 4.5            | claude-opus-4-5-20251101      | anthropic  | 0.1500 |

## Implemented (v2.0 · 7-Jun-2026 — Strategist Memory)
- ✅ **ChromaDB-backed long-term recall** — new `/app/backend/memory.py` running an in-process `chromadb.PersistentClient` (cosine space, all-MiniLM-L6-v2 default embeddings) at `/app/backend/chroma_data`.
- ✅ **Automatic extraction** — every chat turn fires a fire-and-forget Claude Haiku call that mines durable preferences / projects / facts / goals / themes / notes from the exchange and persists them. Extraction failures degrade gracefully (no chat impact).
- ✅ **Automatic recall + injection** — before each turn the router does semantic top-5 recall (distance ≤ 0.85), builds a "What PETER remembers about you" context block and prepends it to the user message so reasoning compounds.
- ✅ **Frontend `/memory` view** — luxury card grid grouped by type with filter chips, semantic search ("Recall"), inline "Teach PETER" manual entry with type selector, per-card delete, and a global "Forget all".
- ✅ **In-chat indicator** — gold "N memories applied" badge in the assistant bubble; clicking opens a popover listing every recalled memory with its type chip.
- ✅ **REST API** — `GET /api/memory`, `GET /api/memory/recall?q=…`, `POST /api/memory`, `DELETE /api/memory/{id}`, `DELETE /api/memory`.

## Implemented (v1.4 · 7-Jun-2026)
- ✅ **Blinking gold ▌ cursor** at the tail of any streaming assistant bubble (CSS `cursor-blink` keyframe in `index.css`).
- ✅ **Stats badge reformatted** to a single compact line: `Tier: X | Tokens: Y | Cost: $Z | Time: Ns | Saved: $S` on a soft-gold `rgba(218,165,32,0.1)` background with a thin champagne border. Backend `/api/chat/stream` `done` event now emits `tokens_estimated`.
- ✅ **TTFT < 500ms** — measured ~33ms in preview to first token.
- ✅ **Non-blocking send** — sending while streaming queues the message (shown via "N MESSAGE(S) QUEUED" indicator) and auto-fires when the current turn completes. Stop and Queue buttons coexist while streaming.
- ✅ **Streaming hook extracted** to `/app/frontend/src/hooks/useStreamingChat.js` (manages AbortController, TTFT, elapsed-ms).
- ✅ **Text colour set to #E5E5E5** on chat bubbles and input.
- ✅ **Emergent branding removed** from the app (verified via DOM scan: 0 references).

## Implemented (v1.3 · 7-Jun-2026)
- ✅ **Sidebar tier dots** — every session now shows a small coloured dot before its title (FREE=silver, CHEAP=gold-light, SMART=champagne, PREMIUM=gold-dark) with a soft glow. Auto-routed sessions show a faint neutral dot. Tooltips display "Locked tier: SMART" / "Auto-routing".
- ✅ **Last-tier default for new sessions** — the dropdown remembers your last choice in `localStorage` (key `peter_ai.last_force_tier`) and reuses it on app load and every "+ New" click. Switching dropdown updates both the in-session record and the user-level default in one motion.

## Implemented (v1.2 · 7-Jun-2026)
- ✅ **Stop streaming** — Send button morphs into a gold-outlined Stop button while in-flight; clicks abort the fetch via the existing `AbortController`. Partial content is preserved on the bubble; UI returns to Send instantly.
- ✅ **Per-session `force_tier` persistence** — stored on each session document in MongoDB. Restored when a session is reloaded (page refresh or sidebar select). The dropdown PATCHes `/api/sessions/{id}` immediately when changed inside a session, and `/api/chat` + `/api/chat/stream` persist the initial tier when the session is first created.

## Implemented (v1.1 · 7-Jun-2026)
- ✅ **Token-by-token SSE streaming** in chat (`/api/chat/stream` consumed via fetch+ReadableStream; live tier badge appears at first `route` event, deltas append, `done` finalises stats).
- ✅ **Markdown rendering** for chat assistant replies and crew agent output (`react-markdown` + `remark-gfm`, fully styled with luxury theme — headings, code blocks, tables, blockquotes, lists).
- ✅ **Session sidebar** with new / select / rename-in-place / delete (with confirm) in Chat view. Backend gained `PATCH /api/sessions/{id}` and `DELETE /api/sessions/{id}`, and the router drops in-memory LlmChat instances on session deletion.

## Implemented (v1.0 · 7-Jun-2026)
- ✅ Hero command center with live aggregated stats and tier showcase.
- ✅ Multi-turn chat with model badge (tier, model, cost, latency, saved).
- ✅ AI Router visualization (React Flow) with classifier → 4 tiers + active routing animation.
- ✅ Pattern + heuristic classifier (no LLM call for routing).
- ✅ 7-agent CrewAI orchestration with live status polling and per-agent output panel.
- ✅ Cost & Usage dashboard: total queries, total cost, savings ledger, donut, bar chart, recent table.
- ✅ Settings view with tier catalogue + self-host quick-start.
- ✅ Force-tier override in chat.
- ✅ Self-host docker-compose stack at `/app/deploy/` (Postgres + Redis + ChromaDB + Mongo + Ollama + Nginx).

## Endpoints
- `GET  /api/`                       — meta
- `GET  /api/tiers`                  — tier catalogue
- `GET  /api/agents`                 — crew blueprint
- `POST /api/router/classify`        — instant classification
- `POST /api/chat`                   — route & run a chat turn
- `POST /api/chat/stream`            — SSE streaming variant
- `GET  /api/sessions`               — list chat sessions
- `GET  /api/sessions/{id}/messages` — chat history
- `PATCH /api/sessions/{id}`         — rename session
- `DELETE /api/sessions/{id}`        — delete session (+ messages)
- `POST /api/crew/build`             — start 7-agent build
- `GET  /api/crew/runs/{id}`         — poll status
- `GET  /api/crew/runs`              — list past runs
- `GET  /api/stats`                  — dashboard data

## Backlog (P1)
- ~~Streaming chat UI (token-by-token)~~ — done in v1.1.
- ~~Markdown rendering in agent output and chat~~ — done in v1.1.
- ~~Session sidebar with switch / rename / delete in Chat view~~ — done in v1.1.
- ~~"Stop streaming" button to abort mid-flight~~ — done in v1.2.
- ~~Persist `force_tier` per session~~ — done in v1.2.

## Backlog (P2)
- Real Ollama integration for FREE tier in preview (would require Ollama deploy).
- Auth (JWT or Emergent Google Auth).
- Token-accurate billing via provider usage payloads instead of estimate.
- Export crew artifact bundle as a ZIP / GitHub PR.

## Next Action Items
- Validate all flows via testing subagent.
- If green, deliver to user; gather feedback on streaming / markdown polish.
