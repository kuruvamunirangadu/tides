import { DroneMissionTestSuite } from './DroneMissionTestSuite';

function main() {
  console.log('======================================================================');
  console.log('TIDES — Drone Phase 4: Mission & Patrol Manager Integration Tests');
  console.log('Site: Rushikonda Beach Coastal Digital Twin Fleet');
  console.log('======================================================================');

  const suite = new DroneMissionTestSuite();
  const results = suite.runAll();

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

