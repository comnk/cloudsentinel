import json
import os
import threading
import time
import uuid
from datetime import datetime, timezone

from confluent_kafka import Producer

SCENARIOS = {
    "cpu-spike": {
        "name": "CPU Spike Incident",
        "description": "Simulates runaway CPU utilization spiking to 92%",
        "durationSeconds": 120,
    },
    "memory-leak": {
        "name": "Memory Leak Incident",
        "description": "Simulates gradual memory growth until OOMKilled",
        "durationSeconds": 300,
    },
    "crash-loop": {
        "name": "Crash Loop Incident",
        "description": "Simulates a pod repeatedly crashing with CrashLoopBackOff",
        "durationSeconds": 180,
    },
    "bad-deployment": {
        "name": "Bad Deployment Incident",
        "description": "Rolls out a faulty v2 image that leaks memory until OOMKilled",
        "durationSeconds": 240,
    },
}


class SimulationRun:
    def __init__(self, scenario: str):
        self.id = uuid.uuid4().hex[:8]
        self.scenario = scenario
        self.status = "RUNNING"
        self.started_at = datetime.now(timezone.utc).isoformat()
        self.events: list[dict] = []
        self._stop = threading.Event()

    def add_event(self, message: str):
        self.events.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": message,
        })

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "scenario": self.scenario,
            "scenarioName": SCENARIOS.get(self.scenario, {}).get("name", self.scenario),
            "status": self.status,
            "startedAt": self.started_at,
            "events": list(self.events),
        }


