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

## Implemented (v4.1 · 8-Jun-2026 — Sparklines + Multi-Language)

### Per-tier savings sparkline (Cost dashboard)
- ✅ New `GET /api/stats/sparkline?workspace_id=&days=7` — returns chronologically-ordered, zero-filled daily series per tier with `count`/`cost_usd`/`saved_usd`. Days clamp `1 ≤ n ≤ 90`.
- ✅ Reuses the session-join workspace filter from `/api/stats`.
- ✅ Frontend `SparklineCard` (4 cards: FREE/CHEAP/SMART/CRITICAL) — recharts mini `LineChart`, gold stroke in tier color, total saved + peak-day stats, em-dash fallback when no activity. Auto-refreshes every 6s with the rest of /cost.

### Multi-language (UI + chat auto-detect)
- ✅ `react-i18next` initialised in `/app/frontend/src/i18n/index.js` with `LanguageDetector` + `localStorage` persistence (key `peter_ai.lang`).
- ✅ 5 locales shipped: **English**, **Bahasa Indonesia**, **中文**, **Español**, **العربية**.
- ✅ `document.documentElement.lang` + `dir` track active language; **Arabic → RTL mirror**.
- ✅ `<LanguageSwitcher variant="sidebar">` in sidebar bottom and `variant="settings"` on /settings as a fuller card.
- ✅ Translated surfaces: nav labels, workspace selector, /chat header + placeholder + suggestions + memory toggle + force-tier + context-menu, /cost (all labels, scope badge, sparkline header, recent table empty state), /settings (Settings/About/Language).
- ✅ Footer brand line stays in LTR English under every locale (deliberate brand lock with `dir="ltr"`).
- ✅ **Chat auto-language**: `ai_router.py` system prompt now explicitly cites EN/ID/ZH/ES/AR + "Always detect the user's language … reply fluently in that exact language". Backend regression confirmed Spanish + Mandarin replies generated successfully.

### Testing
- ✅ 9/9 backend pytest in `/app/backend/tests/test_iteration3.py` (sparkline shape, day clamping, workspace filter, chat language detection).
- ✅ Frontend verified across EN + ID + AR (Playwright DOM scan + smoke screenshots).



Five prompts in user message #347 audited and closed.

### Sidebar right-click context menu (Prompt 3)
- ✅ `SessionItem` now exposes `onContextMenu` opening a fixed-position menu with **Rename** and **Delete** items + dividers.
- ✅ Menu clamps to viewport edges; closes on Escape, click outside, or scroll.
- ✅ Rename routes to inline editing (`session-rename-input-{id}`); Delete fires `window.confirm` and the existing DELETE flow.
- ✅ Hover-action icons retained as redundant affordance.

### Footer one-liner (Prompt 4)
- ✅ Sidebar footer now reads exactly: **"PETER AI v4.0 — Intelligence, Elevated. Built in Indonesia."** with the centre clause in Champagne Gold (`[data-testid="sidebar-footer-brand"]`).
- ✅ DOM scan across all 8 routes: 0 occurrences of the word "Emergent".

### Markdown strict styling (Prompt 2)
- ✅ H1 → Cormorant Garamond serif at `#C9A84C` (Champagne Gold).
- ✅ Code blocks (inline + fenced) → solid `#0A0A0A` background with gold-tinted hairline border.
- ✅ Tables → wrapped in `.md-table` with zebra rows (`rgba(10,15,30,0.35)` / `rgba(201,168,76,0.04)`) + gold hover; thead headers in champagne gold.

### Workspace-aware Cost Dashboard (P1 add-on)
- ✅ `GET /api/stats` now accepts `?workspace_id=<id>` (also `__none__` for untagged). Messages are scoped via the parent session join. Response echoes `workspace_id`.
- ✅ Frontend `stats(workspace_id)` signature; `CostView` consumes `useWorkspace()` and re-fetches on workspace change.
- ✅ New `[data-testid="cost-workspace-scope"]` badge in the header reading "Scope: All workspaces" / "Scope: {workspace name}".

### Testing
- ✅ 14/14 backend pytest in `/app/backend/tests/test_iteration2.py`.
- ✅ Frontend UI verification 100% across footer text, Emergent-scan, context menu UX, Cost scope switch, Markdown styling.


- ✅ **Branding sweep** — DOM scan across every page (`/`, `/chat`, `/router`, `/crew`, `/memory`, `/workspaces`, `/cost`, `/settings`) reports **zero "emergent" matches**.
- ✅ Sidebar footer now reads: "v4.0 · The Luxury Strategist / Intelligence, Elevated. / Built in Indonesia · For the few."
- ✅ Settings page gained an **About PETER** card: "Personal Enhanced Thinking & Execution Robot" with the full PETER AI manifesto.
- ✅ HTML `<meta description>` + OG tags updated; FastAPI app title/description updated.
- ✅ Code-comment cleanup in `ai_router.py` and `crew_manager.py`.
- ✅ **Note on `EMERGENT_LLM_KEY` env var**: it is a protected platform contract required by the `emergentintegrations` SDK to function. It is NOT user-visible and cannot be renamed without losing managed-key billing. All user-facing strings now refer to it only as "managed Universal Key".

