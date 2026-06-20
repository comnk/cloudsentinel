# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CloudSentinel is an AI-powered platform for real-time metric monitoring, anomaly detection, and incident management. The system ingests metrics/logs via Kafka, processes them through an AI service, and surfaces results to users through a Spring Boot REST API and Next.js frontend.

## Services

| Service    | Tech                               | Port | Purpose                                 |
| ---------- | ---------------------------------- | ---- | --------------------------------------- |
| `frontend` | Next.js 16 + TypeScript + Tailwind | 3000 | UI                                      |
| `backend`  | Spring Boot 4 + Java 25            | 8080 | REST API, auth, Kafka producer          |
| `ai`       | FastAPI + Python 3.12              | 8000 | AI agents, Kafka consumer, ML inference |
| `kafka`    | Confluent Kafka 7.6                | 9092 | Message bus                             |
| `postgres` | PostgreSQL 16                      | 5432 | Persistent storage (db: `aiplatform`)   |
| `redis`    | Redis 7                            | 6379 | Caching                                 |

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
KafkaConsumerService.consumeRawMetrics()
        ↓  JSON → MetricSampleDTO → MetricSampleEntity
metric_samples table (PostgreSQL)
```

Every 5 seconds, `metric_generator.py` collects real host CPU/memory/disk via `psutil` and publishes to `metrics.raw`. Spring Boot deserializes the JSON, maps it to `MetricSampleEntity`, and saves it via `MetricSampleRepository`.

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

| Topic                | Direction                  | Purpose                                          |
| -------------------- | -------------------------- | ------------------------------------------------ |
| `metrics.raw`        | Python collector → Backend | Real host metrics (cpu/memory/disk) — **active** |
| `logs.raw`           | Backend → (future)         | Raw log events                                   |
| `features.processed` | (future) → Backend         | Processed/engineered features                    |
| `anomalies.detected` | (future) → Backend         | Anomaly detection results                        |
| `incidents.created`  | Backend → UI               | Incident notifications                           |

The backend bootstrap server is read from `spring.kafka.bootstrap-servers` in `application.properties` (`localhost:9092` locally, overridden to `kafka:29092` in Docker via env var). The AI service reads `KAFKA_BOOTSTRAP_SERVERS` env var, defaulting to `localhost:9092`.

## Architecture Flow

```
metric_generator.py  ←  psutil (real host metrics)
        ↓ metrics.raw
  Backend (Spring Boot)
    - KafkaConsumerService → deserialize → MetricSampleRepository.save()
    - KafkaProducerService → publishes to outbound topics
    - SecurityConfig → JWT auth (jjwt 0.11.5)
    - UserController / UserService → user management
        ↓ WebSocket (STOMP — stub, not yet implemented)
  Frontend (Next.js App Router)
    - app/page.tsx → redirects to /dashboard
    - app/dashboard/page.tsx → live metric cards (CPU/memory/disk), auto-refreshes every 5s
    - app/metrics-table/page.tsx → historical metrics table
    - app/anomalies/page.tsx → detected anomalies table, auto-refreshes every 10s
    - app/investigations/page.tsx → investigations list, auto-refreshes every 15s
    - app/investigations/[id]/page.tsx → investigation detail (timeline, evidence, status update)
    - app/k8s/overview/page.tsx → cluster stat cards (nodes/pods/deployments)
    - app/k8s/pods/page.tsx → pods table with status badges
    - app/k8s/deployments/page.tsx → deployments table
    - app/k8s/timeline/page.tsx → merged anomaly + cluster event feed

  AI Agents (not yet connected to pipeline)
    - alert_agent.py, recommendation_agent.py, sentiment_agent.py, research_assistant.py
```

## Backend Key Details

- **Spring Boot 4 / Java 25** — uses `spring-boot-starter-webmvc` (not WebFlux)
- **JPA**: `ddl-auto=create-drop` in dev — the `metric_samples` table is dropped and recreated on every restart
- **Lombok**: `MetricSampleEntity` uses `@Data` + `@NoArgsConstructor` — `@NoArgsConstructor` is required by JPA; do not remove it
- **AI integration**: Spring AI with Google GenAI (`gemini-2.5-flash`), configured via `GEMINI_KEY`
- **Auth**: JWT via `JwtAuthenticationFilter` + `SecurityConfig`; token expiry 1 hour
- **WebSocket**: STOMP config stub in `websocket/WebSocketConfig.java` (not yet implemented)
- Backend env vars loaded from `.env` file in the `backend/` directory via `spring.config.import=file:.env[.properties]`

## AI Service Key Details

- **Framework**: FastAPI, single router at `app/routers/routes.py`
- **Collector**: `app/services/metric_generator.py` — uses `psutil` (already in venv); publishes to `metrics.raw` every 5 seconds
- **Agents**: Google ADK (`google-adk`) agents in `app/agents/`; uses `google-genai` SDK — not yet connected to the ingestion pipeline
- **ML**: PyTorch available (`torch`, `torchvision`) for model inference in `app/ml/`
- **Kafka**: `confluent-kafka` producer/consumer (not aiokafka)
- Run with `uvicorn app.main:app`; CORS allows `localhost:3000`

## Frontend Key Details

- **Next.js 16 App Router** — this is a newer version with potential breaking changes vs. older Next.js. Read `node_modules/next/dist/docs/` before making framework-level changes (per `frontend/AGENTS.md`).
- **Tailwind CSS v4** — PostCSS-based config, not the v3 `tailwind.config.js` pattern
- **Routing**: `app/page.tsx` does a server-side `redirect("/dashboard")` — there is no landing page
- **Navbar**: `components/Navbar/Navbar.tsx` — dark slate top bar, uses `usePathname` for active link highlighting; primary links on the left, K8s links grouped on the right
- **Design system**: `bg-gray-50` body, `bg-white rounded-xl shadow-sm` cards, semantic pill badges for severity (CRITICAL=red, WARNING=amber) and status (OPEN=red, IN_PROGRESS=amber, RESOLVED=green); metric values color-coded green/amber/red by threshold (<65%/<85%/≥85%)
- **Types**: `types/Metric.ts`, `types/Anomaly.ts`, `types/Investigation.ts` (includes `InvestigationDetail`, `InvestigationEvent`, `InvestigationEvidence`), `types/ClusterEvent.ts`
- **Backend API URL** configured via `NEXT_PUBLIC_API_URL` env var (default `http://localhost:8080`)
