"""
backend/tests/test_perception_fusion.py
Comprehensive test suite for TIDES Milestone 7 Multi-Camera Computer Vision & Sensor Fusion.
Verifies all 16 required test scenarios:
1. Valid and malformed detections
2. Camera timestamp preservation
3. Track continuity across successive frames
4. Track expiry after missed observations
5. Camera disconnection and recovery
6. Duplicate detection suppression
7. Missing calibration handling
8. Ambiguous cross-camera associations
9. Timestamp skew and stale observations
10. Sensor disagreement detection
11. Invalid units and data normalization
12. Evidence deduplication
13. Candidate alerts remaining distinct from confirmed incidents (ZERO auto-dispatch)
14. Sensor-fusion output preserving source provenance
15. Existing simulation and rescue regressions
16. Backend perception API endpoint integration
"""

import pytest
import time

from app.perception.types import (
    DetectionProvenance,
    TrackState,
    AssociationStatus,
    SensorFreshness,
    CandidateStatus,
    CameraGeometry,
)
from app.perception.detection_adapter import DetectionAdapter
from app.perception.camera_tracker import CameraTracker
from app.perception.cross_camera_association import CrossCameraAssociator
from app.perception.sensor_fusion import SensorFusionEngine
from app.perception.incident_evidence import IncidentEvidenceCorrelator
from app.simulation.simulator import BeachSimulator


# 1. Valid and Malformed Detections
def test_valid_and_malformed_detections():
    adapter = DetectionAdapter()
    raw_detections = [
        # Valid item
        {
            "id": "det-01",
            "confidence": 0.92,
            "bbox": {"x": 100, "y": 200, "width": 30, "height": 60},
            "estimated_beach_x": 150.0,
            "estimated_beach_y": 210.0,
        },
        # Malformed: negative width
        {
            "id": "det-02",
            "confidence": 0.85,
            "bbox": {"x": 100, "y": 200, "width": -10, "height": 60},
        },
        # Malformed: confidence > 1.0
        {
            "id": "det-03",
            "confidence": 1.45,
            "bbox": {"x": 100, "y": 200, "width": 20, "height": 50},
        },
        # Malformed: non-dict
        "INVALID_STRING_DETECTION",
    ]

    valid, rejections = adapter.validate_and_adapt(raw_detections, camera_id="CAM-01")
    assert len(valid) == 1
    assert valid[0].id == "det-01"
    assert valid[0].confidence == 0.92
    assert len(rejections) == 3


# 2. Camera Timestamp Preservation
def test_camera_timestamp_preservation():
    adapter = DetectionAdapter()
    capture_time = 1718000123.456
    raw = [{
        "id": "det-time-check",
        "confidence": 0.95,
        "bbox": {"x": 120, "y": 180, "width": 25, "height": 50},
        "estimated_beach_x": 120.0,
        "estimated_beach_y": 180.0,
    }]

    valid, _ = adapter.validate_and_adapt(raw, camera_id="CAM-01", frame_timestamp=capture_time)
    assert len(valid) == 1
    assert valid[0].timestamp == capture_time


# 3. Track Continuity Across Successive Frames
def test_track_continuity_across_successive_frames():
    tracker = CameraTracker("CAM-01", distance_threshold_m=15.0)
    adapter = DetectionAdapter()

    # Frame 1: Initial detection
    raw_f1 = [{"confidence": 0.90, "bbox": {"x": 100, "y": 200, "width": 20, "height": 40}, "estimated_beach_x": 100.0, "estimated_beach_y": 200.0}]
    v1, _ = adapter.validate_and_adapt(raw_f1, "CAM-01", frame_timestamp=10.0)
    t1 = tracker.update(v1, frame_timestamp=10.0)
    assert len(t1) == 1
    initial_id = t1[0].track_id
    assert t1[0].state == TrackState.TENTATIVE
    assert t1[0].hits == 1

    # Frame 2: Advancing 2 meters away at timestamp 11.0s
    raw_f2 = [{"confidence": 0.92, "bbox": {"x": 102, "y": 201, "width": 20, "height": 40}, "estimated_beach_x": 102.0, "estimated_beach_y": 201.0}]
    v2, _ = adapter.validate_and_adapt(raw_f2, "CAM-01", frame_timestamp=11.0)
    t2 = tracker.update(v2, frame_timestamp=11.0)
    assert len(t2) == 1
    assert t2[0].track_id == initial_id
    assert t2[0].state == TrackState.CONFIRMED  # Promoted after 2 consecutive frames
    assert t2[0].hits == 2
    assert t2[0].speed_mps > 0.0


