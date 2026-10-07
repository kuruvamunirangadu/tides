"""
backend/app/api/telemetry.py
FastAPI router for marine IoT telemetry ingestion and status polling.
"""

from fastapi import APIRouter, HTTPException, status
from app.models.telemetry import BuoyTelemetryReading, TelemetryIngestResponse
from app.safety.telemetry_service import TelemetryService

router = APIRouter(prefix="/api/telemetry", tags=["Marine IoT Telemetry"])


@router.post("/buoy", response_model=TelemetryIngestResponse, status_code=status.HTTP_201_CREATED)
def ingest_buoy_telemetry(reading: BuoyTelemetryReading):
    """
    Ingest real-time wave buoy and weather station telemetry.
    Matches INCOIS coastal observation buoy transmission schema.
    """
    try:
        response = TelemetryService.process_buoy_reading(reading)
        return response
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Telemetry ingestion pipeline failure: {str(exc)}"
        )


@router.get("/status/{beach_id}")
def get_beach_telemetry_status(beach_id: str):
    """Check whether a beach is receiving live sensor packets or operating on synthetic mathematical fallback."""
    active_reading = TelemetryService.get_active_telemetry(beach_id)
    if active_reading:
        return {
            "source": "LIVE_HARDWARE_BUOY",
            "fallback_active": False,
            "telemetry": active_reading
        }
    return {
        "source": "SYNTHETIC_MATHEMATICAL_MODEL",
        "fallback_active": True,
        "message": "No active hardware heartbeat within 45s. Running deterministic M₂ tide and wave equations."
    }


@router.get("/status")
def get_general_telemetry_status():
    """Default status check for primary beach pilot (Rushikonda)."""
    return get_beach_telemetry_status("RUSHIKONDA_VIZAG")
