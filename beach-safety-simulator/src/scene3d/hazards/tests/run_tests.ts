import { RipCurrentTestSuite } from './RipCurrentTestSuite';

console.log('--- RUNNING MILESTONE 3 RIP CURRENT & DISTRESS TEST SUITE ---');
const result = RipCurrentTestSuite.runTests();
result.results.forEach((r) => {
  console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.testName}: ${r.message}`);
});

console.log(`\nSUMMARY: ${result.passedTests} / ${result.totalTests} tests passed.`);
if (!result.passed) {
  process.exit(1);
} else {
  console.log('ALL MILESTONE 3 TESTS PASSED PERFECTLY!');
  process.exit(0);
}

