import React, { useEffect, useState, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import { classify, tiers } from "../lib/api";

const TIER_ORDER = ["free", "cheap", "smart", "critical"];

function ClassifierNode({ data }) {
  return (
    <div
      className="px-5 py-4 rounded-md bg-peter-navy2 border border-peter-gold/40 shadow-gold min-w-[200px]"
      data-testid="node-classifier"
    >
      <Handle type="target" position={Position.Left} className="!bg-peter-gold" />
      <Handle type="source" position={Position.Right} className="!bg-peter-gold" />
      <div className="text-[10px] tracking-[0.3em] uppercase text-peter-gold/80">
        Classifier
      </div>
      <div className="h-display text-xl text-peter-ivory mt-1">Pattern + heuristic</div>
      <div className="text-xs text-peter-dim mt-1 font-mono">
        {data.query ? `"${data.query.slice(0, 30)}${data.query.length > 30 ? "…" : ""}"` : "Awaiting query…"}
      </div>
    </div>
  );
}

function QueryNode({ data }) {
  return (
    <div
      className="px-5 py-4 rounded-md bg-peter-navy border border-peter-gold/30 min-w-[200px]"
      data-testid="node-query"
    >
      <Handle type="source" position={Position.Right} className="!bg-peter-gold" />
      <div className="text-[10px] tracking-[0.3em] uppercase text-peter-dim">User Query</div>
      <div className="text-sm text-peter-ivory mt-1 font-light">
        {data.query || "—"}
      </div>
    </div>
  );
}

function TierNode({ data }) {
  return (
    <div
      className={`px-5 py-4 rounded-md min-w-[200px] transition-all duration-300 ${
        data.active
          ? "bg-peter-navy2 border-2 border-peter-gold shadow-goldStrong node-pulse"
          : "bg-peter-navy/70 border border-peter-gold/15 opacity-60"
      }`}
      data-testid={`node-tier-${data.id}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-peter-gold" />
      <div
        className="text-[10px] tracking-[0.3em] uppercase mb-1"
        style={{ color: data.color }}
      >
        {data.label}
      </div>
      <div className="h-display text-lg text-peter-ivory">{data.name}</div>
      <div className="text-[10px] text-peter-dim mt-1 font-mono">{data.model}</div>
      <div className="hairline my-2" />
      <div className="flex justify-between text-[10px] text-peter-dim">
        <span className="tnum">${data.cost.toFixed(4)}/1K</span>
        <span className="tnum">~{data.latency} ms</span>
      </div>
    </div>
  );
}

const nodeTypes = {
  classifier: ClassifierNode,
  query: QueryNode,
  tier: TierNode,
};

export default function RouterView() {
  const [tierCatalog, setTierCatalog] = useState({});
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [classifying, setClassifying] = useState(false);

  useEffect(() => {
    tiers().then((r) => setTierCatalog(r.tiers)).catch(() => {});
  }, []);

  const activeTier = result?.tier;

  const nodes = useMemo(() => {
    const out = [
      {
        id: "query",
        type: "query",
        position: { x: 0, y: 200 },
        data: { query: result ? result.query : query },
      },
      {
        id: "classifier",
        type: "classifier",
        position: { x: 290, y: 200 },
        data: { query: result ? result.query : query },
      },
    ];
    TIER_ORDER.forEach((tid, idx) => {
      const t = tierCatalog[tid];
      if (!t) return;
      out.push({
        id: `tier-${tid}`,
        type: "tier",
        position: { x: 620, y: 40 + idx * 130 },
        data: {
          id: t.id,
          label: t.label,
          name: t.name,
          model: t.preview_model,
          cost: t.cost_per_1k_usd,
          latency: t.typical_latency_ms,
          color: t.color,
          active: activeTier === tid,
        },
      });
    });
    return out;
  }, [tierCatalog, query, result, activeTier]);

  const edges = useMemo(() => {
    const base = [
      {
        id: "e-q-c",
        source: "query",
        target: "classifier",
        animated: true,
        style: { stroke: "#C9A84C" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#C9A84C" },
      },
    ];
    TIER_ORDER.forEach((tid) => {
      const isActive = activeTier === tid;
      base.push({
        id: `e-c-${tid}`,
        source: "classifier",
        target: `tier-${tid}`,
        animated: isActive,
        style: {
          stroke: isActive ? "#C9A84C" : "rgba(201,168,76,0.18)",
          strokeWidth: isActive ? 2 : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isActive ? "#C9A84C" : "rgba(201,168,76,0.18)",
        },
      });
    });
    return base;
  }, [activeTier]);

  const handleClassify = async () => {
    if (!query.trim()) return;
    setClassifying(true);
    try {
      const r = await classify(query.trim());
      setResult(r);
    } finally {
      setClassifying(false);
    }
  };

  const examples = [
    "What time is it in London?",
    "Translate 'good evening' to Japanese.",
    "Analyze our Q3 churn data and suggest a strategy.",
    "Architect a scalable event-driven order system.",
    "I need legal advice on a contract clause.",
  ];

  return (
    <div className="p-12">
      <div className="text-[11px] tracking-[0.32em] uppercase text-peter-dim">
        Intelligent AI Router
      </div>
      <h1 className="h-display text-4xl text-peter-ivory mt-1">
        Routing as <em className="text-peter-gold not-italic">choreography</em>
      </h1>
      <p className="text-peter-ivory/70 mt-3 max-w-3xl text-sm font-light leading-relaxed">
        Type a query and watch PETER classify it instantly — no LLM call required. The
        active tier ignites; the rest dim. Every routing decision is auditable.
      </p>

      <div className="mt-8 flex flex-wrap gap-3 items-stretch">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleClassify()}
          placeholder="A query to route…"
          data-testid="router-query-input"
          className="flex-1 min-w-[320px] bg-peter-navy2 border border-peter-gold/25 focus:border-peter-gold/60 outline-none text-peter-ivory px-4 py-3 rounded-md font-light"
        />
        <button
          onClick={handleClassify}
          disabled={classifying || !query.trim()}
          data-testid="router-classify-btn"
          className="bg-peter-gold disabled:opacity-40 text-peter-black hover:bg-peter-goldLight transition-colors px-6 py-3 rounded-md font-medium"
        >
          {classifying ? "Classifying…" : "Classify"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => setQuery(ex)}
            className="text-[11px] px-3 py-1.5 rounded-full border border-peter-gold/20 text-peter-dim hover:text-peter-ivory hover:border-peter-gold/50 transition-colors"
            data-testid={`router-example-${ex.slice(0, 10)}`}
          >
            {ex}
          </button>
        ))}
      </div>

      <div
        className="mt-6 relative bg-peter-navy/30 border border-peter-gold/15 rounded-lg overflow-hidden"
        style={{ height: 620 }}
        data-testid="router-canvas"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          panOnDrag
          zoomOnScroll={false}
        >
          <Background gap={28} color="rgba(201,168,76,0.06)" />
          <Controls className="!bg-peter-navy2 !border !border-peter-gold/20" />
        </ReactFlow>

        <AnimatePresence>
          {result ? (
            <motion.div
              key={result.tier}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="absolute right-4 bottom-4 w-72 glass-strong rounded-md p-4"
              data-testid="router-result-card"
            >
              <div
                className="text-[10px] tracking-[0.3em] uppercase mb-1"
                style={{ color: result.tier_meta.color }}
              >
                Routed → {result.tier_meta.label}
              </div>
              <div className="h-display text-xl text-peter-ivory">
                {result.tier_meta.name}
              </div>
              <div className="text-[11px] text-peter-dim mt-1 font-mono">
                {result.tier_meta.preview_model}
              </div>
              <div className="hairline my-3" />
              <div className="text-xs text-peter-ivory/80">
                <span className="text-peter-dim uppercase tracking-widest text-[9px] block mb-1">
                  Match
                </span>
                {result.matched_pattern || "default heuristic"}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
