"""PETER AI backend i18n.

Public-facing display strings (agent roles, tier names + purposes, etc.) are
translated here. Internal strings that feed the LLM (agent.task, agent.backstory)
stay in English to keep model outputs consistent across locales.

Add a new language by:
  1. adding the 2-letter code to SUPPORTED_LOCALES;
  2. extending AGENT_TR, TIER_TR with the same keys.

The helper pick_locale() reads the standard HTTP Accept-Language header and
collapses sub-tags (en-US → en).
"""

from __future__ import annotations

from typing import Any, Iterable

SUPPORTED_LOCALES: tuple[str, ...] = ("en", "id", "zh", "es", "ar")
DEFAULT_LOCALE = "en"


def pick_locale(accept_language: str | None) -> str:
    """Return the best matching supported locale from an Accept-Language header.
    Falls back to DEFAULT_LOCALE. Accepts both raw header strings and bare codes.
    """
    if not accept_language:
        return DEFAULT_LOCALE
    raw = accept_language.split(",")
    for part in raw:
        code = part.strip().split(";")[0].strip().lower()
        if not code:
            continue
        # Try exact, then primary subtag (en-US → en).
        if code in SUPPORTED_LOCALES:
            return code
        primary = code.split("-", 1)[0]
        if primary in SUPPORTED_LOCALES:
            return primary
    return DEFAULT_LOCALE


# ────────────────────────────── Agents ──────────────────────────────
# Only `role` and `goal` are translated. `id`, `tier`, `backstory`, `task`
# stay constant so they feed the LLM in English.

