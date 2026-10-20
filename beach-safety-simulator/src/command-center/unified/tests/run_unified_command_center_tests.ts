/**
 * run_unified_command_center_tests.ts
 * 
 * Node/tsx test runner for Phase 13: Unified Command Center Dashboard & Mission Replay
 */

import { UnifiedCommandCenterTestSuite } from './UnifiedCommandCenterTestSuite';

function main() {
  console.log('======================================================================');
  console.log('TIDES — Phase 13: Unified Command Center Dashboard & Mission Replay');
  console.log('Site: Rushikonda Beach Digital Twin Subsystem');
  console.log('======================================================================');

  const suite = new UnifiedCommandCenterTestSuite();

  const testCases: Array<{
    name: string;
    fn: () => { pass: boolean; details: string };
  }> = [
    { name: '1. Authoritative Overview Metrics Reflection (Zero Fake Data)', fn: () => suite.testAuthoritativeMetricsReflection() },
    { name: '2. Strict Non-Overlapping Fleet Partition (Sum === 4)', fn: () => suite.testNonOverlappingFleetPartition() },
    { name: '3. Metric Selection Click-to-Filter Navigation', fn: () => suite.testMetricClickToFilterNavigation() },
    { name: '4. Chronological Incident Event Timeline Creation', fn: () => suite.testChronologicalIncidentTimeline() },
    { name: '5. Missing Incident Stages Explicitly Handled (No Invention)', fn: () => suite.testMissingIncidentStagesHandled() },
    { name: '6. Authoritative Drone Status & Unreadiness Reason', fn: () => suite.testAuthoritativeDroneStatusAndReason() },
    { name: '7. Historical Benchmark Sessions Loading', fn: () => suite.testHistoricalBenchmarkSessionsLoading() },
    { name: '8. Chronological Event Ordering & Stable Identifiers', fn: () => suite.testChronologicalEventOrdering() },
    { name: '9. Replay Controller Play, Pause, Resume, and Restart', fn: () => suite.testReplayControllerPlayPauseRestart() },
    { name: '10. Replay Playback Speeds (0.5x, 1x, 2x, 5x)', fn: () => suite.testReplayPlaybackSpeeds() },
    { name: '11. Timeline Forward and Backward Seeking', fn: () => suite.testTimelineSeeking() },
    { name: '12. Replay Reaches End and Stops Cleanly', fn: () => suite.testReplayReachesEndCleanly() },
    { name: '13. Telemetry Gap Detection (Zero Flight-Path Fabrication)', fn: () => suite.testTelemetryGapDetectionWithoutFabrication() },
    { name: '14. Incomplete & Sparse Session Handling', fn: () => suite.testIncompleteSessionHandling() },
    { name: '15. MANDATORY REPLAY ISOLATION — Zero Mutation of Live DroneRegistry', fn: () => suite.testReplayIsolationZeroRegistryMutation() },
    { name: '16. MANDATORY REPLAY ISOLATION — Historical Events Do Not Trigger Live Dispatch', fn: () => suite.testReplayIsolationNoLiveDispatch() },
    { name: '17. MANDATORY REPLAY ISOLATION — Exiting Replay Cleanly Restores Live View', fn: () => suite.testReplayExitRestoresLiveView() },
    { name: '18. Multiple Simultaneous Incidents Independent Selection', fn: () => suite.testMultipleSimultaneousIncidentsSelection() },
    { name: '19. Event Timeline Search & Filtering', fn: () => suite.testEventTimelineSearchAndFiltering() },
    { name: '20. Event Subscriptions Cleanup (Zero Leak)', fn: () => suite.testSubscriptionCleanup() },
    { name: '21. Life-Safety Boundaries & Simulation Disclaimers Preservation', fn: () => suite.testLifeSafetyBoundariesPreserved() },
    { name: '22. Non-Interference with Core Simulation & Fleet Reset', fn: () => suite.testNonInterferenceAndCleanReset() },
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
        console.log(`[FAIL] ${tc.name}`);
        console.log(`       ↳ ${res.details}`);
      }
    } catch (err: any) {
      console.log(`[FAIL] ${tc.name}`);
      console.log(`       ↳ Unhandled Exception: ${err.message}`);
    }
  }

  console.log('======================================================================');
  console.log(
    `Summary: ${passedCount}/${testCases.length} passed (${((passedCount / testCases.length) * 100).toFixed(1)}%)`
  );
  console.log('======================================================================\n');

  if (passedCount !== testCases.length) {
    process.exit(1);
  }
}

main();

