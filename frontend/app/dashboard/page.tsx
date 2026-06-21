"use client";

import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar/Navbar";
import { Metric } from "@/types/Metric";
import { useWebSocket } from "@/hooks/useWebSocket";

function usageColor(value: number) {
  if (value >= 85) return { bar: "bg-red-500", text: "text-red-600", label: "Critical" };
  if (value >= 65) return { bar: "bg-amber-500", text: "text-amber-600", label: "Warning" };
  return { bar: "bg-green-500", text: "text-green-600", label: "Normal" };
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  const pct = value ?? 0;
  const { bar, text, label: statusLabel } = usageColor(pct);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {value != null && (
          <span className={`text-xs font-semibold ${text}`}>{statusLabel}</span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-5xl font-bold tabular-nums ${value != null ? text : "text-gray-200"}`}>
          {value != null ? value.toFixed(1) : "—"}
        </span>
        {value != null && <span className="text-xl text-gray-400 font-medium">%</span>}
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metric | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Seed with current value from Redis cache
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/metrics/latest`)
      .then((r) => (r.ok && r.status !== 204 ? r.json() : null))
      .then((d) => { if (d) { setMetrics(d); setLastUpdated(new Date()); } })
      .catch(() => {});
  }, []);

  // Live updates via WebSocket
  const { data: wsMetric, connected } = useWebSocket<Metric>("/topic/metrics");
  useEffect(() => {
    if (wsMetric) { setMetrics(wsMetric); setLastUpdated(new Date()); }
  }, [wsMetric]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              {metrics?.host ? `Host: ${metrics.host}` : "Waiting for data…"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {lastUpdated && (
              <p className="text-xs text-gray-400">
                Updated {lastUpdated.toLocaleTimeString()}
              </p>
            )}
            <span className={`text-xs font-medium ${connected ? "text-green-500" : "text-gray-400"}`}>
              {connected ? "● Live" : "○ Connecting…"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard label="CPU Usage" value={metrics?.cpuUsage ?? null} />
          <MetricCard label="Memory Usage" value={metrics?.memoryUsage ?? null} />
          <MetricCard label="Disk Usage" value={metrics?.diskUsage ?? null} />
        </div>
      </div>
    </div>
  );
}
