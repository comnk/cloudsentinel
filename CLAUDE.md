# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CloudSentinel is an AI-powered platform for real-time metric monitoring, anomaly detection, and incident management. The system ingests metrics/logs via Kafka, processes them through an AI service, and surfaces results to users through a Spring Boot REST API and Next.js frontend.

## Services

| Service           | Tech                               | Port | Purpose                                              |
| ----------------- | ---------------------------------- | ---- | ---------------------------------------------------- |
| `frontend`        | Next.js 16 + TypeScript + Tailwind | 3000 | Dashboard UI                                         |
| `backend`         | Spring Boot 4 + Java 25            | 8080 | REST API, auth, Kafka consumer/producer              |
| `ai`              | FastAPI + Python 3.12              | 8000 | Agent service (Gemini investigation agent)           |
| `anomaly-service` | Python 3.12                        | —    | ML anomaly detection (Kafka consumer/producer)       |
| `k8s-collector`   | Python 3.12                        | —    | Kubernetes metrics collector (polls every 30s)       |
| `kafka`           | Confluent Kafka 7.6                | 9092 | Message bus                                          |
| `postgres`        | PostgreSQL 16                      | 5432 | Persistent storage (db: `astraquant-db`)             |
| `redis`           | Redis 7                            | 6379 | Caching                                              |

## Running the Stack

**Full stack (Docker):**

```bash
docker compose up --build
```

**Individual services for local dev:**

Backend (requires `.env` file with `DB_USERNAME`, `DB_PASSWORD`, `GEMINI_KEY`, `JWT_SECRET`):

```bash
cd backend && ./mvnw spring-boot:run
```

AI service (activate venv first):

```bash
cd ai && source venv/bin/activate && uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend && npm run dev
```

## Build & Test Commands

**Backend:**

```bash
cd backend
./mvnw clean package          # build JAR
./mvnw test                   # run all tests
./mvnw test -Dtest=ClassName  # run single test class
./mvnw verify                 # build + integration tests
```

**Frontend:**

```bash
cd frontend
npm run build   # production build
npm run lint    # ESLint
```

**AI:**

```bash
cd ai && source venv/bin/activate
python -m pytest tests/         # run tests
python tests/python-test.py     # run standalone test script
```

## Telemetry Ingestion Pipeline (implemented)

The core pipeline is fully wired end-to-end:

```
metric_generator.py (psutil)
        ↓  metrics.raw (Kafka)
anomaly-service (anomaly_consumer.py)
        ↓  feature window → Autoencoder / Isolation Forest + threshold rules + explainer
        ↓  anomalies.detected (Kafka)
Backend (KafkaConsumerService)
        ↓  JSON → AnomalyEntity → save() → trigger investigator_agent → WebSocketBroadcastService

metrics.raw is ALSO consumed by Backend's KafkaConsumerService for live metric broadcasts:
        ↓  JSON → MetricSampleDTO → MetricSampleEntity → /topic/metrics (WebSocket)
```

Every 5 seconds, `metric_generator.py` collects real host CPU/memory/disk via `psutil` and publishes to `metrics.raw`. The `anomaly-service` is the primary consumer for ML detection; the Backend also consumes `metrics.raw` to persist samples and push live updates via WebSocket.

**Metric event schema** (contract between Python and Java — do not change field names without updating both sides):

```json
{
  "timestamp": "2026-05-31T18:00:00Z",
  "host": "laptop-1",
  "cpuUsage": 47.2,
  "memoryUsage": 62.8,
  "diskUsage": 51.4
}
```

To start the collector manually:

```python
from app.services.metric_generator import run
run()
```

## Kafka Topics

Topics are auto-created by the `kafka-init` container at startup (3 partitions each):

| Topic                | Producer              | Consumer                       | Purpose                          |
| -------------------- | --------------------- | ------------------------------ | -------------------------------- |
| `metrics.raw`        | metric_generator.py   | anomaly-service, Backend       | Host CPU/memory/disk every 5s    |
| `anomalies.detected` | anomaly-service       | Backend                        | ML anomaly events                |
| `k8s.pods`           | k8s-collector         | Backend                        | Pod status snapshots             |
| `k8s.deployments`    | k8s-collector         | Backend                        | Deployment replica counts        |
| `k8s.events`         | k8s-collector         | Backend                        | Cluster warning events           |
| `k8s.nodes`          | k8s-collector         | Backend                        | Node status                      |
| `incidents.created`  | Backend               | (future)                       | Incident notifications           |
| `logs.raw`           | (future)              | (future)                       | Raw log events                   |
| `features.processed` | (future)              | (future)                       | Engineered features              |

