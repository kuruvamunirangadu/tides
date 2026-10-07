"""
backend/app/models/audio.py
Data models and message dictionary for multilingual PA broadcasts.
"""

from pydantic import BaseModel
from typing import Dict, Literal, Optional, List
from enum import Enum


class AlertLanguage(str, Enum):
    TELUGU = "te-IN"
    ENGLISH = "en-IN"
    HINDI = "hi-IN"


class AudioBroadcastPayload(BaseModel):
    broadcast_id: str
    beach_id: str
    alert_type: Literal["FLAG_ESCALATION", "RIP_CURRENT_SURGE", "GEOFENCE_BREACH", "SUDDEN_SQUALL"]
    severity: Literal["INFO", "WARNING", "CRITICAL"]
    messages: Dict[str, str]  # Map of language codes to localized text
    audio_chime_type: Literal["STANDARD_WARNING", "CRITICAL_SIREN", "ALL_CLEAR"]
    target_speaker_zones: List[str] = ["TOWER_1", "TOWER_2"]

