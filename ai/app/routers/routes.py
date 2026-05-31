from fastapi import APIRouter

router = APIRouter()

@router.post("/incidents")
async def create_incident():
    return {"message": "Incident created."}