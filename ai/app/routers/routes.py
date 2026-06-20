import asyncio

from fastapi import APIRouter
from pydantic import BaseModel

from app.agents.investigator_agent import run_investigation

router = APIRouter()


class InvestigateRequest(BaseModel):
    investigationId: str
    anomalyId: int
    type: str
    host: str
    severity: str


@router.post("/incidents")
async def create_incident():
    return {"message": "Incident created."}


@router.post("/investigate", status_code=202)
async def investigate(req: InvestigateRequest):
    asyncio.create_task(
        run_investigation(req.investigationId, req.host, req.type, req.severity)
    )
    return {"status": "investigation started", "investigationId": req.investigationId}
