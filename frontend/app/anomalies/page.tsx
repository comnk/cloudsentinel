"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar/Navbar";
import { Anomaly } from "@/types/Anomaly";
import { useWebSocket } from "@/hooks/useWebSocket";

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700 ring-red-200",
  WARNING: "bg-amber-100 text-amber-700 ring-amber-200",
};

function Badge({ label, styles }: { label: string; styles: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles}`}
    >
      {label}
    </span>
  );
}

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/anomalies/`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Anomaly[]) => setAnomalies(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { data: newAnomaly } = useWebSocket<Anomaly>("/topic/anomalies");
  useEffect(() => {
    if (!newAnomaly) return;
    setAnomalies((prev) => {
      if (prev.some((a) => a.id === newAnomaly.id)) return prev;
      return [newAnomaly, ...prev];
    });
  }, [newAnomaly]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Detected Anomalies</h1>

        {loading && <p className="text-gray-500 text-sm">Loading…</p>}

        {!loading && anomalies.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-gray-500 text-sm">No anomalies detected yet.</p>
          </div>
        )}

        {anomalies.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Host</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Severity</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Message</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Explanation</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-gray-500 text-xs">
                      {new Date(a.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{a.host ?? "—"}</td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-700">{a.type}</td>
                    <td className="py-3 px-4">
                      <Badge
                        label={a.severity}
                        styles={SEVERITY_BADGE[a.severity] ?? "bg-gray-100 text-gray-700 ring-gray-200"}
                      />
                    </td>
                    <td className="py-3 px-4 tabular-nums text-gray-700">{a.score.toFixed(3)}</td>
                    <td className="py-3 px-4 text-gray-700">{a.message}</td>
                    <td className="py-3 px-4 text-gray-500">{a.explanation ?? "—"}</td>
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
