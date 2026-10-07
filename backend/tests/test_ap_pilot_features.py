import pytest
from app.simulation.beach_layout import COASTAL_PRESETS, create_beach_layout_by_preset
from app.safety.audio_engine import AudioBroadcastEngine
from app.vision.detector import VisionDetector, DetectionBoundingBox


def test_coastal_presets_configuration():
    assert "RUSHIKONDA_VIZAG" in COASTAL_PRESETS
    assert "SURYALANKA_BAPATLA" in COASTAL_PRESETS

    rushikonda = COASTAL_PRESETS["RUSHIKONDA_VIZAG"]
    assert rushikonda["coordinates"]["lat"] == pytest.approx(17.7795)
    assert rushikonda["bathymetry_type"] == "EMBEDDED_TRENCH_REEF"
    assert rushikonda["trench_depth_meters"] == 3.8

    suryalanka = COASTAL_PRESETS["SURYALANKA_BAPATLA"]
    assert suryalanka["coordinates"]["lat"] == pytest.approx(15.8345)
    assert suryalanka["bathymetry_type"] == "WIDE_FLAT_SHELF"
    assert suryalanka["tide_amplitude"] == 2.10

    layout_rk = create_beach_layout_by_preset("RUSHIKONDA_VIZAG")
    assert "Rushikonda" in layout_rk.beach_name


def test_multilingual_audio_broadcast():
    payload = AudioBroadcastEngine.generate_warning_broadcast(
        alert_id="ALT-01",
        hazard_type="RIP_CURRENT_FORMATION",
        target_beach="Rushikonda Blue Flag Beach",
        target_zone="ZONE_B",
        flag_status="RED",
    )
    assert "రుషికొండ" in payload.telugu
    assert "హెచ్చరిక" in payload.telugu
    assert "Warning" in payload.english
    assert "चेतावनी" in payload.hindi
    assert payload.broadcast_priority == "CRITICAL"


def test_vision_distress_detection():
    detector = VisionDetector()
    boxes = [
        DetectionBoundingBox(
            detection_id="det-01",
            camera_id="CAM-01",
            class_name="SWIMMER",
            x=150.0,
            y=20.0,
            width=20.0,
            height=30.0,
            confidence=0.95,
        ),
        DetectionBoundingBox(
            detection_id="det-02",
            camera_id="CAM-02",
            class_name="STRUGGLING_ARMS",
            x=420.0,
            y=45.0,
            width=25.0,
            height=35.0,
            confidence=0.98,
            dwell_seconds=12.0,
        ),
        DetectionBoundingBox(
            detection_id="det-03",
            camera_id="CAM-04",
            class_name="RESTRICTED_INTRUDER",
            x=850.0,
            y=-10.0,
            width=20.0,
            height=30.0,
            confidence=0.94,
        ),
    ]

    result = detector.process_frame_detections(boxes)
    assert result.total_detected == 3
    assert result.struggling_detected == 1
    assert result.geofence_breaches == 1
    assert len(result.incidents_raised) == 2

