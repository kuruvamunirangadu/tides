import { DroneDistressTestSuite } from './DroneDistressTestSuite';

function main() {
  console.log('======================================================================');
  console.log('TIDES — Drone Phase 7: Distress Verification & Incident Integration Tests');
  console.log('Site: Rushikonda Beach Coastal Digital Twin Fleet');
  console.log('======================================================================');

  const suite = new DroneDistressTestSuite();
  const results = suite.runAllTests();

  let passedCount = 0;

  results.forEach((r, idx) => {
    const status = r.passed ? '[PASS]' : '[FAIL]';
    console.log(`${status} ${idx + 1}. ${r.name}`);
    console.log(`       ↳ ${r.message}`);
    if (r.passed) passedCount++;
  });

  console.log('======================================================================');
  console.log(`Summary: ${passedCount}/${results.length} passed (${((passedCount / results.length) * 100).toFixed(1)}%)`);
  console.log('======================================================================');

  if (passedCount < results.length) {
    process.exit(1);
  }
}

main();