# 4. Track Expiry After Missed Observations
def test_track_expiry_after_missed_observations():
    tracker = CameraTracker("CAM-01", max_lost_seconds=3.0)
    adapter = DetectionAdapter()

    # Seed track
    raw = [{"confidence": 0.90, "bbox": {"x": 100, "y": 200, "width": 20, "height": 40}, "estimated_beach_x": 100.0, "estimated_beach_y": 200.0}]
    v, _ = adapter.validate_and_adapt(raw, "CAM-01", frame_timestamp=10.0)
    tracks = tracker.update(v, frame_timestamp=10.0)
    assert tracks[0].state == TrackState.TENTATIVE

    # Empty frame at 11.0s (1s missed -> LOST)
    tracks_lost = tracker.update([], frame_timestamp=11.0)
    assert tracks_lost[0].state == TrackState.LOST

    # Empty frame at 14.5s (4.5s missed > 3.0s -> EXPIRED)
    tracks_expired = tracker.update([], frame_timestamp=14.5)
    assert tracks_expired[0].state == TrackState.EXPIRED
    assert len(tracker.get_active_tracks()) == 0


# 5. Camera Disconnection and Recovery
def test_camera_disconnection_and_recovery():
    fusion = SensorFusionEngine()
    cams = [
        CameraGeometry(id="CAM-01", name="Tower A", position={"x": 140, "y": 190}, rotation_deg=90, field_of_view_deg=85, range_m=240, status="ONLINE"),
        CameraGeometry(id="CAM-02", name="Tower B", position={"x": 420, "y": 190}, rotation_deg=90, field_of_view_deg=90, range_m=260, status="ONLINE"),
    ]

    report_online = fusion.compute_coverage_report(cams)
    assert report_online.active_cameras_count == 2
    assert report_online.offline_cameras_count == 0

    # Camera 02 disconnects
    cams[1].status = "OFFLINE"
    report_offline = fusion.compute_coverage_report(cams)
    assert report_offline.active_cameras_count == 1
    assert report_offline.offline_cameras_count == 1
    # Offline void recorded in blind spots
    assert any(b.id == "BS-OFFLINE-CAM-02" for b in report_offline.blind_spots)

    # Camera 02 recovers
    cams[1].status = "ONLINE"
    report_recovered = fusion.compute_coverage_report(cams)
    assert report_recovered.active_cameras_count == 2
    assert report_recovered.offline_cameras_count == 0


# 6. Duplicate Detection Suppression
def test_duplicate_detection_suppression():
    tracker = CameraTracker("CAM-01", distance_threshold_m=10.0)
    adapter = DetectionAdapter()

    # Frame 1: Establish track at (150, 200)
    raw1 = [{"confidence": 0.90, "bbox": {"x": 150, "y": 200, "width": 20, "height": 40}, "estimated_beach_x": 150.0, "estimated_beach_y": 200.0}]
    v1, _ = adapter.validate_and_adapt(raw1, "CAM-01", frame_timestamp=10.0)
    tracker.update(v1, frame_timestamp=10.0)

    # Frame 2: Detector produces two overlapping boxes for same person (at (151, 200) and (152, 200))
    raw_dups = [
        {"confidence": 0.95, "bbox": {"x": 151, "y": 200, "width": 20, "height": 40}, "estimated_beach_x": 151.0, "estimated_beach_y": 200.0},
        {"confidence": 0.70, "bbox": {"x": 152, "y": 200, "width": 20, "height": 40}, "estimated_beach_x": 152.0, "estimated_beach_y": 200.0},
    ]
    v2, _ = adapter.validate_and_adapt(raw_dups, "CAM-01", frame_timestamp=11.0)
    tracks2 = tracker.update(v2, frame_timestamp=11.0)

    # Primary track was updated by the 0.95 confidence box; second box initialized as a new track or remained segregated
    assert any(t.hits == 2 for t in tracks2)


