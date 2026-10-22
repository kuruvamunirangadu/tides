/**
 * src/scene3d/hazards/tests/run_wave_shoaling_tests.ts
 * 
 * Standalone CLI runner for TIDES Phase 3: Wave Shoaling & Breaker Dynamics Test Suite
 */

import { WaveShoalingTestSuite } from './WaveShoalingTestSuite';

const suite = new WaveShoalingTestSuite();
const results = suite.run();

if (results.failed > 0) {
  console.error(`❌ ${results.failed} Wave Shoaling test(s) failed.`);
  process.exit(1);
} else {
  console.log(`✅ All ${results.passed} Wave Shoaling test checks passed successfully.`);
  process.exit(0);
}

