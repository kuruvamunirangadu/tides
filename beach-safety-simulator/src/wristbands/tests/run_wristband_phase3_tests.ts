/**
 * run_wristband_phase3_tests.ts
 * 
 * Test runner for Track B — Wristband Phase 3: Physical Hardware Prototype & Beach Gateway
 */

import { WristbandPhase3HardwareTestSuite } from './WristbandPhase3HardwareTestSuite';

function main() {
  console.log('======================================================================');
  console.log('TIDES Track B — Wristband Phase 3: Hardware Prototype & Beach Gateway');
  console.log('Site: Rushikonda Beach Digital Twin Subsystem');
  console.log('======================================================================');

  const suite = new WristbandPhase3HardwareTestSuite();

  const testCases: Array<{
    name: string;
    fn: () => { pass: boolean; details: string };
  }> = [
    { name: '1. Hardware Architecture & Parameter Specification Validation', fn: () => suite.testHardwareArchitectureConfiguration() },
    { name: '2. Physical SOS Button Press Debouncing & Hold Threshold (1.2s verification)', fn: () => suite.testPhysicalButtonDebounceAndHoldThreshold() },
    { name: '3. Correct Device ID, Sequence, and Wire Protocol Frame Verification', fn: () => suite.testWireProtocolFrameVerification() },
    { name: '4. Gateway Packet Intake, CRC16 Check, and Cryptographic Authentication', fn: () => suite.testGatewayPacketIntakeAndAuthentication() },
    { name: '5. Backend Event Acceptance & Provenance Tagging (HARDWARE vs SIMULATED)', fn: () => suite.testBackendEventAcceptanceAndProvenance() },
    { name: '6. Authoritative Incident Creation via Hardware Adapter & Core IncidentManager', fn: () => suite.testAuthoritativeIncidentCreationFromHardware() },
    { name: '7. Duplicate Message Suppression & Idempotency Sliding Window', fn: () => suite.testDuplicateMessageSuppressionAndIdempotency() },
    { name: '8. Invalid Magic, Malformed CRC, and Unauthorized Device Rejection', fn: () => suite.testInvalidPacketAndUnauthorizedDeviceRejection() },
    { name: '9. Gateway Offline Buffering & Storage Capacity Preservation', fn: () => suite.testGatewayOfflineBuffering() },
    { name: '10. Gateway Reconnect Queue Flushing Without Duplicate Incidents', fn: () => suite.testGatewayReconnectQueueFlushing() },
    { name: '11. Downlink Localized Warning Delivery & Swimmer Acknowledgment', fn: () => suite.testDownlinkWarningDeliveryAndAcknowledgment() },
    { name: '12. Hardware LED & Haptic Vibration Pattern State Machine', fn: () => suite.testHardwareLedAndHapticPatterns() },
    { name: '13. Zero Coordinate Fabrication Preservation for Hardware Packets', fn: () => suite.testZeroCoordinateFabricationPreservation() },
    { name: '14. Gateway & Transceiver Resilient Behavior Under Packet Loss', fn: () => suite.testGatewayAndDeviceBehaviorUnderPacketLoss() },
    { name: '15. Non-Interference Regression: Phase 2 Wristbands & Drone Track A (4 drones) Intact', fn: () => suite.testNonInterferenceRegression() },
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

