import { SwimmerMotionTestSuite } from './SwimmerMotionTestSuite';

async function main() {
  console.log('======================================================================');
  console.log(' TIDES Milestone 13 — Swimmer Physics & Hydrodynamics Test Suite');
  console.log('======================================================================');

  const results = await SwimmerMotionTestSuite.runAll();
  let passedCount = 0;

  for (const r of results) {
    if (r.passed) {
      console.log(`[PASS] ${r.name}`);
      passedCount++;
    } else {
      console.log(`[FAIL] ${r.name}`);
      if (r.message) console.log(`       Reason: ${r.message}`);
    }
  }

  console.log('======================================================================');
  console.log(
    `Summary: ${passedCount}/${results.length} passed (${((passedCount / results.length) * 100).toFixed(1)}%)`
  );
  console.log('======================================================================');

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});

