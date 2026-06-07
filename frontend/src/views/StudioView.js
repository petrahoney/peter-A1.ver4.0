import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkle, FilmStrip, Lightning, Star, ArrowRight, Brain, Clock, UsersThree, Trash } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";

import Markdown from "../components/Markdown";
import {
  scriptGenerate,
  scriptEvaluate,
  geniusPromptStream,
  geniusPromptsList,
  geniusPromptDelete,
  scriptsList,
  scriptDetail,
  scriptDelete,
} from "../lib/api";
import { logErr } from "../lib/logErr";

const PLATFORMS = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
];
const STYLES = [
  { id: "viral", label: "Viral" },
  { id: "cinematic", label: "Cinematic" },
  { id: "educational", label: "Educational" },
  { id: "avatar", label: "Avatar" },
  { id: "slideshow", label: "Slideshow" },
];
const LANGS = [
  { id: "en", label: "English" },
  { id: "id", label: "Bahasa Indonesia" },
  { id: "zh", label: "中文" },
  { id: "es", label: "Español" },
  { id: "ar", label: "العربية" },
];

function ScoreBar({ label, value }) {
  const pct = Math.max(0, Math.min(10, Number(value) || 0)) * 10;
  return (
    <div className="flex items-center gap-3" data-testid={`score-${label.toLowerCase()}`}>
      <div className="text-[10px] tracking-[0.22em] uppercase text-peter-dim w-28 shrink-0">
        {label}
      </div>
      <div className="flex-1 h-1.5 rounded-full bg-peter-navy2 overflow-hidden">
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: pct >= 70 ? "#C9A84C" : pct >= 50 ? "#9C7A37" : "#5C4520",
          }}
        />
      </div>
      <div className="text-xs font-mono text-peter-ivory tnum w-10 text-right">
        {(Number(value) || 0).toFixed(1)}
      </div>
    </div>
  );
}

