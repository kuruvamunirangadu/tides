/**
 * run_swimmer_integration_tests.ts
 * 
 * Standalone runner for the Post-Phase-10 Wristband-to-Swimmer Integration Audit Test Suite.
 */

import { WristbandSwimmerIntegrationTestSuite } from './WristbandSwimmerIntegrationTestSuite';

const suite = new WristbandSwimmerIntegrationTestSuite();
const results = suite.run();

if (results.failed > 0) {
  console.error(`\n❌ Wristband-to-Swimmer Integration Suite failed with ${results.failed} errors.`);
  process.exit(1);
} else {
  console.log(`\n✅ All ${results.passed} Wristband-to-Swimmer Integration Suite checks passed successfully.`);
  process.exit(0);
}

