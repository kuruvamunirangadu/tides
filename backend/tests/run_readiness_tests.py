"""
backend/tests/run_readiness_tests.py
Standalone test runner for TIDES Milestone 11:
Operational Readiness, Field-Pilot Mode & Evidence-Based Evaluation.
"""

import sys
import os
import unittest

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from test_milestone11_readiness import TestMilestone11Readiness

def main():
    print("=" * 65)
    print("RUNNING MILESTONE 11 BACKEND OPERATIONAL READINESS TESTS (15 tests)")
    print("=" * 65)

    suite = unittest.TestLoader().loadTestsFromTestCase(TestMilestone11Readiness)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print("=" * 65)
    print(f"RESULT: {result.testsRun - len(result.failures) - len(result.errors)} passed, "
          f"{len(result.failures)} failed, {len(result.errors)} errors out of {result.testsRun} tests")
    print("=" * 65)

    if result.wasSuccessful():
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()

