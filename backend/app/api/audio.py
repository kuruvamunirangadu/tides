"""
backend/app/api/audio.py
FastAPI router for triggering acoustic PA announcements and mobile siren webhooks.
"""

from fastapi import APIRouter
from app.models.audio import AudioBroadcastPayload
from app.safety.audio_engine import AudioEngine

router = APIRouter(prefix="/api/audio", tags=["Acoustic Public Address"])


@router.post("/trigger", response_model=AudioBroadcastPayload)
def trigger_manual_broadcast(beach_id: str, alert_preset: str):
    """Trigger an instant multilingual PA warning across beach tower speakers."""
    return AudioEngine.generate_broadcast(beach_id=beach_id, hazard_type=alert_preset, severity="CRITICAL")

