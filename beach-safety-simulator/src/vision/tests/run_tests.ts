import { SensorFusionTestSuite } from './SensorFusionTestSuite';

console.log('='.repeat(70));
console.log('TIDES Milestone 7 — TypeScript Simulator Sensor Fusion Test Suite');
console.log('='.repeat(70));

const { passed, failed, results } = SensorFusionTestSuite.runAllTests();

for (const res of results) {
  if (res.success) {
    console.log(`[PASS] ${res.name}`);
  } else {
    console.log(`[FAIL] ${res.name}: ${res.error}`);
  }
}

console.log('='.repeat(70));
console.log(`Summary: ${passed}/${results.length} passed (${((passed / results.length) * 100).toFixed(1)}%)`);
console.log('='.repeat(70));

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

