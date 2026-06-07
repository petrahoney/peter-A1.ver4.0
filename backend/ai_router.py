"""AI Router — cost-optimised multi-model selection for PETER AI v4.0.

Classifies a query into one of four tiers and routes it to the cheapest
capable model, all through the managed Universal Key.
"""

from __future__ import annotations

import asyncio
import json
import time
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, AsyncIterator, Optional

from emergentintegrations.llm.chat import (
    LlmChat,
    StreamDone,
    TextDelta,
    UserMessage,
)


class TaskComplexity(str, Enum):
    SIMPLE = "free"
    MEDIUM = "cheap"
    COMPLEX = "smart"
    CRITICAL = "critical"


# Public tier catalog the frontend renders as elegant cards.
# `cost_per_1k_usd` is an estimate used to compute savings vs PREMIUM.
TIER_CATALOG: dict[str, dict[str, Any]] = {
    "free": {
        "id": "free",
        "label": "FREE",
        "name": "Local / Ollama llama3.3",
        "preview_model": "gemini-3-flash-preview",
        "provider": "gemini",
        "cost_per_1k_usd": 0.0,
        "typical_latency_ms": 250,
        "purpose": "Simple factual queries, conversions, definitions",
        "color": "#C0C0C0",
    },
    "cheap": {
        "id": "cheap",
        "label": "CHEAP",
        "name": "Claude Haiku 4.5",
        "preview_model": "claude-haiku-4-5-20251001",
        "provider": "anthropic",
        "cost_per_1k_usd": 0.001,
        "typical_latency_ms": 550,
        "purpose": "Everyday conversation, drafts, summaries",
        "color": "#E8D5A3",
    },
    "smart": {
        "id": "smart",
        "label": "SMART",
        "name": "Claude Sonnet 4.5",
        "preview_model": "claude-sonnet-4-5-20250929",
        "provider": "anthropic",
        "cost_per_1k_usd": 0.015,
        "typical_latency_ms": 1100,
        "purpose": "Analysis, strategy, architecture, optimisation",
        "color": "#C9A84C",
    },
    "critical": {
        "id": "critical",
        "label": "PREMIUM",
        "name": "Claude Opus 4.5",
        "preview_model": "claude-opus-4-5-20251101",
        "provider": "anthropic",
        "cost_per_1k_usd": 0.15,
        "typical_latency_ms": 1900,
        "purpose": "Mission-critical: medical, legal, financial, production",
        "color": "#8B6914",
    },
}


SIMPLE_PATTERNS = [
    "what time", "what date", "calculate", "weather",
    "translate", "spell check", "define", "definition",
    "convert", "remind me", "schedule", "how many",
    "currency", "timezone", "abbreviation",
]

COMPLEX_PATTERNS = [
    "analyze", "analysis", "strategy", "design", "architect",
    "architecture", "complex algorithm", "optimize", "optimise",
    "research deeply", "compare in depth", "refactor", "trade-off",
    "scaling", "system design", "roadmap",
]

