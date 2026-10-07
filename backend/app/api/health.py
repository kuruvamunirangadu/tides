"""
Health check endpoint for coastal safety backend.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/")
async def health_check():
    return {
        "status": "online",
        "system": "Andhra Pradesh Integrated Coastal Beach Safety Platform",
        "engine": "Deterministic Simulation + Central Safety Engine v1.0",
        "timestamp": "2026-10-03T12:00:00Z"
    }
