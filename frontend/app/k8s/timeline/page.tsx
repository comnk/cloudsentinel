"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar/Navbar";
import { Anomaly } from "@/types/Anomaly";
import { ClusterEvent } from "@/types/ClusterEvent";

type TimelineEntry =
  | { kind: "anomaly"; timestamp: string; data: Anomaly }
  | { kind: "k8s_event"; timestamp: string; data: ClusterEvent };

const API = process.env.NEXT_PUBLIC_API_URL;

export default function TimelinePage() {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const [anomalyRes, eventRes] = await Promise.all([
          fetch(`${API}/anomalies/`),
          fetch(`${API}/k8s/events`),
        ]);

        const anomalies: Anomaly[] = anomalyRes.ok ? await anomalyRes.json() : [];
        const events: ClusterEvent[] = eventRes.ok ? await eventRes.json() : [];

        const merged: TimelineEntry[] = [
          ...anomalies.map((a) => ({ kind: "anomaly" as const, timestamp: a.timestamp, data: a })),
          ...events.map((e) => ({ kind: "k8s_event" as const, timestamp: e.timestamp, data: e })),
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setEntries(merged);
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
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Event Timeline</h1>
        {loading && <p className="text-gray-500">Loading...</p>}
        {!loading && entries.length === 0 && (
          <p className="text-gray-500">No events yet.</p>
        )}
        <ol className="relative border-l border-gray-200">
          {entries.map((entry, i) => (
            <li key={i} className="mb-6 ml-4">
              <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-gray-400" />
              <time className="text-xs text-gray-500">
                {new Date(entry.timestamp).toLocaleString()}
              </time>
              {entry.kind === "anomaly" ? (
                <AnomalyEntry anomaly={entry.data} />
              ) : (
                <K8sEventEntry event={entry.data} />
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function AnomalyEntry({ anomaly }: { anomaly: Anomaly }) {
  const color =
    anomaly.severity === "CRITICAL"
      ? "border-red-500 bg-red-50"
      : "border-yellow-400 bg-yellow-50";
  return (
    <div className={`mt-1 rounded border-l-4 p-3 ${color}`}>
      <p className="font-semibold text-sm">
        Anomaly Detected — {anomaly.type}
        <span className="ml-2 text-xs font-normal text-gray-600">
          [{anomaly.severity}]
        </span>
      </p>
      <p className="text-sm text-gray-700 mt-0.5">{anomaly.message}</p>
      {anomaly.host && (
        <p className="text-xs text-gray-500 mt-0.5">host: {anomaly.host}</p>
      )}
    </div>
  );
}

function K8sEventEntry({ event }: { event: ClusterEvent }) {
  const isWarning = ["OOMKilled", "BackOff", "FailedScheduling", "Killing"].includes(
    event.reason ?? ""
  );
  const color = isWarning ? "border-orange-400 bg-orange-50" : "border-blue-300 bg-blue-50";
  return (
    <div className={`mt-1 rounded border-l-4 p-3 ${color}`}>
      <p className="font-semibold text-sm">
        {event.reason}
        <span className="ml-2 text-xs font-normal text-gray-500">{event.resource}</span>
      </p>
      {event.message && (
        <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">{event.message}</p>
      )}
      <p className="text-xs text-gray-500 mt-0.5">ns: {event.namespace}</p>
    </div>
  );
}
