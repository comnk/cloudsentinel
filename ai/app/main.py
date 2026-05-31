import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.routes import router
from app.services.metric_generator import run as run_collector

app = FastAPI(title="AstraQuant AI Service", description="API for AstraQuant AI Service")

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


@app.on_event("startup")
def start_collector():
    thread = threading.Thread(target=run_collector, daemon=True)
    thread.start()


@app.get("/health")
def health_check():
    return {"status": "ok"}