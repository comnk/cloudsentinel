import os
import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.routes import router
from app.services.metric_generator import run as run_collector
from app.services import anomaly_detector
from app.services import k8s_collector

app = FastAPI(title="CloudSentinel AI Service", description="API for CloudSentinel AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


import logging as _logging
_log = _logging.getLogger(__name__)

def _run_collector_safe():
    try:
        run_collector()
    except Exception:
        _log.exception("Metric collector thread crashed")

@app.on_event("startup")
def start_collector():
    thread = threading.Thread(target=_run_collector_safe, daemon=True)
    thread.start()
    if os.environ.get("EMBEDDED_ANOMALY_DETECTOR", "false").lower() == "true":
        anomaly_detector.start()
    k8s_collector.start()


@app.get("/health")
def health_check():
    return {"status": "ok"}