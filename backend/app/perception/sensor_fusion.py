"""
backend/app/perception/sensor_fusion.py
Combines multi-camera tracks, environmental telemetry (ADCP current, wave radar), and sensor health.
Tracks source freshness, normalizes units, detects disagreements between sources, and preserves full provenance.
"""

from typing import List, Dict, Optional, Tuple, Any
import math
import time
from app.perception.types import (
    CameraTrack,
    CrossCameraLink,
    SensorReading,
    SensorDisagreement,
    SensorFreshness,
    CoverageReport,
    BlindSpot,
    CameraGeometry,
)


class SensorFusionEngine:
    """
    Modular sensor fusion engine for coastal perception.
    Integrates vision tracks, environmental telemetry, and sensor health with disagreement detection.
    """

    def __init__(
        self,
        stale_threshold_sec: float = 30.0,
        current_disagreement_threshold_mps: float = 0.5,
    ):
        self.stale_threshold_sec = stale_threshold_sec
        self.current_disagreement_threshold_mps = current_disagreement_threshold_mps
        self.fusion_version = "v1.2.0-milestone7"

    def normalize_sensor_reading(self, raw_reading: Dict[str, Any], current_time: float) -> SensorReading:
        """
        Normalizes sensor readings into standard metric units (m/s, m, km/h) and checks freshness.
        """
        metric = raw_reading.get("metric_name", "unknown")
        raw_val = float(raw_reading.get("value", 0.0))
        unit = str(raw_reading.get("unit", "")).lower()
        ts = float(raw_reading.get("timestamp", current_time))

        # Unit normalization
        normalized_val = raw_val
        normalized_unit = unit

        if metric in ("water_current", "water_current_mps", "rip_velocity"):
            if unit == "knots":
                normalized_val = raw_val * 0.514444
                normalized_unit = "m/s"
            elif unit in ("cm/s", "cmps"):
                normalized_val = raw_val / 100.0
                normalized_unit = "m/s"
            else:
                normalized_unit = "m/s"
        elif metric in ("wave_height", "wave_height_m"):
            if unit in ("ft", "feet"):
                normalized_val = raw_val * 0.3048
                normalized_unit = "m"
            else:
                normalized_unit = "m"

        age = current_time - ts
        freshness = SensorFreshness.FRESH
        if age > self.stale_threshold_sec:
            freshness = SensorFreshness.STALE
        if bool(raw_reading.get("offline", False)):
            freshness = SensorFreshness.OFFLINE

        return SensorReading(
            source_id=str(raw_reading.get("source_id", "SENSOR-UNKNOWN")),
            sensor_type=str(raw_reading.get("sensor_type", "GENERIC")),
            timestamp=ts,
            metric_name=metric,
            value=round(normalized_val, 2),
            unit=normalized_unit,
            confidence=float(raw_reading.get("confidence", 0.9)),
            freshness=freshness,
        )

    def evaluate_sensor_disagreements(
        self,
        tracks: List[CameraTrack],
        readings: List[SensorReading],
        current_time: float,
    ) -> List[SensorDisagreement]:
        """
        Compares vision kinematic drift estimates with ADCP/acoustic and radar ground truth sensors.
        """
        disagreements: List[SensorDisagreement] = []

        # Find ADCP current sensor
        adcp_reading = next(
            (r for r in readings if "adcp" in r.source_id.lower() or "current" in r.metric_name), None
        )

        # Average speed of swimmers in water
        in_water_tracks = [t for t in tracks if t.in_water and t.state.value in ("CONFIRMED", "TENTATIVE")]

        if adcp_reading and in_water_tracks:
            avg_vision_speed = sum(t.speed_mps for t in in_water_tracks) / len(in_water_tracks)
            adcp_val = adcp_reading.value
            diff = abs(avg_vision_speed - adcp_val)

            if diff > self.current_disagreement_threshold_mps:
                severity = "SEVERE" if diff > (self.current_disagreement_threshold_mps * 2) else "MILD"
                disagreements.append(
                    SensorDisagreement(
                        property_name="water_current_mps",
                        sensor_a="VISION_TRACK_KINEMATICS",
                        sensor_b=adcp_reading.source_id,
                        value_a=round(avg_vision_speed, 2),
                        value_b=round(adcp_val, 2),
                        unit="m/s",
                        absolute_difference=round(diff, 2),
                        severity=severity,
                        explanation=(
                            f"Vision swimmer drift speed ({avg_vision_speed:.2f} m/s) diverges from "
                            f"acoustic ADCP sensor ({adcp_val:.2f} m/s) by {diff:.2f} m/s. "
                            f"Check for local rip trench or sensor calibration drift."
                        ),
                        timestamp=current_time,
                    )
                )

        # Check for stale or offline sensor warnings
        for r in readings:
            if r.freshness == SensorFreshness.STALE:
                disagreements.append(
                    SensorDisagreement(
                        property_name=r.metric_name,
                        sensor_a=r.source_id,
                        sensor_b="SYSTEM_CLOCK",
                        value_a=round(current_time - r.timestamp, 1),
                        value_b=self.stale_threshold_sec,
                        unit="seconds_stale",
                        absolute_difference=round(current_time - r.timestamp, 1),
                        severity="MILD",
                        explanation=f"Sensor {r.source_id} telemetry is stale ({current_time - r.timestamp:.1f}s old).",
                        timestamp=current_time,
                    )
                )

        return disagreements

    def compute_coverage_report(
        self,
        cameras: List[CameraGeometry],
        beach_width: float = 1000.0,
        beach_depth: float = 400.0,
    ) -> CoverageReport:
        """
        Calculates camera coverage areas, overlapping pairs, and blind spots.
        """
        active_cams = [c for c in cameras if c.status == "ONLINE"]
        offline_cams = [c for c in cameras if c.status == "OFFLINE"]

        # Calculate overlapping camera pairs
        overlaps: List[Dict[str, Any]] = []
        for i in range(len(active_cams)):
            for j in range(i + 1, len(active_cams)):
                c1 = active_cams[i]
                c2 = active_cams[j]
                dx = abs(c1.position["x"] - c2.position["x"])
                # Cameras with center distance less than combined range share overlap
                if dx < (c1.range_m * 0.8 + c2.range_m * 0.8):
                    overlaps.append({
                        "camera_a": c1.id,
                        "camera_b": c2.id,
                        "overlap_zone": f"Inter-Tower Corridor ({c1.name[:7]} & {c2.name[:7]})",
                        "approx_overlap_span_m": round(max(0, (c1.range_m + c2.range_m) - dx), 1),
                    })

        # Known blind spots
        blind_spots: List[BlindSpot] = []
        # Far seaward deep water beyond max camera range (> 320m Y)
        blind_spots.append(
            BlindSpot(
                id="BS-OFFSHORE-DEEP",
                zone_name="Deep Offshore Bathymetry (>320m)",
                x_min=0.0,
                x_max=beach_width,
                y_min=320.0,
                y_max=beach_depth,
                reason="OUT_OF_RANGE",
            )
        )

        # If any camera is offline, record its designated watch area as a blind spot
        for off_cam in offline_cams:
            blind_spots.append(
                BlindSpot(
                    id=f"BS-OFFLINE-{off_cam.id}",
                    zone_name=f"Coverage void due to {off_cam.name} offline",
                    x_min=max(0.0, off_cam.position["x"] - 120.0),
                    x_max=min(beach_width, off_cam.position["x"] + 120.0),
                    y_min=off_cam.position["y"],
                    y_max=min(beach_depth, off_cam.position["y"] + off_cam.range_m),
                    reason="CAMERA_OFFLINE",
                )
            )

        # Coverage percentage estimation
        base_coverage = 85.0
        if len(offline_cams) > 0:
            base_coverage -= len(offline_cams) * 22.0

        return CoverageReport(
            total_coverage_pct=round(max(10.0, min(98.0, base_coverage)), 1),
            active_cameras_count=len(active_cams),
            offline_cameras_count=len(offline_cams),
            overlapping_pairs=overlaps,
            blind_spots=blind_spots,
            timestamp=time.time(),
        )
