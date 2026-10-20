"""
backend/tests/run_calibration_tests.py
Standalone test runner for Milestone 8 Calibration, Real-Time Data & Validation.
"""

import sys
import os
import traceback

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import test_milestone8_calibration

def main():
    test_funcs = [
        getattr(test_milestone8_calibration, f)
        for f in dir(test_milestone8_calibration)
        if f.startswith("test_") and callable(getattr(test_milestone8_calibration, f))
    ]

    print(f"==================================================")
    print(f"RUNNING MILESTONE 8 BACKEND CALIBRATION TESTS ({len(test_funcs)} tests)")
    print(f"==================================================")

    passed = 0
    failed = 0

    for test in test_funcs:
        name = test.__name__
        try:
            test()
            print(f"  [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name}: {e}")
            traceback.print_exc()
            failed += 1

    print(f"==================================================")
    print(f"RESULT: {passed} passed, {failed} failed out of {len(test_funcs)} tests")
    print(f"==================================================")

    if failed > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
