# -*- coding: utf-8 -*-
"""
core/brain.py
PETER Brain — Routing & Specialized Prompts
The Luxury Strategist — Intelligence, Elevated.
"""

import os
import sys

from dotenv import load_dotenv
load_dotenv()

from peter_identity import (
    get_system_prompt    as _peter_system_prompt,
    format_response_luxury,
    detect_domain_and_get_prompt
)

ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")
USER_NAME     = os.getenv("USER_NAME", "Sir")

# ── SPECIALIZED PROMPTS ───────────────────────────────────

CODING_PROMPT = _peter_system_prompt(USER_NAME, "", "coding") + """

CODING RULES:
- Tulis kode lengkap dan berfungsi — bukan pseudocode
- Tambahkan komentar untuk logika penting
- Sertakan error handling
- Setelah kode — jelaskan cara menjalankan
- Supported: Python, JavaScript, SQL, Bash
- Frameworks: FastAPI, React, LangChain, Django
- Jika user minta fix: analisis bug → jelaskan → berikan fix
- Respond dalam Bahasa Indonesia kecuali komentar kode"""

VIDEO_PROMPT = _peter_system_prompt(USER_NAME, "", "video") + """

VIDEO RULES:
- Output format WAJIB:
  PROMPT: "[detailed cinematic prompt in English]"
  DURATION: [seconds]
  ASPECT: [16:9 or 9:16]
  STYLE: [cinematic/anime/documentary/commercial]
  MOOD: [description]
  NEGATIVE: [what to avoid]
- Sinematik dan ultra-realistis
- Spesifik: kamera, pencahayaan, gerakan
- Jelaskan dalam Bahasa Indonesia apa yang akan dihasilkan"""

CONTENT_PROMPT = _peter_system_prompt(USER_NAME, "", "content") + """

CONTENT RULES:
- Hook kuat di 3 detik pertama
- Struktur: Hook → Problem → Solution → CTA
- Bahasa Indonesia yang engaging dan natural
- Sesuai platform: YouTube/TikTok/Instagram
- Selalu berikan angle yang unik dan unexpected"""

MEMORY_PROMPT = _peter_system_prompt(USER_NAME, "", "analysis") + """

MEMORY RETRIEVAL RULES:
- Return format:
  RELEVANT CONTEXT:
  - [Memory 1: summary dan kenapa relevan]
  - [Memory 2: summary dan kenapa relevan]
- Jika tidak ada memori relevan: RELEVANT CONTEXT: None
- Hanya include memori yang genuinely helpful
- Jangan hallucinate atau invent memori"""

GENERAL_PROMPT = _peter_system_prompt(USER_NAME, "", "general")


# ── PETER BRAIN CLASS ─────────────────────────────────────

