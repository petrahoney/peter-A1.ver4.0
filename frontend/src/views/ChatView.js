import React, { useEffect, useRef, useState } from "react";
import { PaperPlaneRight, Sparkle, Clock, CurrencyDollar } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { chat, tiers } from "../lib/api";

const TIER_COLORS = {
  free: "#C0C0C0",
  cheap: "#E8D5A3",
  smart: "#C9A84C",
  critical: "#8B6914",
};

function MessageBubble({ m }) {
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
        {!isUser && m.tier ? (
          <div className="flex flex-wrap items-center gap-2 mb-3">
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
            <span className="text-[10px] text-peter-dim font-mono">{m.model}</span>
            <span className="text-[10px] text-peter-dim tnum inline-flex items-center gap-1">
              <CurrencyDollar size={10} weight="bold" />
              {Number(m.cost_usd || 0).toFixed(5)}
            </span>
            <span className="text-[10px] text-peter-dim tnum inline-flex items-center gap-1">
              <Clock size={10} weight="bold" />
              {m.latency_ms} ms
            </span>
            {m.saved_usd ? (
              <span className="text-[10px] text-peter-gold tnum">
                saved ${Number(m.saved_usd).toFixed(5)}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="whitespace-pre-wrap font-light leading-relaxed text-[15px]">
          {m.content}
        </div>
      </div>
    </motion.div>
  );
}

export default function ChatView() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [forceTier, setForceTier] = useState("");
  const [sending, setSending] = useState(false);
  const [tierCatalog, setTierCatalog] = useState({});
  const scrollerRef = useRef(null);

  useEffect(() => {
    tiers().then((r) => setTierCatalog(r.tiers)).catch(() => {});
  }, []);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, role: "user", content: text },
    ]);
    setSending(true);
    try {
      const res = await chat(text, sessionId, forceTier || null);
      setSessionId(res.session_id);
      setMessages((prev) => [
        ...prev,
        {
          id: res.message_id || `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: "assistant",
          content: res.response,
          tier: res.tier,
          model: res.model,
          cost_usd: res.cost_usd,
          saved_usd: res.saved_usd,
          latency_ms: res.latency_ms,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `An error occurred: ${e?.response?.data?.detail || e.message}`,
          tier: "free",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-screen">
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
              onChange={(e) => setForceTier(e.target.value)}
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
          messages.map((m) => <MessageBubble key={m.id} m={m} />)
        )}
        {sending ? (
          <div className="flex justify-start" data-testid="msg-loading">
            <div className="bg-peter-navy border border-peter-gold/20 px-4 py-3 rounded-lg">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-peter-gold animate-pulse" />
                <span
                  className="w-2 h-2 rounded-full bg-peter-gold animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-peter-gold animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          </div>
        ) : null}
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
            onClick={send}
            disabled={!input.trim() || sending}
            data-testid="chat-send"
            className="bg-peter-gold disabled:opacity-40 text-peter-black hover:bg-peter-goldLight transition-colors px-5 py-3 rounded-md font-medium inline-flex items-center gap-2"
          >
            <PaperPlaneRight size={16} weight="fill" /> Send
          </button>
        </div>
      </div>
    </div>
  );
}
