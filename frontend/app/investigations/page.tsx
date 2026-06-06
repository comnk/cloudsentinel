"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar/Navbar";
import { Investigation } from "@/types/Investigation";

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "text-red-600",
  WARNING: "text-yellow-500",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "text-red-500",
  IN_PROGRESS: "text-yellow-500",
  RESOLVED: "text-green-500",
};

export default function InvestigationsPage() {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/investigations`);
        if (!res.ok) return;
        const data: Investigation[] = await res.json();
        setInvestigations(data.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
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
    <div className="min-h-screen w-screen">
      <Navbar />
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Investigations</h1>
        {loading && <p className="text-gray-500">Loading...</p>}
        {!loading && investigations.length === 0 && (
          <p className="text-gray-500">No investigations yet.</p>
        )}
        {investigations.length > 0 && (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Severity</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2">Summary</th>
              </tr>
            </thead>
            <tbody>
              {investigations.map((inv) => (
                <tr key={inv.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 pr-4 font-mono text-xs">
                    <Link
                      href={`/investigations/${inv.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {inv.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className={`py-2 pr-4 font-semibold ${SEVERITY_COLORS[inv.severity] ?? ""}`}>
                    {inv.severity}
                  </td>
                  <td className={`py-2 pr-4 font-semibold ${STATUS_COLORS[inv.status] ?? ""}`}>
                    {inv.status.replace("_", " ")}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {new Date(inv.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 text-gray-600">{inv.summary ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
