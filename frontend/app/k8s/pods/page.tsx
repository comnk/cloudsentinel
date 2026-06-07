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

const STATUS_COLORS: Record<string, string> = {
  Running: "text-green-600",
  Pending: "text-yellow-500",
  Failed: "text-red-600",
  Succeeded: "text-gray-500",
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
    <div className="min-h-screen w-screen">
      <Navbar />
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Pods</h1>
        {loading && <p className="text-gray-500">Loading...</p>}
        {!loading && pods.length === 0 && (
          <p className="text-gray-500">No pods found.</p>
        )}
        {pods.length > 0 && (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4">Pod</th>
                <th className="py-2 pr-4">Namespace</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Node</th>
                <th className="py-2 pr-4">Restarts</th>
                <th className="py-2">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {pods.map((pod) => (
                <tr key={pod.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 pr-4 font-mono text-xs">{pod.podName}</td>
                  <td className="py-2 pr-4">{pod.namespace}</td>
                  <td className={`py-2 pr-4 font-semibold ${STATUS_COLORS[pod.status] ?? ""}`}>
                    {pod.status ?? "—"}
                  </td>
                  <td className="py-2 pr-4 text-gray-600">{pod.node ?? "—"}</td>
                  <td className="py-2 pr-4">{pod.restarts}</td>
                  <td className="py-2 text-gray-500 text-xs">
                    {new Date(pod.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
