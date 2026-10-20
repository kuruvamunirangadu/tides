import { HumanVisibilityTestSuite } from './HumanVisibilityTestSuite';

function main() {
  console.log('======================================================================');
  console.log('TIDES — 3D Human Visibility & End-to-End Rescue Flow Test Suite');
  console.log('Site: Rushikonda Beach & Coastal Digital Twin (Option 1 Aerial Overlay)');
  console.log('======================================================================');

  const suite = new HumanVisibilityTestSuite();
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