The backend bootstrap server is read from `spring.kafka.bootstrap-servers` in `application.properties` (`localhost:9092` locally, overridden to `kafka:29092` in Docker via env var). The AI service reads `KAFKA_BOOTSTRAP_SERVERS` env var, defaulting to `localhost:9092`.

## Architecture Flow

```
psutil (host metrics)              Kubernetes API
        ↓                                 ↓
 metric_generator.py           k8s-collector/main.py
        ↓ metrics.raw                     ↓ k8s.pods / k8s.events / k8s.deployments / k8s.nodes
        ├──────────────────────────────────┤
        ↓                                 ↓
  anomaly-service                  Backend (Spring Boot)
  (anomaly_consumer.py)              - KafkaConsumerService → persist K8s state → WebSocketBroadcastService
  - Isolation Forest / Autoencoder   - KafkaConsumerService.consumeRawMetrics → save + /topic/metrics
  - threshold fallback               - KafkaProducerService → publishes outbound topics
  - explainer                        - SimulationController → proxies /simulations/** to AI service
        ↓ anomalies.detected           - ModelVersionController → GET /models
        ↓                              - AgentTriggerService → POST /investigate to AI service
  Backend (Spring Boot)              - SecurityConfig → JWT auth (jjwt 0.11.5)
  - persists AnomalyEntity           - agent.service.url → http://localhost:8000 (env-configurable)
  - triggers investigator_agent
        ↓ WebSocket (STOMP over native WS, endpoint /ws)
  Frontend (Next.js App Router)
    - hooks/useWebSocket.ts → typed STOMP hook (reconnects every 5s)
    - app/page.tsx → redirects to /dashboard
    - app/dashboard/page.tsx → live metric cards; seeded via REST, updated via /topic/metrics
    - app/metrics-table/page.tsx → historical metrics table (REST only)
    - app/anomalies/page.tsx → history via REST on mount, new arrivals via /topic/anomalies
    - app/investigations/page.tsx → history via REST on mount, new/updated via /topic/investigations
    - app/investigations/[id]/page.tsx → live agent progress via /topic/investigations/{id}
    - app/k8s/overview/page.tsx → cluster stat cards (nodes/pods/deployments)
    - app/k8s/pods/page.tsx → pods table with status badges
    - app/k8s/deployments/page.tsx → deployments table
    - app/k8s/timeline/page.tsx → history via REST; live anomalies + events via /topic/anomalies and /topic/events
    - app/simulation-lab/page.tsx → run simulations (cpu-spike, memory-leak, crash-loop, bad-deployment)

  AI Service (FastAPI, port 8000)
    - investigator_agent.py → LlmAgent (gemini-3-flash-preview), triggered by Backend AgentTriggerService
      Tools: get_recent_metrics, get_k8s_events, get_recent_deployments, find_similar_incidents, submit_findings
      Fallback: rule-based findings for HIGH_MEMORY, HIGH_CPU, HIGH_DISK, CRASH_LOOP
    - simulation_service.py → 4 scenarios publish realistic Kafka events for demo/testing
    - alert_agent.py, recommendation_agent.py, sentiment_agent.py, research_assistant.py (not yet wired)
    - anomaly_detector.py → embedded threshold detector (optional, EMBEDDED_ANOMALY_DETECTOR=true)
    - k8s_collector.py → embedded K8s poller (always starts; disabled gracefully if no kubeconfig)
```

## WebSocket Topics

The backend broadcasts on these STOMP topics after every relevant Kafka message or database write:

| Topic                        | Payload                        | Source                                              |
| ---------------------------- | ------------------------------ | --------------------------------------------------- |
| `/topic/metrics`             | `MetricSampleEntity`           | `KafkaConsumerService.consumeRawMetrics`            |
| `/topic/anomalies`           | `AnomalyEntity`                | `KafkaConsumerService.consumeDetectedAnomalies`     |
| `/topic/events`              | `ClusterEventEntity`           | `KafkaConsumerService.consumeClusterEvent`          |
| `/topic/investigations`      | `InvestigationEntity`          | `InvestigationService` on create / status / findings |
| `/topic/investigations/{id}` | `InvestigationDetailResponse`  | `InvestigationService` on status / findings update  |

`WebSocketBroadcastService` is the single point of dispatch (`SimpMessagingTemplate` wrapper). All pages follow the pattern: load history via REST once on mount, then subscribe to a WebSocket topic for live updates — no polling anywhere.

## Backend Key Details

