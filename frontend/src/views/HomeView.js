import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowRight, Sparkle, CurrencyDollar, Lightning } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { stats, tiers } from "../lib/api";

const HERO_BG =
  "https://images.unsplash.com/photo-1761437856376-2ce1c483343b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzZ8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGx1eHVyeSUyMGRhcmslMjBnb2xkJTIwdGVjaG5vbG9neSUyMGJhY2tncm91bmR8ZW58MHx8fHwxNzgwODEyNjM4fDA&ixlib=rb-4.1.0&q=85";

function Stat({ label, value, sub }) {
  return (
    <div className="px-6 py-5 bg-peter-navy/60 border border-peter-gold/15 rounded-lg" data-testid={`stat-${label}`}>
      <div className="text-[10px] tracking-[0.32em] uppercase text-peter-dim">{label}</div>
      <div className="mt-2 h-display text-3xl text-peter-ivory tnum">{value}</div>
      {sub ? <div className="text-xs text-peter-dim mt-1">{sub}</div> : null}
    </div>
  );
}

export default function HomeView() {
  const { t: i18nT } = useTranslation();
  const [s, setS] = useState(null);
  const [t, setT] = useState(null);

  useEffect(() => {
    stats().then(setS).catch(() => {});
    tiers().then((r) => setT(r.tiers)).catch(() => {});
  }, []);

  return (
    <div className="relative">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url(${HERO_BG})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "saturate(0.7) contrast(1.05)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-peter-black/85 via-peter-black/75 to-peter-black" />
        <div className="absolute inset-0 grain" />
        <div className="relative px-14 pt-20 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl"
          >
            <div className="text-[11px] tracking-[0.4em] uppercase text-peter-gold/80 mb-5 flex items-center gap-3">
              <Sparkle size={14} weight="fill" />
              v4.0 · The Luxury Strategist
            </div>
            <h1 className="h-display text-6xl md:text-7xl text-peter-ivory leading-[0.95]">
              {i18nT("home.title")}
              <br />
              <span className="text-peter-gold italic font-normal">{i18nT("home.titleAccent")}</span>
            </h1>
            <p className="mt-7 max-w-2xl text-peter-ivory/75 text-lg font-light leading-relaxed">
              {i18nT("home.subtitle")}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/chat"
                data-testid="cta-start-chat"
                className="inline-flex items-center gap-2 bg-peter-gold text-peter-black hover:bg-peter-goldLight transition-colors px-6 py-3 rounded-md font-medium tracking-wide"
              >
                Begin a session <ArrowRight size={16} weight="bold" />
              </Link>
              <Link
                to="/router"
                data-testid="cta-view-router"
                className="inline-flex items-center gap-2 bg-transparent text-peter-gold border border-peter-gold/60 hover:bg-peter-gold/10 transition-colors px-6 py-3 rounded-md font-medium tracking-wide"
              >
                Inspect the router
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Live stats */}
      <div className="px-14 -mt-6 relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat
          label="Queries Served"
          value={s ? s.totals.total_queries.toLocaleString() : "—"}
          sub="All time"
        />
        <Stat
          label="Cost Incurred"
          value={s ? `$${s.totals.total_cost_usd.toFixed(4)}` : "—"}
          sub="Total spend"
        />
        <Stat
          label="Savings"
          value={s ? `$${s.totals.total_saved_usd.toFixed(4)}` : "—"}
          sub="vs always-Premium"
        />
        <Stat
          label="Avg Latency"
          value={s && s.totals.avg_latency_ms ? `${Math.round(s.totals.avg_latency_ms)} ms` : "—"}
          sub="Across all tiers"
        />
      </div>

      {/* Tier showcase */}
      <div className="px-14 mt-16">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="h-display text-3xl text-peter-ivory">{i18nT("home.fourTiers")}</h2>
          <div className="text-[10px] tracking-[0.32em] uppercase text-peter-dim">
            Cost-optimised routing
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(t || []) && t
            ? Object.values(t).map((tier) => (
                <motion.div
                  key={tier.id}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.25 }}
                  className="relative p-6 bg-peter-navy2 border border-peter-gold/20 rounded-lg overflow-hidden"
                  data-testid={`tier-card-${tier.id}`}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{ background: tier.color }}
                  />
                  <div
                    className="text-[10px] tracking-[0.32em] uppercase mb-3"
                    style={{ color: tier.color }}
                  >
                    {tier.label}
                  </div>
                  <div className="h-display text-2xl text-peter-ivory mb-1">{tier.name}</div>
                  <div className="text-xs text-peter-dim mb-4 font-mono">
                    {tier.preview_model}
                  </div>
                  <div className="text-sm text-peter-ivory/80 leading-relaxed">
                    {tier.purpose}
                  </div>
                  <div className="hairline my-4" />
                  <div className="flex justify-between text-xs">
                    <div>
                      <div className="text-peter-dim uppercase tracking-widest text-[9px]">
                        Cost / 1K
                      </div>
                      <div className="text-peter-ivory tnum mt-1">
                        ${tier.cost_per_1k_usd.toFixed(4)}
                      </div>
                    </div>
                    <div>
                      <div className="text-peter-dim uppercase tracking-widest text-[9px]">
                        Latency
                      </div>
                      <div className="text-peter-ivory tnum mt-1">
                        ~{tier.typical_latency_ms} ms
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            : null}
        </div>
      </div>

      {/* Capabilities band */}
      <div className="px-14 mt-20 mb-20 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: Lightning,
            title: "Instant classification",
            body:
              "Pattern-based router decides the tier in microseconds — no AI call required for routing.",
          },
          {
            icon: CurrencyDollar,
            title: "Cost-optimised by default",
            body:
              "Every query is benchmarked against always-premium. The savings ledger is live and audited.",
          },
          {
            icon: Sparkle,
            title: "Seven-agent build crew",
            body:
              "Architect, DBA, Backend, Frontend, QA, DevOps, Documenter — orchestrated end-to-end.",
          },
        ].map((c) => (
          <div
            key={c.title}
            className="p-6 bg-peter-navy/40 border border-peter-gold/15 rounded-lg"
            data-testid={`cap-${c.title}`}
          >
            <c.icon size={22} weight="light" className="text-peter-gold" />
            <div className="h-display text-2xl text-peter-ivory mt-3">{c.title}</div>
            <p className="text-sm text-peter-ivory/70 mt-2 leading-relaxed">{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
