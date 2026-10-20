import { IncidentReplayTestSuite } from '../src/impact-lab/replay/tests/IncidentReplayTestSuite';

async function main() {
  console.log('================================================================');
  console.log('   TIDES STAGE 3: INCIDENT REPLAY & RESPONSE ANALYTICS SUITE    ');
  console.log('================================================================\n');

  const suite = IncidentReplayTestSuite.getInstance();
  const results = await suite.runFullSuite();

  let allPassed = true;
  for (const r of results) {
    const symbol = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${symbol}] ${r.testId}: ${r.name}`);
    console.log(`  Description: ${r.description}`);
    console.log(`  Expected:    ${r.expectedOutcome}`);
    console.log(`  Actual:      ${r.actualOutcome}`);
    console.log(`  Notes:       ${r.notes}\n`);
    if (!r.passed) allPassed = false;
  }

  const passedCount = results.filter((r) => r.passed).length;
  console.log('----------------------------------------------------------------');
  console.log(`TEST EXECUTION SUMMARY: ${passedCount}/${results.length} PASSED (${Math.round((passedCount / results.length) * 100)}%)`);
  console.log('----------------------------------------------------------------\n');

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});

