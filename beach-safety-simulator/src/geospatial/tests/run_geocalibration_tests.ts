/**
 * src/geospatial/tests/run_geocalibration_tests.ts
 * Standalone runner for Geographic Calibration & 1 km Coastal Georeferencing Tests.
 */

import { GeoCalibrationTestSuite } from './GeoCalibrationTestSuite';

function main() {
  console.log('======================================================================');
  console.log('TIDES — Geographic Calibration for 1 km Coastal 3D Digital Twin Tests');
  console.log('Site: Rushikonda Blue Flag Beach (Visakhapatnam, Andhra Pradesh)');
  console.log('======================================================================');

  const results = GeoCalibrationTestSuite.runAll();
  let passed = 0;
  let failed = 0;

  for (const r of results) {
    if (r.passed) {
      console.log(`[PASS] ${r.name}`);
      if (r.message) {
        console.log(`       ↳ ${r.message}`);
      }
      passed++;
    } else {
      console.log(`[FAIL] ${r.name}: ${r.message}`);
      failed++;
    }
  }

  console.log('======================================================================');
  console.log(`Summary: ${passed}/${results.length} passed (${((passed / results.length) * 100).toFixed(1)}%)`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();