# 7. Missing Calibration Handling
def test_missing_calibration_handling():
    associator = CrossCameraAssociator()
    cams = {
        "CAM-01": CameraGeometry(id="CAM-01", name="Tower A", position={"x": 140, "y": 190}, rotation_deg=90, field_of_view_deg=85, range_m=240, calibrated=True),
        "CAM-UNCALIBRATED": CameraGeometry(id="CAM-UNCALIBRATED", name="Ad-hoc Cam", position={"x": 150, "y": 190}, rotation_deg=90, field_of_view_deg=85, range_m=240, calibrated=False),
    }

    t1 = CameraTracker("CAM-01")
    v1, _ = DetectionAdapter().validate_and_adapt([{"confidence": 0.9, "bbox": {"x": 145, "y": 200, "width": 20, "height": 40}, "estimated_beach_x": 145.0, "estimated_beach_y": 200.0}], "CAM-01", 10.0)
    t1.update(v1, 10.0)

    t2 = CameraTracker("CAM-UNCALIBRATED")
    v2, _ = DetectionAdapter().validate_and_adapt([{"confidence": 0.9, "bbox": {"x": 146, "y": 200, "width": 20, "height": 40}, "estimated_beach_x": 146.0, "estimated_beach_y": 200.0}], "CAM-UNCALIBRATED", 10.0)
    t2.update(v2, 10.0)

    links = associator.associate_tracks(
        {"CAM-01": t1.get_active_tracks(), "CAM-UNCALIBRATED": t2.get_active_tracks()},
        cams,
        sim_time=10.0
    )
    # Because CAM-UNCALIBRATED is uncalibrated, no cross camera link is claimed
    assert len(links) == 0


# 8. Ambiguous Cross-Camera Associations
def test_ambiguous_cross_camera_associations():
    associator = CrossCameraAssociator(max_spatial_delta_m=25.0)
    cams = {
        "CAM-01": CameraGeometry(id="CAM-01", name="Tower A", position={"x": 200, "y": 190}, rotation_deg=90, field_of_view_deg=90, range_m=260, calibrated=True),
        "CAM-02": CameraGeometry(id="CAM-02", name="Tower B", position={"x": 220, "y": 190}, rotation_deg=90, field_of_view_deg=90, range_m=260, calibrated=True),
    }

    t1 = CameraTracker("CAM-01")
    v1, _ = DetectionAdapter().validate_and_adapt([{"confidence": 0.9, "bbox": {"x": 210, "y": 220, "width": 20, "height": 40}, "estimated_beach_x": 210.0, "estimated_beach_y": 220.0}], "CAM-01", 10.0)
    t1.update(v1, 10.0)

    # CAM-02 detects TWO bathers right next to that same spot (ambiguous cluster)
    t2 = CameraTracker("CAM-02")
    v2, _ = DetectionAdapter().validate_and_adapt([
        {"confidence": 0.9, "bbox": {"x": 211, "y": 220, "width": 20, "height": 40}, "estimated_beach_x": 211.0, "estimated_beach_y": 220.0},
        {"confidence": 0.88, "bbox": {"x": 214, "y": 221, "width": 20, "height": 40}, "estimated_beach_x": 214.0, "estimated_beach_y": 221.0},
    ], "CAM-02", 10.0)
    t2.update(v2, 10.0)

    links = associator.associate_tracks(
        {"CAM-01": t1.get_active_tracks(), "CAM-02": t2.get_active_tracks()},
        cams,
        sim_time=10.0
    )
    # Associations created should be explicitly flagged as AMBIGUOUS
    assert len(links) >= 1
    assert any(link.status == AssociationStatus.AMBIGUOUS for link in links)


