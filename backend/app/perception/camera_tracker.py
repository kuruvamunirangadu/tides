"""
backend/app/perception/camera_tracker.py
Maintains per-camera track states (TENTATIVE -> CONFIRMED -> LOST -> EXPIRED).
Associates successive detections within a camera stream without mutating ground truth visitor state.
Suppresses duplicate detections and smoothly handles temporary occlusions.
"""

from typing import List, Dict, Optional, Tuple, Set
import math
import time
from app.perception.types import (
    PerceptionDetection,
    CameraTrack,
    TrackState,
    TrackPosition,
    BoundingBox,
)


class CameraTracker:
    """
    Per-camera object tracker with lifecycle management and spatial gating.
    """

    def __init__(self, camera_id: str, max_lost_seconds: float = 4.0, distance_threshold_m: float = 25.0):
        self.camera_id = camera_id
        self.max_lost_seconds = max_lost_seconds
        self.distance_threshold_m = distance_threshold_m
        self.tracks: Dict[str, CameraTrack] = {}
        self.next_track_num: int = 101

    def update(
        self, detections: List[PerceptionDetection], frame_timestamp: Optional[float] = None
    ) -> List[CameraTrack]:
        """
        Updates active tracks with incoming detections from this camera.
        """
        now = frame_timestamp if frame_timestamp is not None else time.time()
        matched_track_ids: Set[str] = set()
        unmatched_detections: List[PerceptionDetection] = []

        # Sort detections by confidence descending to prioritize best detections
        sorted_dets = sorted(detections, key=lambda d: d.confidence, reverse=True)

        # 1. Spatial Gating Association
        for det in sorted_dets:
            best_track_id: Optional[str] = None
            min_dist = float("inf")

            for track_id, track in self.tracks.items():
                if track_id in matched_track_ids or track.state == TrackState.EXPIRED:
                    continue

                # Compute distance to latest known track position
                latest_pos = track.positions[-1] if track.positions else None
                if not latest_pos:
                    continue

                dx = det.estimated_world_x - latest_pos.x
                dy = det.estimated_world_y - latest_pos.y
                dist = math.sqrt(dx * dx + dy * dy)

                if dist < self.distance_threshold_m and dist < min_dist:
                    min_dist = dist
                    best_track_id = track_id

            if best_track_id is not None:
                # Update existing track
                track = self.tracks[best_track_id]
                prev_pos = track.positions[-1]
                dt = max(0.05, now - track.last_seen)

                vx = (det.estimated_world_x - prev_pos.x) / dt
                vy = (det.estimated_world_y - prev_pos.y) / dt
                speed = math.sqrt(vx * vx + vy * vy)
                direction = (math.atan2(vy, vx) * 180.0 / math.pi) % 360.0

                track.positions.append(
                    TrackPosition(x=det.estimated_world_x, y=det.estimated_world_y, timestamp=now)
                )
                if len(track.positions) > 30:
                    track.positions.pop(0)

                track.latest_bbox = det.bbox
                track.last_seen = now
                track.velocity = {"vx": round(vx, 2), "vy": round(vy, 2)}
                track.speed_mps = round(speed, 2)
                track.direction_deg = round(direction, 1)
                track.confidence = round((track.confidence * 0.7) + (det.confidence * 0.3), 2)
                track.hits += 1
                track.misses = 0
                track.in_water = det.in_water
                track.ground_truth_id = det.ground_truth_id

                # Transition from TENTATIVE to CONFIRMED after 2 consecutive hits
                if track.hits >= 2 and track.state == TrackState.TENTATIVE:
                    track.state = TrackState.CONFIRMED

                matched_track_ids.add(best_track_id)
            else:
                unmatched_detections.append(det)

        # 2. Initialize new tracks for unmatched detections
        for det in unmatched_detections:
            track_id = f"TRACK-{self.camera_id}-{self.next_track_num}"
            self.next_track_num += 1

            new_track = CameraTrack(
                track_id=track_id,
                camera_id=self.camera_id,
                state=TrackState.TENTATIVE,
                provenance=det.provenance,
                first_seen=now,
                last_seen=now,
                positions=[TrackPosition(x=det.estimated_world_x, y=det.estimated_world_y, timestamp=now)],
                latest_bbox=det.bbox,
                velocity={"vx": 0.0, "vy": 0.0},
                speed_mps=0.0,
                direction_deg=0.0,
                confidence=det.confidence,
                hits=1,
                misses=0,
                in_water=det.in_water,
                ground_truth_id=det.ground_truth_id,
            )
            self.tracks[track_id] = new_track
            matched_track_ids.add(track_id)

        # 3. Handle misses and track expiration
        for track_id, track in list(self.tracks.items()):
            if track_id not in matched_track_ids:
                track.misses += 1
                time_since_seen = now - track.last_seen

                if time_since_seen > self.max_lost_seconds:
                    track.state = TrackState.EXPIRED
                    # Expired tracks are purged after an additional grace period (e.g. 10s)
                    if time_since_seen > (self.max_lost_seconds + 10.0):
                        del self.tracks[track_id]
                else:
                    track.state = TrackState.LOST

        return list(self.tracks.values())

    def get_active_tracks(self) -> List[CameraTrack]:
        return [t for t in self.tracks.values() if t.state in (TrackState.CONFIRMED, TrackState.TENTATIVE)]

    def get_track(self, track_id: str) -> Optional[CameraTrack]:
        return self.tracks.get(track_id)

    def reset(self) -> None:
        self.tracks.clear()
        self.next_track_num = 101

