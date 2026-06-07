import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { stats, statsSparkline } from "../lib/api";
import { useWorkspace } from "../context/WorkspaceContext";
import { logErr } from "../lib/logErr";

const TIER_COLORS = {
  free: "#C0C0C0",
  cheap: "#E8D5A3",
  smart: "#C9A84C",
  critical: "#8B6914",
};

function Big({ label, value, sub, testid }) {
  return (
    <div
      className="p-6 bg-peter-navy/50 border border-peter-gold/15 rounded-lg"
      data-testid={testid}
    >
      <div className="text-[10px] tracking-[0.32em] uppercase text-peter-dim">
        {label}
      </div>
      <div className="h-display text-4xl text-peter-ivory tnum mt-2">{value}</div>
      {sub ? <div className="text-xs text-peter-dim mt-1">{sub}</div> : null}
    </div>
  );
}

function SparklineCard({ tier, label, color, points, total, days }) {
  const hasData = points.some((p) => p.saved_usd > 0 || p.count > 0);
  const peak = points.reduce((m, p) => Math.max(m, p.saved_usd), 0);
  return (
    <div
      className="p-4 bg-peter-navy/40 border border-peter-gold/15 rounded-lg flex flex-col"
      data-testid={`sparkline-${tier}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: color, boxShadow: `0 0 6px ${color}99` }}
          />
          <span
            className="text-[10px] tracking-[0.28em] uppercase"
            style={{ color }}
          >
            {label}
          </span>
        </div>
        <span className="text-[10px] text-peter-dim font-mono tnum">
          {points.reduce((s, p) => s + p.count, 0)} q
        </span>
      </div>

      <div className="mt-2 h-display text-xl text-peter-ivory tnum">
        ${Number(total).toFixed(5)}
      </div>
      <div className="text-[10px] text-peter-dim/80 mt-0.5">
        Peak day · ${peak.toFixed(5)}
      </div>

      <div className="mt-3" style={{ height: 48 }}>
        {hasData ? (
          <ResponsiveContainer>
            <LineChart data={points} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
              <Tooltip
                contentStyle={{
                  background: "#0A0F1E",
                  border: "1px solid rgba(201,168,76,0.3)",
                  color: "#F5F5F0",
                  fontSize: 11,
                }}
                labelStyle={{ color: "#888880", fontSize: 10 }}
                formatter={(v) => [`$${Number(v).toFixed(5)}`, "Saved"]}
              />
              <Line
                type="monotone"
                dataKey="saved_usd"
                stroke={color}
                strokeWidth={1.6}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-[10px] text-peter-dim/60 italic">
            —
          </div>
        )}
      </div>

      <div className="mt-1 flex justify-between text-[9px] text-peter-dim/60 font-mono tnum">
        <span>{points[0]?.date.slice(5)}</span>
        <span>{points[points.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

export default function CostView() {
  const { active, activeId } = useWorkspace();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [spark, setSpark] = useState(null);

  const refresh = useCallback(() => {
    stats(activeId || undefined).then(setData).catch(logErr("CostView.stats"));
    statsSparkline(activeId || undefined, 7).then(setSpark).catch(logErr("CostView.sparkline"));
  }, [activeId]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 6000);
    return () => clearInterval(id);
  }, [refresh]);

  if (!data) {
    return (
      <div className="p-12 text-peter-dim text-sm" data-testid="cost-loading">
        {t("common.loading")}
      </div>
    );
  }

  const pie = Object.entries(data.tier_breakdown).map(([tier, v]) => ({
    name: tier,
    value: v.count,
    color: TIER_COLORS[tier] || "#C9A84C",
  }));

  const bar = Object.entries(data.tier_breakdown).map(([tier, v]) => ({
    name: tier.toUpperCase(),
    cost: Number((v.cost_usd || 0).toFixed(6)),
    saved: Number((v.saved_usd || 0).toFixed(6)),
    color: TIER_COLORS[tier],
  }));

  return (
    <div className="p-12">
      <div className="text-[11px] tracking-[0.32em] uppercase text-peter-dim">
        {t("cost.label")}
      </div>
      <div className="flex items-end justify-between flex-wrap gap-4">
        <h1 className="h-display text-4xl text-peter-ivory mt-1">
          {t("cost.title")} <em className="text-peter-gold not-italic">{t("cost.titleAccent")}</em>
        </h1>
        <div
          data-testid="cost-workspace-scope"
          className="text-[10px] tracking-[0.28em] uppercase inline-flex items-center gap-2 px-3 py-1.5 rounded-md border"
          style={{
            color: active ? active.color || "#C9A84C" : "#C9A84C",
            borderColor: "rgba(201,168,76,0.25)",
            background: "rgba(201,168,76,0.06)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: active ? active.color || "#C9A84C" : "#C9A84C" }}
          />
          {t("cost.scope")}: {active ? active.name : t("sidebar.allWorkspaces")}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Big
          label={t("cost.totalQueries")}
          value={data.totals.total_queries.toLocaleString()}
          sub={t("cost.lifetime")}
          testid="metric-total-queries"
        />
        <Big
          label={t("cost.totalCost")}
          value={`$${data.totals.total_cost_usd.toFixed(5)}`}
          sub={t("cost.acrossAllTiers")}
          testid="metric-total-cost"
        />
        <Big
          label={t("cost.savedVsPremium")}
          value={`$${data.totals.total_saved_usd.toFixed(5)}`}
          sub={t("cost.ifPremium")}
          testid="metric-total-saved"
        />
        <Big
          label={t("cost.avgLatency")}
          value={`${Math.round(data.totals.avg_latency_ms || 0)} ms`}
          sub={t("cost.meanAcrossTiers")}
          testid="metric-avg-latency"
        />
      </div>

      {/* Per-tier sparklines — last 7 days, scoped to active workspace */}
      <div className="mt-8" data-testid="sparkline-section">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-[10px] tracking-[0.32em] uppercase text-peter-dim">
              {t("cost.sparkline")}
            </div>
            <div className="text-xs text-peter-dim/70 mt-0.5">
              {t("cost.sparklineHint")}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["free", "cheap", "smart", "critical"].map((tier) => {
            const meta = (data.tier_catalog && data.tier_catalog[tier]) || {};
            const points = (spark && spark.series && spark.series[tier]) || [];
            const total =
              (spark && spark.totals_by_tier && spark.totals_by_tier[tier]?.saved_usd) || 0;
            return (
              <SparklineCard
                key={tier}
                tier={tier}
                label={meta.label || tier.toUpperCase()}
                color={meta.color || TIER_COLORS[tier]}
                points={points}
                total={total}
                days={(spark && spark.days) || 7}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-12 gap-4">
        <div
          className="col-span-12 lg:col-span-5 bg-peter-navy/40 border border-peter-gold/15 rounded-lg p-6"
          data-testid="cost-pie-card"
        >
          <div className="text-[10px] tracking-[0.32em] uppercase text-peter-dim mb-4">
            {t("cost.distributionByTier")}
          </div>
          {pie.length === 0 ? (
            <div className="text-peter-dim text-sm">{t("cost.noQueriesYet")}</div>
          ) : (
            <div style={{ height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    stroke="#080808"
                  >
                    {pie.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#0A0F1E",
                      border: "1px solid rgba(201,168,76,0.3)",
                      color: "#F5F5F0",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    wrapperStyle={{ color: "#888880", fontSize: 11, letterSpacing: 1 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div
          className="col-span-12 lg:col-span-7 bg-peter-navy/40 border border-peter-gold/15 rounded-lg p-6"
          data-testid="cost-bar-card"
        >
          <div className="text-[10px] tracking-[0.32em] uppercase text-peter-dim mb-4">
            {t("cost.spendVsSavings")}
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={bar}>
                <CartesianGrid stroke="rgba(201,168,76,0.08)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#888880"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(201,168,76,0.15)" }}
                />
                <YAxis
                  stroke="#888880"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(201,168,76,0.15)" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0A0F1E",
                    border: "1px solid rgba(201,168,76,0.3)",
                    color: "#F5F5F0",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ color: "#888880", fontSize: 11 }} />
                <Bar dataKey="cost" fill="#8B6914" name="Cost ($)" />
                <Bar dataKey="saved" fill="#C9A84C" name="Saved ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="text-[10px] tracking-[0.32em] uppercase text-peter-dim mb-3">
          {t("cost.recentQueries")}
        </div>
        <div
          className="bg-peter-navy/40 border border-peter-gold/15 rounded-lg overflow-hidden"
          data-testid="recent-table"
        >
          <table className="w-full text-sm">
            <thead className="bg-peter-navy2/60 text-[10px] uppercase tracking-[0.2em] text-peter-dim">
              <tr>
                <th className="text-left px-5 py-3">Tier</th>
                <th className="text-left px-5 py-3">Model</th>
                <th className="text-left px-5 py-3">Preview</th>
                <th className="text-right px-5 py-3">Cost</th>
                <th className="text-right px-5 py-3">Saved</th>
                <th className="text-right px-5 py-3">Latency</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-peter-dim">
                    {t("cost.noQueriesYet")}
                  </td>
                </tr>
              ) : (
                data.recent.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-peter-gold/10 hover:bg-peter-navy2/30"
                  >
                    <td className="px-5 py-3">
                      <span
                        className="px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] border rounded-sm"
                        style={{
                          color: TIER_COLORS[r.tier] || "#C9A84C",
                          borderColor: (TIER_COLORS[r.tier] || "#C9A84C") + "55",
                        }}
                      >
                        {r.tier}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-peter-dim">
                      {r.model}
                    </td>
                    <td className="px-5 py-3 text-peter-ivory/80 font-light max-w-md truncate">
                      {r.preview}
                    </td>
                    <td className="px-5 py-3 text-right tnum text-peter-ivory">
                      ${Number(r.cost_usd || 0).toFixed(5)}
                    </td>
                    <td className="px-5 py-3 text-right tnum text-peter-gold">
                      ${Number(r.saved_usd || 0).toFixed(5)}
                    </td>
                    <td className="px-5 py-3 text-right tnum text-peter-ivory/80">
                      {r.latency_ms} ms
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
