"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar/Navbar";
import { Anomaly } from "@/types/Anomaly";

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "text-red-600",
  WARNING: "text-yellow-500",
};

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnomalies = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/anomalies/`
        );
        if (!response.ok) return;
        const data: Anomaly[] = await response.json();
        setAnomalies(data);
      } catch (error) {
        console.error("Error fetching anomalies:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnomalies();
    const interval = setInterval(fetchAnomalies, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-screen">
      <Navbar />
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Detected Anomalies</h1>
        {loading && <p className="text-gray-500">Loading...</p>}
        {!loading && anomalies.length === 0 && (
          <p className="text-gray-500">No anomalies detected yet.</p>
        )}
        {anomalies.length > 0 && (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Host</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Severity</th>
                <th className="py-2 pr-4">Score</th>
                <th className="py-2 pr-4">Message</th>
                <th className="py-2">Explanation</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((a) => (
                <tr key={a.id} className="border-b">
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {new Date(a.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4">{a.host ?? "—"}</td>
                  <td className="py-2 pr-4 font-mono">{a.type}</td>
                  <td
                    className={`py-2 pr-4 font-semibold ${SEVERITY_COLORS[a.severity] ?? ""}`}
                  >
                    {a.severity}
                  </td>
                  <td className="py-2 pr-4">{a.score.toFixed(3)}</td>
                  <td className="py-2 pr-4">{a.message}</td>
                  <td className="py-2 text-gray-600">{a.explanation ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
