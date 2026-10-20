/**
 * run_phase6_command_center_tests.ts
 * 
 * Standalone test runner for Phase 6: Operational Command Center & Live Monitoring
 */

import { Phase6CommandCenterTestSuite } from './Phase6CommandCenterTestSuite';

async function main() {
  console.log('======================================================================');
  console.log('TIDES — PHASE 6: OPERATIONAL COMMAND CENTER & LIVE MONITORING');
  console.log('Automated Verification Test Suite');
  console.log('======================================================================\n');

  const suite = new Phase6CommandCenterTestSuite();
  const tests = [
    { name: 'P6-1. Unified Overview Aggregation Across Subsystems', fn: () => suite.testUnifiedOverviewAggregation() },
    { name: 'P6-2. Strict Non-Overlapping Drone Fleet Partitioning', fn: () => suite.testStrictNonOverlappingDroneFleetPartitioning() },
    { name: 'P6-3. Multi-Sensor Candidate Distress Triage Visibility', fn: () => suite.testCandidateDistressTriageVisibility() },
    { name: 'P6-4. Operator Candidate Verification Action & Auto Warnings', fn: () => suite.testOperatorVerifyCandidateAction() },
    { name: 'P6-5. Operator Candidate Dismissal Action & Zero Pollution', fn: () => suite.testOperatorDismissCandidateAction() },
    { name: 'P6-6. Operator Drone Closer Look Inspection Request', fn: () => suite.testOperatorCloserLookAction() },
    { name: 'P6-7. Wristband Fleet Provenance Separation (Sim vs HW)', fn: () => suite.testWristbandFleetProvenanceSeparation() },
    { name: 'P6-8. Zero Coordinate Fabrication for Unmeasured Devices', fn: () => suite.testZeroCoordinateFabricationForUnmeasuredWristbands() },
    { name: 'P6-9. Localized Warning Distribution & Sector Tracking', fn: () => suite.testLocalizedWarningDistributionTracking() },
    { name: 'P6-10. Zero Delivery Fabrication for Physical Hardware', fn: () => suite.testZeroDeliveryFabricationForPhysicalDevices() },
    { name: 'P6-11. Beach Gateway Health & Offline Buffer Surfacing', fn: () => suite.testBeachGatewayHealthAndBufferSurfacing() },
    { name: 'P6-12. Subsystem Health Matrix & Explicit Data Freshness Indicators', fn: () => suite.testSystemHealthFreshnessIndicators() },
    { name: 'P6-13. Controlled Field Pilot Validation Integration', fn: () => suite.testControlledPilotValidationIntegration() },
    { name: 'P6-14. Operator Action Audit Trail Traceability', fn: () => suite.testOperatorActionAuditTrail() },
    { name: 'P6-15. Clean Reset & Non-Interference with Simulation Subsystems', fn: () => suite.testNonInterferenceAndCleanReset() },
  ];

  let passed = 0;
  for (const t of tests) {
    try {
      const res = t.fn();
      if (res.pass) {
        passed++;
        console.log(`[PASS] ${t.name}`);
        console.log(`       ↳ ${res.details}`);
      } else {
        console.error(`[FAIL] ${t.name}`);
        console.error(`       ↳ ${res.details}`);
      }
    } catch (err: any) {
      console.error(`[ERROR] ${t.name}:`, err);
    }
  }

  console.log('\n======================================================================');
  console.log(`PHASE 6 TEST RESULTS: ${passed}/${tests.length} PASSED (${((passed / tests.length) * 100).toFixed(1)}%)`);
  console.log('======================================================================');

  if (passed !== tests.length) {
    process.exit(1);
  }
}

main();

