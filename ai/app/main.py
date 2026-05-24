from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

from app.routers.research_routes import research_router

app = FastAPI("AstraQuant Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(research_router)

@app.get("/health")
def health_check():
    return {"status": "ok"}