# CloudSentinel

AI-powered platform for real-time infrastructure monitoring, anomaly detection, and incident investigation. Ingests host and Kubernetes metrics via Kafka, runs ML-based anomaly detection, triggers AI agent investigations, and surfaces everything through a live dashboard.

## Architecture

```
psutil (host metrics)          Kubernetes API
        ↓                             ↓
 metric_generator.py          k8s-collector/main.py
        ↓ metrics.raw                 ↓ k8s.pods / k8s.events / k8s.deployments / k8s.nodes
        └──────────────┬─────────────┘
                       ↓
              anomaly-service
          (Isolation Forest / Autoencoder + threshold rules)
                       ↓ anomalies.detected
              Backend (Spring Boot)
          - Persists anomalies, metrics, K8s state
          - Triggers AI investigator agent (Gemini)
          - REST API for frontend
                       ↓
              Frontend (Next.js)
          - Live metric dashboard
          - Anomaly feed, investigations, cluster view
```

## Services

| Service            | Tech                               | Port | Purpose                                               |
| ------------------ | ---------------------------------- | ---- | ----------------------------------------------------- |
| `frontend`         | Next.js 16 + TypeScript + Tailwind | 3000 | Dashboard UI                                          |
| `backend`          | Spring Boot 4 + Java 25            | 8080 | REST API, auth, Kafka consumer/producer               |
| `ai`               | FastAPI + Python 3.12              | 8000 | Agent service (Gemini-powered investigation agent)    |
| `anomaly-service`  | Python 3.12                        | —    | ML anomaly detection (Kafka consumer/producer)        |
| `k8s-collector`    | Python 3.12                        | —    | Kubernetes metrics collector (one-shot or scheduled)  |
| `kafka`            | Confluent Kafka 7.6                | 9092 | Message bus                                           |
| `postgres`         | PostgreSQL 16                      | 5432 | Persistent storage (db: `astraquant-db`)              |
| `redis`            | Redis 7                            | 6379 | Caching                                               |

## Kafka Topics

| Topic                | Producer              | Consumer             | Purpose                          |
| -------------------- | --------------------- | -------------------- | -------------------------------- |
| `metrics.raw`        | metric_generator.py   | anomaly-service      | Host CPU/memory/disk every 5s    |
| `anomalies.detected` | anomaly-service       | Backend              | ML anomaly events                |
| `k8s.pods`           | k8s-collector         | Backend              | Pod status snapshots             |
| `k8s.deployments`    | k8s-collector         | Backend              | Deployment replica counts        |
| `k8s.events`         | k8s-collector         | Backend              | Cluster warning events           |
| `k8s.nodes`          | k8s-collector         | Backend              | Node status                      |
| `incidents.created`  | Backend               | (future)             | Incident notifications           |
| `logs.raw`           | (future)              | (future)             | Raw log events                   |
| `features.processed` | (future)              | (future)             | Engineered features              |

Topics are auto-created by the `kafka-init` container at startup (3 partitions, replication factor 1).

## Getting Started

### Prerequisites

- Docker and Docker Compose
- A `.env` file in the project root with:

```env
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
GEMINI_KEY=your_google_gemini_api_key
JWT_SECRET=your_jwt_secret
```

### Run the full stack

```bash
docker compose up --build
```

The frontend will be available at http://localhost:3000, which redirects to the dashboard at `/dashboard`. The backend API is at http://localhost:8080.

### Local development

**Backend** (requires a `backend/.env` with the same vars as above):

```bash
cd backend && ./mvnw spring-boot:run
```

**AI agent service**:

```bash
cd ai && source venv/bin/activate && uvicorn app.main:app --reload --port 8000
```

**Anomaly service** (connects to Kafka on `localhost:9092` by default):

```bash
cd ai && source venv/bin/activate && python anomaly-service/main.py
```

**Frontend**:

```bash
cd frontend && npm run dev
```

**Start the metric collector manually**:

```python
from app.services.metric_generator import run
run()
```

## Build & Test

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

**AI / anomaly service:**

```bash
cd ai && source venv/bin/activate
python -m pytest tests/
python tests/python-test.py
```

## Frontend Pages

| Route                     | Description                                                         |
| ------------------------- | ------------------------------------------------------------------- |
| `/`                       | Redirects to `/dashboard`                                           |
| `/dashboard`              | Live CPU, memory, and disk gauges — auto-refreshes every 5s        |
| `/metrics-table`          | Historical metrics table with color-coded usage values              |
| `/anomalies`              | Detected anomaly feed with severity badges — auto-refreshes every 10s |
| `/investigations`         | Investigation list with status and confidence — auto-refreshes every 15s |
| `/investigations/[id]`    | Investigation detail: timeline, evidence, status controls           |
| `/k8s/overview`           | Cluster stat cards (nodes, running/failed pods, deployments)        |
| `/k8s/pods`               | Pod table with status badges and restart counts                     |
| `/k8s/deployments`        | Deployment replica health                                           |
| `/k8s/timeline`           | Merged anomaly + cluster event feed, newest first                   |

## Backend REST API

| Method | Path                                  | Description                              |
| ------ | ------------------------------------- | ---------------------------------------- |
| GET    | `/metrics/latest`                     | Most recent metric sample                |
| GET    | `/metrics/history`                    | All stored metric samples                |
| GET    | `/anomalies/`                         | All detected anomalies                   |
| GET    | `/investigations`                     | All investigations                       |
| GET    | `/investigations/{id}`                | Investigation detail (timeline, evidence)|
| PATCH  | `/investigations/{id}/status`         | Update investigation status              |
| GET    | `/k8s/pods`                           | All pod records                          |
| GET    | `/k8s/deployments`                    | All deployment records                   |
| GET    | `/k8s/events`                         | All cluster events                       |
| GET    | `/k8s/nodes`                          | All node records                         |

Auth endpoints (`/auth/register`, `/auth/login`) issue JWTs valid for 1 hour.

## Anomaly Detection

The `anomaly-service` consumes `metrics.raw` and runs a two-stage detection pipeline:

1. **Warm-up**: threshold rules fire immediately (e.g. CPU > 90%, memory > 85%).
2. **ML detection**: once a feature window is populated, an Isolation Forest or Autoencoder model scores each sample. The model with the highest priority that is loaded is used.
3. **Explainer**: contributing factors (which metric deviated and by how much) are appended to each anomaly event before publishing to `anomalies.detected`.

Models are trained via `anomaly-service/model/train.py` and loaded at startup. The trained model file is volume-mounted at `./ai/anomaly-service/model` in Docker.

When the backend receives an anomaly on `anomalies.detected`, it persists it and triggers the `investigator_agent` (Gemini-powered) to open an investigation, analyze root cause, and record evidence.

## Key Technical Notes

- **Backend JPA**: `ddl-auto=create-drop` in dev — all tables are dropped and recreated on each restart.
- **Lombok**: `MetricSampleEntity` uses `@Data` + `@NoArgsConstructor` — the no-arg constructor is required by JPA.
- **Tailwind CSS v4**: uses `@import "tailwindcss"` in `globals.css`, not a `tailwind.config.js`.
- **WebSocket**: STOMP config stub exists in `backend/websocket/WebSocketConfig.java` but is not yet implemented.
- **K8s collector**: runs as a one-shot script against `kubeconfig`; not yet deployed as a continuous service in Docker Compose.
