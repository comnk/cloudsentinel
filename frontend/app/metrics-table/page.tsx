"use client";

import { useEffect, useState } from "react";
import { Metric } from "@/types/Metric";
import Navbar from "@/components/Navbar/Navbar";

function usageColor(value: number) {
  if (value >= 85) return "text-red-600";
  if (value >= 65) return "text-amber-600";
  return "text-green-600";
}

export default function MetricsTablePage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetricsHistory = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/metrics/history`);
        if (!res.ok) throw new Error("Failed to fetch metrics history");
        const data: Metric[] = await res.json();
        setMetrics(data);
      } catch (e) {
        console.error("Error fetching metrics history:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchMetricsHistory();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Metrics History</h1>

        {loading && <p className="text-gray-500 text-sm">Loading…</p>}

        {!loading && metrics.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-gray-500 text-sm">No metrics recorded yet.</p>
          </div>
        )}

        {metrics.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Timestamp</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Host</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">CPU</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Memory</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Disk</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(m.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{m.host}</td>
                    <td className={`py-3 px-4 tabular-nums font-medium ${usageColor(m.cpuUsage)}`}>
                      {m.cpuUsage.toFixed(1)}%
                    </td>
                    <td className={`py-3 px-4 tabular-nums font-medium ${usageColor(m.memoryUsage)}`}>
                      {m.memoryUsage.toFixed(1)}%
                    </td>
                    <td className={`py-3 px-4 tabular-nums font-medium ${usageColor(m.diskUsage)}`}>
                      {m.diskUsage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
