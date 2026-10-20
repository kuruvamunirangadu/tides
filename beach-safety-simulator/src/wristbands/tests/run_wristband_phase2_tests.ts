/**
 * run_wristband_phase2_tests.ts
 * 
 * Test runner for Track B — Wristband Phase 2: Incident Integration & Localized Warning Engine
 */

import { WristbandPhase2TestSuite } from './WristbandPhase2TestSuite';

function main() {
  console.log('======================================================================');
  console.log('TIDES Track B — Wristband Phase 2: Incident Integration & Warning Engine');
  console.log('Site: Rushikonda Beach Digital Twin Subsystem');
  console.log('======================================================================');

  const suite = new WristbandPhase2TestSuite();

  const testCases: Array<{
    name: string;
    fn: () => { pass: boolean; details: string };
  }> = [
    { name: '1. Virtual Wristband Registry & Hardware Initialization', fn: () => suite.testVirtualWristbandRegistryInitialization() },
    { name: '2. Device Identity Verification (Unregistered Rejection)', fn: () => suite.testEventAdapterDeviceIdentityVerification() },
    { name: '3. Event Deduplication & Idempotency Window', fn: () => suite.testEventAdapterDeduplicationAndIdempotency() },
    { name: '4. Zero Coordinate Fabrication Preservation', fn: () => suite.testZeroCoordinateFabricationPreservation() },
    { name: '5. Authoritative Incident Creation via WristbandIncidentBridge', fn: () => suite.testAuthoritativeIncidentCreationViaBridge() },
    { name: '6. Duplicate Incident Suppression on Repeated SOS', fn: () => suite.testDuplicateIncidentSuppressionOnRepeatedSOS() },
    { name: '7. Rescue Coordination Integration (Authoritative Incident Reflection)', fn: () => suite.testRescueCoordinationIntegration() },
    { name: '8. Two-Way Incident Resolution Synchronization', fn: () => suite.testTwoWayIncidentResolutionSync() },
    { name: '9. Spatial Distance-Bounded Localized Warning Targeting', fn: () => suite.testSpatialDistanceBoundedWarningTargeting() },
    { name: '10. Zone-Based Warning Targeting', fn: () => suite.testZoneBasedWarningDispatch() },
    { name: '11. Rip Current Corridor Intersection Targeting', fn: () => suite.testRipCorridorWarningTargeting() },
    { name: '12. Downlink Delivery Lifecycle (PENDING -> DELIVERED -> ACKNOWLEDGED)', fn: () => suite.testDownlinkDeliveryLifecycle() },
    { name: '13. Gateway Connectivity & Transmission Failure Handling', fn: () => suite.testGatewayConnectivityAndFailureHandling() },
    { name: '14. Non-Interference with Drone Track A & Clean Fleet Reset', fn: () => suite.testNonInterferenceWithCoreSimAndTrackA() },
  ];

  let passedCount = 0;
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    try {
      const res = tc.fn();
      if (res.pass) {
        passedCount++;
        console.log(`[PASS] ${tc.name}`);
        console.log(`       ↳ ${res.details}`);
      } else {
        console.error(`[FAIL] ${tc.name}`);
        console.error(`       ↳ ${res.details}`);
      }
    } catch (err: any) {
      console.error(`[ERROR] ${tc.name} threw an unexpected error:`);
      console.error(err);
    }
  }

  console.log('======================================================================');
  const pct = ((passedCount / testCases.length) * 100).toFixed(1);
  console.log(`Summary: ${passedCount}/${testCases.length} passed (${pct}%)`);
  console.log('======================================================================');

  if (passedCount !== testCases.length) {
    process.exit(1);
  }
}

main();