AGENT_TR: dict[str, dict[str, dict[str, str]]] = {
    "en": {
        "architect":  {"role": "Software Architect",   "goal": "Design a scalable system architecture for the requested application."},
        "dba":        {"role": "Database Engineer",    "goal": "Design an optimised database schema with indexes and migrations."},
        "backend":    {"role": "Backend Developer",    "goal": "Build API and microservices skeleton with clear endpoints."},
        "frontend":   {"role": "Frontend Developer",   "goal": "Build a modern React/Next.js frontend skeleton."},
        "qa":         {"role": "QA Engineer",          "goal": "Design a comprehensive test plan covering unit, integration and e2e."},
        "devops":     {"role": "DevOps Engineer",      "goal": "Setup deployment infrastructure, CI/CD and observability."},
        "documenter": {"role": "Technical Writer",     "goal": "Create clear user-facing and developer-facing documentation."},
    },
    "id": {
        "architect":  {"role": "Arsitek Perangkat Lunak", "goal": "Merancang arsitektur sistem yang skalabel untuk aplikasi yang diminta."},
        "dba":        {"role": "Insinyur Basis Data",     "goal": "Merancang skema basis data optimal lengkap dengan indeks dan migrasi."},
        "backend":    {"role": "Pengembang Backend",      "goal": "Membangun kerangka API dan microservices dengan endpoint yang jelas."},
        "frontend":   {"role": "Pengembang Frontend",     "goal": "Membangun kerangka frontend modern berbasis React/Next.js."},
        "qa":         {"role": "Insinyur QA",             "goal": "Menyusun rencana uji menyeluruh mencakup unit, integrasi, dan e2e."},
        "devops":     {"role": "Insinyur DevOps",         "goal": "Menyiapkan infrastruktur deployment, CI/CD, dan observabilitas."},
        "documenter": {"role": "Penulis Teknis",          "goal": "Menulis dokumentasi yang jernih untuk pengguna dan pengembang."},
    },
    "zh": {
        "architect":  {"role": "软件架构师",   "goal": "为所请求的应用设计可扩展的系统架构。"},
        "dba":        {"role": "数据库工程师", "goal": "设计优化的数据库模式,含索引与迁移。"},
        "backend":    {"role": "后端开发者",   "goal": "构建带清晰端点的 API 与微服务骨架。"},
        "frontend":   {"role": "前端开发者",   "goal": "构建现代 React/Next.js 前端骨架。"},
        "qa":         {"role": "测试工程师",   "goal": "设计涵盖单元、集成与端到端的完整测试计划。"},
        "devops":     {"role": "DevOps 工程师", "goal": "搭建部署基础设施、CI/CD 与可观测性。"},
        "documenter": {"role": "技术文档师",   "goal": "撰写面向用户与开发者的清晰文档。"},
    },
    "es": {
        "architect":  {"role": "Arquitecto de Software",     "goal": "Diseñar una arquitectura de sistema escalable para la aplicación solicitada."},
        "dba":        {"role": "Ingeniero de Bases de Datos","goal": "Diseñar un esquema de base de datos optimizado con índices y migraciones."},
        "backend":    {"role": "Desarrollador Backend",      "goal": "Construir el esqueleto de la API y microservicios con endpoints claros."},
        "frontend":   {"role": "Desarrollador Frontend",     "goal": "Construir un esqueleto moderno de frontend con React/Next.js."},
        "qa":         {"role": "Ingeniero de QA",            "goal": "Diseñar un plan de pruebas integral: unitarias, de integración y e2e."},
        "devops":     {"role": "Ingeniero DevOps",           "goal": "Configurar infraestructura de despliegue, CI/CD y observabilidad."},
        "documenter": {"role": "Redactor Técnico",           "goal": "Crear documentación clara para usuarios y desarrolladores."},
    },
    "ar": {
        "architect":  {"role": "مهندس البرمجيات",     "goal": "تصميم بنية نظام قابلة للتوسّع للتطبيق المطلوب."},
        "dba":        {"role": "مهندس قواعد البيانات", "goal": "تصميم مخطط قاعدة بيانات مُحسَّن مع الفهارس والترحيلات."},
        "backend":    {"role": "مطوّر الخلفية",         "goal": "بناء هيكل واجهات برمجة التطبيقات والخدمات المصغّرة بنقاط نهاية واضحة."},
        "frontend":   {"role": "مطوّر الواجهة الأماميّة", "goal": "بناء هيكل واجهة أماميّة حديث بـ React/Next.js."},
        "qa":         {"role": "مهندس ضمان الجودة",    "goal": "تصميم خطّة اختبار شاملة تغطّي الوحدات، التكامل، وE2E."},
        "devops":     {"role": "مهندس DevOps",          "goal": "إعداد البنية التحتيّة للنشر وCI/CD والمراقبة."},
        "documenter": {"role": "كاتب تقني",             "goal": "كتابة توثيق واضح للمستخدمين والمطوّرين."},
    },
}


# ────────────────────────────── Tiers ──────────────────────────────
# Only `name` and `purpose` are translated. `id`, `label`, `provider`,
# `preview_model`, `cost_per_1k_usd`, `color` keep their canonical values.

