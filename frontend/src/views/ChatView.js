import React, { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  PaperPlaneRight,
  Sparkle,
  Plus,
  PencilSimple,
  Trash,
  Check,
  X,
  Stop,
  Brain,
  Prohibit,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import {
  tiers,
  getMessages,
  listSessions,
  renameSession,
  deleteSession,
  setSessionTier,
  setSessionMemoryEnabled,
} from "../lib/api";
import Markdown from "../components/Markdown";
import useStreamingChat from "../hooks/useStreamingChat";
import { useWorkspace } from "../context/WorkspaceContext";

const TIER_COLORS = {
  free: "#C0C0C0",
  cheap: "#E8D5A3",
  smart: "#C9A84C",
  critical: "#8B6914",
};

const LAST_TIER_KEY = "peter_ai.last_force_tier";

function StatsBadge({ m }) {
  // Compact single-line badge: Tier: SMART | Tokens: 1234 | Cost: $0.00012 | Time: 1.2s
  const elapsed = m.elapsed_ms != null ? m.elapsed_ms : m.latency_ms;
  return (
    <div
      data-testid="msg-stats-badge"
      className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-mono tnum"
      style={{
        background: "rgba(218, 165, 32, 0.1)",
        border: "1px solid rgba(201, 168, 76, 0.25)",
        color: "#E5E5E5",
      }}
    >
      <span style={{ color: TIER_COLORS[m.tier] || "#C9A84C" }} className="font-semibold tracking-widest">
        Tier: {String(m.tier || "—").toUpperCase()}
      </span>
      <span className="text-peter-dim">|</span>
      <span>Tokens: {m.tokens_estimated != null ? m.tokens_estimated : "—"}</span>
      <span className="text-peter-dim">|</span>
      <span>Cost: ${Number(m.cost_usd || 0).toFixed(5)}</span>
      <span className="text-peter-dim">|</span>
      <span>Time: {elapsed != null ? (elapsed / 1000).toFixed(2) : "—"}s</span>
      {m.saved_usd ? (
        <>
          <span className="text-peter-dim">|</span>
          <span style={{ color: "#C9A84C" }}>Saved: ${Number(m.saved_usd).toFixed(5)}</span>
        </>
      ) : null}
    </div>
  );
}

function MemoriesAppliedBadge({ memories }) {
  const [open, setOpen] = useState(false);
  if (!memories || memories.length === 0) return null;
  return (
    <span className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        data-testid="memories-applied-badge"
        className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border tnum transition-colors"
        style={{
          color: "#C9A84C",
          borderColor: "rgba(201,168,76,0.4)",
          background: "rgba(218,165,32,0.08)",
        }}
        title="Memories PETER recalled for this turn"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M9.5 2A2.5 2.5 0 0112 4.5V7m-2.5-5A2.5 2.5 0 007 4.5m2.5-2.5v18m0 0A2.5 2.5 0 017 19.5m2.5 2.5a2.5 2.5 0 002.5-2.5m-2.5 2.5v-2.5M14.5 2A2.5 2.5 0 0017 4.5V7m-2.5-5A2.5 2.5 0 0112 4.5m2.5 17.5A2.5 2.5 0 0017 19.5m-2.5 2.5a2.5 2.5 0 01-2.5-2.5" />
        </svg>
        {memories.length} memor{memories.length === 1 ? "y" : "ies"} applied
      </button>
      {open ? (
        <div
          className="absolute left-0 mt-2 z-20 w-80 p-3 rounded-md shadow-goldStrong glass-strong"
          data-testid="memories-applied-popover"
        >
          <div className="text-[10px] tracking-[0.3em] uppercase text-peter-dim mb-2">
            Recalled for this turn
          </div>
          <ul className="space-y-2">
            {memories.map((m) => (
              <li key={m.id} className="text-[12px] leading-relaxed">
                <span
                  className="inline-block px-1.5 py-0.5 mr-2 text-[9px] uppercase tracking-widest rounded-sm border"
                  style={{
                    color: TIER_COLORS[m.tier] || "#C9A84C",
                    borderColor: "rgba(201,168,76,0.3)",
                  }}
                >
                  {m.type}
                </span>
                <span style={{ color: "#E5E5E5" }}>{m.content}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </span>
  );
}

function MessageBubble({ m, streaming }) {
  const isUser = m.role === "user";
  const hasStats = !isUser && (m.cost_usd != null || m.tokens_estimated != null);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      data-testid={isUser ? "msg-user" : "msg-ai"}
    >
      <div
        className={[
          "max-w-[80%] p-5 rounded-lg",
          isUser
            ? "bg-peter-navy2 border-l-2 border-peter-silver rounded-bl-lg rounded-tr-sm"
            : "bg-peter-navy border border-peter-gold/20 rounded-lg",
        ].join(" ")}
        style={{ color: "#E5E5E5" }}
      >
        {!isUser && (m.tier || streaming) ? (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {m.tier ? (
              <span
                className="px-2 py-0.5 text-[10px] tracking-[0.2em] uppercase rounded-sm border font-medium tnum"
                style={{
                  color: TIER_COLORS[m.tier] || "#C9A84C",
                  borderColor: (TIER_COLORS[m.tier] || "#C9A84C") + "66",
                }}
                data-testid="msg-tier-badge"
              >
                {m.tier}
              </span>
            ) : null}
            {m.model ? (
              <span className="text-[10px] text-peter-dim font-mono">{m.model}</span>
            ) : null}
            {streaming ? (
              <span
                className="text-[10px] inline-flex items-center gap-1"
                style={{ color: "#C9A84C" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "#C9A84C" }}
                />
                streaming
              </span>
            ) : null}
            {m.memories_used && m.memories_used.length > 0 ? (
              <MemoriesAppliedBadge memories={m.memories_used} />
            ) : null}
          </div>
        ) : null}
        {isUser ? (
          <div className="whitespace-pre-wrap font-light leading-relaxed text-[15px]">
            {m.content}
          </div>
        ) : (
          <div className="text-[15px] font-light">
            {m.content ? (
              <Markdown>{m.content}</Markdown>
            ) : streaming ? (
              <span className="text-peter-dim italic">Thinking…</span>
            ) : null}
            {streaming ? (
              <span className="cursor-blink" aria-hidden="true">
                ▌
              </span>
            ) : null}
            {hasStats ? <StatsBadge m={m} /> : null}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SessionItem({ s, active, onSelect, onRename, onDelete }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(s.title || "Untitled");
  const [menu, setMenu] = useState(null); // {x, y} when right-click menu is open

  const commit = async () => {
    const t = title.trim();
    if (t && t !== s.title) await onRename(s.id, t);
    setEditing(false);
  };

  const openMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (editing) return;
    // Clamp to viewport so menu never spills off-screen
    const w = 180;
    const h = 92;
    const x = Math.min(e.clientX, window.innerWidth - w - 8);
    const y = Math.min(e.clientY, window.innerHeight - h - 8);
    setMenu({ x, y });
  };

  const closeMenu = () => setMenu(null);

  useEffect(() => {
    if (!menu) return undefined;
    const onDown = () => closeMenu();
    const onKey = (e) => e.key === "Escape" && closeMenu();
    window.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  return (
    <div
      onClick={() => !editing && onSelect(s.id)}
      onContextMenu={openMenu}
      className={[
        "group px-3 py-2.5 rounded-md cursor-pointer transition-colors border",
        active
          ? "bg-peter-gold/10 border-peter-gold/40"
          : "bg-transparent border-transparent hover:bg-peter-navy2/60 hover:border-peter-gold/15",
      ].join(" ")}
      data-testid={`session-item-${s.id}`}
    >
      {editing ? (
        <div className="flex items-center gap-1">
          <input
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-peter-black/60 border border-peter-gold/30 text-peter-ivory text-xs px-2 py-1 rounded outline-none"
            data-testid={`session-rename-input-${s.id}`}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              commit();
            }}
            className="text-peter-gold hover:text-peter-goldLight p-1"
            data-testid={`session-rename-confirm-${s.id}`}
          >
            <Check size={14} weight="bold" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditing(false);
              setTitle(s.title || "Untitled");
            }}
            className="text-peter-dim hover:text-peter-ivory p-1"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span
            data-testid={`session-tier-dot-${s.id}`}
            title={s.force_tier ? `Locked tier: ${s.force_tier.toUpperCase()}` : "Auto-routing"}
            className="shrink-0 w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: s.force_tier
                ? TIER_COLORS[s.force_tier]
                : "rgba(201,168,76,0.18)",
              boxShadow: s.force_tier
                ? `0 0 6px ${TIER_COLORS[s.force_tier]}99`
                : "none",
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-peter-ivory truncate font-light">
              {s.title || "Untitled"}
            </div>
            <div className="text-[10px] text-peter-dim/70 mt-0.5 font-mono">
              {s.updated_at ? new Date(s.updated_at).toLocaleString() : ""}
            </div>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              className="text-peter-dim hover:text-peter-gold p-1"
              data-testid={`session-rename-btn-${s.id}`}
            >
              <PencilSimple size={12} weight="regular" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(t("chat.confirmDelete", { title: s.title || "this session" })))
                  onDelete(s.id);
              }}
              className="text-peter-dim hover:text-red-400 p-1"
              data-testid={`session-delete-btn-${s.id}`}
            >
              <Trash size={12} weight="regular" />
            </button>
          </div>
        </div>
      )}
      {menu ? (
        <div
          className="peter-context-menu"
          style={{ top: menu.y, left: menu.x }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          role="menu"
          data-testid={`session-context-menu-${s.id}`}
        >
          <button
            type="button"
            data-testid={`session-context-rename-${s.id}`}
            onClick={() => {
              closeMenu();
              setEditing(true);
            }}
          >
            <PencilSimple size={12} weight="regular" />
            {t("chat.rename")}
          </button>
          <div className="divider" />
          <button
            type="button"
            className="danger"
            data-testid={`session-context-delete-${s.id}`}
            onClick={() => {
              closeMenu();
              if (window.confirm(t("chat.confirmDelete", { title: s.title || "this session" })))
                onDelete(s.id);
            }}
          >
            <Trash size={12} weight="regular" />
            {t("chat.delete")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function ChatView() {
  const { active, activeId } = useWorkspace();
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [forceTier, setForceTier] = useState(() => {
    try {
      return localStorage.getItem(LAST_TIER_KEY) || "";
    } catch {
      return "";
    }
  });
  const [tierCatalog, setTierCatalog] = useState({});
  const [sessions, setSessions] = useState([]);
  const [queuedCount, setQueuedCount] = useState(0);
  const scrollerRef = useRef(null);
  const queueRef = useRef([]);
  const sessionIdRef = useRef(null);
  const { streaming, start: startStream, stop: stopStream } = useStreamingChat();

  // Keep a ref of the live session id so the queue can use the latest value.
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    tiers().then((r) => setTierCatalog(r.tiers)).catch(() => {});
    listSessions().then((r) => setSessions(r.sessions)).catch(() => {});
  }, []);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  const refreshSessions = useCallback(async () => {
    try {
      const r = await listSessions(activeId || undefined);
      setSessions(r.sessions);
    } catch {
      /* silent */
    }
  }, [activeId]);

  // Reload sessions when active workspace changes. Deferred to a microtask
  // to keep setState out of the effect's synchronous body.
  useEffect(() => {
    const t = setTimeout(refreshSessions, 0);
    return () => clearTimeout(t);
  }, [refreshSessions]);

  const loadSession = useCallback(async (id) => {
    stopStream();
    setSessionId(id);
    setMessages([]);
    try {
      const r = await getMessages(id);
      setForceTier(r.force_tier || "");
      setMemoryEnabled(r.memory_enabled !== false);
      setMessages(
        r.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          tier: m.tier,
          model: m.model,
          cost_usd: m.cost_usd,
          saved_usd: m.saved_usd,
          latency_ms: m.latency_ms,
          tokens_estimated: m.tokens_estimated,
        }))
      );
    } catch {
      /* silent */
    }
  }, [stopStream]);

  const newSession = () => {
    stopStream();
    setSessionId(null);
    setMessages([]);
    queueRef.current = [];
    setQueuedCount(0);
    setMemoryEnabled(true);
    try {
      const last = localStorage.getItem(LAST_TIER_KEY) || "";
      setForceTier(last);
    } catch {
      /* silent */
    }
  };

  const toggleMemory = async () => {
    const next = !memoryEnabled;
    setMemoryEnabled(next);
    if (sessionId) {
      try {
        await setSessionMemoryEnabled(sessionId, next);
      } catch {
        /* silent */
      }
    }
  };

  const onForceTierChange = async (value) => {
    setForceTier(value);
    try {
      if (value) localStorage.setItem(LAST_TIER_KEY, value);
      else localStorage.removeItem(LAST_TIER_KEY);
    } catch {
      /* silent */
    }
    // If we're already inside a session, persist the preference server-side.
    if (sessionId) {
      try {
        await setSessionTier(sessionId, value);
        refreshSessions();
      } catch {
        /* silent */
      }
    }
  };

  const stopStreaming = () => stopStream();

  const handleRename = async (id, title) => {
    await renameSession(id, title);
    refreshSessions();
  };

  const handleDelete = async (id) => {
    await deleteSession(id);
    if (id === sessionId) newSession();
    refreshSessions();
  };

  const runTurn = useCallback(
    async (text, tier) => {
      const userMsg = {
        id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: "user",
        content: text,
      };
      const aiId = `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const aiMsg = { id: aiId, role: "assistant", content: "" };
      setMessages((prev) => [...prev, userMsg, aiMsg]);

      let liveSessionId = sessionIdRef.current;

      await startStream(
        {
          message: text,
          session_id: sessionIdRef.current,
          force_tier: tier || null,
          workspace_id: activeId || null,
          memory_enabled: memoryEnabled,
        },
        {
          onRoute: (meta) => {
            liveSessionId = meta.session_id;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId
                  ? {
                      ...m,
                      tier: meta.tier,
                      model: meta.model,
                      memories_used: meta.memories_used || [],
                    }
                  : m,
              ),
            );
          },
          onDelta: (chunk) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId ? { ...m, content: (m.content || "") + chunk } : m,
              ),
            );
          },
          onDone: (stats) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId
                  ? {
                      ...m,
                      tier: stats.tier || m.tier,
                      model: stats.model || m.model,
                      cost_usd: stats.cost_usd,
                      saved_usd: stats.saved_usd,
                      latency_ms: stats.latency_ms,
                      elapsed_ms: stats.elapsed_ms,
                      tokens_estimated: stats.tokens_estimated,
                    }
                  : m,
              ),
            );
          },
          onError: (err) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId
                  ? {
                      ...m,
                      content: `**Stream error.** ${err.message || "Connection lost."}`,
                    }
                  : m,
              ),
            );
          },
        },
      );

      if (liveSessionId && liveSessionId !== sessionIdRef.current) {
        sessionIdRef.current = liveSessionId;
        setSessionId(liveSessionId);
      }
      refreshSessions();
    },
    [startStream, refreshSessions, activeId, memoryEnabled],
  );

  // Drain the queue whenever streaming flips false.
  useEffect(() => {
    if (streaming) return;
    if (queueRef.current.length === 0) return;
    const next = queueRef.current.shift();
    setQueuedCount(queueRef.current.length);
    runTurn(next.text, next.tier);
  }, [streaming, runTurn]);

  const send = () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    if (streaming) {
      // Queue it; will fire automatically when the current stream finishes.
      queueRef.current.push({ text, tier: forceTier });
      setQueuedCount(queueRef.current.length);
      return;
    }
    runTurn(text, forceTier);
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-screen">
      {/* Session sidebar */}
      <aside
        className="w-72 border-r border-peter-gold/10 bg-peter-navy/30 flex flex-col"
        data-testid="session-sidebar"
      >
        <div className="px-4 pt-6 pb-3 flex items-center justify-between">
          <div className="text-[10px] tracking-[0.3em] uppercase text-peter-dim">
            {t("sidebar.sessions")}
          </div>
          <button
            onClick={newSession}
            data-testid="new-session-btn"
            className="text-peter-gold hover:text-peter-goldLight p-1 inline-flex items-center gap-1 text-[10px] tracking-widest uppercase"
          >
            <Plus size={12} weight="bold" /> {t("sidebar.new")}
          </button>
        </div>
        <div className="hairline mx-3" />
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="px-3 py-4 text-xs text-peter-dim/70 italic">
              {t("sidebar.noSessions")}
            </div>
          ) : (
            sessions.map((s) => (
              <SessionItem
                key={s.id}
                s={s}
                active={s.id === sessionId}
                onSelect={loadSession}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </aside>

      {/* Main chat */}
      <div className="flex-1 flex flex-col">
        <header className="px-12 pt-10 pb-6 border-b border-peter-gold/10">
          <div className="text-[11px] tracking-[0.32em] uppercase text-peter-dim">
            {t("chat.label")}
          </div>
          <div className="flex items-end justify-between gap-6 mt-1">
            <h1 className="h-display text-4xl text-peter-ivory">
              {t("chat.title")}
            </h1>
            <div className="flex items-center gap-3 flex-wrap justify-end">
            {active ? (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border text-[9px] tracking-widest"
                style={{ color: active.color, borderColor: active.color + "66" }}
                data-testid="chat-workspace-pill"
                title="This session is scoped to a workspace"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: active.color }} />
                {active.name.toUpperCase()}
              </span>
            ) : null}
            <button
              onClick={toggleMemory}
              data-testid="memory-toggle"
              title={memoryEnabled ? t("chat.memoryOn") : t("chat.memoryOff")}
              className={[
                "inline-flex items-center gap-1.5 px-3 py-2 rounded-md border text-[10px] tracking-widest uppercase transition-colors",
                memoryEnabled
                  ? "border-peter-gold/60 text-peter-gold bg-peter-gold/10 hover:bg-peter-gold/15"
                  : "border-peter-dim/40 text-peter-dim hover:text-peter-ivory hover:border-peter-dim/60",
              ].join(" ")}
            >
              {memoryEnabled ? <Brain size={12} weight="fill" /> : <Prohibit size={12} weight="bold" />}
              {memoryEnabled ? t("chat.memoryOn") : t("chat.memoryOff")}
            </button>
            <span className="text-[10px] tracking-[0.32em] uppercase text-peter-dim">
              {t("chat.forceTier")}
            </span>
            <select
              data-testid="force-tier-select"
              value={forceTier}
              onChange={(e) => onForceTierChange(e.target.value)}
              className="bg-peter-navy2 border border-peter-gold/30 text-peter-ivory text-xs px-3 py-2 rounded-md font-mono"
            >
                <option value="">{t("chat.auto")}</option>
                {Object.values(tierCatalog).map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.label} — {tier.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div
          ref={scrollerRef}
          className="flex-1 overflow-y-auto px-12 py-8 space-y-5"
          data-testid="chat-scroller"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Sparkle size={28} weight="light" className="text-peter-gold/70" />
              <div className="h-display text-3xl text-peter-ivory mt-4">
                {t("chat.howMayIAssist")}
              </div>
              <div className="text-sm text-peter-dim mt-2 max-w-md leading-relaxed">
                {t("chat.subtitle")}
              </div>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-2 max-w-2xl w-full">
                {[
                  t("chat.suggest1"),
                  t("chat.suggest2"),
                  t("chat.suggest3"),
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    data-testid={`suggestion-${s.slice(0, 12)}`}
                    className="px-4 py-3 text-left text-xs text-peter-ivory/80 bg-peter-navy/40 border border-peter-gold/15 rounded-md hover:border-peter-gold/40 hover:bg-peter-navy/70 transition-colors leading-relaxed"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, idx) => {
              const isLastAssistant =
                m.role === "assistant" && idx === messages.length - 1;
              return (
                <MessageBubble
                  key={m.id}
                  m={m}
                  streaming={streaming && isLastAssistant}
                />
              );
            })
          )}
        </div>

        <div className="px-12 py-6 border-t border-peter-gold/10 bg-peter-black">
          {queuedCount > 0 ? (
            <div
              data-testid="queue-indicator"
              className="mb-2 text-[10px] tracking-[0.3em] uppercase text-peter-gold/80"
            >
              {t("chat.queued", { count: queuedCount })}
            </div>
          ) : null}
          <div className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder={t("chat.placeholder")}
              rows={2}
              data-testid="chat-input"
              className="flex-1 bg-peter-navy2 border border-peter-gold/20 focus:border-peter-gold/60 focus:outline-none px-4 py-3 rounded-md resize-none font-light placeholder:text-peter-dim/60 transition-colors"
              style={{ color: "#E5E5E5" }}
            />
            {streaming ? (
              <button
                onClick={stopStreaming}
                data-testid="chat-stop"
                className="bg-peter-navy2 text-peter-gold border border-peter-gold/60 hover:bg-peter-gold/10 transition-colors px-4 py-3 rounded-md font-medium inline-flex items-center gap-2"
              >
                <Stop size={16} weight="fill" /> {t("chat.stop")}
              </button>
            ) : null}
            <button
              onClick={send}
              disabled={!input.trim()}
              data-testid="chat-send"
              className="bg-peter-gold disabled:opacity-40 text-peter-black hover:bg-peter-goldLight transition-colors px-5 py-3 rounded-md font-medium inline-flex items-center gap-2"
            >
              <PaperPlaneRight size={16} weight="fill" />
              {t("chat.send")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
