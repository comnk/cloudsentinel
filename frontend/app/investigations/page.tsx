"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar/Navbar";
import { Investigation } from "@/types/Investigation";

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
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles}`}
    >
      {label.replace("_", " ")}
    </span>
  );
}

export default function InvestigationsPage() {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/investigations`);
        if (!res.ok) return;
        const data: Investigation[] = await res.json();
        setInvestigations(
          data.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      } catch (e) {
        console.error("Error fetching investigations:", e);
      } finally {
        setLoading(false);
      }
    };

    fetch_();
    const interval = setInterval(fetch_, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Investigations</h1>

        {loading && <p className="text-gray-500 text-sm">Loading…</p>}

        {!loading && investigations.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-gray-500 text-sm">No investigations yet.</p>
          </div>
        )}

        {investigations.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Severity</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Confidence</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Summary</th>
                </tr>
              </thead>
              <tbody>
                {investigations.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        href={`/investigations/${inv.id}`}
                        className="font-mono text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        {inv.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        label={inv.severity}
                        styles={SEVERITY_BADGE[inv.severity] ?? "bg-gray-100 text-gray-700 ring-gray-200"}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        label={inv.status}
                        styles={STATUS_BADGE[inv.status] ?? "bg-gray-100 text-gray-700 ring-gray-200"}
                      />
                    </td>
                    <td className="py-3 px-4 tabular-nums text-gray-700">
                      {inv.confidence != null ? (
                        `${Math.round(inv.confidence * 100)}%`
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-xs text-gray-500">
                      {new Date(inv.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{inv.summary ?? "—"}</td>
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