TIER_TR: dict[str, dict[str, dict[str, str]]] = {
    "en": {
        "free":     {"name": "Local Ollama",      "purpose": "Simple factual queries, conversions, definitions"},
        "cheap":    {"name": "Claude Haiku 4.5",  "purpose": "Everyday conversation, drafts, summaries"},
        "smart":    {"name": "Claude Sonnet 4.5", "purpose": "Analysis, strategy, architecture, optimisation"},
        "critical": {"name": "Claude Opus 4.5",   "purpose": "Mission-critical: medical, legal, financial, production"},
    },
    "id": {
        "free":     {"name": "Ollama Lokal",      "purpose": "Pertanyaan faktual sederhana, konversi, definisi"},
        "cheap":    {"name": "Claude Haiku 4.5",  "purpose": "Percakapan harian, draf, ringkasan"},
        "smart":    {"name": "Claude Sonnet 4.5", "purpose": "Analisis, strategi, arsitektur, optimisasi"},
        "critical": {"name": "Claude Opus 4.5",   "purpose": "Misi kritis: medis, hukum, keuangan, produksi"},
    },
    "zh": {
        "free":     {"name": "本地 Ollama",       "purpose": "简单事实查询、换算、定义"},
        "cheap":    {"name": "Claude Haiku 4.5",  "purpose": "日常对话、草稿、摘要"},
        "smart":    {"name": "Claude Sonnet 4.5", "purpose": "分析、战略、架构、优化"},
        "critical": {"name": "Claude Opus 4.5",   "purpose": "关键任务:医疗、法律、金融、生产"},
    },
    "es": {
        "free":     {"name": "Ollama local",      "purpose": "Consultas factuales simples, conversiones, definiciones"},
        "cheap":    {"name": "Claude Haiku 4.5",  "purpose": "Conversación cotidiana, borradores, resúmenes"},
        "smart":    {"name": "Claude Sonnet 4.5", "purpose": "Análisis, estrategia, arquitectura, optimización"},
        "critical": {"name": "Claude Opus 4.5",   "purpose": "Misión crítica: médico, legal, financiero, producción"},
    },
    "ar": {
        "free":     {"name": "Ollama المحلّي",     "purpose": "استعلامات وقائعيّة بسيطة وتحويلات وتعاريف"},
        "cheap":    {"name": "Claude Haiku 4.5",   "purpose": "المحادثة اليوميّة والمسوّدات والملخّصات"},
        "smart":    {"name": "Claude Sonnet 4.5",  "purpose": "التحليل والاستراتيجيّة والمعماريّة والتحسين"},
        "critical": {"name": "Claude Opus 4.5",    "purpose": "مهامّ حرجة: طبّ، قانون، ماليّة، إنتاج"},
    },
}


# ────────────────────────────── Status enum ──────────────────────────────
# Human labels for the crew run lifecycle states.

STATUS_TR: dict[str, dict[str, str]] = {
    "en": {"pending": "Pending",       "running": "Running",       "done": "Done",       "error": "Error"},
    "id": {"pending": "Menunggu",      "running": "Berjalan",      "done": "Selesai",    "error": "Galat"},
    "zh": {"pending": "等待中",         "running": "运行中",         "done": "完成",        "error": "错误"},
    "es": {"pending": "Pendiente",     "running": "En ejecución",  "done": "Hecho",      "error": "Error"},
    "ar": {"pending": "قيد الانتظار",   "running": "قيد التشغيل",   "done": "تمّ",         "error": "خطأ"},
}


def translate_agents(blueprint: Iterable[dict[str, Any]], locale: str) -> list[dict[str, Any]]:
    """Return a deep-ish copy of the agent blueprint with role + goal swapped
    to the requested locale. Untranslated fields pass through unchanged.
    """
    locale = locale if locale in SUPPORTED_LOCALES else DEFAULT_LOCALE
    table = AGENT_TR.get(locale, AGENT_TR[DEFAULT_LOCALE])
    out: list[dict[str, Any]] = []
    for a in blueprint:
        tr = table.get(a["id"])
        if tr is None:
            out.append(dict(a))
            continue
        merged = dict(a)
        merged["role"] = tr["role"]
        merged["goal"] = tr["goal"]
        out.append(merged)
    return out


def translate_tier_catalog(catalog: dict[str, dict[str, Any]], locale: str) -> dict[str, dict[str, Any]]:
    """Return a copy of TIER_CATALOG with name + purpose swapped for the locale."""
    locale = locale if locale in SUPPORTED_LOCALES else DEFAULT_LOCALE
    table = TIER_TR.get(locale, TIER_TR[DEFAULT_LOCALE])
    out: dict[str, dict[str, Any]] = {}
    for tier_id, meta in catalog.items():
        tr = table.get(tier_id)
        merged = dict(meta)
        if tr:
            merged["name"] = tr["name"]
            merged["purpose"] = tr["purpose"]
        out[tier_id] = merged
    return out


def status_labels(locale: str) -> dict[str, str]:
    locale = locale if locale in SUPPORTED_LOCALES else DEFAULT_LOCALE
    return dict(STATUS_TR.get(locale, STATUS_TR[DEFAULT_LOCALE]))
