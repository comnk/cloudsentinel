"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar/Navbar";
import { Anomaly } from "@/types/Anomaly";
import { ClusterEvent } from "@/types/ClusterEvent";
import { useWebSocket } from "@/hooks/useWebSocket";

type TimelineEntry =
  | { kind: "anomaly"; timestamp: string; data: Anomaly }
  | { kind: "k8s_event"; timestamp: string; data: ClusterEvent };

const API = process.env.NEXT_PUBLIC_API_URL;

export default function TimelinePage() {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
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
    load();
  }, []);

  const { data: newAnomaly } = useWebSocket<Anomaly>("/topic/anomalies");
  useEffect(() => {
    if (!newAnomaly) return;
    setEntries((prev) => {
      const entry: TimelineEntry = { kind: "anomaly", timestamp: newAnomaly.timestamp, data: newAnomaly };
      if (prev.some((e) => e.kind === "anomaly" && e.data.id === newAnomaly.id)) return prev;
      return [entry, ...prev];
    });
  }, [newAnomaly]);

  const { data: newEvent } = useWebSocket<ClusterEvent>("/topic/events");
  useEffect(() => {
    if (!newEvent) return;
    setEntries((prev) => {
      const entry: TimelineEntry = { kind: "k8s_event", timestamp: newEvent.timestamp, data: newEvent };
      if (prev.some((e) => e.kind === "k8s_event" && e.data.id === newEvent.id)) return prev;
      return [entry, ...prev];
    });
  }, [newEvent]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Event Timeline</h1>

        {loading && <p className="text-gray-500 text-sm">Loading…</p>}

        {!loading && entries.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-gray-500 text-sm">No events yet.</p>
          </div>
        )}

        <ol className="relative border-l-2 border-gray-100">
          {entries.map((entry, i) => (
            <li key={i} className="mb-5 ml-5">
              <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-gray-300" />
              <time className="text-xs text-gray-400 block mb-1">
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
  const isCritical = anomaly.severity === "CRITICAL";
  return (
    <div
      className={`rounded-lg border-l-4 p-3 ${
        isCritical ? "border-red-400 bg-red-50" : "border-amber-400 bg-amber-50"
      }`}
    >
      <p className="font-semibold text-sm text-gray-800">
        Anomaly — {anomaly.type}
        <span className={`ml-2 text-xs font-medium ${isCritical ? "text-red-600" : "text-amber-600"}`}>
          [{anomaly.severity}]
        </span>
      </p>
      <p className="text-sm text-gray-600 mt-0.5">{anomaly.message}</p>
      {anomaly.host && (
        <p className="text-xs text-gray-400 mt-0.5">host: {anomaly.host}</p>
      )}
    </div>
  );
}

function K8sEventEntry({ event }: { event: ClusterEvent }) {
  const isWarning = ["OOMKilled", "BackOff", "FailedScheduling", "Killing"].includes(event.reason ?? "");
  return (
    <div
      className={`rounded-lg border-l-4 p-3 ${
        isWarning ? "border-orange-400 bg-orange-50" : "border-blue-300 bg-blue-50"
      }`}
    >
      <p className="font-semibold text-sm text-gray-800">
        {event.reason}
        <span className="ml-2 text-xs font-normal text-gray-500">{event.resource}</span>
      </p>
      {event.message && (
        <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{event.message}</p>
      )}
      <p className="text-xs text-gray-400 mt-0.5">ns: {event.namespace}</p>
    </div>
  );
}
