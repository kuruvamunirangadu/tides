"""
backend/tests/run_tests.py
Direct test runner for test_perception_fusion.py functions.
"""

import sys
import os

# Add backend to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from test_perception_fusion import (
    test_valid_and_malformed_detections,
    test_camera_timestamp_preservation,
    test_track_continuity_across_successive_frames,
    test_track_expiry_after_missed_observations,
    test_camera_disconnection_and_recovery,
    test_duplicate_detection_suppression,
    test_missing_calibration_handling,
    test_ambiguous_cross_camera_associations,
    test_timestamp_skew_and_stale_observations,
    test_sensor_disagreement_detection,
    test_invalid_units_and_data_normalization,
    test_evidence_deduplication,
    test_candidate_alerts_zero_auto_dispatch,
    test_fusion_output_preserving_provenance,
    test_existing_simulation_regressions,
    test_backend_perception_api_endpoints,
)

test_suite = [
    ("1. Valid and malformed detections", test_valid_and_malformed_detections),
    ("2. Camera timestamp preservation", test_camera_timestamp_preservation),
    ("3. Track continuity across successive frames", test_track_continuity_across_successive_frames),
    ("4. Track expiry after missed observations", test_track_expiry_after_missed_observations),
    ("5. Camera disconnection and recovery", test_camera_disconnection_and_recovery),
    ("6. Duplicate detection suppression", test_duplicate_detection_suppression),
    ("7. Missing calibration handling", test_missing_calibration_handling),
    ("8. Ambiguous cross-camera associations", test_ambiguous_cross_camera_associations),
    ("9. Timestamp skew and stale observations", test_timestamp_skew_and_stale_observations),
    ("10. Sensor disagreement detection", test_sensor_disagreement_detection),
    ("11. Invalid units and data normalization", test_invalid_units_and_data_normalization),
    ("12. Evidence deduplication", test_evidence_deduplication),
    ("13. Candidate alerts zero auto-dispatch", test_candidate_alerts_zero_auto_dispatch),
    ("14. Fusion output preserving provenance", test_fusion_output_preserving_provenance),
    ("15. Existing simulation regressions", test_existing_simulation_regressions),
    ("16. Backend perception API endpoints", test_backend_perception_api_endpoints),
]

def main():
    print("=" * 70)
    print("TIDES Milestone 7 — Backend Multi-Camera CV & Sensor Fusion Tests")
    print("=" * 70)
    passed = 0
    failed = 0

    for name, func in test_suite:
        try:
            func()
            print(f"[PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"[FAIL] {name}: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

    print("=" * 70)
    print(f"Summary: {passed}/{len(test_suite)} passed ({passed/len(test_suite)*100:.1f}%)")
    print("=" * 70)
    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
