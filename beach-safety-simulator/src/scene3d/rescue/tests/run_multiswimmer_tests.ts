/**
 * src/scene3d/rescue/tests/run_multiswimmer_tests.ts
 * Standalone runner for Milestone 12 Multi-Swimmer and Multi-Incident Tests.
 */

import { MultiSwimmerTestSuite } from './MultiSwimmerTestSuite';

function main() {
  console.log('======================================================================');
  console.log('TIDES Milestone 12 — Multi-Swimmer & Multi-Incident Rescue Tests');
  console.log('======================================================================');

  const results = MultiSwimmerTestSuite.runAll();
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

