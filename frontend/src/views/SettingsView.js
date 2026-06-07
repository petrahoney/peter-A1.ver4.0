import React, { useEffect, useState } from "react";
import { tiers } from "../lib/api";

export default function SettingsView() {
  const [t, setT] = useState({});
  useEffect(() => {
    tiers().then((r) => setT(r.tiers)).catch(() => {});
  }, []);

  return (
    <div className="p-12">
      <div className="text-[11px] tracking-[0.32em] uppercase text-peter-dim">
        Settings
      </div>
      <h1 className="h-display text-4xl text-peter-ivory mt-1">
        The <em className="text-peter-gold not-italic">configuration</em>
      </h1>

      {/* About */}
      <div className="mt-8 p-6 bg-peter-navy/40 border border-peter-gold/15 rounded-lg">
        <div className="text-[10px] tracking-[0.3em] uppercase text-peter-dim mb-2">
          About PETER
        </div>
        <div className="h-display text-2xl text-peter-ivory">
          Personal Enhanced Thinking &amp; Execution Robot
        </div>
        <p
          className="mt-3 text-sm font-light leading-relaxed max-w-3xl"
          style={{ color: "#E5E5E5" }}
          data-testid="about-paragraph"
        >
          PETER AI v4.0 is a luxury strategist&rsquo;s command center: intelligent
          multi-model routing, a seven-agent build crew, long-form ChromaDB-backed
          memory and project workspaces. Built in Indonesia, for the few who
          prefer signal to noise. <span className="text-peter-gold">Intelligence, Elevated.</span>
        </p>
      </div>

      <p className="text-peter-ivory/70 mt-8 max-w-3xl text-sm font-light leading-relaxed">
        Live in the preview, PETER routes via a managed universal key — Claude Sonnet
        4.5, Haiku 4.5, Opus 4.5 and Gemini 3 Flash. For self-hosting, run the included
        <span className="text-peter-gold"> docker-compose</span> stack to wire in
        PostgreSQL, Redis, ChromaDB and a real Ollama llama3.3.
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.values(t).map((tier) => (
          <div
            key={tier.id}
            className="p-6 bg-peter-navy/40 border border-peter-gold/15 rounded-lg"
            data-testid={`settings-tier-${tier.id}`}
          >
            <div
              className="text-[10px] tracking-[0.3em] uppercase mb-1"
              style={{ color: tier.color }}
            >
              {tier.label}
            </div>
            <div className="h-display text-2xl text-peter-ivory">{tier.name}</div>
            <div className="text-xs font-mono text-peter-dim mt-1">
              provider · {tier.provider}
            </div>
            <div className="text-xs font-mono text-peter-dim">
              model · {tier.preview_model}
            </div>
            <div
              className="text-xs mt-3 font-light leading-relaxed"
              style={{ color: "#E5E5E5" }}
            >
              {tier.purpose}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 p-6 bg-peter-navy2/40 border border-peter-gold/15 rounded-lg">
        <div className="text-[10px] tracking-[0.3em] uppercase text-peter-dim mb-2">
          Local self-host
        </div>
        <div className="h-display text-2xl text-peter-ivory">One-command deploy</div>
        <pre className="mt-3 text-xs font-mono bg-peter-black/60 border border-peter-gold/10 rounded-md p-4 overflow-x-auto" style={{ color: "#E5E5E5" }}>
{`# Inside /app/deploy
cp .env.example .env  # fill in keys
docker compose up -d
# Frontend  → http://localhost:3000
# Backend   → http://localhost:8001
# Ollama    → http://localhost:11434`}
        </pre>
      </div>

      <div className="mt-8 text-center text-[10px] tracking-[0.32em] uppercase text-peter-dim/60">
        PETER AI v4.0 — Intelligence, Elevated. Built in Indonesia.
      </div>
    </div>
  );
}
