"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar/Navbar";
import { Deployment } from "@/types/Deployment";
import { useWebSocket } from "@/hooks/useWebSocket";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeployments = async () => {
      try {
        const res = await fetch(`${API}/k8s/deployments`);
        if (res.ok) setDeployments(await res.json());
      } finally {
        setLoading(false);
      }
    };
    fetchDeployments();
  }, []);

  const { data: updatedDeployment } = useWebSocket<Deployment>("/topic/deployments");
  useEffect(() => {
    if (!updatedDeployment) return;
    setDeployments((prev) => {
      const idx = prev.findIndex((d) => d.id === updatedDeployment.id);
      if (idx === -1) return [updatedDeployment, ...prev];
      const next = [...prev];
      next[idx] = updatedDeployment;
      return next;
    });
  }, [updatedDeployment]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Deployments</h1>

        {loading && <p className="text-gray-500 text-sm">Loading…</p>}

        {!loading && deployments.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-gray-500 text-sm">No deployments found.</p>
          </div>
        )}

        {deployments.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Deployment</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Namespace</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Replicas</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Available</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {deployments.map((d) => {
                  const healthy =
                    d.availableReplicas != null &&
                    d.replicas != null &&
                    d.availableReplicas >= d.replicas;
                  return (
                    <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-gray-700">{d.deploymentName}</td>
                      <td className="py-3 px-4 text-gray-600">{d.namespace}</td>
                      <td className="py-3 px-4 tabular-nums text-gray-700">{d.replicas ?? "—"}</td>
                      <td className={`py-3 px-4 tabular-nums font-semibold ${healthy ? "text-green-600" : "text-red-500"}`}>
                        {d.availableReplicas ?? "—"}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(d.timestamp).toLocaleString()}
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
