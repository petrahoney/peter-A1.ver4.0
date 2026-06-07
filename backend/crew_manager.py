"""PETER Crew Manager — 7-agent app-builder orchestration.

Lightweight CrewAI-style sequential workflow built directly on the
Universal Key (no extra dependency). Each agent uses the
right tier from the AI Router so cost stays low while keeping the
"Architect" and "QA" steps on Claude Sonnet for quality.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from emergentintegrations.llm.chat import (
    LlmChat,
    StreamDone,
    TextDelta,
    UserMessage,
)

from ai_router import TIER_CATALOG, estimate_tokens


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# Each agent declares its role, tier (used for cost optimisation) and task brief.
AGENT_BLUEPRINT: list[dict[str, Any]] = [
    {
        "id": "architect",
        "role": "Software Architect",
        "tier": "smart",
        "goal": "Design a scalable system architecture for the requested application.",
        "backstory": "Senior architect with 15 years of experience designing large-scale systems.",
        "task": (
            "Produce a concise but complete architecture document. Include: "
            "system overview, core components, data flow, chosen tech stack with "
            "justification, key trade-offs, and a deployment topology. Output in "
            "clear markdown sections."
        ),
    },
    {
        "id": "dba",
        "role": "Database Engineer",
        "tier": "cheap",
        "goal": "Design an optimised database schema with indexes and migrations.",
        "backstory": "Database expert who has scaled OLTP systems to 100M+ rows.",
        "task": (
            "Based on the architecture, produce: ER diagram (text), table "
            "schemas with column types, primary/foreign keys, indexes, and a "
            "short rationale per table. Output in clear markdown."
        ),
    },
    {
        "id": "backend",
        "role": "Backend Developer",
        "tier": "cheap",
        "goal": "Build API and microservices skeleton with clear endpoints.",
        "backstory": "Expert in Python and Node.js building production APIs.",
        "task": (
            "Produce: REST API endpoint list (method, path, purpose), key "
            "request/response shapes, auth approach, and a sample handler "
            "for the most critical endpoint in pseudo-code or real Python. "
            "Output in clear markdown."
        ),
    },
    {
        "id": "frontend",
        "role": "Frontend Developer",
        "tier": "cheap",
        "goal": "Build a modern React/Next.js frontend skeleton.",
        "backstory": "Expert in modern web development, design systems and a11y.",
        "task": (
            "Produce: page/route map, component hierarchy for the main view, "
            "state management approach, and a sample component (JSX) for the "
            "most important screen. Output in clear markdown."
        ),
    },
    {
        "id": "qa",
        "role": "QA Engineer",
        "tier": "smart",
        "goal": "Design a comprehensive test plan covering unit, integration and e2e.",
        "backstory": "Meticulous QA who has shipped highly reliable products.",
        "task": (
            "Produce: test pyramid summary, 8-12 concrete test cases with "
            "Given/When/Then, plus the recommended testing stack. Output in "
            "clear markdown."
        ),
    },
    {
        "id": "devops",
        "role": "DevOps Engineer",
        "tier": "free",
        "goal": "Setup deployment infrastructure, CI/CD and observability.",
        "backstory": "Cloud infrastructure expert across AWS, GCP and self-hosted.",
        "task": (
            "Produce: Dockerfile sketches for backend & frontend, a "
            "docker-compose.yml outline, CI/CD pipeline stages, and key "
            "observability signals (metrics/logs/traces). Output in clear markdown."
        ),
    },
    {
        "id": "documenter",
        "role": "Technical Writer",
        "tier": "free",
        "goal": "Create clear user-facing and developer-facing documentation.",
        "backstory": "Documentation expert who writes for clarity and craft.",
        "task": (
            "Produce: README skeleton (overview, quick start, env vars, "
            "deploy), plus a short 'How it works' explainer aimed at a "
            "non-technical stakeholder. Output in clear markdown."
        ),
    },
]


class PeterCrewManager:
    def __init__(self, api_key: str, db, router) -> None:
        self.api_key = api_key
        self.db = db
        self.router = router

    async def _run_agent(
        self,
        agent: dict[str, Any],
        requirements: str,
        prior_outputs: dict[str, str],
    ) -> dict[str, Any]:
        tier_meta = TIER_CATALOG[agent["tier"]]

        # Build a short context string from prior agent outputs
        context_block = "\n\n".join(
            f"### {prev_id.upper()} OUTPUT\n{prior_outputs[prev_id][:1800]}"
            for prev_id in prior_outputs
        )

        system = (
            f"You are the {agent['role']} on PETER AI's elite build crew. "
            f"{agent['backstory']} "
            "Be concise, structured, premium. Output in clean markdown. "
            "Do not add filler. Reply in the same language as the requirements."
        )

        user_text = (
            f"REQUIREMENTS FROM THE CLIENT:\n{requirements}\n\n"
            f"YOUR TASK:\n{agent['task']}\n\n"
            f"PRIOR CREW OUTPUTS (context):\n{context_block or '— none —'}\n\n"
            "Deliver your output now."
        )

        chat = LlmChat(
            api_key=self.api_key,
            session_id=f"crew:{agent['id']}:{uuid.uuid4()}",
            system_message=system,
        ).with_model(tier_meta["provider"], tier_meta["preview_model"])

        start = time.perf_counter()
        out = ""
        async for ev in chat.stream_message(UserMessage(text=user_text)):
            if isinstance(ev, TextDelta):
                out += ev.content
            elif isinstance(ev, StreamDone):
                break
        latency_ms = int((time.perf_counter() - start) * 1000)
        tokens = estimate_tokens(user_text) + estimate_tokens(out)
        cost_usd = round((tokens / 1000.0) * tier_meta["cost_per_1k_usd"], 6)
        premium_cost = round(
            (tokens / 1000.0) * TIER_CATALOG["critical"]["cost_per_1k_usd"], 6
        )
        saved_usd = round(max(0.0, premium_cost - cost_usd), 6)

        return {
            "output": out,
            "latency_ms": latency_ms,
            "cost_usd": cost_usd,
            "saved_usd": saved_usd,
            "model": tier_meta["preview_model"],
            "tier": agent["tier"],
        }

    async def run_crew(self, run_id: str, requirements: str) -> None:
        """Run all 7 agents sequentially and persist progress in MongoDB."""
        prior_outputs: dict[str, str] = {}
        total_cost = 0.0
        total_saved = 0.0

        for idx, agent in enumerate(AGENT_BLUEPRINT):
            # Mark agent as running
            await self.db.crew_runs.update_one(
                {"_id": run_id},
                {
                    "$set": {
                        f"agents.{idx}.status": "running",
                        f"agents.{idx}.started_at": now_iso(),
                    }
                },
            )
            try:
                result = await self._run_agent(agent, requirements, prior_outputs)
                prior_outputs[agent["id"]] = result["output"]
                total_cost += result["cost_usd"]
                total_saved += result["saved_usd"]
                await self.db.crew_runs.update_one(
                    {"_id": run_id},
                    {
                        "$set": {
                            f"agents.{idx}.status": "done",
                            f"agents.{idx}.output": result["output"],
                            f"agents.{idx}.latency_ms": result["latency_ms"],
                            f"agents.{idx}.cost_usd": result["cost_usd"],
                            f"agents.{idx}.saved_usd": result["saved_usd"],
                            f"agents.{idx}.model": result["model"],
                            f"agents.{idx}.finished_at": now_iso(),
                            "total_cost_usd": round(total_cost, 6),
                            "total_saved_usd": round(total_saved, 6),
                        }
                    },
                )
            except Exception as e:  # pragma: no cover — defensive
                await self.db.crew_runs.update_one(
                    {"_id": run_id},
                    {
                        "$set": {
                            f"agents.{idx}.status": "error",
                            f"agents.{idx}.output": f"Agent error: {e}",
                            f"agents.{idx}.finished_at": now_iso(),
                            "status": "error",
                        }
                    },
                )
                return

        await self.db.crew_runs.update_one(
            {"_id": run_id},
            {"$set": {"status": "done", "finished_at": now_iso()}},
        )
