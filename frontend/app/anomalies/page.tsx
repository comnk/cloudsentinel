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
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles}`}>
      {label}
    </span>
  );
}

function parseFactors(explanation: string | null): string[] {
  if (!explanation) return [];
  return explanation.split(" | ").filter((f) => f && f !== "No significant deviation from baseline");
}

function extractDelta(factor: string): number | null {
  const m = factor.match(/([+-]\d+)%/);
  return m ? parseInt(m[1], 10) : null;
}

function factorChipStyle(delta: number | null): string {
  if (delta === null) return "bg-gray-100 text-gray-600 ring-gray-200";
  const abs = Math.abs(delta);
  if (abs >= 40) return "bg-red-50 text-red-700 ring-red-200";
  if (abs >= 20) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-blue-50 text-blue-700 ring-blue-200";
}

function FactorChip({ factor }: { factor: string }) {
  // "Memory: +58% (42.3%→66.7%)" → chip label "Memory +58%", full text on hover
  const colonIdx = factor.indexOf(":");
  const pctMatch = factor.match(/([+-]\d+%)/);
  const label = colonIdx !== -1
    ? factor.slice(0, colonIdx) + " " + (pctMatch?.[0] ?? "")
    : factor;
  const delta = extractDelta(factor);

  return (
    <span
      title={factor}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset cursor-default ${factorChipStyle(delta)}`}
    >
      {label.trim()}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? "bg-red-400" : pct >= 50 ? "bg-amber-400" : "bg-blue-400";
  return (
    <div className="flex items-center gap-2">
      <span className="tabular-nums text-gray-700 w-10 shrink-0">{score.toFixed(3)}</span>
      <div className="h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
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
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Contributing Factors</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((a) => {
                  const factors = parseFactors(a.explanation);
                  return (
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
                      <td className="py-3 px-4">
                        <ScoreBar score={a.score} />
                      </td>
                      <td className="py-3 px-4 text-gray-700 max-w-xs">{a.message}</td>
                      <td className="py-3 px-4">
                        {factors.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {factors.map((f, i) => <FactorChip key={i} factor={f} />)}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
