/**
 * run_drone_fault_recovery_tests.ts
 * 
 * Node/tsx test runner for Phase 12: Fault Handling & Recovery Test Suite
 */

import { DroneFaultRecoveryTestSuite } from './DroneFaultRecoveryTestSuite';

function main() {
  console.log('======================================================================');
  console.log('TIDES — Drone Phase 12: Fault Handling, Resilience & Recovery Test Suite');
  console.log('Site: Rushikonda Beach Digital Twin Subsystem');
  console.log('======================================================================');

  const suite = new DroneFaultRecoveryTestSuite();
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
  console.log(
    `Summary: ${passedCount}/${results.length} passed (${((passedCount / results.length) * 100).toFixed(1)}%)`
  );
  console.log('======================================================================\n');

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

main();