export default function StudioView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("tiktok");
  const [style, setStyle] = useState("viral");
  const [language, setLanguage] = useState("en");
  const [targetScore, setTargetScore] = useState(8.5);
  const [iterations, setIterations] = useState(1);
  const [activeGeniusId, setActiveGeniusId] = useState(null);

  const [script, setScript] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [genius, setGenius] = useState(null);
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [savedScripts, setSavedScripts] = useState([]);

  // Live stream of iteration events from the SSE loop.
  // [{iteration, score, change, weaknesses, is_best, skipped}, ...]
  const [iterEvents, setIterEvents] = useState([]);
  const [streamStatus, setStreamStatus] = useState(""); // "iter 2 / 3" etc.
  const [streamError, setStreamError] = useState("");

  const [generating, setGenerating] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [iteratingGenius, setIteratingGenius] = useState(false);

  useEffect(() => {
    geniusPromptsList()
      .then((r) => setSavedPrompts(r.items || []))
      .catch(logErr("StudioView.geniusPromptsList"));
    scriptsList()
      .then((r) => setSavedScripts(r.items || []))
      .catch(logErr("StudioView.scriptsList"));
  }, []);

  const refreshSavedPrompts = () =>
    geniusPromptsList()
      .then((r) => setSavedPrompts(r.items || []))
      .catch(logErr("StudioView.geniusPromptsList"));

  const refreshSavedScripts = () =>
    scriptsList()
      .then((r) => setSavedScripts(r.items || []))
      .catch(logErr("StudioView.scriptsList"));

  const handleDeletePrompt = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm(t("studio.confirmDeletePrompt") || "Delete this saved genius prompt?")) return;
    try {
      await geniusPromptDelete(id);
      if (activeGeniusId === id) setActiveGeniusId(null);
      if (genius?.id === id) setGenius(null);
      refreshSavedPrompts();
    } catch (err) {
      logErr("StudioView.deletePrompt")(err);
    }
  };

  const handleDeleteScript = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm(t("studio.confirmDeleteScript") || "Delete this saved script?")) return;
    try {
      await scriptDelete(id);
      refreshSavedScripts();
    } catch (err) {
      logErr("StudioView.deleteScript")(err);
    }
  };

  const handleOpenSavedScript = async (id) => {
    try {
      const detail = await scriptDetail(id);
      setScript(detail);
      setEvaluation(null);
      setTopic(detail.topic || "");
      if (detail.platform) setPlatform(detail.platform);
      if (detail.style) setStyle(detail.style);
      if (detail.language) setLanguage(detail.language);
    } catch (err) {
      logErr("StudioView.openSavedScript")(err);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setScript(null);
    setEvaluation(null);
    setGenerating(true);
    try {
      const out = await scriptGenerate({
        topic: topic.trim(),
        platform,
        style,
        target_language: language,
        genius_prompt_id: activeGeniusId || undefined,
      });
      setScript(out);
      refreshSavedScripts();
    } catch (e) {
      logErr("StudioView.generate")(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleEvaluate = async () => {
    if (!script?.script) return;
    setEvaluation(null);
    setEvaluating(true);
    try {
      const out = await scriptEvaluate({ script: script.script, platform });
      setEvaluation(out);
    } catch (e) {
      logErr("StudioView.evaluate")(e);
    } finally {
      setEvaluating(false);
    }
  };

  const handleGenius = async () => {
    if (!topic.trim()) return;
    setGenius(null);
    setIterEvents([]);
    setStreamStatus("");
    setStreamError("");
    setIteratingGenius(true);
    try {
      const finalResult = await geniusPromptStream(
        {
          topic: topic.trim(),
          platform,
          style,
          target_score: Number(targetScore),
          iterations: Number(iterations),
          target_language: language,
        },
        (event) => {
          if (event.type === "start") {
            setStreamStatus(
              t("studio.streamStarting", { n: event.iterations }) || `Iter 0 / ${event.iterations}`,
            );
          } else if (event.type === "iter_start") {
            setStreamStatus(
              t("studio.streamIter", { i: event.iteration, n: event.total }) ||
                `Iter ${event.iteration} / ${event.total}`,
            );
          } else if (event.type === "iter_done") {
            setIterEvents((prev) => [...prev, event]);
          }
        },
      );
      if (finalResult) setGenius(finalResult);
      refreshSavedPrompts();
    } catch (e) {
      setStreamError(e?.message || String(e));
      logErr("StudioView.geniusLoop")(e);
    } finally {
      setIteratingGenius(false);
      setStreamStatus("");
    }
  };

  const applyGenius = (id) => {
    setActiveGeniusId(id);
    setGenius(savedPrompts.find((p) => p.id === id) || null);
  };

  // Send a script to the Crew Builder with an auto-composed production brief.
  // CrewView reads this hand-off key on mount and immediately pre-fills its input.
  const sendToCrew = (scriptText, version = null) => {
    if (!scriptText) return;
    const briefTag = version ? `Variant ${version}` : "Original";
    const brief =
      `Build the production checklist + shot list + voiceover storyboard for this ${platform} ` +
      `video script (${briefTag} · style: ${style} · language: ${language}). ` +
      `Treat the script below as the authoritative narrative.\n\n` +
      `TOPIC: ${topic.trim() || "(see script)"}\n` +
      `PLATFORM: ${platform}\nSTYLE: ${style}\n\n` +
      `=== SCRIPT ===\n${scriptText}\n=== END SCRIPT ===\n\n` +
      `Deliver: 1) a numbered production checklist (props, locations, B-roll), ` +
      `2) a shot list with timing for each scene, 3) voiceover storyboard with ` +
      `pacing notes, 4) QA test plan, 5) deployment/publish runbook.`;
    try {
      localStorage.setItem(
        "peter_ai.crew_handoff",
        JSON.stringify({ brief, source: "studio", topic, platform, style, at: Date.now() }),
      );
    } catch (e) {
      logErr("StudioView.sendToCrew localStorage")(e);
    }
    navigate("/crew");
  };

  const overallScore = Number(evaluation?.overall_score || 0);
  const eligibleForCrew = overallScore >= 8.0;

  const variants = evaluation?.variants || [];
  const bestVersion = evaluation?.recommendation?.best_version;

  return (
    <div className="p-12">
      <div className="text-[11px] tracking-[0.32em] uppercase text-peter-dim flex items-center gap-2">
        <FilmStrip size={14} weight="light" />
        {t("studio.label")}
      </div>
      <h1 className="h-display text-4xl text-peter-ivory mt-1">
        {t("studio.title")}{" "}
        <em className="text-peter-gold not-italic">{t("studio.titleAccent")}</em>
      </h1>
      <p className="text-peter-ivory/70 mt-3 max-w-3xl text-sm font-light leading-relaxed">
        {t("studio.subtitle")}
      </p>

      {/* Controls */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-6">
          <div className="text-[10px] tracking-[0.3em] uppercase text-peter-dim mb-1.5">
            {t("studio.topic")}
          </div>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t("studio.topicPlaceholder")}
            data-testid="studio-topic"
            className="w-full bg-peter-navy2 border border-peter-gold/25 focus:border-peter-gold/60 outline-none text-peter-ivory px-4 py-3 rounded-md font-light"
          />
        </div>
        <Select
          label={t("studio.platform")}
          value={platform}
          onChange={setPlatform}
          options={PLATFORMS}
          testid="studio-platform"
          className="md:col-span-2"
        />
        <Select
          label={t("studio.style")}
          value={style}
          onChange={setStyle}
          options={STYLES}
          testid="studio-style"
          className="md:col-span-2"
        />
        <Select
          label={t("studio.language")}
          value={language}
          onChange={setLanguage}
          options={LANGS}
          testid="studio-language"
          className="md:col-span-2"
        />
      </div>

      {/* Action row */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={!topic.trim() || generating}
          data-testid="studio-generate-btn"
          className="bg-peter-gold disabled:opacity-40 text-peter-black hover:bg-peter-goldLight transition-colors px-5 py-2.5 rounded-md font-medium inline-flex items-center gap-2 text-sm"
        >
          <Sparkle size={14} weight="fill" />
          {generating ? t("studio.generating") : t("studio.generate")}
        </button>
        <button
          onClick={handleEvaluate}
          disabled={!script?.script || evaluating}
          data-testid="studio-evaluate-btn"
          className="bg-peter-navy2 border border-peter-gold/40 text-peter-gold hover:border-peter-gold/70 disabled:opacity-40 transition-colors px-5 py-2.5 rounded-md font-medium inline-flex items-center gap-2 text-sm"
        >
          <Star size={14} weight="regular" />
          {evaluating ? t("studio.evaluating") : t("studio.evaluate")}
        </button>
        <div className="hairline h-6 w-px" />
        <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-peter-dim">
          <Brain size={12} weight="light" />
          {t("studio.iterations")}
          <input
            type="number"
            min="1"
            max="3"
            value={iterations}
            onChange={(e) => setIterations(e.target.value)}
            data-testid="studio-iterations"
            className="w-12 bg-peter-navy2 border border-peter-gold/20 px-2 py-1 rounded-sm text-center text-peter-ivory font-mono normal-case tracking-normal"
          />
        </div>
        <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-peter-dim">
          {t("studio.targetScore")}
          <input
            type="number"
            min="5"
            max="10"
            step="0.1"
            value={targetScore}
            onChange={(e) => setTargetScore(e.target.value)}
            data-testid="studio-target-score"
            className="w-14 bg-peter-navy2 border border-peter-gold/20 px-2 py-1 rounded-sm text-center text-peter-ivory font-mono normal-case tracking-normal"
          />
        </div>
        <button
          onClick={handleGenius}
          disabled={!topic.trim() || iteratingGenius}
          data-testid="studio-genius-btn"
          className="bg-peter-navy2 border border-peter-gold/40 text-peter-gold hover:border-peter-gold/70 disabled:opacity-40 transition-colors px-4 py-2.5 rounded-md font-medium inline-flex items-center gap-2 text-sm"
        >
          <Lightning size={14} weight="fill" />
          {iteratingGenius ? t("studio.geniusRunning") : t("studio.geniusLoop")}
        </button>
        <span className="inline-flex items-center gap-1 text-[10px] text-peter-dim/70">
          <Clock size={10} weight="regular" />
          {t("studio.timingHint")}
        </span>
      </div>

      {/* Live Stream Progress (visible during iteration or while showing results/errors) */}
      {(iteratingGenius || iterEvents.length > 0 || streamError) && (
        <div
          className="mt-4 p-3 rounded-md border border-peter-gold/30 bg-peter-gold/[0.04]"
          data-testid="studio-stream-progress"
        >
          <div className="flex items-center gap-3 mb-2">
            <Lightning
              size={12}
              weight="fill"
              className={iteratingGenius ? "text-peter-gold animate-pulse" : "text-peter-gold/60"}
            />
            <span className="text-[10px] tracking-[0.28em] uppercase text-peter-gold">
              {t("studio.geniusLiveStream") || "Live Stream"}
            </span>
            {streamStatus ? (
              <span
                className="text-[10px] font-mono text-peter-ivory/80"
                data-testid="studio-stream-status"
              >
                {streamStatus}
              </span>
            ) : null}
          </div>
          {streamError ? (
            <div
              className="text-[11px] text-red-300 bg-red-500/10 border border-red-500/30 rounded-sm px-2 py-1.5 mb-2"
              data-testid="studio-stream-error"
            >
              {t("studio.streamError") || "Stream interrupted"}: {streamError}
            </div>
          ) : null}
          {iterEvents.length === 0 && iteratingGenius ? (
            <div className="text-[11px] text-peter-dim/80 italic">
              {t("studio.streamWaiting") || "Designing meta-prompt…"}
            </div>
          ) : null}
          <ol className="space-y-1.5">
            {iterEvents.map((ev) => (
              <li
                key={ev.iteration}
                data-testid={`stream-iter-${ev.iteration}`}
                className={`flex items-start gap-3 text-[11px] font-mono ${
                  ev.is_best ? "text-peter-gold" : "text-peter-ivory/80"
                }`}
              >
                <span className="tnum w-12 shrink-0">v{ev.iteration}</span>
                <span className="tnum w-14 shrink-0">
                  {ev.skipped ? "—" : (Number(ev.score) || 0).toFixed(1)}
                </span>
                {ev.is_best ? (
                  <span className="text-[9px] tracking-widest uppercase text-peter-gold/90 px-1 border border-peter-gold/50 rounded-sm">
                    best
                  </span>
                ) : null}
                <span className="text-peter-ivory/65 leading-snug flex-1 normal-case font-light tracking-normal">
                  {ev.change}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Main board */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Script + Evaluation */}
        <div className="space-y-4">
          <div
            className="p-5 rounded-md border border-peter-gold/15 bg-peter-navy/40 min-h-[260px]"
            data-testid="studio-script-card"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] tracking-[0.32em] uppercase text-peter-dim">
                {t("studio.scriptOutput")}
              </div>
              {activeGeniusId ? (
                <span className="text-[9px] tracking-widest uppercase text-peter-gold border border-peter-gold/40 px-1.5 py-0.5 rounded-sm">
                  <Lightning size={9} weight="fill" className="inline mr-0.5" />
                  Genius
                </span>
              ) : null}
            </div>
            {script ? (
              <>
                <div className="text-xs text-peter-dim mb-2 flex flex-wrap gap-2">
                  <span className="text-peter-gold">↳ {script.hook}</span>
                  {script.duration_sec ? (
                    <span className="font-mono">· {script.duration_sec}s</span>
                  ) : null}
                </div>
                <div className="text-xs text-peter-ivory/90 font-light leading-relaxed max-h-[360px] overflow-y-auto pr-1">
                  <Markdown>{script.script}</Markdown>
                </div>
                {script.tags?.length ? (
                  <div className="mt-3 text-[10px] text-peter-dim/80 flex flex-wrap gap-1.5">
                    {script.tags.slice(0, 8).map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 rounded-sm bg-peter-navy2/60"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-peter-dim/60 text-sm italic mt-12 text-center">
                {generating ? t("studio.generating") : "—"}
              </div>
            )}
          </div>

          {evaluation ? (
            <div
              className="p-5 rounded-md border border-peter-gold/15 bg-peter-navy/40"
              data-testid="studio-evaluation-card"
            >
              <div className="flex items-end justify-between mb-3">
                <div className="text-[10px] tracking-[0.32em] uppercase text-peter-dim">
                  {t("studio.scriptScore")}
                </div>
                <div className="h-display text-4xl text-peter-gold tnum">
                  {Number(evaluation.overall_score || 0).toFixed(1)}
                  <span className="text-peter-dim text-xl">/10</span>
                </div>
              </div>
              <div className="space-y-2.5">
                <ScoreBar label={t("studio.hook")} value={evaluation.scores?.hook} />
                <ScoreBar label={t("studio.pacing")} value={evaluation.scores?.pacing} />
                <ScoreBar label={t("studio.cta")} value={evaluation.scores?.cta} />
                <ScoreBar label={t("studio.value")} value={evaluation.scores?.value} />
                <ScoreBar
                  label={t("studio.platformFit")}
                  value={evaluation.scores?.platform_optimization}
                />
              </div>
              {(evaluation.strengths?.length || evaluation.weaknesses?.length) ? (
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-[9px] tracking-[0.28em] uppercase text-peter-goldLight mb-1">
                      {t("studio.strengths")}
                    </div>
                    <ul className="space-y-0.5">
                      {(evaluation.strengths || []).map((s, i) => (
                        <li key={i} className="text-peter-ivory/80 leading-snug">
                          · {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[9px] tracking-[0.28em] uppercase text-peter-dim mb-1">
                      {t("studio.weaknesses")}
                    </div>
                    <ul className="space-y-0.5">
                      {(evaluation.weaknesses || []).map((s, i) => (
                        <li key={i} className="text-peter-ivory/70 leading-snug">
                          · {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => sendToCrew(script?.script)}
                disabled={!script?.script}
                data-testid="open-in-crew-original-btn"
                title={eligibleForCrew ? "" : t("studio.crewHintBelow8")}
                className={`mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-[10px] tracking-widest uppercase font-medium transition-all ${
                  eligibleForCrew
                    ? "bg-peter-gold text-peter-black hover:bg-peter-goldLight shadow-gold"
                    : "bg-peter-navy2 border border-peter-gold/30 text-peter-gold hover:border-peter-gold/60"
                }`}
              >
                <UsersThree size={12} weight="regular" />
                {t("studio.openInCrew")}
                {eligibleForCrew ? (
                  <span className="text-[9px] tracking-[0.18em] opacity-80">{t("studio.score8Plus")}</span>
                ) : null}
                <ArrowRight size={11} weight="bold" />
              </button>
            </div>
          ) : null}
        </div>

        {/* Right: Variants + Genius */}
        <div className="space-y-4">
          {variants.length ? (
            <div
              className="p-5 rounded-md border border-peter-gold/15 bg-peter-navy/40"
              data-testid="studio-variants-card"
            >
              <div className="text-[10px] tracking-[0.32em] uppercase text-peter-dim mb-3">
                {t("studio.variants")}
              </div>
              <div className="space-y-3">
                {variants.map((v) => (
                  <div
                    key={v.version}
                    className={`p-3 rounded-md border transition-colors ${
                      bestVersion === v.version
                        ? "border-peter-gold/50 bg-peter-gold/5"
                        : "border-peter-gold/15 bg-peter-navy2/40"
                    }`}
                    data-testid={`variant-${v.version}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] tracking-[0.32em] uppercase text-peter-gold">
                          {v.version}
                        </span>
                        <span className="text-xs text-peter-ivory/90 font-light">
                          {v.optimization}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-peter-gold tnum">
                        {Number(v.projected_score || 0).toFixed(1)} ·{" "}
                        {t("studio.projectedImprovement", { n: v.projected_improvement_pct || 0 })}
                      </div>
                    </div>
                    <div className="text-[11px] text-peter-ivory/75 leading-relaxed max-h-32 overflow-y-auto pr-1">
                      <Markdown>{v.script}</Markdown>
                    </div>
                    {Number(v.projected_score || 0) >= 8 ? (
                      <button
                        type="button"
                        onClick={() => sendToCrew(v.script, v.version)}
                        data-testid={`open-in-crew-variant-${v.version}-btn`}
                        className="mt-2 text-[9px] tracking-[0.24em] uppercase inline-flex items-center gap-1 text-peter-gold hover:text-peter-goldLight transition-colors"
                      >
                        <UsersThree size={10} weight="regular" />
                        {t("studio.openInCrew")}
                        <ArrowRight size={9} weight="bold" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              {evaluation?.recommendation ? (
                <div className="mt-4 p-3 rounded-md border border-peter-gold/40 bg-peter-gold/10">
                  <div className="text-[9px] tracking-[0.28em] uppercase text-peter-gold mb-1">
                    {t("studio.recommendation")}
                  </div>
                  <div className="text-xs text-peter-ivory">
                    {t("studio.useVersion", { v: evaluation.recommendation.best_version })}
                    {" — "}
                    <span className="text-peter-ivory/70">
                      {evaluation.recommendation.reason}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {genius ? (
            <div
              className="p-5 rounded-md border border-peter-gold/40 bg-peter-gold/[0.04]"
              data-testid="studio-genius-card"
            >
              <div className="flex items-center justify-between">
                <div className="text-[10px] tracking-[0.32em] uppercase text-peter-gold">
                  {t("studio.geniusPrompt")}
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="text-peter-ivory/80">
                    {t("studio.expected")}:{" "}
                    <span className="text-peter-gold tnum">
                      {Number(genius.expected_quality_score || 0).toFixed(1)}
                    </span>
                  </span>
                  <span className="text-peter-ivory/80">
                    {t("studio.confidence")}:{" "}
                    <span className="text-peter-gold tnum">
                      {Math.round((genius.confidence || 0) * 100)}%
                    </span>
                  </span>
                </div>
              </div>
              <pre className="mt-3 text-[11px] font-mono text-peter-ivory/85 leading-relaxed whitespace-pre-wrap bg-peter-black/60 border border-peter-gold/15 rounded-md p-3 max-h-72 overflow-y-auto">
                {genius.genius_prompt}
              </pre>
              {genius.evolution?.length ? (
                <div className="mt-3 text-[10px] text-peter-dim/80 space-y-0.5">
                  <span className="tracking-[0.24em] uppercase text-peter-goldLight">
                    {t("studio.evolution")}
                  </span>
                  {genius.evolution.map((ev) => (
                    <div key={ev.iteration} className="flex gap-2">
                      <span className="text-peter-gold tnum font-mono">
                        {t("studio.iter")} {ev.iteration}
                      </span>
                      <span className="font-mono tnum text-peter-ivory/70">
                        score {Number(ev.score || 0).toFixed(1)}
                      </span>
                      <span className="text-peter-ivory/60 truncate">{ev.change}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => setActiveGeniusId(genius.id)}
                data-testid="studio-genius-apply-btn"
                className={`mt-3 w-full text-[10px] tracking-widest uppercase px-3 py-2 rounded-sm font-medium inline-flex items-center justify-center gap-2 transition-colors ${
                  activeGeniusId === genius.id
                    ? "bg-peter-gold/20 text-peter-gold border border-peter-gold/40"
                    : "bg-peter-gold text-peter-black hover:bg-peter-goldLight"
                }`}
              >
                <ArrowRight size={12} weight="bold" />
                {activeGeniusId === genius.id ? "✓ Applied" : t("studio.useThisPrompt")}
              </button>
            </div>
          ) : null}

          {savedPrompts.length ? (
            <div
              className="p-5 rounded-md border border-peter-gold/15 bg-peter-navy/40"
              data-testid="studio-saved-prompts-card"
            >
              <div className="text-[10px] tracking-[0.32em] uppercase text-peter-dim mb-3">
                {t("studio.savedPrompts")}
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {savedPrompts.map((p) => (
                  <div
                    key={p.id}
                    className={`group flex items-center justify-between p-2 rounded-sm cursor-pointer transition-colors ${
                      activeGeniusId === p.id
                        ? "bg-peter-gold/10 border border-peter-gold/40"
                        : "hover:bg-peter-navy2/60 border border-transparent"
                    }`}
                    onClick={() => applyGenius(p.id)}
                    data-testid={`saved-prompt-${p.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-peter-ivory truncate">{p.topic}</div>
                      <div className="text-[10px] font-mono text-peter-dim">
                        {p.platform} · {p.style}
                        {p.language ? ` · ${p.language}` : ""}
                      </div>
                    </div>
                    <div className="text-[10px] tnum text-peter-gold font-mono ml-2">
                      {Number(p.expected_quality_score || 0).toFixed(1)}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeletePrompt(p.id, e)}
                      data-testid={`delete-saved-prompt-${p.id}`}
                      title={t("studio.deletePrompt") || "Delete"}
                      className="ml-2 p-1 rounded-sm text-peter-dim/60 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash size={12} weight="regular" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {savedScripts.length ? (
            <div
              className="p-5 rounded-md border border-peter-gold/15 bg-peter-navy/40"
              data-testid="studio-saved-scripts-card"
            >
              <div className="text-[10px] tracking-[0.32em] uppercase text-peter-dim mb-3">
                {t("studio.savedScripts") || "Saved scripts"}
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {savedScripts.map((s) => (
                  <div
                    key={s.id}
                    className="group flex items-center justify-between p-2 rounded-sm cursor-pointer hover:bg-peter-navy2/60 border border-transparent transition-colors"
                    onClick={() => handleOpenSavedScript(s.id)}
                    data-testid={`saved-script-${s.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-peter-ivory truncate">{s.topic}</div>
                      <div className="text-[10px] font-mono text-peter-dim">
                        {s.platform} · {s.style}
                        {s.language ? ` · ${s.language}` : ""}
                        {s.duration_sec ? ` · ${s.duration_sec}s` : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteScript(s.id, e)}
                      data-testid={`delete-saved-script-${s.id}`}
                      title={t("studio.deleteScript") || "Delete"}
                      className="ml-2 p-1 rounded-sm text-peter-dim/60 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash size={12} weight="regular" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options, testid, className = "" }) {
  return (
    <div className={className}>
      <div className="text-[10px] tracking-[0.3em] uppercase text-peter-dim mb-1.5">
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testid}
        className="w-full bg-peter-navy2 border border-peter-gold/25 focus:border-peter-gold/60 outline-none text-peter-ivory px-3 py-3 rounded-md font-mono text-xs"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
