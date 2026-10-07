"""
backend/app/api/vision.py
FastAPI router for receiving CCTV edge vision frame inferences and bounding box streams.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status
from app.models.vision import FrameInferencePayload
from app.vision.detector import VisionAnalyticsEngine, VisionDetector, DetectionBoundingBox, CVInferenceResult

router = APIRouter(prefix="/api/vision", tags=["Computer Vision Analytics"])

detector = VisionDetector()


@router.post("/frame", status_code=status.HTTP_200_OK)
def ingest_cctv_frame_analytics(payload: FrameInferencePayload):
    """
    Ingest real-time edge CV bounding boxes and swimmer posture states.
    Triggers incident dispatches if distress patterns or geofence breaches are verified.
    """
    try:
        analysis = VisionAnalyticsEngine.process_frame(payload)
        return {
            "status": "PROCESSED",
            "summary": analysis
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Edge vision processing failure: {str(exc)}"
        )


@router.post("/detections", response_model=CVInferenceResult)
async def ingest_camera_detections(detections: List[DetectionBoundingBox]):
    """
    Ingests live camera bounding box detections, processes dwell times,
    and returns geofence breaches / struggling swimmer incidents.
    """
    result = detector.process_frame_detections(detections)
    return result


@router.get("/detections/active", response_model=List[DetectionBoundingBox])
async def get_active_detections():
    """
    Retrieves latest camera bounding box detections for map overlay.
    """
    return detector.get_latest_detections()
