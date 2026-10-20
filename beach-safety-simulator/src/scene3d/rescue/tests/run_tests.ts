import { RescueTestSuite } from './RescueTestSuite';

console.log('====================================================');
console.log(' TIDES Milestone 4: Intelligent Rescue Operations Test Suite');
console.log('====================================================');

const results = RescueTestSuite.runAll();
let passedCount = 0;

results.forEach((res, idx) => {
  if (res.passed) {
    passedCount++;
    console.log(`[PASS] ${idx + 1}. ${res.name}`);
  } else {
    console.error(`[FAIL] ${idx + 1}. ${res.name}: ${res.message}`);
  }
});

console.log('----------------------------------------------------');
console.log(`Summary: ${passedCount}/${results.length} tests passed.`);
console.log('====================================================');

if (passedCount !== results.length) {
  process.exit(1);
} else {
  process.exit(0);
}

