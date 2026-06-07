import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  PaperPlaneRight,
  Sparkle,
  Clock,
  CurrencyDollar,
  Plus,
  PencilSimple,
  Trash,
  Check,
  X,
  Stop,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import {
  tiers,
  getMessages,
  listSessions,
  renameSession,
  deleteSession,
  setSessionTier,
} from "../lib/api";
import { streamChat } from "../lib/stream";
import Markdown from "../components/Markdown";

const TIER_COLORS = {
  free: "#C0C0C0",
  cheap: "#E8D5A3",
  smart: "#C9A84C",
  critical: "#8B6914",
};

function MessageBubble({ m, streaming }) {
  const isUser = m.role === "user";
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
            ? "bg-peter-navy2 text-peter-ivory border-l-2 border-peter-silver rounded-bl-lg rounded-tr-sm"
            : "bg-peter-navy border border-peter-gold/20 text-peter-ivory rounded-lg",
        ].join(" ")}
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
            {m.cost_usd != null ? (
              <span className="text-[10px] text-peter-dim tnum inline-flex items-center gap-1">
                <CurrencyDollar size={10} weight="bold" />
                {Number(m.cost_usd).toFixed(5)}
              </span>
            ) : null}
            {m.latency_ms != null ? (
              <span className="text-[10px] text-peter-dim tnum inline-flex items-center gap-1">
                <Clock size={10} weight="bold" />
                {m.latency_ms} ms
              </span>
            ) : null}
            {m.saved_usd ? (
              <span className="text-[10px] text-peter-gold tnum">
                saved ${Number(m.saved_usd).toFixed(5)}
              </span>
            ) : null}
            {streaming ? (
              <span className="text-[10px] text-peter-gold/80 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-peter-gold animate-pulse" />
                streaming
              </span>
            ) : null}
          </div>
        ) : null}
        {isUser ? (
          <div className="whitespace-pre-wrap font-light leading-relaxed text-[15px]">
            {m.content}
          </div>
        ) : (
          <div className="text-[15px] font-light">
            <Markdown>{m.content}</Markdown>
            {streaming && !m.content ? (
              <span className="text-peter-dim italic">Thinking…</span>
            ) : null}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SessionItem({ s, active, onSelect, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(s.title || "Untitled");

  const commit = async () => {
    const t = title.trim();
    if (t && t !== s.title) await onRename(s.id, t);
    setEditing(false);
  };

  return (
    <div
      onClick={() => !editing && onSelect(s.id)}
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
                if (window.confirm(`Delete "${s.title || "this session"}"?`))
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
    </div>
  );
}

export default function ChatView() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [forceTier, setForceTier] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [tierCatalog, setTierCatalog] = useState({});
  const [sessions, setSessions] = useState([]);
  const scrollerRef = useRef(null);
  const abortRef = useRef(null);

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
      const r = await listSessions();
      setSessions(r.sessions);
    } catch {
      /* silent */
    }
  }, []);

  const loadSession = useCallback(async (id) => {
    if (abortRef.current) abortRef.current.abort();
    setSessionId(id);
    setMessages([]);
    try {
      const r = await getMessages(id);
      setForceTier(r.force_tier || "");
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
        }))
      );
    } catch {
      /* silent */
    }
  }, []);

  const newSession = () => {
    if (abortRef.current) abortRef.current.abort();
    setSessionId(null);
    setMessages([]);
    setForceTier("");
  };

  const onForceTierChange = async (value) => {
    setForceTier(value);
    // If we're already inside a session, persist the preference.
    if (sessionId) {
      try {
        await setSessionTier(sessionId, value);
        refreshSessions();
      } catch {
        /* silent */
      }
    }
  };

  const stopStreaming = () => {
    if (abortRef.current) abortRef.current.abort();
  };

  const handleRename = async (id, title) => {
    await renameSession(id, title);
    refreshSessions();
  };

  const handleDelete = async (id) => {
    await deleteSession(id);
    if (id === sessionId) newSession();
    refreshSessions();
  };

  const send = async () => {
    if (!input.trim() || streaming) return;
    const text = input.trim();
    setInput("");

    const userMsg = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: "user",
      content: text,
    };
    const aiId = `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const aiMsg = { id: aiId, role: "assistant", content: "" };
    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let liveSessionId = sessionId;

    await streamChat(
      { message: text, session_id: sessionId, force_tier: forceTier || null },
      {
        onRoute: (meta) => {
          liveSessionId = meta.session_id;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId ? { ...m, tier: meta.tier, model: meta.model } : m
            )
          );
        },
        onDelta: (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId ? { ...m, content: (m.content || "") + chunk } : m
            )
          );
        },
        onDone: (stats) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId
                ? {
                    ...m,
                    tier: stats.tier || m.tier,
                    cost_usd: stats.cost_usd,
                    saved_usd: stats.saved_usd,
                    latency_ms: stats.latency_ms,
                  }
                : m
            )
          );
        },
        onError: (err) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId
                ? { ...m, content: `An error occurred: ${err.message}` }
                : m
            )
          );
        },
      },
      ctrl.signal
    );

    setStreaming(false);
    if (liveSessionId && liveSessionId !== sessionId) {
      setSessionId(liveSessionId);
    }
    refreshSessions();
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
            Sessions
          </div>
          <button
            onClick={newSession}
            data-testid="new-session-btn"
            className="text-peter-gold hover:text-peter-goldLight p-1 inline-flex items-center gap-1 text-[10px] tracking-widest uppercase"
          >
            <Plus size={12} weight="bold" /> New
          </button>
        </div>
        <div className="hairline mx-3" />
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="px-3 py-4 text-xs text-peter-dim/70 italic">
              No sessions yet. Begin a conversation to create one.
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
            Conversation
          </div>
          <div className="flex items-end justify-between gap-6 mt-1">
            <h1 className="h-display text-4xl text-peter-ivory">
              A <em className="text-peter-gold not-italic">private</em> council
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] tracking-[0.32em] uppercase text-peter-dim">
                Force tier
              </span>
              <select
                data-testid="force-tier-select"
                value={forceTier}
                onChange={(e) => onForceTierChange(e.target.value)}
                className="bg-peter-navy2 border border-peter-gold/30 text-peter-ivory text-xs px-3 py-2 rounded-md font-mono"
              >
                <option value="">Auto</option>
                {Object.values(tierCatalog).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} — {t.name}
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
                How may I assist?
              </div>
              <div className="text-sm text-peter-dim mt-2 max-w-md leading-relaxed">
                Ask anything — a calculation, a definition, a deep strategy review.
                PETER picks the right model in milliseconds.
              </div>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-2 max-w-2xl w-full">
                {[
                  "What time is it in Tokyo?",
                  "Analyze the strategic risk of expanding to Europe in 2026.",
                  "Define the difference between OOP and FP.",
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
          <div className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Speak with PETER…"
              rows={2}
              data-testid="chat-input"
              className="flex-1 bg-peter-navy2 border border-peter-gold/20 focus:border-peter-gold/60 focus:outline-none text-peter-ivory px-4 py-3 rounded-md resize-none font-light placeholder:text-peter-dim/60 transition-colors"
            />
            <button
              onClick={streaming ? stopStreaming : send}
              disabled={!streaming && !input.trim()}
              data-testid={streaming ? "chat-stop" : "chat-send"}
              className={[
                "transition-colors px-5 py-3 rounded-md font-medium inline-flex items-center gap-2",
                streaming
                  ? "bg-peter-navy2 text-peter-gold border border-peter-gold/60 hover:bg-peter-gold/10"
                  : "bg-peter-gold disabled:opacity-40 text-peter-black hover:bg-peter-goldLight",
              ].join(" ")}
            >
              {streaming ? (
                <>
                  <Stop size={16} weight="fill" /> Stop
                </>
              ) : (
                <>
                  <PaperPlaneRight size={16} weight="fill" /> Send
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
