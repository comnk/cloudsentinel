"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar/Navbar";
import { InvestigationDetail } from "@/types/Investigation";

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "text-red-600",
  WARNING: "text-yellow-500",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "text-red-500",
  IN_PROGRESS: "text-yellow-500",
  RESOLVED: "text-green-500",
};

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

  if (loading) return (
    <div className="min-h-screen w-screen">
      <Navbar />
      <div className="p-8 text-gray-500">Loading...</div>
    </div>
  );

  if (!detail) return (
    <div className="min-h-screen w-screen">
      <Navbar />
      <div className="p-8 text-red-500">Investigation not found.</div>
    </div>
  );

  const { investigation, timeline, evidence } = detail;

  return (
    <div className="min-h-screen w-screen">
      <Navbar />
      <div className="p-8 max-w-4xl">

        <div className="mb-8 border-b pb-6">
          <h1 className="text-2xl font-bold mb-2">
            Investigation <span className="font-mono text-base">{investigation.id.slice(0, 8)}…</span>
          </h1>
          <div className="flex gap-6 text-sm mb-4">
            <span>
              Severity:{" "}
              <span className={`font-semibold ${SEVERITY_COLORS[investigation.severity] ?? ""}`}>
                {investigation.severity}
              </span>
            </span>
            <span>
              Status:{" "}
              <span className={`font-semibold ${STATUS_COLORS[investigation.status] ?? ""}`}>
                {investigation.status.replace("_", " ")}
              </span>
            </span>
            <span>Created: {new Date(investigation.createdAt).toLocaleString()}</span>
          </div>
          {investigation.summary && (
            <p className="text-gray-600 mb-4">{investigation.summary}</p>
          )}
          <div className="flex gap-2">
            {(["OPEN", "IN_PROGRESS", "RESOLVED"] as const).map((s) => (
              <button
                key={s}
                disabled={updating || investigation.status === s}
                onClick={() => updateStatus(s)}
                className="px-3 py-1 text-xs border rounded disabled:opacity-40 hover:bg-gray-100"
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Evidence</h2>
          {evidence.length === 0 ? (
            <p className="text-gray-500 text-sm">No evidence attached.</p>
          ) : (
            <ul className="space-y-2">
              {evidence.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className="text-gray-400 font-mono text-xs pt-0.5">{e.evidenceType}</span>
                  <span>{e.content}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Timeline</h2>
          {timeline.length === 0 ? (
            <p className="text-gray-500 text-sm">No timeline entries.</p>
          ) : (
            <ol className="space-y-2 border-l-2 border-gray-200 pl-4">
              {timeline.map((e) => (
                <li key={e.id} className="text-sm relative">
                  <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-gray-300 border-2 border-white" />
                  <span className="text-gray-400 mr-3">
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="font-medium mr-2">{e.eventType}</span>
                  <span className="text-gray-600">{e.description}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

      </div>
    </div>
  );
}
