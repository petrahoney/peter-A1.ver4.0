"""Strategist Memory — ChromaDB-backed long-term recall for PETER AI.

Each user/assistant exchange is mined (by a cheap LLM) for durable
facts, preferences, projects, themes and goals. Memories are stored
in a local ChromaDB collection and recalled by semantic search on
every subsequent turn, then injected as a system context block so
PETER's reasoning compounds across sessions.

Memories carry a `workspace_id` ("global" by default) so the new
Project Workspaces layer can scope recall and storage to a specific
container (e.g. "Acme M&A").

Designed to fail open: any extraction or recall error leaves chat
working without memory.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import chromadb
from chromadb.config import Settings
from emergentintegrations.llm.chat import (
    LlmChat,
    StreamDone,
    TextDelta,
    UserMessage,
)

log = logging.getLogger("peter.memory")

CHROMA_PATH = os.environ.get("CHROMA_PATH", "/app/backend/chroma_data")
COLLECTION = "peter_strategist_memory"
GLOBAL_WORKSPACE = "global"

MEMORY_TYPES = {"preference", "project", "fact", "goal", "theme", "note"}

EXTRACTION_SYSTEM = (
    "You are a memory curator for PETER AI, a luxury AI command center. "
    "Read the recent user/assistant exchange and extract any durable, "
    "session-spanning insights worth remembering for future conversations. "
    "Capture: stated preferences, ongoing projects, factual claims about "
    "the user or their context, explicit goals, and recurring strategic "
    "themes. Ignore small talk, weather, time queries, anything ephemeral. "
    'Reply with ONLY a JSON array (no prose) of objects: '
    '[{"type":"<preference|project|fact|goal|theme|note>","content":"<single sentence>"}]. '
    "If nothing is worth remembering, reply with []."
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_json_array(text: str) -> list[dict]:
    if not text:
        return []
    try:
        v = json.loads(text)
        if isinstance(v, list):
            return v
    except Exception:
        pass
    m = re.search(r"\[.*\]", text, re.DOTALL)
    if not m:
        return []
    try:
        v = json.loads(m.group(0))
        return v if isinstance(v, list) else []
    except Exception:
        return []


def _ws(workspace_id: Optional[str]) -> str:
    return (workspace_id or GLOBAL_WORKSPACE).strip() or GLOBAL_WORKSPACE


class StrategistMemory:
    def __init__(self, api_key: str) -> None:
        self.api_key = api_key
        os.makedirs(CHROMA_PATH, exist_ok=True)
        self._client = chromadb.PersistentClient(
            path=CHROMA_PATH,
            settings=Settings(anonymized_telemetry=False),
        )
        self._collection = self._client.get_or_create_collection(
            name=COLLECTION,
            metadata={"hnsw:space": "cosine"},
        )

    # ───────────── recall ─────────────

    async def recall(
        self,
        query: str,
        limit: int = 5,
        workspace_id: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        try:
            kwargs = {"query_texts": [query], "n_results": limit}
            if workspace_id:
                kwargs["where"] = {"workspace_id": _ws(workspace_id)}
            res = await asyncio.to_thread(self._collection.query, **kwargs)
        except Exception as e:
            log.warning("memory.recall failed: %s", e)
            return []

        out: list[dict[str, Any]] = []
        ids = (res.get("ids") or [[]])[0]
        docs = (res.get("documents") or [[]])[0]
        metas = (res.get("metadatas") or [[]])[0]
        dists = (res.get("distances") or [[]])[0]
        for i, doc in enumerate(docs):
            meta = metas[i] if i < len(metas) else {}
            dist = dists[i] if i < len(dists) else None
            if dist is not None and dist > 0.85:
                continue
            out.append(
                {
                    "id": ids[i] if i < len(ids) else None,
                    "content": doc,
                    "type": meta.get("type", "note"),
                    "session_id": meta.get("session_id"),
                    "workspace_id": meta.get("workspace_id", GLOBAL_WORKSPACE),
                    "created_at": meta.get("created_at"),
                    "distance": dist,
                }
            )
        return out

    def build_context_block(self, memories: list[dict[str, Any]]) -> str:
        if not memories:
            return ""
        lines = [
            "## What PETER remembers about you (use this naturally; do not quote verbatim):"
        ]
        for m in memories:
            lines.append(f"- [{m['type']}] {m['content']}")
        return "\n".join(lines)

    # ───────────── extraction & store ─────────────

    async def extract_and_store(
        self,
        session_id: str,
        user_msg: str,
        ai_response: str,
        workspace_id: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        if not user_msg or not ai_response:
            return []
        if len(user_msg) < 12 and len(ai_response) < 60:
            return []

        prompt = (
            f"USER MESSAGE:\n{user_msg.strip()[:2000]}\n\n"
            f"ASSISTANT REPLY:\n{ai_response.strip()[:2000]}\n\n"
            "Return the JSON array now."
        )
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"memory-extract:{uuid.uuid4()}",
                system_message=EXTRACTION_SYSTEM,
            ).with_model("anthropic", "claude-haiku-4-5-20251001")
            text = ""
            async for ev in chat.stream_message(UserMessage(text=prompt)):
                if isinstance(ev, TextDelta):
                    text += ev.content
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            log.warning("memory extraction LLM failed: %s", e)
            return []

        items = _safe_json_array(text)
        stored: list[dict[str, Any]] = []
        ids: list[str] = []
        docs: list[str] = []
        metas: list[dict[str, Any]] = []

        for raw in items:
            if not isinstance(raw, dict):
                continue
            t = str(raw.get("type", "note")).lower().strip()
            if t not in MEMORY_TYPES:
                t = "note"
            content = str(raw.get("content", "")).strip()
            if len(content) < 6:
                continue
            mid = str(uuid.uuid4())
            ids.append(mid)
            docs.append(content)
            metas.append(
                {
                    "type": t,
                    "session_id": session_id or "",
                    "workspace_id": _ws(workspace_id),
                    "created_at": _now_iso(),
                }
            )
            stored.append(
                {
                    "id": mid,
                    "type": t,
                    "content": content,
                    "workspace_id": _ws(workspace_id),
                }
            )

        if ids:
            try:
                await asyncio.to_thread(
                    self._collection.add, ids=ids, documents=docs, metadatas=metas
                )
            except Exception as e:
                log.warning("chroma add failed: %s", e)
                return []
        return stored

    # ───────────── manual CRUD ─────────────

    async def add_manual(
        self,
        content: str,
        mtype: str = "note",
        workspace_id: Optional[str] = None,
    ) -> dict[str, Any]:
        content = (content or "").strip()
        if not content:
            raise ValueError("content required")
        if mtype not in MEMORY_TYPES:
            mtype = "note"
        mid = str(uuid.uuid4())
        await asyncio.to_thread(
            self._collection.add,
            ids=[mid],
            documents=[content],
            metadatas=[
                {
                    "type": mtype,
                    "session_id": "manual",
                    "workspace_id": _ws(workspace_id),
                    "created_at": _now_iso(),
                }
            ],
        )
        return {
            "id": mid,
            "type": mtype,
            "content": content,
            "workspace_id": _ws(workspace_id),
        }

    async def list_all(
        self, limit: int = 500, workspace_id: Optional[str] = None
    ) -> list[dict[str, Any]]:
        try:
            kwargs = {"include": ["documents", "metadatas"]}
            if workspace_id:
                kwargs["where"] = {"workspace_id": _ws(workspace_id)}
            res = await asyncio.to_thread(self._collection.get, **kwargs)
        except Exception as e:
            log.warning("memory.list_all failed: %s", e)
            return []
        out = []
        ids = res.get("ids") or []
        docs = res.get("documents") or []
        metas = res.get("metadatas") or []
        for i, doc in enumerate(docs):
            meta = metas[i] if i < len(metas) else {}
            out.append(
                {
                    "id": ids[i],
                    "content": doc,
                    "type": meta.get("type", "note"),
                    "session_id": meta.get("session_id"),
                    "workspace_id": meta.get("workspace_id", GLOBAL_WORKSPACE),
                    "created_at": meta.get("created_at"),
                }
            )
        out.sort(key=lambda x: x.get("created_at") or "", reverse=True)
        return out[:limit]

    async def delete(self, memory_id: str) -> None:
        try:
            await asyncio.to_thread(self._collection.delete, ids=[memory_id])
        except Exception as e:
            log.warning("memory.delete failed: %s", e)

    async def delete_many(self, memory_ids: list[str]) -> None:
        if not memory_ids:
            return
        try:
            await asyncio.to_thread(self._collection.delete, ids=memory_ids)
        except Exception as e:
            log.warning("memory.delete_many failed: %s", e)

    async def clear_all(self, workspace_id: Optional[str] = None) -> int:
        try:
            kwargs = {}
            if workspace_id:
                kwargs["where"] = {"workspace_id": _ws(workspace_id)}
            res = await asyncio.to_thread(self._collection.get, **kwargs)
            ids = res.get("ids") or []
            if ids:
                await asyncio.to_thread(self._collection.delete, ids=ids)
            return len(ids)
        except Exception as e:
            log.warning("memory.clear_all failed: %s", e)
            return 0

    async def count(self, workspace_id: Optional[str] = None) -> int:
        try:
            if not workspace_id:
                return await asyncio.to_thread(self._collection.count)
            res = await asyncio.to_thread(
                self._collection.get,
                where={"workspace_id": _ws(workspace_id)},
            )
            return len(res.get("ids") or [])
        except Exception:
            return 0

    async def reassign_workspace(
        self, memory_ids: list[str], workspace_id: str
    ) -> int:
        """Move memories to a different workspace (used when workspace deleted)."""
        if not memory_ids:
            return 0
        try:
            res = await asyncio.to_thread(
                self._collection.get,
                ids=memory_ids,
                include=["documents", "metadatas"],
            )
            ids = res.get("ids") or []
            metas = res.get("metadatas") or []
            new_metas = []
            for meta in metas:
                m = dict(meta or {})
                m["workspace_id"] = _ws(workspace_id)
                new_metas.append(m)
            if ids:
                await asyncio.to_thread(
                    self._collection.update, ids=ids, metadatas=new_metas
                )
            return len(ids)
        except Exception as e:
            log.warning("reassign_workspace failed: %s", e)
            return 0
