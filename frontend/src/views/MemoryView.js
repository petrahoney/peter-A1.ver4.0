import React, { useEffect, useState, useCallback } from "react";
import {
  Brain,
  Plus,
  Trash,
  CheckCircle,
  X,
  MagnifyingGlass,
  Graph as GraphIcon,
  List,
  Download,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import ReactFlow, { Background, Handle, Position } from "reactflow";
import "reactflow/dist/style.css";
import { BACKEND } from "../lib/api";
import { useWorkspace } from "../context/WorkspaceContext";

const TYPE_COLORS = {
  preference: "#C9A84C",
  project: "#E8D5A3",
  fact: "#C0C0C0",
  goal: "#F5F5F0",
  theme: "#8B6914",
  note: "#888880",
};

const TYPES = ["preference", "project", "fact", "goal", "theme", "note"];

async function api(path, opts = {}) {
  const res = await fetch(`${BACKEND}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function withWs(path, workspaceId) {
  if (!workspaceId) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}workspace_id=${encodeURIComponent(workspaceId)}`;
}

function MemoryCard({ m, onDelete }) {
  const color = TYPE_COLORS[m.type] || "#C9A84C";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25 }}
      className="group relative p-5 bg-peter-navy/40 border border-peter-gold/15 rounded-lg hover:border-peter-gold/40 transition-colors"
      data-testid={`memory-card-${m.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="px-2 py-0.5 text-[10px] tracking-[0.25em] uppercase rounded-sm border font-medium tnum"
          style={{ color, borderColor: color + "66" }}
        >
          {m.type}
        </span>
        <button
          onClick={() => onDelete(m.id)}
          data-testid={`memory-delete-${m.id}`}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-peter-dim hover:text-red-400 p-1"
          title="Forget this memory"
        >
          <Trash size={14} weight="regular" />
        </button>
      </div>
      <p
        className="mt-3 text-[14px] font-light leading-relaxed"
        style={{ color: "#E5E5E5" }}
      >
        {m.content}
      </p>
      <div className="mt-3 text-[10px] text-peter-dim/70 font-mono">
        {m.created_at ? new Date(m.created_at).toLocaleString() : ""}
        {m.session_id && m.session_id !== "manual" ? (
          <span className="ml-3">from session {m.session_id.slice(0, 8)}</span>
        ) : m.session_id === "manual" ? (
          <span className="ml-3 text-peter-gold/70">manual entry</span>
        ) : null}
      </div>
    </motion.div>
  );
}

function ClusterNode({ data }) {
  return (
    <div
      className="px-4 py-3 rounded-md bg-peter-navy2 border-2 shadow-gold min-w-[160px] text-center"
      style={{ borderColor: data.color }}
    >
      <Handle type="source" position={Position.Right} style={{ background: data.color }} />
      <Handle type="target" position={Position.Left} style={{ background: data.color }} />
      <div
        className="text-[10px] tracking-[0.3em] uppercase font-medium"
        style={{ color: data.color }}
      >
        {data.type}
      </div>
      <div className="h-display text-3xl text-peter-ivory tnum mt-1">{data.count}</div>
      <div className="text-[10px] text-peter-dim uppercase tracking-widest">memories</div>
    </div>
  );
}

function MemoryLeafNode({ data }) {
  return (
    <div
      className="px-3 py-2 rounded-md bg-peter-navy/70 border border-peter-gold/20 max-w-[260px]"
      title={data.content}
    >
      <Handle type="target" position={Position.Left} className="!bg-peter-gold" />
      <p className="text-[11px] font-light leading-relaxed line-clamp-3" style={{ color: "#E5E5E5" }}>
        {data.content}
      </p>
    </div>
  );
}

const flowNodeTypes = { cluster: ClusterNode, memory: MemoryLeafNode };

function MemoryGraph({ workspaceId, memories }) {
  // Build nodes/edges from `memories` (already loaded for the list view).
  const groups = {};
  for (const m of memories) {
    (groups[m.type] = groups[m.type] || []).push(m);
  }
  const types = Object.keys(groups).sort();
  const nodes = [];
  const edges = [];
  const cx = 480;
  const cy = 320;
  const clusterRadius = 220;
  types.forEach((t, i) => {
    const ang = (2 * Math.PI * i) / Math.max(types.length, 1) - Math.PI / 2;
    const x = cx + Math.cos(ang) * clusterRadius;
    const y = cy + Math.sin(ang) * clusterRadius;
    const color = TYPE_COLORS[t] || "#C9A84C";
    nodes.push({
      id: `cluster-${t}`,
      type: "cluster",
      position: { x, y },
      data: { type: t, count: groups[t].length, color },
    });
    // Add up to 6 leaf memories around each cluster
    const memsToShow = groups[t].slice(0, 6);
    memsToShow.forEach((m, j) => {
      const sub = (j - (memsToShow.length - 1) / 2) * 0.45;
      const lx = x + Math.cos(ang) * 260 + Math.cos(ang + Math.PI / 2) * sub * 80;
      const ly = y + Math.sin(ang) * 260 + Math.sin(ang + Math.PI / 2) * sub * 80;
      const lid = `mem-${m.id}`;
      nodes.push({
        id: lid,
        type: "memory",
        position: { x: lx, y: ly },
        data: { content: m.content },
      });
      edges.push({
        id: `e-${t}-${lid}`,
        source: `cluster-${t}`,
        target: lid,
        style: { stroke: color + "66", strokeWidth: 1 },
      });
    });
  });
  return (
    <div
      className="bg-peter-navy/20 border border-peter-gold/15 rounded-lg overflow-hidden"
      style={{ height: 620 }}
      data-testid="memory-graph"
    >
      {nodes.length === 0 ? (
        <div className="h-full flex items-center justify-center text-peter-dim text-sm">
          No memories to visualise{workspaceId ? " in this workspace" : ""}.
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={flowNodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          panOnDrag
          zoomOnScroll={false}
        >
          <Background gap={28} color="rgba(201,168,76,0.06)" />
        </ReactFlow>
      )}
    </div>
  );
}

export default function MemoryView() {
  const { active, activeId } = useWorkspace();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("note");
  const [view, setView] = useState("list"); // "list" | "graph"

  const refresh = useCallback(async () => {
    try {
      const d = await api(withWs("/memory", activeId));
      setMemories(d.memories);
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    api(withWs("/memory", activeId))
      .then((d) => {
        if (cancelled) return;
        timer = setTimeout(() => {
          setMemories(d.memories);
          setLoading(false);
        }, 0);
      })
      .catch(() => {
        if (cancelled) return;
        timer = setTimeout(() => setLoading(false), 0);
      });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [activeId]);

  const addMemory = async () => {
    const content = newContent.trim();
    if (!content) return;
    await api("/memory", {
      method: "POST",
      body: JSON.stringify({
        content,
        type: newType,
        workspace_id: activeId || null,
      }),
    });
    setNewContent("");
    setNewType("note");
    setAdding(false);
    refresh();
  };

  const deleteMemory = async (id) => {
    if (!window.confirm("Forget this memory permanently?")) return;
    await api(`/memory/${id}`, { method: "DELETE" });
    refresh();
    if (searchResults)
      setSearchResults(searchResults.filter((m) => m.id !== id));
  };

  const clearAll = async () => {
    const scope = active ? `the "${active.name}" workspace` : "every workspace";
    if (
      !window.confirm(
        `Forget ALL memories in ${scope}? This cannot be undone — PETER will lose every cross-session insight in this scope.`,
      )
    )
      return;
    await api(withWs("/memory", activeId), { method: "DELETE" });
    refresh();
    setSearchResults(null);
  };

  const exportJson = async () => {
    const d = await api(withWs("/memory/export", activeId));
    const blob = new Blob([JSON.stringify(d, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const wsTag = active ? `-${active.name.toLowerCase().replace(/\s+/g, "-")}` : "";
    a.download = `peter-memory${wsTag}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const runSearch = async () => {
    const q = search.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    const d = await api(
      withWs(`/memory/recall?q=${encodeURIComponent(q)}&limit=10`, activeId),
    );
    setSearchResults(d.memories);
  };

  const onSearchKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runSearch();
    }
  };

  const counts = TYPES.reduce((acc, t) => {
    acc[t] = memories.filter((m) => m.type === t).length;
    return acc;
  }, {});

  const visible = searchResults
    ? searchResults
    : filter
    ? memories.filter((m) => m.type === filter)
    : memories;

  return (
    <div className="p-12 min-h-screen" data-testid="memory-view">
      <div className="flex items-end justify-between gap-6 mb-2">
        <div>
          <div className="text-[11px] tracking-[0.32em] uppercase text-peter-dim flex items-center gap-2">
            <Brain size={14} weight="light" />
            Strategist Memory
            {active ? (
              <span
                className="ml-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[9px] tracking-widest"
                style={{ color: active.color, borderColor: active.color + "66" }}
                data-testid="memory-workspace-pill"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: active.color }} />
                {active.name.toUpperCase()}
              </span>
            ) : null}
          </div>
          <h1 className="h-display text-4xl text-peter-ivory mt-1">
            The <em className="text-peter-gold not-italic">long-form</em> mind
          </h1>
        </div>
        <div className="flex items-end gap-6">
          <div className="text-right">
            <div className="h-display text-4xl text-peter-gold tnum" data-testid="memory-count">
              {memories.length}
            </div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-peter-dim">
              memories held
            </div>
          </div>
          <div className="flex items-center bg-peter-navy2 border border-peter-gold/20 rounded-md p-1">
            <button
              onClick={() => setView("list")}
              data-testid="memory-view-list"
              className={[
                "px-3 py-1.5 rounded text-[11px] tracking-widest uppercase inline-flex items-center gap-1.5 transition-colors",
                view === "list"
                  ? "bg-peter-gold/15 text-peter-gold"
                  : "text-peter-dim hover:text-peter-ivory",
              ].join(" ")}
            >
              <List size={12} weight="bold" /> List
            </button>
            <button
              onClick={() => setView("graph")}
              data-testid="memory-view-graph"
              className={[
                "px-3 py-1.5 rounded text-[11px] tracking-widest uppercase inline-flex items-center gap-1.5 transition-colors",
                view === "graph"
                  ? "bg-peter-gold/15 text-peter-gold"
                  : "text-peter-dim hover:text-peter-ivory",
              ].join(" ")}
            >
              <GraphIcon size={12} weight="bold" /> Graph
            </button>
          </div>
        </div>
      </div>
      <p className="text-peter-ivory/70 max-w-3xl text-sm font-light leading-relaxed">
        Durable insights distilled from every conversation — your preferences,
        projects, goals and recurring strategic themes. PETER recalls the most
        relevant ones at the start of each new turn so reasoning compounds
        across sessions.
      </p>

      {/* Search + actions */}
      <div className="mt-8 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[320px] flex items-center bg-peter-navy2 border border-peter-gold/25 focus-within:border-peter-gold/60 rounded-md transition-colors">
          <MagnifyingGlass size={16} weight="light" className="text-peter-dim ml-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder="Semantic recall — e.g. 'what is the user building?'"
            data-testid="memory-search-input"
            className="flex-1 bg-transparent outline-none px-3 py-3 font-light placeholder:text-peter-dim/60"
            style={{ color: "#E5E5E5" }}
          />
          {search ? (
            <button
              onClick={() => {
                setSearch("");
                setSearchResults(null);
              }}
              className="text-peter-dim hover:text-peter-ivory p-2"
            >
              <X size={14} />
            </button>
          ) : null}
          <button
            onClick={runSearch}
            data-testid="memory-search-btn"
            className="text-peter-black bg-peter-gold hover:bg-peter-goldLight font-medium px-4 py-2 m-1 rounded-md text-sm"
          >
            Recall
          </button>
        </div>
        <button
          onClick={() => setAdding(true)}
          data-testid="memory-add-btn"
          className="bg-transparent text-peter-gold border border-peter-gold/60 hover:bg-peter-gold/10 transition-colors px-5 py-3 rounded-md font-medium inline-flex items-center gap-2"
        >
          <Plus size={16} weight="bold" /> Teach PETER
        </button>
        {memories.length > 0 ? (
          <button
            onClick={exportJson}
            data-testid="memory-export-btn"
            className="bg-transparent text-peter-ivory/80 border border-peter-gold/30 hover:border-peter-gold/60 hover:text-peter-ivory transition-colors px-4 py-3 rounded-md text-sm inline-flex items-center gap-2"
            title="Download a JSON snapshot of every memory in scope"
          >
            <Download size={14} weight="bold" /> Export JSON
          </button>
        ) : null}
        {memories.length > 0 ? (
          <button
            onClick={clearAll}
            data-testid="memory-clear-btn"
            className="text-peter-dim hover:text-red-400 text-sm transition-colors"
          >
            Forget all
          </button>
        ) : null}
      </div>

      {/* Type filter chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("")}
          className={[
            "text-[11px] px-3 py-1.5 rounded-full border transition-colors",
            filter === ""
              ? "border-peter-gold text-peter-gold bg-peter-gold/10"
              : "border-peter-gold/20 text-peter-dim hover:text-peter-ivory hover:border-peter-gold/50",
          ].join(" ")}
        >
          All · {memories.length}
        </button>
        {TYPES.map((t) =>
          counts[t] > 0 ? (
            <button
              key={t}
              onClick={() => setFilter(filter === t ? "" : t)}
              className={[
                "text-[11px] px-3 py-1.5 rounded-full border transition-colors",
                filter === t
                  ? "text-peter-black bg-peter-gold border-peter-gold"
                  : "border-peter-gold/20 text-peter-dim hover:text-peter-ivory hover:border-peter-gold/50",
              ].join(" ")}
              style={{ borderColor: filter === t ? TYPE_COLORS[t] : undefined }}
              data-testid={`memory-filter-${t}`}
            >
              {t} · {counts[t]}
            </button>
          ) : null
        )}
      </div>

      {/* Add panel */}
      <AnimatePresence>
        {adding ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-5 overflow-hidden"
          >
            <div className="p-5 bg-peter-navy2/50 border border-peter-gold/30 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] tracking-[0.3em] uppercase text-peter-dim">
                  Teach PETER something durable
                </div>
                <button
                  onClick={() => setAdding(false)}
                  className="text-peter-dim hover:text-peter-ivory"
                >
                  <X size={14} />
                </button>
              </div>
              <textarea
                autoFocus
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={2}
                placeholder="e.g. I always launch products in Bahasa Indonesia first, then English."
                data-testid="memory-new-content"
                className="w-full bg-peter-black/60 border border-peter-gold/30 focus:border-peter-gold/60 outline-none px-4 py-3 rounded-md font-light resize-none"
                style={{ color: "#E5E5E5" }}
              />
              <div className="mt-3 flex items-center gap-3">
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  data-testid="memory-new-type"
                  className="bg-peter-navy2 border border-peter-gold/30 text-peter-ivory text-xs px-3 py-2 rounded-md font-mono"
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <button
                  onClick={addMemory}
                  disabled={!newContent.trim()}
                  data-testid="memory-new-save"
                  className="bg-peter-gold disabled:opacity-40 text-peter-black hover:bg-peter-goldLight transition-colors px-5 py-2 rounded-md font-medium inline-flex items-center gap-2 text-sm"
                >
                  <CheckCircle size={14} weight="fill" /> Commit
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Results / list */}
      <div className="mt-6">
        {searchResults ? (
          <div className="text-[11px] tracking-[0.3em] uppercase text-peter-gold/80 mb-3">
            {searchResults.length} semantic match{searchResults.length === 1 ? "" : "es"}
          </div>
        ) : null}

        {loading ? (
          <div className="text-peter-dim text-sm">Reading the long-form mind…</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-peter-dim">
            <Brain size={36} weight="light" className="mx-auto mb-3 opacity-40" />
            <div className="text-sm">
              {searchResults
                ? "No matches. Try a different query."
                : "No memories yet. Chat with PETER and durable insights will appear here automatically."}
            </div>
          </div>
        ) : view === "graph" && !searchResults ? (
          <MemoryGraph workspaceId={activeId} memories={visible} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {visible.map((m) => (
                <MemoryCard key={m.id} m={m} onDelete={deleteMemory} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
