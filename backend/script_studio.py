"""Script Studio — Prompts 14, 17, 18.

Three responsibilities:
  • generate_script()        — Prompt 14: produce a video script for topic+platform.
  • evaluate_script()        — Prompt 17: score + 3 improved variants.
  • generate_genius_prompt() — Prompt 18: self-improving prompt loop.

All LLM work goes through emergentintegrations.LlmChat with the universal key.
We deliberately use the SMART tier (Claude Sonnet 4.5) for evaluation and
genius-prompt work since these are reasoning-heavy tasks; script *generation*
uses CHEAP (Haiku) by default to keep iteration cost low.
"""

from __future__ import annotations

import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from emergentintegrations.llm.chat import LlmChat, UserMessage

from ai_router import TIER_CATALOG

log = logging.getLogger(__name__)

_PLATFORMS = {"tiktok", "instagram", "youtube"}
_STYLES = {"cinematic", "viral", "educational", "avatar", "slideshow"}

_REPLY_LANG_NAMES = {
    "en": "English",
    "id": "Bahasa Indonesia",
    "zh": "Mandarin Chinese (中文)",
    "es": "Spanish (Español)",
    "ar": "Arabic (العربية)",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _api_key() -> str:
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise RuntimeError("EMERGENT_LLM_KEY not configured")
    return key


def _strip_code_fences(text: str) -> str:
    """LLMs love to wrap JSON in ```json fences. Peel them off."""
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*(.+?)```", text, re.DOTALL)
    return fence.group(1).strip() if fence else text


async def _ask_json(
    system: str,
    user: str,
    *,
    tier: str = "smart",
    session_id: Optional[str] = None,
) -> dict[str, Any]:
    """Single-turn LLM call expecting a JSON object back. Raises on parse fail."""
    meta = TIER_CATALOG[tier]
    chat = LlmChat(
        api_key=_api_key(),
        session_id=session_id or f"studio:{uuid.uuid4().hex[:12]}",
        system_message=system,
    ).with_model(meta["provider"], meta["preview_model"])
    raw = await chat.send_message(UserMessage(text=user))
    cleaned = _strip_code_fences(raw)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        log.warning("Studio: bad JSON, attempting salvage. err=%s body=%s", e, cleaned[:400])
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise


# ──────────────────────────── Prompt 14 — Generate ────────────────────────────

_PLATFORM_GUIDE = {
    "tiktok": (
        "TikTok / Reels — vertical 9:16, 30-60s, fast pacing (scene cuts every 3-4s), "
        "scroll-stopping hook in first 3 seconds, trending hashtags, snappy spoken tone."
    ),
    "instagram": (
        "Instagram Reels — vertical 9:16, 30-90s, polished aesthetic, aspirational tone, "
        "longer hook (5-10s), save-worthy value."
    ),
    "youtube": (
        "YouTube Shorts — vertical 9:16, up to 60s, authoritative tone, deep value, "
        "clear CTA at end, binge-worthy framing."
    ),
}


async def generate_script(
    topic: str,
    platform: str,
    style: str = "viral",
    target_language: str = "en",
    genius_prompt: Optional[str] = None,
) -> dict[str, Any]:
    if platform not in _PLATFORMS:
        raise ValueError(f"unsupported platform: {platform}")
    if style not in _STYLES:
        raise ValueError(f"unsupported style: {style}")

    system = (
        "You are PETER AI's Script Studio — a senior short-form video scriptwriter. "
        "You write tight, hook-driven scripts that respect the platform's culture. "
        "Always emit valid JSON. Never include commentary outside the JSON object."
    )
    if genius_prompt:
        # When a genius prompt is provided, treat it as the authoritative spec.
        user = (
            f"GENIUS PROMPT (follow exactly):\n{genius_prompt}\n\n"
            f"TOPIC: {topic}\n"
            f"PLATFORM: {platform}\n"
            f"STYLE: {style}\n"
            f"LANGUAGE: respond in {target_language}\n\n"
            'Return JSON: {"script": str (numbered SCENE blocks with VOICEOVER), '
            '"hook": str (first 5s), "cta": str, "tags": [str], "duration_sec": int}'
        )
    else:
        user = (
            f"Write a {style} script for {platform} on the topic: \"{topic}\".\n"
            f"Platform guide: {_PLATFORM_GUIDE[platform]}\n"
            f"Language: respond in {target_language}.\n\n"
            "Structure: 4-6 numbered SCENE blocks. Each block has a "
            "[VISUAL] line and a VOICEOVER line. Open with an irresistible hook. "
            "Close with a clear CTA.\n\n"
            'Return JSON exactly: {"script": str (the full SCENE blocks), '
            '"hook": str (first 5s spoken line), "cta": str (closing CTA line), '
            '"tags": [str] (5-10 hashtags), "duration_sec": int (15-90)}'
        )

    data = await _ask_json(system, user, tier="cheap")
    data["topic"] = topic
    data["platform"] = platform
    data["style"] = style
    data["language"] = target_language
    if genius_prompt:
        data["genius_prompt_used"] = True
    return data


# ──────────────────────────── Prompt 17 — Evaluate ────────────────────────────


_DIMENSIONS = ("hook", "pacing", "cta", "value", "platform_optimization")


async def evaluate_script(script: str, platform: str = "tiktok") -> dict[str, Any]:
    if platform not in _PLATFORMS:
        raise ValueError(f"unsupported platform: {platform}")

    system = (
        "You are a senior short-form video script evaluator. You score scripts on "
        "five 0-10 dimensions and generate three improved variants. Always return "
        "valid JSON only — no prose outside the JSON object."
    )
    user = f"""Evaluate this {platform} video script.

SCRIPT:
{script}

Dimensions (score 0-10 each, integer or one-decimal):
  • hook — does it grab attention in first 3 seconds?
  • pacing — scene cuts every 3-5 seconds, natural flow?
  • cta — clear, compelling call-to-action?
  • value — does it deliver on the implicit promise?
  • platform_optimization — culturally tuned for {platform}?

For each dimension scoring <6, name a specific weakness.

Then generate THREE improved variants:
  A — Stronger hook (rewrite the first 5 seconds to be irresistible)
  B — Better pacing (add scene cuts so every block is 3-5s)
  C — Stronger CTA (add 2-3 strategic CTAs without sounding pushy)

For each variant, project the new score and the % improvement.

Return JSON with this shape:
{{
  "scores": {{"hook": 0-10, "pacing": 0-10, "cta": 0-10, "value": 0-10, "platform_optimization": 0-10}},
  "overall_score": 0-10,
  "strengths": [str],
  "weaknesses": [str],
  "variants": [
    {{"version": "A", "optimization": str, "script": str, "projected_score": float, "projected_improvement_pct": int}},
    {{"version": "B", "optimization": str, "script": str, "projected_score": float, "projected_improvement_pct": int}},
    {{"version": "C", "optimization": str, "script": str, "projected_score": float, "projected_improvement_pct": int}}
  ],
  "recommendation": {{"best_version": "A"|"B"|"C", "reason": str}}
}}
"""

    data = await _ask_json(system, user, tier="smart")

    # Compute overall_score deterministically if model omitted or fudged it.
    scores = data.get("scores", {}) or {}
    if scores:
        vals = [float(scores.get(d, 0) or 0) for d in _DIMENSIONS]
        avg = round(sum(vals) / len(vals), 2) if vals else 0.0
        data["overall_score"] = avg

    data["platform"] = platform
    return data


# ──────────────────────────── Prompt 18 — Genius Prompt ────────────────────────────


async def generate_genius_prompt(
    topic: str,
    platform: str,
    style: str = "viral",
    target_score: float = 8.5,
    iterations: int = 3,
    target_language: str = "en",
) -> dict[str, Any]:
    """Self-improving loop: generate prompt → script → evaluate → refine.

    Stops early when the score plateaus (<0.2 improvement) or hits target_score.
    Returns the best prompt found plus the evolution history.

    The generated genius-prompt — and the sample scripts used to score it — are
    produced in `target_language` so the loop respects the user's UI locale.
    """
    if platform not in _PLATFORMS:
        raise ValueError(f"unsupported platform: {platform}")
    iterations = max(1, min(iterations, 5))

    lang_name = _REPLY_LANG_NAMES.get(target_language, "English")
    system = (
        "You are a META-PROMPT ENGINEER. You design specialised prompts that teach "
        "an AI to write higher-quality short-form video scripts. You analyse past "
        "iteration scores and refine the prompt to address the specific weaknesses. "
        f"The prompts you produce — and the scripts they yield — must be written "
        f"entirely in {lang_name}. Always return JSON only."
    )

    history: list[dict[str, Any]] = []
    best: Optional[dict[str, Any]] = None

    for i in range(iterations):
        prev_block = ""
        if history:
            prev_block = (
                "\nPREVIOUS ITERATIONS:\n"
                + "\n".join(
                    f"  v{h['iteration']} score={h['score']:.2f} change=\"{h['change']}\""
                    for h in history
                )
                + "\nFocus this iteration on the weakest dimension from the last evaluation:\n"
                + json.dumps(history[-1].get("weaknesses", []), ensure_ascii=False)
            )

        user = (
            f"TOPIC: {topic}\nPLATFORM: {platform}\nSTYLE: {style}\nTARGET SCORE: {target_score}\n"
            f"OUTPUT LANGUAGE: {lang_name} (write the entire prompt in this language)\n"
            f"Iteration: {i + 1} of {iterations}.\n{prev_block}\n\n"
            f"Design ONE specialised script-writing prompt — written in {lang_name} — "
            f"that, when given to a script writer, will yield a {lang_name} script "
            "scoring >=" f"{target_score} on the standard 5-dimension rubric "
            "(hook, pacing, cta, value, platform_optimization).\n\n"
            'Return JSON: {"prompt": str (the full optimised prompt, 6-15 lines, in the target language), '
            '"rationale": str (one sentence on what changed vs previous iteration, in the target language), '
            '"focus_dimensions": [str] (which rubric dimensions this prompt boosts)}'
        )

        proposal = await _ask_json(system, user, tier="smart")
        proposed_prompt = proposal.get("prompt") or ""
        if not proposed_prompt:
            continue

        # Evaluate the proposal by generating a sample script with it, then scoring.
        try:
            sample = await generate_script(
                topic, platform, style=style, target_language=target_language,
                genius_prompt=proposed_prompt,
            )
            evaluation = await evaluate_script(sample.get("script", ""), platform)
            score = float(evaluation.get("overall_score") or 0.0)
        except Exception as e:
            log.warning("Studio: iteration %d eval failed: %s", i + 1, e)
            continue

        change = proposal.get("rationale") or "(no rationale)"
        history.append({
            "iteration": i + 1,
            "score": round(score, 2),
            "change": change,
            "weaknesses": evaluation.get("weaknesses", []),
            "prompt": proposed_prompt,
        })

        if best is None or score > best["score"]:
            best = {
                "score": round(score, 2),
                "prompt": proposed_prompt,
                "iteration": i + 1,
                "rationale": change,
                "focus_dimensions": proposal.get("focus_dimensions", []),
            }

        # Early stop: plateau or target reached.
        if score >= target_score:
            break
        if len(history) >= 2 and (history[-1]["score"] - history[-2]["score"]) < 0.2:
            # Two consecutive iterations with negligible gain → stop.
            break

    if best is None:
        raise RuntimeError("Studio: genius-prompt loop produced no usable iteration")

    # Confidence = how close we got to the target, capped at 0.95.
    confidence = min(0.95, round(best["score"] / max(target_score, 0.01), 2))

    return {
        "id": uuid.uuid4().hex,
        "topic": topic,
        "platform": platform,
        "style": style,
        "language": target_language,
        "target_score": target_score,
        "best_iteration": best["iteration"],
        "expected_quality_score": best["score"],
        "genius_prompt": best["prompt"],
        "rationale": best["rationale"],
        "focus_dimensions": best["focus_dimensions"],
        "evolution": [
            {"iteration": h["iteration"], "score": h["score"], "change": h["change"]}
            for h in history
        ],
        "confidence": confidence,
        "created_at": _now_iso(),
    }
