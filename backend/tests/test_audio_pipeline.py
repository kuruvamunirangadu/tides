import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.safety.audio_engine import AudioEngine
from app.safety.decision_engine import evaluate_safety_escalation


client = TestClient(app)


def test_audio_engine_generation():
    payload = AudioEngine.generate_broadcast(
        beach_id="AP-VIZAG-01",
        hazard_type="RIP_CURRENT_SURGE",
        severity="CRITICAL"
    )
    assert payload.beach_id == "AP-VIZAG-01"
    assert payload.alert_type == "RIP_CURRENT_SURGE"
    assert payload.severity == "CRITICAL"
    assert payload.audio_chime_type == "CRITICAL_SIREN"
    assert "రిప్ కరెంట్" in payload.messages["te-IN"]
    assert "rip currents" in payload.messages["en-IN"].lower()
    assert "रिप करंट" in payload.messages["hi-IN"]


def test_audio_api_trigger_endpoint():
    response = client.post("/api/audio/trigger?beach_id=AP-BAPATLA-01&alert_preset=TIDAL_RUNUP_SURYALANKA")
    assert response.status_code == 200
    data = response.json()
    assert data["beach_id"] == "AP-BAPATLA-01"
    assert "ఆటుపోట్ల" in data["messages"]["te-IN"]
    assert "tidal run-up" in data["messages"]["en-IN"].lower()


def test_decision_engine_safety_escalation():
    # Flag transition GREEN -> RED triggers broadcast
    broadcast = evaluate_safety_escalation(
        beach_id="RUSHIKONDA_VIZAG",
        current_flag="GREEN",
        target_flag="RED"
    )
    assert broadcast is not None
    assert broadcast.alert_type == "FLAG_ESCALATION"
    assert "ఎరుపు జెండా" in broadcast.messages["te-IN"]
    assert "Red Flag" in broadcast.messages["en-IN"]

    # Red to Red should not re-trigger escalation
    no_broadcast = evaluate_safety_escalation(
        beach_id="RUSHIKONDA_VIZAG",
        current_flag="RED",
        target_flag="RED"
    )
    assert no_broadcast is None
