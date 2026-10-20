/**
 * src/terrain/tests/run_terrain_tests.ts
 * Standalone runner for Milestone 15 Real-World Terrain & Bathymetry Integration Tests.
 */

import { TerrainBathymetryTestSuite } from './TerrainBathymetryTestSuite';

function main() {
  console.log('======================================================================');
  console.log('TIDES Milestone 15 — Real-World Terrain & Bathymetry Integration Tests');
  console.log('Site: Rushikonda Blue Flag Beach & Bay (Visakhapatnam, Andhra Pradesh)');
  console.log('======================================================================');

  const results = TerrainBathymetryTestSuite.runAll();
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