class SimulationService:
    def __init__(self):
        self._runs: dict[str, SimulationRun] = {}
        self._lock = threading.Lock()

    def _producer(self) -> Producer:
        bootstrap = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
        return Producer({"bootstrap.servers": bootstrap})

    def list_runs(self) -> list[dict]:
        with self._lock:
            return [r.to_dict() for r in self._runs.values()]

    def get_run(self, run_id: str) -> dict | None:
        run = self._runs.get(run_id)
        return run.to_dict() if run else None

    def start(self, scenario: str) -> dict:
        if scenario not in SCENARIOS:
            raise ValueError(f"Unknown scenario: {scenario}")
        run = SimulationRun(scenario)
        with self._lock:
            self._runs[run.id] = run
        t = threading.Thread(target=self._execute, args=(run,), daemon=True)
        t.start()
        return run.to_dict()

    def stop(self, run_id: str) -> dict:
        run = self._runs.get(run_id)
        if not run:
            raise KeyError(f"Run not found: {run_id}")
        run._stop.set()
        run.status = "STOPPED"
        run.add_event("Simulation stopped by user")
        return run.to_dict()

    def _publish_metric(self, producer: Producer, host: str, cpu: float, memory: float, disk: float):
        msg = {
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
            "host": host,
            "cpuUsage": round(cpu, 1),
            "memoryUsage": round(memory, 1),
            "diskUsage": round(disk, 1),
        }
        producer.produce("metrics.raw", json.dumps(msg))
        producer.flush()

    def _publish_k8s_event(self, producer: Producer, reason: str, resource: str, message: str):
        msg = {
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
            "namespace": "demo-lab",
            "type": "Warning",
            "reason": reason,
            "resource": resource,
            "message": message,
        }
        producer.produce("k8s.events", json.dumps(msg))
        producer.flush()

    def _sleep(self, run: SimulationRun, seconds: float) -> bool:
        """Sleep for `seconds`, returning False early if stopped."""
        return not run._stop.wait(timeout=seconds)

    def _execute(self, run: SimulationRun):
        producer = self._producer()
        try:
            scenarios = {
                "cpu-spike": self._cpu_spike,
                "memory-leak": self._memory_leak,
                "crash-loop": self._crash_loop,
                "bad-deployment": self._bad_deployment,
            }
            scenarios[run.scenario](run, producer)
            if not run._stop.is_set():
                run.status = "COMPLETED"
                run.add_event("Simulation completed")
        except Exception as exc:
            run.status = "FAILED"
            run.add_event(f"Simulation failed: {exc}")

    def _cpu_spike(self, run: SimulationRun, producer: Producer):
        host = f"sim-{run.id}"
        run.add_event("Simulation started — warming up baseline metrics")
        for i in range(6):
            if not self._sleep(run, 5): return
            self._publish_metric(producer, host, 10 + i * 2, 45.0, 30.0)

        run.add_event("CPU spike initiated — sustained high utilization")
        for i in range(18):
            if not self._sleep(run, 5): return
            cpu = min(94.0, 78.0 + i * 1.0)
            self._publish_metric(producer, host, cpu, 45.0, 30.0)

        run.add_event("CPU spike subsiding")

    def _memory_leak(self, run: SimulationRun, producer: Producer):
        host = f"sim-{run.id}"
        run.add_event("Simulation started — memory growing gradually")
        for i in range(6):
            if not self._sleep(run, 5): return
            self._publish_metric(producer, host, 15.0, 20.0 + i * 2, 30.0)

        run.add_event("Memory leak accelerating")
        oom_sent = False
        for i in range(54):
            if not self._sleep(run, 5): return
            memory = min(96.0, 32.0 + i * 1.3)
            self._publish_metric(producer, host, 20.0, memory, 30.0)
            if memory > 90.0 and not oom_sent:
                oom_sent = True
                self._publish_k8s_event(
                    producer,
                    "OOMKilling",
                    f"pod/sim-worker-{run.id}",
                    f"Container sim-worker-{run.id} exceeded memory limit and was OOMKilled",
                )
                run.add_event("OOMKilled — container exceeded memory limit")

    def _crash_loop(self, run: SimulationRun, producer: Producer):
        host = f"sim-{run.id}"
        pod = f"sim-pod-{run.id}"
        run.add_event("Simulation started — pod deployment initiated")

        for cycle in range(6):
            if run._stop.is_set(): return
            run.add_event(f"Pod restart #{cycle + 1}")
            for _ in range(3):
                if not self._sleep(run, 5): return
                self._publish_metric(producer, host, 25.0, 40.0, 30.0)

            self._publish_k8s_event(
                producer,
                "BackOff",
                f"pod/{pod}",
                f"Back-off restarting failed container in pod {pod} (restarts: {cycle + 1})",
            )
            self._publish_k8s_event(
                producer,
                "CrashLoopBackOff",
                f"pod/{pod}",
                f"Container {pod} in CrashLoopBackOff — restart count: {cycle + 1}",
            )
            run.add_event(f"Pod crashed — CrashLoopBackOff (restart #{cycle + 1})")
            if not self._sleep(run, 8): return

    def _bad_deployment(self, run: SimulationRun, producer: Producer):
        host = f"sim-{run.id}"
        run.add_event("Simulation started — deploying sample-api:v1 (healthy)")
        self._publish_k8s_event(
            producer,
            "Scaled",
            "deployment/sample-api",
            "Scaled up replica set sample-api-v1 to 2",
        )
        for i in range(6):
            if not self._sleep(run, 5): return
            self._publish_metric(producer, host, 12.0, 25.0, 30.0)

        run.add_event("Rolling out sample-api:v2 (faulty — memory leak)")
        self._publish_k8s_event(
            producer,
            "Scaled",
            "deployment/sample-api",
            "Rolled out replica set sample-api-v2 to 2 (replaced v1)",
        )

        oom_sent = False
        for i in range(36):
            if not self._sleep(run, 5): return
            memory = min(96.0, 25.0 + i * 2.0)
            cpu = min(60.0, 15.0 + i * 1.2)
            self._publish_metric(producer, host, cpu, memory, 30.0)
            if memory > 90.0 and not oom_sent:
                oom_sent = True
                self._publish_k8s_event(
                    producer,
                    "OOMKilling",
                    "pod/sample-api-v2-xxx",
                    "Container sample-api-v2 exceeded memory limit — likely memory leak introduced in v2",
                )
                run.add_event("OOMKilled — sample-api:v2 exceeded memory limit (memory leak confirmed)")


simulation_service = SimulationService()
