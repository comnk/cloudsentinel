"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/Navbar/Navbar";
import { SimulationRun, SimulationScenario } from "@/types/Simulation";

const AI = process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8000";

const SCENARIO_COLORS: Record<string, string> = {
  "cpu-spike": "from-orange-50 to-red-50 border-orange-200",
  "memory-leak": "from-purple-50 to-indigo-50 border-purple-200",
  "crash-loop": "from-red-50 to-pink-50 border-red-200",
  "bad-deployment": "from-amber-50 to-orange-50 border-amber-200",
};

const SCENARIO_ICONS: Record<string, string> = {
  "cpu-spike": "⚡",
  "memory-leak": "💧",
  "crash-loop": "🔄",
  "bad-deployment": "🚨",
};

const STATUS_BADGE: Record<string, string> = {
  RUNNING: "bg-blue-100 text-blue-700 ring-blue-200",
  COMPLETED: "bg-green-100 text-green-700 ring-green-200",
  STOPPED: "bg-gray-100 text-gray-600 ring-gray-200",
  FAILED: "bg-red-100 text-red-700 ring-red-200",
};

function Badge({ label, styles }: { label: string; styles: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles}`}>
      {label}
    </span>
  );
}

function ScenarioCard({
  scenario,
  onLaunch,
  launching,
}: {
  scenario: SimulationScenario;
  onLaunch: (id: string) => void;
  launching: boolean;
}) {
  const color = SCENARIO_COLORS[scenario.id] ?? "from-gray-50 to-slate-50 border-gray-200";
  const icon = SCENARIO_ICONS[scenario.id] ?? "🧪";
  const mins = Math.ceil(scenario.durationSeconds / 60);

  return (
    <div className={`bg-gradient-to-br ${color} border rounded-xl p-5 flex flex-col gap-3`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm">{scenario.name}</h3>
          <p className="text-gray-500 text-xs mt-0.5">{scenario.description}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Duration: ~{mins} min</span>
        <button
          onClick={() => onLaunch(scenario.id)}
          disabled={launching}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
        >
          {launching ? "Launching…" : "Launch Scenario"}
        </button>
      </div>
    </div>
  );
}

function RunCard({
  run,
  onStop,
}: {
  run: SimulationRun;
  onStop: (id: string) => void;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gray-400">#{run.id}</span>
          <span className="font-semibold text-gray-900 text-sm">{run.scenarioName}</span>
          <Badge label={run.status} styles={STATUS_BADGE[run.status] ?? STATUS_BADGE.STOPPED} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{new Date(run.startedAt).toLocaleTimeString()}</span>
          {run.status === "RUNNING" && (
            <button
              onClick={() => onStop(run.id)}
              className="px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Stop
            </button>
          )}
        </div>
      </div>
      {run.events.length > 0 && (
        <div className="relative pl-4 border-l-2 border-gray-100 space-y-1.5">
          {run.events.map((ev, i) => (
            <div key={i} className="relative">
              <div className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-gray-300" />
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(ev.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-xs text-gray-700">{ev.message}</span>
              </div>
            </div>
          ))}
          {run.status === "RUNNING" && (
            <div className="relative">
              <div className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs text-blue-500 italic">Simulation running…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SimulationLabPage() {
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([]);
  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [launching, setLaunching] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetch(`${AI}/simulations/scenarios`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setScenarios)
      .catch(() => {});
  }, []);

  const fetchRuns = useCallback(() => {
    fetch(`${AI}/simulations`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SimulationRun[]) =>
        setRuns(data.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()))
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchRuns();
    const id = setInterval(fetchRuns, 4000);
    return () => clearInterval(id);
  }, [fetchRuns]);

  const handleLaunch = async (scenarioId: string) => {
    setLaunching(scenarioId);
    try {
      const res = await fetch(`${AI}/simulations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenarioId }),
      });
      if (res.ok) {
        const run: SimulationRun = await res.json();
        showToast(`Scenario started — ID: ${run.id}`);
        fetchRuns();
      } else {
        showToast("Failed to start scenario");
      }
    } catch {
      showToast("Could not reach the AI service");
    } finally {
      setLaunching(null);
    }
  };

  const handleStop = async (runId: string) => {
    try {
      await fetch(`${AI}/simulations/${runId}`, { method: "DELETE" });
      fetchRuns();
    } catch {
      showToast("Failed to stop simulation");
    }
  };

  const activeRuns = runs.filter((r) => r.status === "RUNNING");
  const pastRuns = runs.filter((r) => r.status !== "RUNNING");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {toast && (
        <div className="fixed top-16 right-4 z-50 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="max-w-screen-xl mx-auto px-4 py-8 space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Simulation Lab</h1>
          <p className="text-gray-500 text-sm mt-1">
            Launch isolated infrastructure incidents and watch the full detection → investigation pipeline fire in real time.
          </p>
        </div>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">Available Scenarios</h2>
          {scenarios.length === 0 ? (
            <p className="text-gray-400 text-sm">Loading scenarios… (AI service must be running)</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {scenarios.map((s) => (
                <ScenarioCard
                  key={s.id}
                  scenario={s}
                  onLaunch={handleLaunch}
                  launching={launching === s.id}
                />
              ))}
            </div>
          )}
        </section>

        {activeRuns.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
              Active Simulations
              <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-200">
                {activeRuns.length}
              </span>
            </h2>
            <div className="space-y-4">
              {activeRuns.map((r) => (
                <RunCard key={r.id} run={r} onStop={handleStop} />
              ))}
            </div>
          </section>
        )}

        {pastRuns.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">Past Simulations</h2>
            <div className="space-y-4">
              {pastRuns.map((r) => (
                <RunCard key={r.id} run={r} onStop={handleStop} />
              ))}
            </div>
          </section>
        )}

        {runs.length === 0 && scenarios.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
            <p className="text-gray-400 text-sm">No simulations yet. Launch a scenario above to see the pipeline in action.</p>
          </div>
        )}

        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3">What happens when you launch</h2>
          <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
            <li>The AI service publishes synthetic metrics to <code className="text-xs bg-gray-100 px-1 rounded">metrics.raw</code> via Kafka</li>
            <li>The anomaly service detects threshold violations and publishes to <code className="text-xs bg-gray-100 px-1 rounded">anomalies.detected</code></li>
            <li>The backend saves the anomaly and auto-opens an investigation</li>
            <li>The AI investigator agent runs root-cause analysis and posts findings</li>
            <li>Crash loop / bad deployment scenarios also emit K8s events visible on the <a href="/k8s/timeline" className="text-indigo-600 underline">K8s Timeline</a></li>
          </ol>
        </section>
      </div>
    </div>
  );
}