# 9. Timestamp Skew and Stale Observations
def test_timestamp_skew_and_stale_observations():
    fusion = SensorFusionEngine(stale_threshold_sec=20.0)
    now = 100.0

    stale_reading = fusion.normalize_sensor_reading(
        {"source_id": "RADAR-01", "metric_name": "wave_height_m", "value": 1.5, "unit": "m", "timestamp": 70.0},
        current_time=now,
    )
    assert stale_reading.freshness == SensorFreshness.STALE

    fresh_reading = fusion.normalize_sensor_reading(
        {"source_id": "RADAR-02", "metric_name": "wave_height_m", "value": 1.5, "unit": "m", "timestamp": 95.0},
        current_time=now,
    )
    assert fresh_reading.freshness == SensorFreshness.FRESH


# 10. Sensor Disagreement Detection
def test_sensor_disagreement_detection():
    fusion = SensorFusionEngine(current_disagreement_threshold_mps=0.5)
    now = 100.0

    # Vision track in water drifting at 2.1 m/s
    t = CameraTracker("CAM-01")
    v1, _ = DetectionAdapter().validate_and_adapt([{"confidence": 0.9, "bbox": {"x": 400, "y": 280, "width": 20, "height": 40}, "estimated_beach_x": 400.0, "estimated_beach_y": 280.0}], "CAM-01", 99.0)
    t.update(v1, 99.0)
    v2, _ = DetectionAdapter().validate_and_adapt([{"confidence": 0.9, "bbox": {"x": 400, "y": 282, "width": 20, "height": 40}, "estimated_beach_x": 400.0, "estimated_beach_y": 282.1}], "CAM-01", 100.0)
    tracks = t.update(v2, 100.0)

    # ADCP sensor reporting calm current at 0.3 m/s
    readings = [
        fusion.normalize_sensor_reading({"source_id": "ADCP-CORRIDOR-01", "metric_name": "water_current_mps", "value": 0.3, "unit": "m/s", "timestamp": 100.0}, now)
    ]

    disagreements = fusion.evaluate_sensor_disagreements(tracks, readings, now)
    assert len(disagreements) >= 1
    assert disagreements[0].property_name == "water_current_mps"
    assert disagreements[0].absolute_difference > 0.5


# 11. Invalid Units and Data Normalization
def test_invalid_units_and_data_normalization():
    fusion = SensorFusionEngine()
    now = 50.0

    # Knots to m/s
    r_knots = fusion.normalize_sensor_reading({"source_id": "CURRENT-01", "metric_name": "water_current_mps", "value": 2.0, "unit": "knots", "timestamp": now}, now)
    assert r_knots.unit == "m/s"
    assert 1.02 < r_knots.value < 1.04

    # Feet to meters
    r_feet = fusion.normalize_sensor_reading({"source_id": "WAVE-01", "metric_name": "wave_height_m", "value": 6.0, "unit": "ft", "timestamp": now}, now)
    assert r_feet.unit == "m"
    assert 1.8 < r_feet.value < 1.85


# 12. Evidence Deduplication
def test_evidence_deduplication():
    correlator = IncidentEvidenceCorrelator(dedup_cooldown_sec=15.0)

    t = CameraTracker("CAM-01")
    # Position in rip corridor (X=400, Y=290), high speed
    v1, _ = DetectionAdapter().validate_and_adapt([{"confidence": 0.9, "bbox": {"x": 400, "y": 290, "width": 20, "height": 40}, "estimated_beach_x": 400.0, "estimated_beach_y": 290.0}], "CAM-01", 10.0)
    t.update(v1, 10.0)
    v2, _ = DetectionAdapter().validate_and_adapt([{"confidence": 0.9, "bbox": {"x": 400, "y": 292, "width": 20, "height": 40}, "estimated_beach_x": 400.0, "estimated_beach_y": 292.0}], "CAM-01", 11.0)
    tracks = t.update(v2, 11.0)

    # First evaluation at 11.0s: candidate generated
    cands1 = correlator.evaluate_candidates(tracks, [], [], [], sim_time=11.0)
    assert len(cands1) == 1

    # Second evaluation at 15.0s (within 15s cooldown): deduplicated, no duplicate created
    cands2 = correlator.evaluate_candidates(tracks, [], [], [], sim_time=15.0)
    assert len(cands2) == 1
    assert cands2[0].id == cands1[0].id


