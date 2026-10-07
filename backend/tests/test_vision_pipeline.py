import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.vision import FrameInferencePayload, SwimmerDetection, BoundingBox
from app.vision.detector import VisionAnalyticsEngine


client = TestClient(app)


def test_edge_vision_inference_engine():
    payload = FrameInferencePayload(
        camera_id="CAM-RUSHIKONDA-TOWER-01",
        beach_id="RUSHIKONDA_VIZAG",
        detections=[
            SwimmerDetection(
                track_id=101,
                class_name="swimmer_normal",
                confidence=0.94,
                bbox=BoundingBox(x_min=100, y_min=200, x_max=120, y_max=240),
                estimated_beach_x=180.0,
                estimated_beach_y=25.0,
            ),
            SwimmerDetection(
                track_id=102,
                class_name="struggling_arms",
                confidence=0.88,
                bbox=BoundingBox(x_min=300, y_min=250, x_max=330, y_max=300),
                estimated_beach_x=220.0,
                estimated_beach_y=30.0,
            ),
            SwimmerDetection(
                track_id=103,
                class_name="bather_wading",
                confidence=0.91,
                bbox=BoundingBox(x_min=500, y_min=400, x_max=520, y_max=430),
                estimated_beach_x=850.0,  # Deep in rocky Zone D / outside rope
                estimated_beach_y=60.0,
            ),
        ]
    )

    analysis = VisionAnalyticsEngine.process_frame(payload)
    assert analysis["camera_id"] == "CAM-RUSHIKONDA-TOWER-01"
    assert analysis["total_detected_bathers"] == 3
    assert analysis["boundary_violations"] >= 1
    assert analysis["active_distress_count"] >= 1
    assert len(analysis["incidents"]) >= 1


def test_vision_api_frame_endpoint():
    payload = {
        "camera_id": "CAM-SURYALANKA-01",
        "beach_id": "SURYALANKA_BAPATLA",
        "frame_width": 1920,
        "frame_height": 1080,
        "detections": [
            {
                "track_id": 201,
                "class_name": "submerged_head",
                "confidence": 0.85,
                "bbox": {"x_min": 150, "y_min": 100, "x_max": 180, "y_max": 140},
                "estimated_beach_x": 230.0,
                "estimated_beach_y": 35.0,
                "is_outside_safety_rope": True,
                "motionless_seconds": 15.0,
            }
        ]
    }
    response = client.post("/api/vision/frame", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "PROCESSED"
    assert res_data["summary"]["active_distress_count"] == 1
    assert len(res_data["summary"]["incidents"]) == 1

