"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar/Navbar";
import { InvestigationDetail } from "@/types/Investigation";

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

  const fetchDetail = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/investigations/${id}`);
      if (!res.ok) return;
      setDetail(await res.json());
    } catch (e) {
      console.error("Error fetching investigation:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/investigations/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await fetchDetail();
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

        {(investigation.rootCause || investigation.status !== "RESOLVED") && (
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
        )}

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
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Timeline</h2>
          {timeline.length === 0 ? (
            <p className="text-sm text-gray-400">No timeline entries.</p>
          ) : (
            <ol className="space-y-3 border-l-2 border-gray-100 pl-4">
              {timeline.map((e) => (
                <li key={e.id} className="text-sm relative">
                  <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-gray-200 border-2 border-white" />
                  <span className="text-gray-400 text-xs mr-3">
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="font-medium text-gray-800 mr-2">{e.eventType}</span>
                  <span className="text-gray-500">{e.description}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

      </div>
    </div>
  );
}
