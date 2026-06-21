"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar/Navbar";
import { InvestigationDetail } from "@/types/Investigation";
import { useWebSocket } from "@/hooks/useWebSocket";

const TIMELINE_META: Record<string, { dot: string; badge: string; icon: string }> = {
  DEPLOYMENT_CHANGE:    { dot: "bg-blue-400",   badge: "bg-blue-50 text-blue-700 ring-blue-200",   icon: "⬆" },
  K8S_EVENT:            { dot: "bg-orange-400", badge: "bg-orange-50 text-orange-700 ring-orange-200", icon: "☸" },
  METRIC_SPIKE:         { dot: "bg-amber-400",  badge: "bg-amber-50 text-amber-700 ring-amber-200", icon: "↑" },
  METRIC_READING:       { dot: "bg-gray-300",   badge: "bg-gray-50 text-gray-600 ring-gray-200",   icon: "~" },
  ANOMALY_DETECTED:     { dot: "bg-red-500",    badge: "bg-red-50 text-red-700 ring-red-200",       icon: "!" },
  INVESTIGATION_OPENED: { dot: "bg-purple-400", badge: "bg-purple-50 text-purple-700 ring-purple-200", icon: "🔍" },
  EVIDENCE_ATTACHED:    { dot: "bg-gray-400",   badge: "bg-gray-50 text-gray-600 ring-gray-200",   icon: "📎" },
  ROOT_CAUSE_IDENTIFIED:{ dot: "bg-green-500",  badge: "bg-green-50 text-green-700 ring-green-200", icon: "✓" },
  __default:            { dot: "bg-gray-300",   badge: "bg-gray-50 text-gray-600 ring-gray-200",   icon: "·" },
};

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700 ring-red-200",
  WARNING: "bg-amber-100 text-amber-700 ring-amber-200",
};

const STATUS_BADGE: Record<string, string> = {
  OPEN: "bg-red-100 text-red-700 ring-red-200",
  IN_PROGRESS: "bg-amber-100 text-amber-700 ring-amber-200",
  RESOLVED: "bg-green-100 text-green-700 ring-green-200",
};

function Badge({ label, styles }: { label: string; styles: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles}`}
    >
      {label.replace("_", " ")}
    </span>
  );
}

export default function InvestigationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<InvestigationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/investigations/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setDetail(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // Live investigation updates from agent
  const { data: wsDetail } = useWebSocket<InvestigationDetail>(`/topic/investigations/${id}`);
  useEffect(() => {
    if (wsDetail) setDetail(wsDetail);
  }, [wsDetail]);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/investigations/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch (e) {
      console.error("Error updating status:", e);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-screen-xl mx-auto px-4 py-8 text-gray-500 text-sm">Loading…</div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-screen-xl mx-auto px-4 py-8 text-red-500 text-sm">Investigation not found.</div>
      </div>
    );
  }

  const { investigation, timeline, evidence } = detail;
  const confidencePct =
    investigation.confidence != null ? Math.round(investigation.confidence * 100) : null;
  const confidenceColor =
    confidencePct == null
      ? ""
      : confidencePct >= 80
      ? "text-green-600"
      : confidencePct >= 50
      ? "text-amber-600"
      : "text-red-500";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Investigation{" "}
                <span className="font-mono text-sm font-medium text-gray-500">
                  {investigation.id.slice(0, 8)}…
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(investigation.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                label={investigation.severity}
                styles={SEVERITY_BADGE[investigation.severity] ?? "bg-gray-100 text-gray-700 ring-gray-200"}
              />
              <Badge
                label={investigation.status}
                styles={STATUS_BADGE[investigation.status] ?? "bg-gray-100 text-gray-700 ring-gray-200"}
              />
            </div>
          </div>

          {investigation.summary && (
            <p className="text-sm text-gray-600 mb-4">{investigation.summary}</p>
          )}

          <div className="flex items-center gap-2">
            {(["OPEN", "IN_PROGRESS", "RESOLVED"] as const).map((s) => (
              <button
                key={s}
                disabled={updating || investigation.status === s}
                onClick={() => updateStatus(s)}
                className="px-3 py-1 text-xs font-medium border border-gray-200 rounded-md bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
            Agent Analysis
          </h2>
          {investigation.rootCause ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">Confidence</span>
                <span className={`text-sm font-semibold ${confidenceColor}`}>
                  {confidencePct != null ? `${confidencePct}%` : "—"}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Root Cause</p>
                <p className="text-sm text-gray-700">{investigation.rootCause}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Investigation in progress…</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Evidence</h2>
          {evidence.length === 0 ? (
            <p className="text-sm text-gray-400">No evidence attached.</p>
          ) : (
            <ul className="space-y-2">
              {evidence.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className="text-gray-400 font-mono text-xs pt-0.5 shrink-0">{e.evidenceType}</span>
                  <span className="text-gray-700">{e.content}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
            Incident Timeline
          </h2>
          {timeline.length === 0 ? (
            <p className="text-sm text-gray-400">No timeline entries.</p>
          ) : (
            <ol className="relative border-l-2 border-gray-100 pl-6 space-y-5">
              {[...timeline]
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                .map((e) => {
                  const meta = TIMELINE_META[e.eventType] ?? TIMELINE_META.__default;
                  return (
                    <li key={e.id} className="relative">
                      <span
                        className={`absolute -left-[29px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${meta.dot}`}
                      />
                      <div className="flex items-start gap-2 flex-wrap">
                        <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${meta.badge}`}>
                          {meta.icon} {e.eventType.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-gray-400 pt-0.5">
                          {new Date(e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{e.description}</p>
                    </li>
                  );
                })}
            </ol>
          )}
        </div>

      </div>
    </div>
  );
}
