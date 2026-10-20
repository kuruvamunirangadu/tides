/**
 * run_drone_rescue_exec_tests.ts
 * 
 * Standalone CLI test runner for TIDES Drone Phase 10: Search, Approach & Rescue Assistance
 */

import { DroneRescueExecutionTestSuite } from './DroneRescueExecutionTestSuite';

function main() {
  console.log('======================================================================');
  console.log('TIDES — Drone Phase 10: Search, Approach & Rescue Assistance Test Suite');
  console.log('Site: Rushikonda Beach Digital Twin Subsystem');
  console.log('======================================================================');

  const suite = new DroneRescueExecutionTestSuite();
  const results = suite.runAllTests();

  let passedCount = 0;
  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    const prefix = res.passed ? '[PASS]' : '[FAIL]';
    console.log(`${prefix} ${i + 1}. ${res.name}`);
    console.log(`       ↳ ${res.message}`);
    if (res.passed) {
      passedCount++;
    }
  }

  console.log('======================================================================');
  const pct = ((passedCount / results.length) * 100).toFixed(1);
  console.log(`Summary: ${passedCount}/${results.length} passed (${pct}%)`);
  console.log('======================================================================');

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

main();
