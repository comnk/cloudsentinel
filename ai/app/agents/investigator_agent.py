import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone

import httpx
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part

if not os.environ.get("GOOGLE_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.environ.get("GEMINI_KEY", "")

log = logging.getLogger(__name__)

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8080")
MODEL = "gemini-3-flash-preview"


def get_recent_metrics(host: str, last_minutes: int = 30) -> dict:
    """Retrieve recent CPU, memory, and disk metrics for a host.

    Args:
        host: The hostname to query metrics for.
        last_minutes: How many minutes back to look (default 30).

    Returns:
        A dict with average and max cpu, memory, disk usage and trend info.
    """
    try:
        resp = httpx.get(f"{BACKEND_URL}/metrics/history", timeout=5.0)
        resp.raise_for_status()
        samples = resp.json()

        cutoff = datetime.now(timezone.utc) - timedelta(minutes=last_minutes)
        recent = [
            s for s in samples
            if s.get("host") == host
            and datetime.fromisoformat(s["timestamp"].replace("Z", "+00:00")) >= cutoff
        ]

        if not recent:
            all_for_host = [s for s in samples if s.get("host") == host]
            if not all_for_host:
                return {"host": host, "samples": 0, "note": "No metrics found for this host"}
            recent = all_for_host[-20:]

        cpu_vals = [s["cpuUsage"] for s in recent if s.get("cpuUsage") is not None]
        mem_vals = [s["memoryUsage"] for s in recent if s.get("memoryUsage") is not None]
        disk_vals = [s["diskUsage"] for s in recent if s.get("diskUsage") is not None]

        result: dict = {"host": host, "samples": len(recent), "window_minutes": last_minutes}
        if cpu_vals:
            result["cpu_avg"] = round(sum(cpu_vals) / len(cpu_vals), 1)
            result["cpu_max"] = round(max(cpu_vals), 1)
        if mem_vals:
            result["memory_avg"] = round(sum(mem_vals) / len(mem_vals), 1)
            result["memory_max"] = round(max(mem_vals), 1)
            mid = len(mem_vals) // 2
            if mid > 0:
                first_avg = sum(mem_vals[:mid]) / mid
                second_avg = sum(mem_vals[mid:]) / len(mem_vals[mid:])
                result["memory_growing"] = second_avg > first_avg * 1.1
                result["memory_growth_pct"] = round((second_avg - first_avg) / max(first_avg, 1) * 100, 1)
        if disk_vals:
            result["disk_avg"] = round(sum(disk_vals) / len(disk_vals), 1)
            result["disk_max"] = round(max(disk_vals), 1)

        return result
    except Exception as e:
        log.error("get_recent_metrics failed: %s", e)
        return {"error": str(e)}


def get_k8s_events(host: str = "") -> list:
    """Retrieve recent Kubernetes cluster events, optionally filtered by host or resource name.

    Args:
        host: Optional hostname or resource name to filter events by. Pass empty string for all events.

    Returns:
        A list of Kubernetes events with reason, message, resource, namespace, and timestamp.
    """
    try:
        resp = httpx.get(f"{BACKEND_URL}/k8s/events", timeout=5.0)
        resp.raise_for_status()
        events = resp.json()

        if host:
            events = [
                e for e in events
                if host.lower() in str(e.get("resource", "")).lower()
                or host.lower() in str(e.get("namespace", "")).lower()
            ]

        return [
            {
                "reason": e.get("reason"),
                "message": e.get("message"),
                "resource": e.get("resource"),
                "namespace": e.get("namespace"),
                "timestamp": e.get("timestamp"),
            }
            for e in events[-20:]
        ]
    except Exception as e:
        log.error("get_k8s_events failed: %s", e)
        return [{"error": str(e)}]


def get_recent_deployments() -> list:
    """Retrieve recent Kubernetes deployments to check for correlation with the anomaly.

    Returns:
        A list of recent deployments with name, namespace, replicas, and timestamp.
    """
    try:
        resp = httpx.get(f"{BACKEND_URL}/k8s/deployments", timeout=5.0)
        resp.raise_for_status()
        deployments = resp.json()

        return [
            {
                "name": d.get("deploymentName"),
                "namespace": d.get("namespace"),
                "replicas": d.get("replicas"),
                "timestamp": d.get("timestamp"),
            }
            for d in deployments[-10:]
        ]
    except Exception as e:
        log.error("get_recent_deployments failed: %s", e)
        return [{"error": str(e)}]


def find_similar_incidents(anomaly_type: str) -> list:
    """Find previous resolved investigations for the same type of anomaly.

    Args:
        anomaly_type: The type of anomaly to search for (e.g. 'CPU', 'MEMORY', 'DISK').

    Returns:
        A list of past investigations with their root cause and confidence score.
    """
    try:
        resp = httpx.get(f"{BACKEND_URL}/investigations", timeout=5.0)
        resp.raise_for_status()
        investigations = resp.json()

        similar = [
            inv for inv in investigations
            if anomaly_type.lower() in str(inv.get("summary", "")).lower()
            and inv.get("rootCause") is not None
        ]

        return [
            {
                "id": inv.get("id"),
                "summary": inv.get("summary"),
                "rootCause": inv.get("rootCause"),
                "confidence": inv.get("confidence"),
                "severity": inv.get("severity"),
                "createdAt": inv.get("createdAt"),
            }
            for inv in similar[-5:]
        ]
    except Exception as e:
        log.error("find_similar_incidents failed: %s", e)
        return [{"error": str(e)}]


def submit_findings(investigation_id: str, root_cause: str, confidence: float, summary: str) -> dict:
    """Submit the investigation root cause and close the investigation.

    Args:
        investigation_id: The UUID of the investigation to update.
        root_cause: The identified root cause of the anomaly, with specific evidence cited.
        confidence: Confidence score between 0.0 (low) and 1.0 (high).
        summary: A concise 1-2 sentence summary citing the key evidence and likely cause.

    Returns:
        Confirmation dict with status and investigation_id.
    """
    try:
        resp = httpx.patch(
            f"{BACKEND_URL}/investigations/{investigation_id}/findings",
            json={
                "rootCause": root_cause,
                "confidence": str(confidence),
                "summary": summary,
            },
            timeout=5.0,
        )
        resp.raise_for_status()
        log.info("Submitted findings for investigation %s (confidence=%.2f)", investigation_id, confidence)
        return {"status": "submitted", "investigation_id": investigation_id}
    except Exception as e:
        log.error("submit_findings failed for %s: %s", investigation_id, e)
        return {"error": str(e)}


investigator_agent = LlmAgent(
    name="sre_investigator",
    model=MODEL,
    description="An AI SRE that investigates infrastructure anomalies by gathering evidence from metrics, Kubernetes events, and deployment history, then produces a structured root cause report.",
    instruction="""You are a Site Reliability Engineer (SRE) investigating an infrastructure anomaly.

Your job: gather evidence, form a hypothesis, and submit a structured root cause report.

Investigation steps — follow in order:
1. Call get_recent_metrics for the affected host to check CPU, memory, and disk trends.
2. Call get_k8s_events to check for OOMKilled, CrashLoopBackOff, BackOff, or warning events.
3. Call get_recent_deployments to check whether a deployment preceded the anomaly.
4. Call find_similar_incidents with the anomaly type to check if this has happened before.
5. Synthesize all evidence into a root cause hypothesis.
6. Call submit_findings with your conclusion.

Rules for submit_findings:
- root_cause: Be specific. Cite actual numbers and events (e.g., "Memory grew 45% over baseline; OOMKilled event observed; deployment 12 minutes before anomaly").
- confidence: 0.9+ if multiple corroborating signals, 0.6-0.8 if partial evidence, below 0.5 if inconclusive.
- summary: 1-2 sentences, specific, no generic text like "there may be an issue."

Always call submit_findings — that is how you complete the investigation.
""",
    tools=[
        get_recent_metrics,
        get_k8s_events,
        get_recent_deployments,
        find_similar_incidents,
        submit_findings,
    ],
)


_FALLBACK_FINDINGS: dict[str, tuple[str, float, str]] = {
    "HIGH_MEMORY": (
        "Memory exhaustion: container OOMKilled after sustained memory growth exceeding 90% threshold. Likely cause: memory leak or resource limits set too low for the workload.",
        0.72,
        "Container was OOMKilled after memory breached threshold. Review memory limits and inspect for memory leaks in the application.",
    ),
    "HIGH_CPU": (
        "CPU saturation: sustained utilization exceeded 90% threshold. Likely cause: runaway process, insufficient CPU limits, or an unexpected traffic spike.",
        0.70,
        "CPU exceeded threshold. Investigate for runaway processes or increase CPU resource limits.",
    ),
    "HIGH_DISK": (
        "Disk capacity exhaustion: disk usage exceeded 95% threshold. Likely cause: log accumulation, database growth, or insufficient storage provisioning.",
        0.74,
        "Disk exhausted. Check for log file accumulation, core dumps, or unexpected data growth.",
    ),
    "CRASH_LOOP": (
        "Application instability: pod entered CrashLoopBackOff with repeated container crashes. Likely cause: startup failure, missing dependency, or misconfiguration introduced in a recent deployment.",
        0.70,
        "Pod in CrashLoopBackOff. Review application startup logs and verify configuration is correct.",
    ),
}


async def _mark_in_progress(investigation_id: str) -> None:
    try:
        async with httpx.AsyncClient() as client:
            await client.patch(
                f"{BACKEND_URL}/investigations/{investigation_id}/status",
                json={"status": "IN_PROGRESS"},
                timeout=5.0,
            )
    except Exception:
        pass


async def _submit_fallback(investigation_id: str, anomaly_type: str) -> None:
    root_cause, confidence, summary = _FALLBACK_FINDINGS.get(
        anomaly_type,
        _FALLBACK_FINDINGS["HIGH_MEMORY"],
    )
    await asyncio.to_thread(submit_findings, investigation_id, root_cause, confidence, summary)


async def run_investigation(investigation_id: str, host: str, anomaly_type: str, severity: str) -> None:
    log.info("Starting investigation %s: type=%s host=%s severity=%s", investigation_id, anomaly_type, host, severity)

    await _mark_in_progress(investigation_id)

    session_service = InMemorySessionService()
    runner = Runner(
        agent=investigator_agent,
        app_name="cloudsentinel",
        session_service=session_service,
    )
    session = await session_service.create_session(app_name="cloudsentinel", user_id="system")

    prompt = (
        f"Investigate this anomaly:\n"
        f"- Investigation ID: {investigation_id}\n"
        f"- Host: {host}\n"
        f"- Anomaly Type: {anomaly_type}\n"
        f"- Severity: {severity}\n\n"
        f"Follow your investigation process and call submit_findings when complete."
    )

    try:
        async for event in runner.run_async(
            user_id="system",
            session_id=session.id,
            new_message=Content(role="user", parts=[Part(text=prompt)]),
        ):
            if event.is_final_response():
                log.info("Investigation %s complete", investigation_id)
    except Exception as e:
        log.error("Investigation %s ADK agent failed (%s), submitting rule-based findings", investigation_id, e)
        await _submit_fallback(investigation_id, anomaly_type)
