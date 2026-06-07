import React, { useEffect, useState } from "react";
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
} from "recharts";
import { stats } from "../lib/api";

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

export default function CostView() {
  const [data, setData] = useState(null);

  const refresh = () => stats().then(setData).catch(() => {});

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 6000);
    return () => clearInterval(id);
  }, []);

  if (!data) {
    return (
      <div className="p-12 text-peter-dim text-sm" data-testid="cost-loading">
        Loading…
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
        Cost & Usage
      </div>
      <h1 className="h-display text-4xl text-peter-ivory mt-1">
        The savings <em className="text-peter-gold not-italic">ledger</em>
      </h1>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Big
          label="Total Queries"
          value={data.totals.total_queries.toLocaleString()}
          sub="Lifetime"
          testid="metric-total-queries"
        />
        <Big
          label="Total Cost"
          value={`$${data.totals.total_cost_usd.toFixed(5)}`}
          sub="Across all tiers"
          testid="metric-total-cost"
        />
        <Big
          label="Saved vs Premium"
          value={`$${data.totals.total_saved_usd.toFixed(5)}`}
          sub="If we'd run every query on Claude Opus"
          testid="metric-total-saved"
        />
        <Big
          label="Avg Latency"
          value={`${Math.round(data.totals.avg_latency_ms || 0)} ms`}
          sub="Mean across tiers"
          testid="metric-avg-latency"
        />
      </div>

      <div className="mt-8 grid grid-cols-12 gap-4">
        <div
          className="col-span-12 lg:col-span-5 bg-peter-navy/40 border border-peter-gold/15 rounded-lg p-6"
          data-testid="cost-pie-card"
        >
          <div className="text-[10px] tracking-[0.32em] uppercase text-peter-dim mb-4">
            Distribution by tier
          </div>
          {pie.length === 0 ? (
            <div className="text-peter-dim text-sm">No queries yet.</div>
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
            Spend vs savings per tier
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
          Recent queries
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
                    No queries yet. Visit the chat to begin.
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
