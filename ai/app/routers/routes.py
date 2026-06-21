import asyncio

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.agents.investigator_agent import run_investigation
from app.services.simulation_service import SCENARIOS, simulation_service

router = APIRouter()

# Strong references so the event loop doesn't GC tasks mid-execution
_bg_tasks: set = set()


class InvestigateRequest(BaseModel):
    investigationId: str
    anomalyId: int
    type: str
    host: str
    severity: str


class StartSimulationRequest(BaseModel):
    scenario: str


@router.post("/incidents")
async def create_incident():
    return {"message": "Incident created."}


@router.post("/investigate", status_code=202)
async def investigate(req: InvestigateRequest):
    task = asyncio.create_task(
        run_investigation(req.investigationId, req.host, req.type, req.severity)
    )
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)
    return {"status": "investigation started", "investigationId": req.investigationId}


@router.get("/simulations/scenarios")
def list_scenarios():
    return [{"id": k, **v} for k, v in SCENARIOS.items()]


@router.get("/simulations")
def list_simulations():
    return simulation_service.list_runs()


@router.post("/simulations", status_code=201)
def start_simulation(req: StartSimulationRequest):
    try:
        return simulation_service.start(req.scenario)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/simulations/{run_id}")
def get_simulation(run_id: str):
    run = simulation_service.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Simulation {run_id} not found")
    return run


@router.delete("/simulations/{run_id}")
def stop_simulation(run_id: str):
    try:
        return simulation_service.stop(run_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