- **Spring Boot 4 / Java 25** — uses `spring-boot-starter-webmvc` (not WebFlux)
- **JPA**: `ddl-auto=create-drop` in dev — the `metric_samples` table is dropped and recreated on every restart
- **Lombok**: `MetricSampleEntity` uses `@Data` + `@NoArgsConstructor` — `@NoArgsConstructor` is required by JPA; do not remove it
- **AI integration**: Spring AI with Google GenAI (`gemini-3-flash-preview`), configured via `GEMINI_KEY`
- **Agent service**: `AgentTriggerService` (`@Async`) posts to `agent.service.url` (default `http://localhost:8000`); `SimulationController` proxies `/simulations/**` to the same URL; `ModelVersionController` exposes `GET /models`
- **Redis**: `RedisConfig` wires Redis for caching (latest metric sample cached and served from `/metrics/latest`)
- **Investigation**: `IncidentCorrelationService` supports cross-anomaly correlation
- **Auth**: JWT via `JwtAuthenticationFilter` + `SecurityConfig`; token expiry 1 hour; `/ws/**` is permit-all (WebSocket handshakes don't carry the JWT)
- **WebSocket**: STOMP over native WebSocket; endpoint `/ws`; in-memory broker on `/topic`; `WebSocketBroadcastService` (single `SimpMessagingTemplate` wrapper) is the only place that calls `convertAndSend`
- Backend env vars loaded from `.env` file in the `backend/` directory via `spring.config.import=file:.env[.properties]`

## AI Service Key Details

- **Framework**: FastAPI, single router at `app/routers/routes.py`
- **Collector**: `app/services/metric_generator.py` — uses `psutil` (already in venv); publishes to `metrics.raw` every 5 seconds; started as a background thread on startup
- **investigator_agent**: `app/agents/investigator_agent.py` — Google ADK `LlmAgent` (`gemini-3-flash-preview`); called by `POST /investigate`; has rule-based fallback for ADK failures
- **simulation_service**: `app/services/simulation_service.py` — 4 scenarios (`cpu-spike`, `memory-leak`, `crash-loop`, `bad-deployment`) that publish synthetic Kafka events; managed via `POST/GET/DELETE /simulations`
- **anomaly_detector**: `app/services/anomaly_detector.py` — embedded threshold detector; activated by `EMBEDDED_ANOMALY_DETECTOR=true` env var (alternative to the standalone `anomaly-service`)
- **k8s_collector**: `app/services/k8s_collector.py` — always starts on startup; polls every 30s; disabled gracefully if no kubeconfig
- **Other agents** (`alert_agent.py`, `recommendation_agent.py`, `sentiment_agent.py`, `research_assistant.py`) — exist but not connected to any route
- **Kafka**: `confluent-kafka` producer/consumer (not aiokafka)
- **ML models**: live in the standalone `anomaly-service`, not in `ai/app/` — there is no `ai/app/ml/` directory
- Run with `uvicorn app.main:app`; CORS allows `localhost:3000`

## Frontend Key Details

- **Next.js 16 App Router** — this is a newer version with potential breaking changes vs. older Next.js. Read `node_modules/next/dist/docs/` before making framework-level changes (per `frontend/AGENTS.md`).
- **Tailwind CSS v4** — PostCSS-based config, not the v3 `tailwind.config.js` pattern
- **Routing**: `app/page.tsx` does a server-side `redirect("/dashboard")` — there is no landing page
- **Navbar**: `components/Navbar/Navbar.tsx` — dark slate top bar, uses `usePathname` for active link highlighting; primary links on the left, K8s links grouped on the right
- **Design system**: `bg-gray-50` body, `bg-white rounded-xl shadow-sm` cards, semantic pill badges for severity (CRITICAL=red, WARNING=amber) and status (OPEN=red, IN_PROGRESS=amber, RESOLVED=green); metric values color-coded green/amber/red by threshold (<65%/<85%/≥85%)
- **Types**: `types/Metric.ts`, `types/Anomaly.ts`, `types/Investigation.ts` (includes `InvestigationDetail`, `InvestigationEvent`, `InvestigationEvidence`), `types/ClusterEvent.ts`, `types/Simulation.ts` (`SimulationScenario`, `SimulationEvent`, `SimulationRun`)
- **Backend API URL** configured via `NEXT_PUBLIC_API_URL` env var (default `http://localhost:8080`)
- **WebSocket hook**: `hooks/useWebSocket.ts` — generic typed hook using `@stomp/stompjs`; derives the WS URL by replacing `http` with `ws` in `NEXT_PUBLIC_API_URL` and appending `/ws`; reconnects every 5s; call once per topic per component. Pages that need multiple live feeds (e.g. timeline) call the hook twice.
