"""
PETER AI v4.0 — Enterprise Multi-Model AI Platform
The Luxury Strategist's Command Center.

This is the FastAPI backend that powers the AI Router, multi-model chat,
and a lightweight 7-agent CrewAI-style orchestration. All LLM calls go
through the Emergent Universal Key (emergentintegrations.llm.chat).

Note: In the live preview the "FREE" Ollama tier is simulated using
gemini-3-flash-preview (cheapest available). The docker-compose deploy
folder wires the real Ollama llama3.3 endpoint for local self-hosting.
"""

from __future__ import annotations

import asyncio
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncIterator, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

from ai_router import AIRouter, TaskComplexity, TIER_CATALOG
from crew_manager import PeterCrewManager, AGENT_BLUEPRINT

load_dotenv()

# ───────────────────────── Bootstrap ─────────────────────────

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]

mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

router_engine = AIRouter(api_key=EMERGENT_LLM_KEY, db=db)
crew_engine = PeterCrewManager(api_key=EMERGENT_LLM_KEY, db=db, router=router_engine)

app = FastAPI(title="PETER AI v4.0", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ───────────────────────── Schemas ─────────────────────────


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    force_tier: Optional[str] = None  # "free" | "cheap" | "smart" | "critical"


class ClassifyRequest(BaseModel):
    query: str


class CrewBuildRequest(BaseModel):
    requirements: str


class FeedbackRequest(BaseModel):
    query_id: str
    rating: int  # 1..5


# ───────────────────────── Health & Meta ─────────────────────────


@app.get("/api/")
async def root() -> dict[str, Any]:
    return {
        "name": "PETER AI",
        "version": "4.0.0",
        "tagline": "Intelligence, Elevated.",
        "archetype": "The Luxury Strategist",
        "status": "online",
    }


@app.get("/api/tiers")
async def list_tiers() -> dict[str, Any]:
    """Return the model tier catalog for the frontend UI."""
    return {"tiers": TIER_CATALOG}


@app.get("/api/agents")
async def list_agents() -> dict[str, Any]:
    """Return the 7-agent blueprint for the Crew builder."""
    return {"agents": AGENT_BLUEPRINT}


# ───────────────────────── Router endpoints ─────────────────────────


@app.post("/api/router/classify")
async def classify(req: ClassifyRequest) -> dict[str, Any]:
    """Classify a query without invoking any LLM — instant pattern match."""
    complexity, matched_pattern = router_engine.classify_query_verbose(req.query)
    return {
        "tier": complexity.value,
        "tier_meta": TIER_CATALOG[complexity.value],
        "matched_pattern": matched_pattern,
        "query": req.query,
    }


@app.post("/api/chat")
async def chat(req: ChatRequest) -> dict[str, Any]:
    """Route + run a single chat turn. Persists messages in MongoDB."""
    session_id = req.session_id or str(uuid.uuid4())

    # Ensure session exists
    existing = await db.sessions.find_one({"_id": session_id})
    if not existing:
        await db.sessions.insert_one(
            {
                "_id": session_id,
                "created_at": now_iso(),
                "updated_at": now_iso(),
                "title": req.message[:60],
                "force_tier": (req.force_tier or "").lower() or None,
            }
        )
    elif req.force_tier is not None:
        # Persist any explicit tier choice on existing session too.
        await db.sessions.update_one(
            {"_id": session_id},
            {"$set": {"force_tier": req.force_tier.lower() or None}},
        )

    # Save user message
    user_msg_id = str(uuid.uuid4())
    await db.messages.insert_one(
        {
            "_id": user_msg_id,
            "session_id": session_id,
            "role": "user",
            "content": req.message,
            "created_at": now_iso(),
        }
    )

    # Route via the AI Router
    forced = None
    if req.force_tier:
        try:
            forced = TaskComplexity(req.force_tier.lower())
        except ValueError:
            raise HTTPException(400, f"unknown tier: {req.force_tier}")

    result = await router_engine.route_and_run(
        query=req.message,
        session_id=session_id,
        forced=forced,
    )

    # Save assistant message
    ai_msg_id = str(uuid.uuid4())
    await db.messages.insert_one(
        {
            "_id": ai_msg_id,
            "session_id": session_id,
            "role": "assistant",
            "content": result["response"],
            "tier": result["tier"],
            "model": result["model"],
            "cost_usd": result["cost_usd"],
            "latency_ms": result["latency_ms"],
            "saved_usd": result["saved_usd"],
            "created_at": now_iso(),
        }
    )

    await db.sessions.update_one(
        {"_id": session_id}, {"$set": {"updated_at": now_iso()}}
    )

    return {
        "session_id": session_id,
        "message_id": ai_msg_id,
        **result,
    }


class SessionRenameRequest(BaseModel):
    title: Optional[str] = None
    force_tier: Optional[str] = None  # "free"|"cheap"|"smart"|"critical"|"" to clear


@app.get("/api/sessions")
async def list_sessions() -> dict[str, Any]:
    cursor = db.sessions.find({}, sort=[("updated_at", -1)]).limit(50)
    sessions = []
    async for s in cursor:
        sessions.append(
            {
                "id": s["_id"],
                "title": s.get("title", "Untitled"),
                "force_tier": s.get("force_tier"),
                "created_at": s.get("created_at"),
                "updated_at": s.get("updated_at"),
            }
        )
    return {"sessions": sessions}


@app.patch("/api/sessions/{session_id}")
async def update_session(session_id: str, req: SessionRenameRequest) -> dict[str, Any]:
    updates: dict[str, Any] = {}
    if req.title is not None:
        title = req.title.strip()[:120]
        if not title:
            raise HTTPException(400, "title cannot be empty")
        updates["title"] = title
    if req.force_tier is not None:
        ft = req.force_tier.strip().lower()
        if ft == "":
            updates["force_tier"] = None
        else:
            try:
                TaskComplexity(ft)
            except ValueError:
                raise HTTPException(400, f"unknown tier: {req.force_tier}")
            updates["force_tier"] = ft
    if not updates:
        raise HTTPException(400, "no updates provided")
    updates["updated_at"] = now_iso()
    result = await db.sessions.update_one({"_id": session_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(404, "session not found")
    s = await db.sessions.find_one({"_id": session_id})
    return {
        "id": session_id,
        "title": s.get("title"),
        "force_tier": s.get("force_tier"),
    }


@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str) -> dict[str, Any]:
    s = await db.sessions.find_one({"_id": session_id})
    if not s:
        raise HTTPException(404, "session not found")
    await db.messages.delete_many({"session_id": session_id})
    await db.sessions.delete_one({"_id": session_id})
    # Also drop in-memory LlmChat instances for this session so a new
    # session_id starts fresh.
    router_engine.drop_session(session_id)
    return {"id": session_id, "deleted": True}



@app.get("/api/sessions/{session_id}/messages")
async def get_messages(session_id: str) -> dict[str, Any]:
    session = await db.sessions.find_one({"_id": session_id})
    cursor = db.messages.find({"session_id": session_id}, sort=[("created_at", 1)])
    messages = []
    async for m in cursor:
        messages.append(
            {
                "id": m["_id"],
                "role": m["role"],
                "content": m["content"],
                "tier": m.get("tier"),
                "model": m.get("model"),
                "cost_usd": m.get("cost_usd"),
                "latency_ms": m.get("latency_ms"),
                "saved_usd": m.get("saved_usd"),
                "created_at": m.get("created_at"),
            }
        )
    return {
        "session_id": session_id,
        "title": session.get("title") if session else None,
        "force_tier": session.get("force_tier") if session else None,
        "messages": messages,
    }


# ───────────────────────── Crew (multi-agent) ─────────────────────────


@app.post("/api/crew/build")
async def crew_build(req: CrewBuildRequest) -> dict[str, Any]:
    """Kick off a 7-agent app-builder workflow (runs in background)."""
    run_id = str(uuid.uuid4())
    await db.crew_runs.insert_one(
        {
            "_id": run_id,
            "requirements": req.requirements,
            "status": "running",
            "created_at": now_iso(),
            "agents": [
                {**a, "status": "pending", "output": None, "started_at": None, "finished_at": None}
                for a in AGENT_BLUEPRINT
            ],
            "total_cost_usd": 0.0,
            "total_saved_usd": 0.0,
        }
    )
    # Fire and forget; status is polled
    asyncio.create_task(crew_engine.run_crew(run_id, req.requirements))
    return {"run_id": run_id, "status": "running"}


@app.get("/api/crew/runs/{run_id}")
async def crew_status(run_id: str) -> dict[str, Any]:
    run = await db.crew_runs.find_one({"_id": run_id})
    if not run:
        raise HTTPException(404, "run not found")
    return {
        "id": run["_id"],
        "requirements": run["requirements"],
        "status": run["status"],
        "agents": run["agents"],
        "total_cost_usd": run.get("total_cost_usd", 0.0),
        "total_saved_usd": run.get("total_saved_usd", 0.0),
        "created_at": run.get("created_at"),
        "finished_at": run.get("finished_at"),
    }


@app.get("/api/crew/runs")
async def crew_list() -> dict[str, Any]:
    cursor = db.crew_runs.find({}, sort=[("created_at", -1)]).limit(20)
    runs = []
    async for r in cursor:
        runs.append(
            {
                "id": r["_id"],
                "requirements": r["requirements"][:120],
                "status": r["status"],
                "created_at": r.get("created_at"),
            }
        )
    return {"runs": runs}


# ───────────────────────── Cost / Stats dashboard ─────────────────────────


@app.get("/api/stats")
async def stats() -> dict[str, Any]:
    pipeline_tier = [
        {"$match": {"role": "assistant"}},
        {
            "$group": {
                "_id": "$tier",
                "count": {"$sum": 1},
                "cost": {"$sum": "$cost_usd"},
                "saved": {"$sum": "$saved_usd"},
                "avg_latency_ms": {"$avg": "$latency_ms"},
            }
        },
    ]
    tier_breakdown: dict[str, Any] = {}
    async for row in db.messages.aggregate(pipeline_tier):
        tier = row["_id"] or "unknown"
        tier_breakdown[tier] = {
            "count": row["count"],
            "cost_usd": round(row["cost"] or 0.0, 6),
            "saved_usd": round(row["saved"] or 0.0, 6),
            "avg_latency_ms": round(row["avg_latency_ms"] or 0.0, 1),
        }

    totals = {
        "total_queries": 0,
        "total_cost_usd": 0.0,
        "total_saved_usd": 0.0,
        "avg_latency_ms": 0.0,
    }
    latencies: list[float] = []
    for v in tier_breakdown.values():
        totals["total_queries"] += v["count"]
        totals["total_cost_usd"] += v["cost_usd"]
        totals["total_saved_usd"] += v["saved_usd"]
        if v["avg_latency_ms"]:
            latencies.append(v["avg_latency_ms"])
    if latencies:
        totals["avg_latency_ms"] = round(sum(latencies) / len(latencies), 1)
    totals["total_cost_usd"] = round(totals["total_cost_usd"], 6)
    totals["total_saved_usd"] = round(totals["total_saved_usd"], 6)

    # Recent queries (last 15)
    recent_cursor = db.messages.find(
        {"role": "assistant"}, sort=[("created_at", -1)]
    ).limit(15)
    recent: list[dict[str, Any]] = []
    async for m in recent_cursor:
        recent.append(
            {
                "id": m["_id"],
                "tier": m.get("tier"),
                "model": m.get("model"),
                "cost_usd": m.get("cost_usd"),
                "saved_usd": m.get("saved_usd"),
                "latency_ms": m.get("latency_ms"),
                "preview": (m.get("content") or "")[:140],
                "created_at": m.get("created_at"),
            }
        )

    return {
        "totals": totals,
        "tier_breakdown": tier_breakdown,
        "recent": recent,
        "tier_catalog": TIER_CATALOG,
    }


# ───────────────────────── Streaming chat (SSE) ─────────────────────────


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    """SSE streaming chat. Emits routing metadata then token deltas."""
    session_id = req.session_id or str(uuid.uuid4())

    existing = await db.sessions.find_one({"_id": session_id})
    if not existing:
        await db.sessions.insert_one(
            {
                "_id": session_id,
                "created_at": now_iso(),
                "updated_at": now_iso(),
                "title": req.message[:60],
                "force_tier": (req.force_tier or "").lower() or None,
            }
        )
    elif req.force_tier is not None:
        await db.sessions.update_one(
            {"_id": session_id},
            {"$set": {"force_tier": req.force_tier.lower() or None}},
        )

    await db.messages.insert_one(
        {
            "_id": str(uuid.uuid4()),
            "session_id": session_id,
            "role": "user",
            "content": req.message,
            "created_at": now_iso(),
        }
    )

    forced = TaskComplexity(req.force_tier.lower()) if req.force_tier else None

    async def event_generator() -> AsyncIterator[str]:
        async for chunk in router_engine.route_and_stream(
            req.message, session_id, forced=forced
        ):
            yield chunk

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
