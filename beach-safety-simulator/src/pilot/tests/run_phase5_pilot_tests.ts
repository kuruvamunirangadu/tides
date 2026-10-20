/**
 * run_phase5_pilot_tests.ts
 * 
 * Standalone test runner for Phase 5: Controlled Field Pilot & Real-World Validation Framework
 */

import { Phase5PilotTestSuite } from './Phase5PilotTestSuite';

async function main() {
  console.log('\n======================================================================');
  console.log('TIDES — Phase 5: Controlled Field Pilot & Validation Framework');
  console.log('15-Point Automated Verification Suite');
  console.log('======================================================================\n');

  const suite = new Phase5PilotTestSuite();
  const { results, allPassed } = await suite.runAllTests();

  let passedCount = 0;
  for (const r of results) {
    const status = r.passed ? 'PASS' : 'FAIL';
    const tag = r.passed ? '✓' : '✗';
    console.log(`[${status}] ${tag} ${r.testId}: ${r.name} (${r.durationMs.toFixed(1)}ms)`);
    console.log(`       ↳ ${r.message}`);
    if (r.passed) passedCount++;
  }

  console.log('\n======================================================================');
  console.log(`SUMMARY: ${passedCount} / ${results.length} tests passed (${((passedCount / results.length) * 100).toFixed(1)}%)`);
  console.log(`OVERALL RESULT: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('======================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});

