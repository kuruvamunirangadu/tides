/**
 * run_drone_coordination_tests.ts
 * 
 * Node/tsx runner for Phase 11: Multi-Incident & Multi-Drone Coordination Test Suite
 */

import { MultiDroneCoordinationTestSuite } from './MultiDroneCoordinationTestSuite';

function main() {
  console.log('======================================================================');
  console.log('TIDES — Drone Phase 11: Multi-Incident & Multi-Drone Coordination Test Suite');
  console.log('Site: Rushikonda Beach Digital Twin Subsystem');
  console.log('======================================================================');

  const suite = new MultiDroneCoordinationTestSuite();
  const results = suite.runAllTests();

  let passedCount = 0;
  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    if (res.passed) {
      passedCount++;
      console.log(`[PASS] ${res.name}`);
      console.log(`       ↳ ${res.message}`);
    } else {
      console.log(`[FAIL] ${res.name}`);
      console.log(`       ↳ ${res.message}`);
    }
  }

  console.log('======================================================================');
  console.log(`Summary: ${passedCount}/${results.length} passed (${((passedCount / results.length) * 100).toFixed(1)}%)`);
  console.log('======================================================================\n');

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

main();

