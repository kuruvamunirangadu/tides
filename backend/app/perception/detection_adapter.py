"""
backend/app/perception/detection_adapter.py
Ingests and validates raw detections from camera streams.
Strictly tags provenance (ACTUAL vs SIMULATED), rejects malformed data, and preserves timestamps.
"""

from typing import List, Dict, Any, Tuple, Optional
import time
from app.perception.types import (
    PerceptionDetection,
    DetectionProvenance,
    BoundingBox,
)


class DetectionAdapter:
    """
    Adapter for converting and validating edge or simulated detections into normalized PerceptionDetections.
    """

    def __init__(self, default_provenance: DetectionProvenance = DetectionProvenance.SIMULATED_FEED):
        self.default_provenance = default_provenance
        self.total_processed: int = 0
        self.total_rejected: int = 0

    def validate_and_adapt(
        self,
        raw_detections: List[Dict[str, Any]],
        camera_id: str,
        frame_timestamp: Optional[float] = None,
        provenance: Optional[DetectionProvenance] = None,
    ) -> Tuple[List[PerceptionDetection], List[Dict[str, Any]]]:
        """
        Validates raw detections, rejects malformed payloads, and returns clean typed detections.
        """
        ts = frame_timestamp if frame_timestamp is not None else time.time()
        prov = provenance or self.default_provenance

        valid_detections: List[PerceptionDetection] = []
        rejections: List[Dict[str, Any]] = []

        for idx, raw in enumerate(raw_detections):
            self.total_processed += 1
            reason = self._validate_raw_item(raw)
            if reason:
                self.total_rejected += 1
                rejections.append({"index": idx, "raw": raw, "reason": reason})
                continue

            # Extract bounding box safely
            raw_box = raw.get("bbox", {})
            bbox = BoundingBox(
                x=float(raw_box.get("x", raw_box.get("x_min", 0.0))),
                y=float(raw_box.get("y", raw_box.get("y_min", 0.0))),
                width=float(raw_box.get("width", max(0.1, float(raw_box.get("x_max", 1.0)) - float(raw_box.get("x_min", 0.0))))),
                height=float(raw_box.get("height", max(0.1, float(raw_box.get("y_max", 1.0)) - float(raw_box.get("y_min", 0.0))))),
            )

            confidence = max(0.0, min(1.0, float(raw.get("confidence", 0.85))))
            world_x = float(raw.get("estimated_world_x", raw.get("estimated_beach_x", bbox.x)))
            world_y = float(raw.get("estimated_world_y", raw.get("estimated_beach_y", bbox.y)))

            det = PerceptionDetection(
                id=str(raw.get("id", f"DET-{camera_id}-{idx}-{int(ts * 1000) % 100000}")),
                camera_id=camera_id,
                timestamp=ts,
                provenance=prov,
                class_name=str(raw.get("class_name", "PERSON")).upper(),
                confidence=confidence,
                bbox=bbox,
                estimated_world_x=world_x,
                estimated_world_y=world_y,
                in_water=bool(raw.get("in_water", world_y >= 260.0)),
                ground_truth_id=str(raw.get("ground_truth_id", raw.get("groundTruthVisitorId", ""))) or None,
            )
            valid_detections.append(det)

        return valid_detections, rejections

    def _validate_raw_item(self, raw: Dict[str, Any]) -> Optional[str]:
        if not isinstance(raw, dict):
            return "Item must be a dictionary"

        # Check confidence
        conf = raw.get("confidence")
        if conf is None or not isinstance(conf, (int, float)):
            return "Missing or non-numeric confidence"
        if conf < 0.0 or conf > 1.0:
            return f"Confidence {conf} out of valid range [0.0, 1.0]"

        # Check bbox structure
        bbox = raw.get("bbox")
        if not isinstance(bbox, dict):
            return "Missing bbox dictionary"

        # Width and height validation
        w = bbox.get("width")
        h = bbox.get("height")
        if w is not None and h is not None:
            if not isinstance(w, (int, float)) or not isinstance(h, (int, float)):
                return "Non-numeric bbox width/height"
            if w <= 0 or h <= 0:
                return "Non-positive bbox width or height"
        elif "x_min" in bbox and "x_max" in bbox:
            if bbox["x_max"] <= bbox["x_min"] or bbox["y_max"] <= bbox["y_min"]:
                return "Invalid bbox min/max coordinates"
        else:
            return "Incomplete bbox bounds"

        return None

