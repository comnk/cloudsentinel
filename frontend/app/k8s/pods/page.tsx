"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar/Navbar";

type Pod = {
  id: number;
  podName: string;
  namespace: string;
  status: string;
  node: string;
  restarts: number;
  timestamp: string;
};

const STATUS_BADGE: Record<string, string> = {
  Running: "bg-green-100 text-green-700 ring-green-200",
  Pending: "bg-amber-100 text-amber-700 ring-amber-200",
  Failed: "bg-red-100 text-red-700 ring-red-200",
  Succeeded: "bg-gray-100 text-gray-600 ring-gray-200",
};

const API = process.env.NEXT_PUBLIC_API_URL;

export default function PodsPage() {
  const [pods, setPods] = useState<Pod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPods = async () => {
      try {
        const res = await fetch(`${API}/k8s/pods`);
        if (res.ok) setPods(await res.json());
      } finally {
        setLoading(false);
      }
    };
    fetchPods();
    const interval = setInterval(fetchPods, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Pods</h1>

        {loading && <p className="text-gray-500 text-sm">Loading…</p>}

        {!loading && pods.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-gray-500 text-sm">No pods found.</p>
          </div>
        )}

        {pods.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Pod</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Namespace</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Node</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Restarts</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {pods.map((pod) => (
                  <tr key={pod.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-gray-700">{pod.podName}</td>
                    <td className="py-3 px-4 text-gray-600">{pod.namespace}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_BADGE[pod.status] ?? "bg-gray-100 text-gray-600 ring-gray-200"}`}
                      >
                        {pod.status ?? "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{pod.node ?? "—"}</td>
                    <td className={`py-3 px-4 tabular-nums font-medium ${pod.restarts > 0 ? "text-amber-600" : "text-gray-700"}`}>
                      {pod.restarts}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(pod.timestamp).toLocaleString()}
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
