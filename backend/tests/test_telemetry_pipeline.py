import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.main import app
from app.models.telemetry import BuoyTelemetryReading
from app.safety.telemetry_service import TelemetryService, _LAST_HEARTBEAT


client = TestClient(app)


def test_buoy_telemetry_ingest_endpoint():
    payload = {
        "sensor_id": "INCOIS-BUOY-VIZAG-01",
        "beach_id": "RUSHIKONDA_VIZAG",
        "significant_wave_height_m": 1.6,
        "peak_wave_period_s": 8.5,
        "wave_direction_deg": 175.0,
        "water_level_m": 1.25,
        "water_temperature_c": 28.0,
        "wind_speed_knots": 14.5,
        "wind_gust_knots": 18.0,
        "wind_direction_deg": 95.0,
        "battery_voltage": 12.4,
        "signal_rssi_dbm": -68.0,
        "data_quality_flag": "GOOD",
    }
    response = client.post("/api/telemetry/buoy", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "INGESTED"
    assert data["sensor_id"] == "INCOIS-BUOY-VIZAG-01"
    assert data["calculated_rip_risk_index"] > 0.0
    assert data["fallback_mode_active"] is False


def test_telemetry_status_endpoint_live_and_fallback():
    # Ingest fresh reading
    reading = BuoyTelemetryReading(
        sensor_id="INCOIS-BUOY-BAPATLA-01",
        beach_id="SURYALANKA_BAPATLA",
        significant_wave_height_m=1.2,
        peak_wave_period_s=7.0,
        wave_direction_deg=180.0,
        water_level_m=1.9,
        wind_speed_knots=10.0,
    )
    TelemetryService.process_buoy_reading(reading)

    # Check status is LIVE
    status_resp = client.get("/api/telemetry/status/SURYALANKA_BAPATLA")
    assert status_resp.status_code == 200
    res_data = status_resp.json()
    assert res_data["source"] == "LIVE_HARDWARE_BUOY"
    assert res_data["fallback_active"] is False

    # Simulate heartbeat timeout (> 45 seconds ago)
    _LAST_HEARTBEAT["SURYALANKA_BAPATLA"] = datetime(2020, 1, 1, tzinfo=timezone.utc)

    # Check status switches to fallback
    fallback_resp = client.get("/api/telemetry/status/SURYALANKA_BAPATLA")
    assert fallback_resp.status_code == 200
    fb_data = fallback_resp.json()
    assert fb_data["source"] == "SYNTHETIC_MATHEMATICAL_MODEL"
    assert fb_data["fallback_active"] is True


def test_telemetry_anomaly_quarantine_and_warnings():
    # Test suspect wave profile (high Hs with extremely low period)
    suspect_reading = BuoyTelemetryReading(
        sensor_id="INCOIS-BUOY-ANOMALOUS-01",
        beach_id="RUSHIKONDA_VIZAG",
        significant_wave_height_m=9.0,
        peak_wave_period_s=1.5,
        wave_direction_deg=180.0,
        water_level_m=1.2,
        wind_speed_knots=20.0,
    )
    resp = TelemetryService.process_buoy_reading(suspect_reading)
    assert resp.status == "FUSED_WITH_WARNING"
    assert "Anomalous wave profile" in resp.message

    # Test failed hardware flag
    failed_reading = BuoyTelemetryReading(
        sensor_id="INCOIS-BUOY-FAILED-01",
        beach_id="RUSHIKONDA_VIZAG",
        significant_wave_height_m=1.0,
        peak_wave_period_s=6.0,
        wave_direction_deg=180.0,
        water_level_m=1.0,
        wind_speed_knots=10.0,
        data_quality_flag="FAILED",
    )
    resp_failed = TelemetryService.process_buoy_reading(failed_reading)
    assert resp_failed.status == "REJECTED_QUARANTINED"
    assert resp_failed.fallback_mode_active is True

