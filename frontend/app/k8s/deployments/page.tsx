"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar/Navbar";

type Deployment = {
  id: number;
  deploymentName: string;
  namespace: string;
  replicas: number;
  availableReplicas: number;
  timestamp: string;
};

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
    const interval = setInterval(fetchDeployments, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-screen">
      <Navbar />
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Deployments</h1>
        {loading && <p className="text-gray-500">Loading...</p>}
        {!loading && deployments.length === 0 && (
          <p className="text-gray-500">No deployments found.</p>
        )}
        {deployments.length > 0 && (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4">Deployment</th>
                <th className="py-2 pr-4">Namespace</th>
                <th className="py-2 pr-4">Replicas</th>
                <th className="py-2 pr-4">Available</th>
                <th className="py-2">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((d) => {
                const healthy =
                  d.availableReplicas != null &&
                  d.replicas != null &&
                  d.availableReplicas >= d.replicas;
                return (
                  <tr key={d.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 pr-4 font-mono text-xs">{d.deploymentName}</td>
                    <td className="py-2 pr-4">{d.namespace}</td>
                    <td className="py-2 pr-4">{d.replicas ?? "—"}</td>
                    <td className={`py-2 pr-4 font-semibold ${healthy ? "text-green-600" : "text-red-500"}`}>
                      {d.availableReplicas ?? "—"}
                    </td>
                    <td className="py-2 text-gray-500 text-xs">
                      {new Date(d.timestamp).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
