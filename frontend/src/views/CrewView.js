import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion } from "framer-motion";
import { CheckCircle, CircleNotch, Circle, WarningCircle } from "@phosphor-icons/react";
import { agents as listAgents, crewBuild, crewStatus, crewList } from "../lib/api";
import Markdown from "../components/Markdown";
import { logErr } from "../lib/logErr";

const STATUS_ICON = {
  pending: Circle,
  running: CircleNotch,
  done: CheckCircle,
  error: WarningCircle,
};

const STATUS_COLOR = {
  pending: "#888880",
  running: "#C9A84C",
  done: "#E8D5A3",
  error: "#FF6B6B",
};

function AgentNode({ data }) {
  const Icon = STATUS_ICON[data.status] || Circle;
  const color = STATUS_COLOR[data.status] || "#888880";
  const isRunning = data.status === "running";
  return (
    <div
      className={`px-4 py-3 rounded-md w-[220px] transition-all duration-300 ${
        data.selected
          ? "bg-peter-navy2 border-2 border-peter-gold shadow-gold"
          : isRunning
          ? "bg-peter-navy2 border border-peter-gold node-pulse"
          : data.status === "done"
          ? "bg-peter-navy2 border border-peter-goldLight/50"
          : "bg-peter-navy/60 border border-peter-gold/15"
      }`}
      onClick={data.onClick}
      data-testid={`agent-node-${data.id}`}
      style={{ cursor: "pointer" }}
    >
      <Handle type="target" position={Position.Left} className="!bg-peter-gold" />
      <Handle type="source" position={Position.Right} className="!bg-peter-gold" />
      <div className="flex items-center gap-2">
        <Icon
          size={16}
          weight={data.status === "done" ? "fill" : "regular"}
          color={color}
          className={isRunning ? "animate-spin" : ""}
        />
        <div className="text-[10px] tracking-[0.25em] uppercase text-peter-dim">
          {data.tier}
        </div>
      </div>
      <div className="h-display text-base text-peter-ivory mt-1 leading-tight">{data.role}</div>
      <div className="text-[10px] text-peter-dim mt-1 leading-snug line-clamp-2">{data.goal}</div>
    </div>
  );
}

const nodeTypes = { agent: AgentNode };