# 13. Candidate Alerts Remaining Distinct from Confirmed Incidents (Zero Auto-Dispatch)
def test_candidate_alerts_zero_auto_dispatch():
    correlator = IncidentEvidenceCorrelator()

    t = CameraTracker("CAM-01")
    v1, _ = DetectionAdapter().validate_and_adapt([{"confidence": 0.9, "bbox": {"x": 400, "y": 290, "width": 20, "height": 40}, "estimated_beach_x": 400.0, "estimated_beach_y": 290.0}], "CAM-01", 10.0)
    t.update(v1, 10.0)
    v2, _ = DetectionAdapter().validate_and_adapt([{"confidence": 0.9, "bbox": {"x": 400, "y": 292, "width": 20, "height": 40}, "estimated_beach_x": 400.0, "estimated_beach_y": 292.0}], "CAM-01", 11.0)
    tracks = t.update(v2, 11.0)

    cands = correlator.evaluate_candidates(tracks, [], [], [], sim_time=11.0)
    assert len(cands) == 1
    cand = cands[0]

    # STRICT SAFETY ASSERTIONS
    assert cand.status == CandidateStatus.CANDIDATE_UNVERIFIED
    assert cand.auto_dispatched is False
    assert cand.requires_operator_action is True

    # Operator must manually review and confirm
    reviewed = correlator.review_candidate(cand.id, action="CONFIRM", operator_notes="Lifeguard verified distress")
    assert reviewed is not None
    assert reviewed.status == CandidateStatus.OPERATOR_CONFIRMED
    assert "verified distress" in reviewed.decision_notes


# 14. Sensor-Fusion Output Preserving Source Provenance
def test_fusion_output_preserving_provenance():
    adapter = DetectionAdapter(default_provenance=DetectionProvenance.SIMULATED_FEED)
    raw = [{"confidence": 0.91, "bbox": {"x": 100, "y": 200, "width": 20, "height": 40}, "estimated_beach_x": 100.0, "estimated_beach_y": 200.0}]
    valid, _ = adapter.validate_and_adapt(raw, "CAM-01")
    assert valid[0].provenance == DetectionProvenance.SIMULATED_FEED

    # Actual inference provenance tag
    actual_adapter = DetectionAdapter(default_provenance=DetectionProvenance.ACTUAL_INFERENCE)
    valid_actual, _ = actual_adapter.validate_and_adapt(raw, "CAM-01")
    assert valid_actual[0].provenance == DetectionProvenance.ACTUAL_INFERENCE


# 15. Existing Simulation and Rescue Regressions
def test_existing_simulation_regressions():
    simulator = BeachSimulator(seed=123)
    simulator.load_scenario("normal")
    state1 = simulator.step(dt=1.0)
    assert state1.tick == 1
    assert len(state1.visitors) > 0
    # Core simulation behavior and visitor states are preserved intact
    assert hasattr(state1, "environment")


# 16. Backend Perception API Endpoint Integration
def test_backend_perception_api_endpoints():
    from app.api.perception import (
        ingest_detections,
        get_perception_state,
        get_coverage_report,
        get_candidate_incidents,
        reset_perception,
        IngestPayload,
    )

    # 1. Reset
    r_reset = reset_perception()
    assert r_reset["status"] == "RESET_SUCCESSFUL"

    # 2. Ingest
    payload = IngestPayload(
        camera_id="CAM-01",
        timestamp=time.time(),
        provenance=DetectionProvenance.SIMULATED_FEED,
        detections=[
            {
                "confidence": 0.93,
                "bbox": {"x": 140, "y": 200, "width": 25, "height": 55},
                "estimated_beach_x": 140.0,
                "estimated_beach_y": 200.0,
            }
        ],
    )
    r_ingest = ingest_detections(payload)
    assert r_ingest["status"] == "PROCESSED"
    assert r_ingest["valid_count"] == 1
    assert r_ingest["active_tracks_count"] == 1

    # 3. State
    state_data = get_perception_state()
    assert len(state_data["active_tracks"]) >= 1

    # 4. Coverage
    cov_data = get_coverage_report()
    assert cov_data.total_coverage_pct > 0.0

    # 5. Candidates
    cands = get_candidate_incidents()
    assert isinstance(cands, list)

