import { PredictiveIntelligenceTestSuite } from './PredictiveIntelligenceTestSuite';

console.log('========================================================================');
console.log(' TIDES Milestone 6: Predictive Beach Safety Intelligence Test Suite');
console.log('========================================================================');

const results = PredictiveIntelligenceTestSuite.runAll();
let passedCount = 0;

results.forEach((res, idx) => {
  if (res.passed) {
    passedCount++;
    console.log(`[PASS] ${res.name}`);
  } else {
    console.error(`[FAIL] ${res.name}: ${res.message}`);
  }
});

console.log('------------------------------------------------------------------------');
console.log(`Summary: ${passedCount}/${results.length} tests passed.`);
console.log('========================================================================');

if (passedCount !== results.length) {
  process.exit(1);
} else {
  process.exit(0);
}