class PeterBrain:
    def __init__(self):
        self.memory  = None
        self.history = []
        self._init_memory()
        print("[BRAIN] Peter Brain initialized!")

    def _init_memory(self):
        try:
            from peter_memory import PeterMemory
            self.memory = PeterMemory()
            print("[BRAIN] Memory OK!")
        except Exception as e:
            print(f"[BRAIN] Memory error: {e}")

    def detect_intent(self, message: str) -> str:
        """Deteksi intent dari pesan untuk routing"""
        msg = message.lower()

        if any(w in msg for w in [
            "code", "kode", "python", "javascript", "bug",
            "error", "fix", "debug", "function", "class",
            "script", "program", "buat aplikasi", "tulis kode"
        ]):
            return "coding"

        if any(w in msg for w in [
            "buat video", "generate video", "runway", "kling",
            "video prompt", "cinematic", "animasi video",
            "video ai", "text to video"
        ]):
            return "video_generation"

        if any(w in msg for w in [
            "ingat", "kamu ingat", "sebelumnya", "tadi",
            "kemarin", "pernah", "sudah pernah", "memory"
        ]):
            return "memory"

        if any(w in msg for w in [
            "script youtube", "script video", "script tiktok",
            "script instagram", "script podcast", "script konten",
            "buat script", "tulis script", "script perdana",
            "script minggu", "konten", "caption", "thumbnail",
            "viral", "youtube", "tiktok", "instagram", "reels"
        ]):
            return "content"

        return "general"

    def get_system_prompt(self, intent: str,
                          context: str = "") -> str:
        """Dapatkan system prompt sesuai archetype Luxury Strategist"""
        base = {
            "coding"          : CODING_PROMPT,
            "video_generation": VIDEO_PROMPT,
            "memory"          : MEMORY_PROMPT,
            "content"         : CONTENT_PROMPT,
            "general"         : GENERAL_PROMPT,
        }.get(intent, GENERAL_PROMPT)

        if context:
            base += f"\n\nMEMORY CONTEXT:\n{context}"

        return base

    def think(self, message: str,
              use_memory: bool = True) -> str:
        """Proses pesan dengan routing ke prompt yang tepat"""
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)

        # Detect intent
        intent = self.detect_intent(message)
        print(f"[BRAIN] Intent: {intent}")

        # Get memory context
        context_str = ""
        if use_memory and self.memory:
            try:
                ctx         = self.memory.build_context(message)
                context_str = ctx.get("context_string", "")
                history     = ctx.get("history", [])
            except Exception:
                history = []
        else:
            history = []

        # Get system prompt sesuai archetype
        system = self.get_system_prompt(intent, context_str)

        # Build messages
        messages = []
        for h in history[-10:]:
            messages.append({
                "role"   : h["role"],
                "content": h["content"]
            })
        messages.append({"role": "user", "content": message})

        # Call Claude
        response = client.messages.create(
            model      = "claude-sonnet-4-6",
            max_tokens = 8096,
            system     = system,
            messages   = messages
        )
        answer = response.content[0].text

        # Filter tone sesuai archetype Luxury Strategist
        answer = format_response_luxury(answer)

        # Save to memory
        if use_memory and self.memory:
            try:
                self.memory.add_short_term("user", message)
                self.memory.add_short_term("assistant", answer)
                self.memory.auto_learn(message, answer)
            except Exception:
                pass

        # Save to local history
        self.history.append({"role": "user", "content": message})
        self.history.append({"role": "assistant", "content": answer})
        if len(self.history) > 20:
            self.history = self.history[-20:]

        return answer

    def generate_video_prompt(self, description: str) -> dict:
        """Generate video prompt untuk Runway ML / Kling"""
        import anthropic
        client   = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
        response = client.messages.create(
            model      = "claude-sonnet-4-6",
            max_tokens = 1000,
            system     = VIDEO_PROMPT,
            messages   = [{
                "role"   : "user",
                "content": f"Buat video prompt untuk: {description}"
            }]
        )
        raw    = response.content[0].text
        result = {"raw": raw, "description": description}

        for line in raw.split("\n"):
            if line.startswith("PROMPT:"):
                result["prompt"] = line.replace("PROMPT:", "").strip().strip('"')
            elif line.startswith("DURATION:"):
                result["duration"] = line.replace("DURATION:", "").strip()
            elif line.startswith("ASPECT:"):
                result["aspect"] = line.replace("ASPECT:", "").strip()
            elif line.startswith("STYLE:"):
                result["style"] = line.replace("STYLE:", "").strip()
            elif line.startswith("MOOD:"):
                result["mood"] = line.replace("MOOD:", "").strip()

        return result

    def code_assistant(self, task: str,
                       code: str = "") -> str:
        """Mode coding assistant khusus"""
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)

        content = (
            f"Fix this code:\n```\n{code}\n```\n\nTask: {task}"
            if code else task
        )

        response = client.messages.create(
            model      = "claude-sonnet-4-6",
            max_tokens = 4096,
            system     = CODING_PROMPT,
            messages   = [{"role": "user", "content": content}]
        )
        answer = response.content[0].text
        return format_response_luxury(answer)