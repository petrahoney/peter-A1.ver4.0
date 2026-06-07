# PETER AI v4.0 — Local self-host

Run the full original-spec stack (Next.js-equivalent frontend, FastAPI backend,
PostgreSQL, Redis, ChromaDB, Mongo, Ollama, Nginx) on your own server.

## Quick start

```bash
cd deploy
cp .env.example .env          # fill in keys
docker compose up -d
docker exec peter-ollama ollama pull llama3.3   # one-time
```

Then:

- Frontend → http://localhost:3000
- Backend  → http://localhost:8001/api/
- Nginx    → http://localhost (reverse-proxies both)
- Ollama   → http://localhost:11434

## What runs where

| Service   | Port  | Role                                  |
| --------- | ----- | ------------------------------------- |
| frontend  | 3000  | React + Tailwind + ReactFlow UI       |
| backend   | 8001  | FastAPI · AI Router · CrewAI engine   |
| ollama    | 11434 | Local llama3.3 for the FREE tier      |
| postgres  | 5432  | Relational data (users, billing)      |
| mongo     | 27017 | Chat sessions, crew runs, query logs  |
| redis     | 6379  | Cache + rate limiting                 |
| chromadb  | 8002  | Long-term memory (vector embeddings)  |
| nginx     | 80    | TLS termination + reverse proxy       |

## Notes on parity with the Emergent preview

The application code in `/app/backend` is identical between the live preview
and this self-hosted deploy. The only difference is configuration:

- In the preview, the "FREE" tier resolves to `gemini-3-flash-preview`
  (real Ollama cannot run in the Kubernetes preview).
- In the local Docker stack, swap the FREE tier `preview_model` in
  `ai_router.py` to call `ollama` at `OLLAMA_URL` for a fully local pipeline.

## Phase 2 — Cloud

Same compose file. Push images to your registry and provision with any
container orchestrator (ECS, Fly.io, Render, Railway, Kubernetes).
