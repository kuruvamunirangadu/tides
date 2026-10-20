"""
backend/app/perception/cross_camera_association.py
Associates tracks across calibrated overlapping cameras using spatio-temporal ground-plane gating.
Strictly handles ambiguity: unassociated by default, avoids false identity claims, and employs zero biometrics.
"""

from typing import List, Dict, Optional, Tuple, Set
import math
import time
from app.perception.types import (
    CameraTrack,
    CrossCameraLink,
    AssociationStatus,
    CameraGeometry,
)


class CrossCameraAssociator:
    """
    Performs ground-plane cross-camera track association with strict ambiguity rejection.
    """

    def __init__(
        self,
        max_spatial_delta_m: float = 20.0,
        max_temporal_delta_sec: float = 1.5,
    ):
        self.max_spatial_delta_m = max_spatial_delta_m
        self.max_temporal_delta_sec = max_temporal_delta_sec
        self.global_id_counter: int = 1001

    def associate_tracks(
        self,
        camera_tracks_map: Dict[str, List[CameraTrack]],
        camera_geometries: Dict[str, CameraGeometry],
        sim_time: Optional[float] = None,
    ) -> List[CrossCameraLink]:
        """
        Takes active tracks from multiple cameras and links them across overlapping FOVs.
        """
        now = sim_time if sim_time is not None else time.time()
        camera_ids = list(camera_tracks_map.keys())
        links: List[CrossCameraLink] = []

        # Find camera pairs
        for i in range(len(camera_ids)):
            cam_a = camera_ids[i]
            geom_a = camera_geometries.get(cam_a)
            # Skip if camera A is uncalibrated or offline
            if not geom_a or not geom_a.calibrated or geom_a.status == "OFFLINE":
                continue

            tracks_a = [t for t in camera_tracks_map.get(cam_a, []) if t.state.value in ("CONFIRMED", "TENTATIVE")]

            for j in range(i + 1, len(camera_ids)):
                cam_b = camera_ids[j]
                geom_b = camera_geometries.get(cam_b)
                # Skip if camera B is uncalibrated or offline
                if not geom_b or not geom_b.calibrated or geom_b.status == "OFFLINE":
                    continue

                tracks_b = [t for t in camera_tracks_map.get(cam_b, []) if t.state.value in ("CONFIRMED", "TENTATIVE")]

                # Match tracks between cam_a and cam_b
                candidate_pairs: List[Tuple[CameraTrack, CameraTrack, float, float]] = []

                for ta in tracks_a:
                    if not ta.positions:
                        continue
                    pa = ta.positions[-1]

                    for tb in tracks_b:
                        if not tb.positions:
                            continue
                        pb = tb.positions[-1]

                        # Check temporal synchronization skew
                        dt = abs(ta.last_seen - tb.last_seen)
                        if dt > self.max_temporal_delta_sec:
                            continue

                        # Check ground spatial distance
                        dx = pa.x - pb.x
                        dy = pa.y - pb.y
                        dist = math.sqrt(dx * dx + dy * dy)

                        if dist <= self.max_spatial_delta_m:
                            candidate_pairs.append((ta, tb, dist, dt))

                # Ambiguity resolution: check for 1-to-many or many-to-1 collisions
                a_counts: Dict[str, int] = {}
                b_counts: Dict[str, int] = {}
                for ta, tb, _, _ in candidate_pairs:
                    a_counts[ta.track_id] = a_counts.get(ta.track_id, 0) + 1
                    b_counts[tb.track_id] = b_counts.get(tb.track_id, 0) + 1

                for ta, tb, dist, dt in candidate_pairs:
                    global_id = f"GLOBAL-ENTITY-{self.global_id_counter}"
                    self.global_id_counter += 1

                    is_ambiguous = (a_counts[ta.track_id] > 1) or (b_counts[tb.track_id] > 1)
                    status = AssociationStatus.AMBIGUOUS if is_ambiguous else AssociationStatus.CONFIRMED

                    # Confidence calculation based on spatial proximity, temporal sync, and track confidences
                    spatial_score = max(0.1, 1.0 - (dist / self.max_spatial_delta_m))
                    temporal_score = max(0.1, 1.0 - (dt / self.max_temporal_delta_sec))
                    base_conf = min(ta.confidence, tb.confidence) * spatial_score * temporal_score
                    if is_ambiguous:
                        base_conf *= 0.5  # Penalize ambiguous associations

                    notes = (
                        "Ambiguous spatial clustering: multiple track candidates in overlap zone"
                        if is_ambiguous
                        else "Spatially verified 1-to-1 ground-plane projection consensus"
                    )

                    links.append(
                        CrossCameraLink(
                            global_id=global_id,
                            camera_tracks=[
                                {"camera_id": ta.camera_id, "track_id": ta.track_id},
                                {"camera_id": tb.camera_id, "track_id": tb.track_id},
                            ],
                            spatial_distance_m=round(dist, 2),
                            time_delta_sec=round(dt, 2),
                            association_confidence=round(max(0.05, min(0.98, base_conf)), 2),
                            status=status,
                            notes=notes,
                        )
                    )

        return links

