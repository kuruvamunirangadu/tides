/**
 * src/operations/tests/run_tests.ts
 * Standalone runner for Milestone 11 Frontend Operational Readiness & Evaluation Tests.
 */

import { ReadinessTestSuite } from './ReadinessTestSuite';

function main() {
  console.log('======================================================================');
  console.log('TIDES Milestone 11 — Frontend Operational Readiness & Evaluation Tests');
  console.log('======================================================================');

  const results = ReadinessTestSuite.runAll();
  let passed = 0;
  let failed = 0;

  for (const r of results) {
    if (r.passed) {
      console.log(`[PASS] ${r.name}`);
      passed++;
    } else {
      console.log(`[FAIL] ${r.name}: ${r.message}`);
      failed++;
    }
  }

  console.log('======================================================================');
  console.log(`Summary: ${passed}/${results.length} passed (${((passed / results.length) * 100).toFixed(1)}%)`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();