### Integration test (Prompt 5)
- TTFT **22 ms** (target < 500 ms)
- Stats badge, sidebar (11 sessions), Workspaces (2 cards), Memory List/Graph, Export, Memory toggle — all green.

## Implemented (v4.0 · 8-Jun-2026 — Message #347 closeout)

Five prompts in user message #347 audited and closed.

### Sidebar right-click context menu (Prompt 3)
- ✅ `SessionItem` now exposes `onContextMenu` opening a fixed-position menu with **Rename** and **Delete** items + dividers.
- ✅ Menu clamps to viewport edges; closes on Escape, click outside, or scroll.
- ✅ Rename routes to inline editing (`session-rename-input-{id}`); Delete fires `window.confirm` and the existing DELETE flow.

### Footer one-liner (Prompt 4)
- ✅ Sidebar footer reads exactly: **"PETER AI v4.0 — Intelligence, Elevated. Built in Indonesia."** with the centre clause in Champagne Gold.
- ✅ DOM scan across all 8 routes: 0 occurrences of the word "Emergent".

### Markdown strict styling (Prompt 2)
- ✅ H1 → Cormorant Garamond serif at `#C9A84C` (Champagne Gold).
- ✅ Code blocks → solid `#0A0A0A` background with gold-tinted hairline border.
- ✅ Tables → `.md-table` with zebra rows + gold hover; thead headers in champagne gold.

### Workspace-aware Cost Dashboard (P1 add-on)
- ✅ `GET /api/stats` accepts `?workspace_id=<id>` (also `__none__` for untagged). Messages scoped via parent session join.
- ✅ `[data-testid="cost-workspace-scope"]` badge in the header reading "Scope: All workspaces" / "Scope: {workspace name}".


## Implemented (v3.0 · 7-Jun-2026 — Project Workspaces & Memory Polish)

Four cohesive additions; PETER is now a **portfolio of private councils**.

### Project Workspaces (the big leap)
- ✅ MongoDB collection `workspaces` with `id / name / description / color / created_at / updated_at`.
- ✅ Every memory now carries `workspace_id` in its ChromaDB metadata (default `"global"`); every session and crew run carry `workspace_id` in Mongo.
- ✅ React `WorkspaceProvider` context exposes `{ workspaces, active, activeId, setActive, refresh }`, persisting the active workspace in `localStorage`.
- ✅ Sidebar gained a workspace selector with gold dot + counts, and a "Manage workspaces" deep-link.
- ✅ New `/workspaces` page: create/edit/delete cards, color picker (5-tone gold palette), live memory/session/crew counts per workspace, soft purge confirmation.
- ✅ Recall + extraction + memory listing + chat sessions + crew runs all transparently scope to the active workspace; "All workspaces" mode shows everything.
- ✅ Workspace delete supports `?purge=true` to cascade-delete contents, otherwise items become untagged.
- ✅ REST: `GET/POST/PATCH/DELETE /api/workspaces`.

### Per-session memory toggle
- ✅ New `memory_enabled` boolean on the session doc, plus PATCH support.
- ✅ Chat header **MEMORY ON / MEMORY OFF** button: when off, no recall + no extraction for that session.
- ✅ Hook reads `memory_enabled` when a session is reloaded so the toggle survives refresh.

### Memory cluster node-graph
- ✅ New `GET /api/memory/graph` endpoint returns memories clustered by type.
- ✅ Memory page gained a **List / Graph** view toggle. Graph view renders type hubs (PREFERENCE / PROJECT / FACT / GOAL / THEME / NOTE) as styled React Flow nodes connected by gold hairlines to up-to-6 representative leaf memories per hub, arranged on a radial layout.

### JSON export
- ✅ New `GET /api/memory/export` returns portable JSON `{ exported_at, workspace_id, count, memories }`.
- ✅ Memory page gained an **Export JSON** button that downloads `peter-memory-{workspace-slug}-{date}.json`.

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
- Real Ollama integration for FREE tier in preview.
- Auth (JWT or Emergent Google Auth).
- Token-accurate billing via provider usage payloads.
- Export crew artifact bundle as ZIP / GitHub PR.
- Denormalise `workspace_id` onto messages for $lookup-free cost queries at scale.
- WorkspaceSelector: close menu on outside click.
- React Router v7 future flags to silence migration warnings.
- Per-session system-prompt versioning so language directives propagate to existing chats without restart.
- Translate Workspaces, Memory, Router, Crew, Home views (currently mostly EN-only — surface translated).

## Implemented (v3.1 · 7-Jun-2026 — Brand Sweep + Integration Verification)
- ✅ Branding sweep — DOM scan across every page reports zero "emergent" matches.
- ✅ Sidebar footer + Settings About PETER card established.
- ✅ HTML `<meta description>` + OG tags + FastAPI app title updated.

## Next Action Items
- Iteration 3 closed (Sparkline + Multi-language). Ready for user verification on /cost (4 sparkline cards) and any locale via the bottom-left switcher (try العربية for full RTL).
- P2 backlog above; "translate remaining views" is the natural next i18n pass if user wants 100% coverage.
