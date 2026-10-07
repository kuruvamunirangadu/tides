"""
backend/app/models/vision.py
Pydantic schemas for CCTV edge vision detections, bounding boxes, and bather posture analytics.
"""

from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from datetime import datetime


class BoundingBox(BaseModel):
    x_min: float = Field(..., description="Normalized or pixel min-x coordinate")
    y_min: float = Field(..., description="Normalized or pixel min-y coordinate")
    x_max: float = Field(..., description="Normalized or pixel max-x coordinate")
    y_max: float = Field(..., description="Normalized or pixel max-y coordinate")


class SwimmerDetection(BaseModel):
    track_id: int = Field(..., description="Unique track identifier across frames")
    class_name: Literal["swimmer_normal", "bather_wading", "struggling_arms", "submerged_head"]
    confidence: float = Field(..., ge=0.0, le=1.0)
    bbox: BoundingBox
    # Spatial beach coordinate mapping (meters from shore baseline)
    estimated_beach_x: float
    estimated_beach_y: float
    is_outside_safety_rope: bool = False
    motionless_seconds: float = 0.0


class FrameInferencePayload(BaseModel):
    camera_id: str = Field(..., description="Identifier of the CCTV tower (e.g., CAM-RUSHIKONDA-TOWER-01)")
    beach_id: str = Field(default="RUSHIKONDA_VIZAG")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    frame_width: int = 1920
    frame_height: int = 1080
    detections: List[SwimmerDetection]

