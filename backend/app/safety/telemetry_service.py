"""
backend/app/safety/telemetry_service.py
Service handling telemetry validation, confidence filtering, and live state injection.
"""

from datetime import datetime, timezone
from typing import Dict, Optional
from app.models.telemetry import BuoyTelemetryReading, TelemetryIngestResponse
from app.safety.hazard_engine import calculate_rip_risk_index

# In-memory storage for latest confirmed telemetry packets per beach
_LATEST_BUOY_DATA: Dict[str, BuoyTelemetryReading] = {}
_LAST_HEARTBEAT: Dict[str, datetime] = {}
HEARTBEAT_TIMEOUT_SECONDS = 45


class TelemetryService:
    @staticmethod
    def process_buoy_reading(reading: BuoyTelemetryReading) -> TelemetryIngestResponse:
        now = datetime.now(timezone.utc)
        _LAST_HEARTBEAT[reading.beach_id] = now

        # 1. Quality & Anomaly Threshold Check
        warning_msg = "Live hardware telemetry applied successfully."

        # Sensor drift / physical anomaly checks (e.g. impossible wave height spikes)
        if reading.significant_wave_height_m > 8.0 and reading.peak_wave_period_s < 2.0:
            reading.data_quality_flag = "SUSPECT"
            warning_msg = "Anomalous wave profile detected: high Hs with unphysically low period."

        if reading.battery_voltage < 10.5 or reading.signal_rssi_dbm < -115.0:
            reading.data_quality_flag = "SUSPECT"
            warning_msg = "Telemetry link degraded (low power or weak RSSI)."

        if reading.data_quality_flag == "FAILED":
            return TelemetryIngestResponse(
                status="REJECTED_QUARANTINED",
                sensor_id=reading.sensor_id,
                calculated_rip_risk_index=0.0,
                fallback_mode_active=True,
                message="Data rejected: Sensor flagged as failed. Switching to deterministic fallback model."
            )

        # 2. Store valid or suspect reading
        _LATEST_BUOY_DATA[reading.beach_id] = reading

        # 3. Calculate instant hydrodynamic risk from real wave & wind parameters
        rip_index = calculate_rip_risk_index(
            hs=reading.significant_wave_height_m,
            tp=reading.peak_wave_period_s,
            wind_knots=reading.wind_speed_knots
        )

        return TelemetryIngestResponse(
            status="FUSED_WITH_WARNING" if reading.data_quality_flag == "SUSPECT" else "INGESTED",
            sensor_id=reading.sensor_id,
            calculated_rip_risk_index=rip_index,
            fallback_mode_active=False,
            message=warning_msg
        )

    @staticmethod
    def get_active_telemetry(beach_id: str) -> Optional[BuoyTelemetryReading]:
        """Returns the latest reading or None if expired beyond timeout window."""
        now = datetime.now(timezone.utc)
        last_seen = _LAST_HEARTBEAT.get(beach_id)
        
        if not last_seen or (now - last_seen).total_seconds() > HEARTBEAT_TIMEOUT_SECONDS:
            return None  # Triggers mathematical M2 harmonic fallback
            
        return _LATEST_BUOY_DATA.get(beach_id)