export default function CrewView() {
  const { t, i18n } = useTranslation();
  const [blueprint, setBlueprint] = useState([]);
  const [reqs, setReqs] = useState("");
  const [runId, setRunId] = useState(null);
  const [run, setRun] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [pastRuns, setPastRuns] = useState([]);
  const pollRef = useRef(null);

  // Re-fetch the agent blueprint whenever the UI language changes so the
  // backend can return localised role + goal strings.
  useEffect(() => {
    listAgents().then((r) => setBlueprint(r.agents)).catch(logErr("CrewView.listAgents"));
    crewList().then((r) => setPastRuns(r.runs)).catch(logErr("CrewView.crewList"));
  }, [i18n.language]);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      try {
        const r = await crewStatus(runId);
        if (cancelled) return;
        setRun(r);
        if (r.status === "running") {
          pollRef.current = setTimeout(poll, 1500);
        } else {
          crewList().then((res) => setPastRuns(res.runs)).catch(logErr("CrewView.crewList"));
        }
      } catch (e) {
        if (cancelled) return;
        // Transient network error during long-poll is expected; back off and retry.
        console.error("[CrewView] poll error, retrying in 3s", e);
        pollRef.current = setTimeout(poll, 3000);
      }
    };
    poll();
    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [runId]);

  const agentList = run?.agents || blueprint.map((a) => ({ ...a, status: "pending" }));

  const nodes = useMemo(() => {
    // Wider horizontal/vertical spacing so 4-per-row × 220px cards never collide
    // even on narrow embedded previews. fitView in the canvas auto-scales them.
    return agentList.map((a, i) => ({
      id: a.id,
      type: "agent",
      position: { x: (i % 4) * 280, y: Math.floor(i / 4) * 200 },
      data: {
        ...a,
        selected: i === selectedIdx,
        onClick: () => setSelectedIdx(i),
      },
    }));
  }, [agentList, selectedIdx]);

  const edges = useMemo(() => {
    const out = [];
    for (let i = 0; i < agentList.length - 1; i++) {
      const a = agentList[i];
      const b = agentList[i + 1];
      const animated = a.status === "done" && b.status === "running";
      out.push({
        id: `${a.id}->${b.id}`,
        source: a.id,
        target: b.id,
        animated,
        style: {
          stroke: a.status === "done" ? "#C9A84C" : "rgba(201,168,76,0.18)",
          strokeWidth: a.status === "done" ? 2 : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: a.status === "done" ? "#C9A84C" : "rgba(201,168,76,0.18)",
        },
      });
    }
    return out;
  }, [agentList]);

  const start = async () => {
    if (!reqs.trim()) return;
    setRun(null);
    setSelectedIdx(0);
    const r = await crewBuild(reqs.trim());
    setRunId(r.run_id);
  };

  const selected = agentList[selectedIdx];

  return (
    <div className="p-12">
      <div className="text-[11px] tracking-[0.32em] uppercase text-peter-dim">
        {t("crew.label")}
      </div>
      <h1 className="h-display text-4xl text-peter-ivory mt-1">
        {t("crew.title")} <em className="text-peter-gold not-italic">{t("crew.titleAccent")}</em>
      </h1>
      <p className="text-peter-ivory/70 mt-3 max-w-3xl text-sm font-light leading-relaxed">
        {t("crew.subtitle")}
      </p>

      <div className="mt-8 flex gap-3">
        <textarea
          value={reqs}
          onChange={(e) => setReqs(e.target.value)}
          rows={2}
          placeholder={t("crew.placeholder")}
          data-testid="crew-requirements-input"
          className="flex-1 bg-peter-navy2 border border-peter-gold/25 focus:border-peter-gold/60 outline-none text-peter-ivory px-4 py-3 rounded-md font-light resize-none"
        />
        <button
          onClick={start}
          disabled={!reqs.trim() || run?.status === "running"}
          data-testid="crew-start-btn"
          className="bg-peter-gold disabled:opacity-40 text-peter-black hover:bg-peter-goldLight transition-colors px-6 py-3 rounded-md font-medium self-stretch"
        >
          {run?.status === "running" ? t("crew.building") : t("crew.dispatch")}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-12 gap-4">
        <div
          className="col-span-12 lg:col-span-8 bg-peter-navy/30 border border-peter-gold/15 rounded-lg overflow-hidden"
          style={{ height: 540 }}
          data-testid="crew-canvas"
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            proOptions={{ hideAttribution: true }}
            panOnDrag
            zoomOnScroll={false}
          >
            <Background gap={28} color="rgba(201,168,76,0.06)" />
            <Controls className="!bg-peter-navy2 !border !border-peter-gold/20" />
          </ReactFlow>
        </div>

        <motion.div
          key={selected?.id}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          className="col-span-12 lg:col-span-4 bg-peter-navy/40 border border-peter-gold/20 rounded-lg p-5 flex flex-col"
          style={{ height: 540 }}
          data-testid="crew-side-panel"
        >
          {selected ? (
            <>
              <div
                className="text-[10px] tracking-[0.3em] uppercase mb-1"
                style={{ color: STATUS_COLOR[selected.status] }}
              >
                {t(`crew.status${selected.status.charAt(0).toUpperCase()}${selected.status.slice(1)}`, selected.status)}
              </div>
              <div className="h-display text-2xl text-peter-ivory">{selected.role}</div>
              <div className="text-[11px] text-peter-dim mt-1 font-mono">
                {t("crew.tier")}: {selected.tier}
                {selected.model ? ` · ${selected.model}` : ""}
              </div>
              <div className="text-xs text-peter-ivory/70 mt-3 leading-relaxed font-light">
                {selected.goal}
              </div>
              <div className="hairline my-4" />
              <div className="text-[10px] tracking-[0.3em] uppercase text-peter-dim mb-2">
                {t("crew.output")}
              </div>
              <div
                className="flex-1 overflow-y-auto text-xs text-peter-ivory/90 font-light leading-relaxed pr-1"
                data-testid="crew-agent-output"
              >
                {selected.output ? (
                  <Markdown>{selected.output}</Markdown>
                ) : selected.status === "running" ? (
                  <span className="italic">{t("crew.thinking")}</span>
                ) : selected.status === "pending" ? (
                  <span className="italic text-peter-dim">{t("crew.awaitingContext")}</span>
                ) : (
                  <span className="italic text-peter-dim">{t("crew.noOutput")}</span>
                )}
              </div>
              {(selected.cost_usd || selected.latency_ms) && (
                <div className="mt-3 flex gap-3 text-[10px] text-peter-dim tnum">
                  {selected.cost_usd != null && (
                    <span>cost ${Number(selected.cost_usd).toFixed(5)}</span>
                  )}
                  {selected.latency_ms != null && (
                    <span>{selected.latency_ms} ms</span>
                  )}
                  {selected.saved_usd != null && (
                    <span className="text-peter-gold">
                      saved ${Number(selected.saved_usd).toFixed(5)}
                    </span>
                  )}
                </div>
              )}
            </>
          ) : null}
        </motion.div>
      </div>

      {run ? (
        <div className="mt-4 flex flex-wrap gap-6 text-sm text-peter-ivory/80">
          <div>
            <span className="text-[10px] tracking-[0.3em] uppercase text-peter-dim mr-2">
              {t("crew.run")}
            </span>
            <span className="font-mono text-xs">{run.id.slice(0, 8)}</span>
          </div>
          <div>
            <span className="text-[10px] tracking-[0.3em] uppercase text-peter-dim mr-2">
              {t("crew.status")}
            </span>
            <span style={{ color: STATUS_COLOR[run.status] || "#C9A84C" }}>
              {t(`crew.status${run.status.charAt(0).toUpperCase()}${run.status.slice(1)}`, run.status)}
            </span>
          </div>
          <div>
            <span className="text-[10px] tracking-[0.3em] uppercase text-peter-dim mr-2">
              {t("crew.totalCost")}
            </span>
            <span className="tnum">${(run.total_cost_usd || 0).toFixed(5)}</span>
          </div>
          <div>
            <span className="text-[10px] tracking-[0.3em] uppercase text-peter-dim mr-2">
              {t("crew.savedVsPremium")}
            </span>
            <span className="tnum text-peter-gold">
              ${(run.total_saved_usd || 0).toFixed(5)}
            </span>
          </div>
        </div>
      ) : null}

      {pastRuns.length ? (
        <div className="mt-10">
          <div className="text-[11px] tracking-[0.32em] uppercase text-peter-dim mb-3">
            {t("crew.recent")}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pastRuns.slice(0, 6).map((r) => (
              <button
                key={r.id}
                onClick={() => setRunId(r.id)}
                data-testid={`past-run-${r.id}`}
                className="text-left px-4 py-3 bg-peter-navy/40 border border-peter-gold/15 hover:border-peter-gold/40 rounded-md transition-colors"
              >
                <div
                  className="text-[10px] tracking-[0.3em] uppercase mb-1"
                  style={{ color: STATUS_COLOR[r.status] }}
                >
                  {t(`crew.status${r.status.charAt(0).toUpperCase()}${r.status.slice(1)}`, r.status)}
                </div>
                <div className="text-sm text-peter-ivory/90 font-light truncate">
                  {r.requirements}
                </div>
                <div className="text-[10px] text-peter-dim mt-1 font-mono">
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