CRITICAL_PATTERNS = [
    "medical advice", "diagnose", "legal document", "legal advice",
    "financial decision", "investment decision",
    "mission critical", "production deployment", "regulatory",
    "compliance", "life threatening", "safety critical",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def estimate_tokens(text: str) -> int:
    """Cheap ~4-chars-per-token estimate, good enough for cost tracking."""
    return max(1, len(text) // 4)


class AIRouter:
    def __init__(self, api_key: str, db, memory=None) -> None:
        self.api_key = api_key
        self.db = db
        self.memory = memory  # StrategistMemory, may be None
        # Keep one LlmChat per session+tier so multi-turn history is preserved.
        self._sessions: dict[tuple[str, str], LlmChat] = {}

    # ─────────────── classification ───────────────

    def classify_query(self, query: str) -> TaskComplexity:
        return self.classify_query_verbose(query)[0]

    def drop_session(self, session_id: str) -> None:
        """Remove cached LlmChat instances for a deleted session."""
        for key in list(self._sessions.keys()):
            if key[0] == session_id:
                self._sessions.pop(key, None)

    def classify_query_verbose(
        self, query: str
    ) -> tuple[TaskComplexity, Optional[str]]:
        q = query.lower()
        for p in CRITICAL_PATTERNS:
            if p in q:
                return TaskComplexity.CRITICAL, p
        for p in COMPLEX_PATTERNS:
            if p in q:
                return TaskComplexity.COMPLEX, p
        for p in SIMPLE_PATTERNS:
            if p in q:
                return TaskComplexity.SIMPLE, p
        # Long, multi-sentence queries lean toward complex
        if len(query) > 280 or query.count("?") + query.count(".") > 3:
            return TaskComplexity.COMPLEX, "length>280"
        return TaskComplexity.MEDIUM, None

    # ─────────────── LLM invocation ───────────────

    def _get_chat(self, session_id: str, tier: TaskComplexity) -> LlmChat:
        key = (session_id, tier.value)
        chat = self._sessions.get(key)
        if chat is None:
            meta = TIER_CATALOG[tier.value]
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"{session_id}:{tier.value}",
                system_message=(
                    "You are PETER AI — The Luxury Strategist. "
                    "Tagline: Intelligence, Elevated. "
                    "Respond with calm authority, depth, and elegance. "
                    "Be concise but substantive. Avoid filler like "
                    '"Certainly!" or "Of course!". '
                    "Reply in the same language the user used."
                ),
            ).with_model(meta["provider"], meta["preview_model"])
            self._sessions[key] = chat
        return chat

    async def _prepare_query(
        self,
        query: str,
        session_id: str,
        workspace_id: Optional[str] = None,
        memory_enabled: bool = True,
    ) -> tuple[str, list[dict[str, Any]]]:
        """Recall memories and prepend a context block to the user query."""
        if not self.memory or not memory_enabled:
            return query, []
        memories = await self.memory.recall(
            query, limit=5, workspace_id=workspace_id
        )
        if not memories:
            return query, []
        ctx = self.memory.build_context_block(memories)
        composed = f"{ctx}\n\n## Current request from the user:\n{query}"
        return composed, memories

    async def route_and_run(
        self,
        query: str,
        session_id: str,
        forced: Optional[TaskComplexity] = None,
        workspace_id: Optional[str] = None,
        memory_enabled: bool = True,
    ) -> dict[str, Any]:
        tier = forced or self.classify_query(query)
        meta = TIER_CATALOG[tier.value]
        chat = self._get_chat(session_id, tier)
        composed, memories = await self._prepare_query(
            query, session_id, workspace_id, memory_enabled
        )

        start = time.perf_counter()
        # Collect streamed deltas into a single response for the non-stream endpoint.
        response_text = ""
        async for ev in chat.stream_message(UserMessage(text=composed)):
            if isinstance(ev, TextDelta):
                response_text += ev.content
            elif isinstance(ev, StreamDone):
                break
        latency_ms = int((time.perf_counter() - start) * 1000)

        tokens = estimate_tokens(query) + estimate_tokens(response_text)
        cost_usd = round((tokens / 1000.0) * meta["cost_per_1k_usd"], 6)
        premium_cost = round(
            (tokens / 1000.0) * TIER_CATALOG["critical"]["cost_per_1k_usd"], 6
        )
        saved_usd = round(max(0.0, premium_cost - cost_usd), 6)

        return {
            "tier": tier.value,
            "model": meta["preview_model"],
            "model_display_name": meta["name"],
            "response": response_text,
            "cost_usd": cost_usd,
            "saved_usd": saved_usd,
            "latency_ms": latency_ms,
            "tokens_estimated": tokens,
            "memories_used": memories,
        }

    async def route_and_stream(
        self,
        query: str,
        session_id: str,
        forced: Optional[TaskComplexity] = None,
        workspace_id: Optional[str] = None,
        memory_enabled: bool = True,
    ) -> AsyncIterator[str]:
        tier = forced or self.classify_query(query)
        meta = TIER_CATALOG[tier.value]
        chat = self._get_chat(session_id, tier)
        composed, memories = await self._prepare_query(
            query, session_id, workspace_id, memory_enabled
        )

        # First SSE event: routing metadata + memory recall
        yield (
            "event: route\n"
            f"data: {json.dumps({'tier': tier.value, 'model': meta['preview_model'], 'session_id': session_id, 'memories_used': memories})}\n\n"
        )

        start = time.perf_counter()
        full = ""
        async for ev in chat.stream_message(UserMessage(text=composed)):
            if isinstance(ev, TextDelta):
                full += ev.content
                yield (
                    "event: delta\n"
                    f"data: {json.dumps({'content': ev.content})}\n\n"
                )
            elif isinstance(ev, StreamDone):
                break
        latency_ms = int((time.perf_counter() - start) * 1000)
        tokens = estimate_tokens(query) + estimate_tokens(full)
        cost_usd = round((tokens / 1000.0) * meta["cost_per_1k_usd"], 6)
        premium_cost = round(
            (tokens / 1000.0) * TIER_CATALOG["critical"]["cost_per_1k_usd"], 6
        )
        saved_usd = round(max(0.0, premium_cost - cost_usd), 6)

        # Persist assistant message
        await self.db.messages.insert_one(
            {
                "_id": str(uuid.uuid4()),
                "session_id": session_id,
                "role": "assistant",
                "content": full,
                "tier": tier.value,
                "model": meta["preview_model"],
                "cost_usd": cost_usd,
                "latency_ms": latency_ms,
                "saved_usd": saved_usd,
                "created_at": now_iso(),
            }
        )
        await self.db.sessions.update_one(
            {"_id": session_id}, {"$set": {"updated_at": now_iso()}}
        )

        # Fire-and-forget memory extraction so the stream isn't blocked.
        if self.memory:
            asyncio.create_task(self.memory.extract_and_store(session_id, query, full))

        yield (
            "event: done\n"
            f"data: {json.dumps({'cost_usd': cost_usd, 'saved_usd': saved_usd, 'latency_ms': latency_ms, 'tier': tier.value, 'model': meta['preview_model'], 'tokens_estimated': tokens, 'memories_recalled': len(memories)})}\n\n"
        )
