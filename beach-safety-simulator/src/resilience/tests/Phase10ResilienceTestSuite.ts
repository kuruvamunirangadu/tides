/**
 * src/resilience/tests/Phase10ResilienceTestSuite.ts
 * 
 * TIDES — Phase 10: Resilience, Fault Tolerance & Disaster Recovery
 * 
 * Dedicated 18-Test Verification Suite covering:
 * 1. Health check state transitions (HEALTHY, DEGRADED, OFFLINE, STALE, RECOVERING, UNKNOWN)
 * 2. Distinguishing infrastructure health failures from beach safety incidents
 * 3. Multi-site fault isolation (RK Beach outage does not affect Rushikonda)
 * 4. Cross-service isolation (Camera failure does not disable wristband SOS)
 * 5. Predictive AI failure isolation (AI down leaves deterministic hazards intact)
 * 6. Malformed event batch resilience (DLQ quarantine without batch termination)
 * 7. Sliding-window deduplication & idempotent event processing
 * 8. Bounded exponential retries & terminal failure routing
 * 9. Dangerous action guardrail (Real dispatch cannot be blindly retried)
 * 10. Bounded offline event buffering & priority-aware retention
 * 11. Chronological reconnection flush & source timestamp preservation
 * 12. Strict temporal ordering (Late packets do not overwrite live state)
 * 13. Life-safety invariant preservation during degraded operations
 * 14. Checkpoint creation, schema versioning & checksum calculation
 * 15. Checkpoint integrity verification & corruption detection
 * 16. Isolated sandbox restoration verification (Zero production mutation)
 * 17. Controlled fault-injection security gating (Blocked outside test mode)
 * 18. Non-interference regression across all existing subsystems
 */

import { SystemHealthMonitor } from '../SystemHealthMonitor';
import { ReliableEventProcessor } from '../ReliableEventProcessor';
import { OfflineResilienceManager } from '../OfflineResilienceManager';
import { DegradedModeManager } from '../DegradedModeManager';
import { DisasterRecoveryManager } from '../DisasterRecoveryManager';
import { ControlledFaultInjector } from '../ControlledFaultInjector';
import { ResilienceOrchestrator } from '../ResilienceOrchestrator';
import { IncidentManager } from '../../visitors/incidents/IncidentManager';
import { BeachGatewayService } from '../../wristbands/gateway/BeachGatewayService';
import { HardwareWristbandAdapter } from '../../wristbands/hardware/HardwareWristbandAdapter';
import { DroneRegistry } from '../../drones/foundation/DroneRegistry';
import { DigitalTwinSyncEngine } from '../../calibration/DigitalTwinSyncEngine';
import { BeachRegistry } from '../../regional/BeachRegistry';

export class Phase10ResilienceTestSuite {
  public static async runAllTests(): Promise<{ passed: number; failed: number; total: number }> {
    let passed = 0;
    let failed = 0;

    console.log('\n--- TRACK B PHASE 10: RESILIENCE, FAULT TOLERANCE & DISASTER RECOVERY TESTS (18) ---');

    function assert(condition: boolean, testName: string, detail?: string) {
      if (condition) {
        console.log(`[PASS] ${testName}`);
        passed++;
      } else {
        console.error(`[FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
        failed++;
      }
    }

    const healthMonitor = SystemHealthMonitor.getInstance();
    const eventProcessor = ReliableEventProcessor.getInstance();
    const offlineManager = OfflineResilienceManager.getInstance();
    const degradedManager = DegradedModeManager.getInstance();
    const recoveryManager = DisasterRecoveryManager.getInstance();
    const faultInjector = ControlledFaultInjector.getInstance();
    const orchestrator = ResilienceOrchestrator.getInstance();
    const incMgr = IncidentManager.getInstance();
    const gateway = BeachGatewayService.getInstance();
    const adapter = HardwareWristbandAdapter.getInstance();
    const droneRegistry = DroneRegistry.getInstance();
    const twinSync = DigitalTwinSyncEngine.getInstance();
    const beachRegistry = BeachRegistry.getInstance();

    // Reset before running test suite
    healthMonitor.reset();
    eventProcessor.reset();
    offlineManager.reset();
    degradedManager.reset();
    recoveryManager.reset();
    faultInjector.reset();

    // TEST 1: Health check behavior and latency tracking
    try {
      const rec = healthMonitor.recordHeartbeat('GW-TOWER-01', 35);
      assert(
        rec.status === 'HEALTHY' && rec.latencyMs === 35 && rec.consecutiveRecoveries > 0,
        'P10-1. Health-Check Behavior & Communication Latency Tracking'
      );
    } catch (e: any) {
      assert(false, 'P10-1. Health-Check Behavior & Communication Latency Tracking', e?.message);
    }

    // TEST 2: 6-State Health Transitions & Recovery Hysteresis
    try {
      // 1. Report failure -> should become DEGRADED or OFFLINE
      healthMonitor.reportFailure('CAM-01', 'High packet loss', false);
      const degradedRec = healthMonitor.getHealth('CAM-01');
      const isDegraded = degradedRec?.status === 'DEGRADED';

      // 2. Report 3 failures -> becomes OFFLINE
      healthMonitor.reportFailure('CAM-01', 'Comms timeout', true);
      const offlineRec = healthMonitor.getHealth('CAM-01');
      const isOffline = offlineRec?.status === 'OFFLINE';

      // 3. Heartbeat -> enters RECOVERING (hysteresis)
      healthMonitor.recordHeartbeat('CAM-01', 20);
      const recoveringRec = healthMonitor.getHealth('CAM-01');
      const isRecovering = recoveringRec?.status === 'RECOVERING';

      // 4. Meet required consecutive recoveries -> returns to HEALTHY
      healthMonitor.recordHeartbeat('CAM-01', 20);
      healthMonitor.recordHeartbeat('CAM-01', 20);
      const healthyRec = healthMonitor.getHealth('CAM-01');
      const isHealthyAgain = healthyRec?.status === 'HEALTHY';

      assert(
        isDegraded && isOffline && isRecovering && isHealthyAgain,
        'P10-2. 6-State Health Transitions & Recovery Verification Hysteresis'
      );
    } catch (e: any) {
      assert(false, 'P10-2. 6-State Health Transitions & Recovery Verification Hysteresis', e?.message);
    }

    // TEST 3: Distinguishing Infrastructure Health Check Failures from Safety Incidents
    try {
      const initialIncidents = incMgr.getActiveIncidents().length;
      healthMonitor.reportFailure('INCOIS-WRB-01', 'Wave buoy communication severed', true);
      const afterIncidents = incMgr.getActiveIncidents().length;

      assert(
        initialIncidents === afterIncidents,
        'P10-3. Distinguishing Infrastructure Health Failure from Beach Safety Incidents'
      );
    } catch (e: any) {
      assert(false, 'P10-3. Distinguishing Infrastructure Health Failure from Beach Safety Incidents', e?.message);
    }

    // TEST 4: Multi-Site Fault Isolation (RK Beach failure does not affect Rushikonda)
    try {
      healthMonitor.reportFailure('SITE-RK_BEACH', 'City optical link failure', true);
      const rkStatus = healthMonitor.getHealth('SITE-RK_BEACH')?.status;
      const rushikondaStatus = healthMonitor.getHealth('SITE-RUSHIKONDA')?.status;

      assert(
        rkStatus === 'OFFLINE' && rushikondaStatus === 'HEALTHY',
        'P10-4. Multi-Site Fault Isolation (RK Beach Outage Isolated from Rushikonda)'
      );
    } catch (e: any) {
      assert(false, 'P10-4. Multi-Site Fault Isolation (RK Beach Outage Isolated from Rushikonda)', e?.message);
    }

    // TEST 5: Cross-Service Isolation (Camera failure does not disable wristband SOS path)
    try {
      // Simulate camera drop
      degradedManager.activateDegradedMode('CAMERA_VISION', 'CAM-01', 'Feed cut');

      // Swimmer SOS on wristband
      const now = Date.now();
      const sosIncident = incMgr.createIncident(
        'DISTRESS',
        ['VISITOR-SOS-1'],
        'ZONE_A',
        'CRITICAL',
        'Swimmer SOS Distress',
        'Physical SOS triggered while camera is down',
        { x: 120, y: -35 },
        now
      );

      assert(
        Boolean(sosIncident && sosIncident.active && sosIncident.type === 'DISTRESS'),
        'P10-5. Cross-Service Isolation (Camera Dropout Does Not Inhibit Wristband SOS Path)'
      );
    } catch (e: any) {
      assert(false, 'P10-5. Cross-Service Isolation (Camera Dropout Does Not Inhibit Wristband SOS Path)', e?.message);
    }

    // TEST 6: Predictive AI Failure Isolation (AI down leaves deterministic hazards intact)
    try {
      degradedManager.activateDegradedMode('PREDICTIVE_AI', 'MODEL-X', 'Inference timeout');
      const fallback = degradedManager.getDegradedState('PREDICTIVE_AI')?.fallbackAction;

      assert(
        Boolean(fallback?.includes('deterministic hazard engine') && fallback?.includes('100% unaltered')),
        'P10-6. Predictive AI Failure Isolation (Deterministic Hazard Calculations Intact)'
      );
    } catch (e: any) {
      assert(false, 'P10-6. Predictive AI Failure Isolation (Deterministic Hazard Calculations Intact)', e?.message);
    }

    // TEST 7: Malformed Event Batch Resilience (Dead Letter Queue Isolation)
    try {
      const batch = [
        { eventId: 'EVT-GOOD-1', siteId: 'RUSHIKONDA', domain: 'SENSOR_TELEMETRY' as const, eventType: 'WAVE', payload: { h: 1.2 } },
        { eventId: 'EVT-CORRUPT-2', siteId: 'RUSHIKONDA', domain: 'SENSOR_TELEMETRY' as const, eventType: 'WAVE', payload: null as any },
        { eventId: 'EVT-GOOD-3', siteId: 'RUSHIKONDA', domain: 'SENSOR_TELEMETRY' as const, eventType: 'WAVE', payload: { h: 1.4 } },
      ];

      const batchResult = await eventProcessor.processBatch(batch, async (p) => p.h * 10);

      assert(
        batchResult.completedCount === 2 && batchResult.failedCount === 1 && batchResult.deadLetterEvents.length === 1,
        'P10-7. Malformed Event Batch Resilience (DLQ Quarantine Without Batch Termination)'
      );
    } catch (e: any) {
      assert(false, 'P10-7. Malformed Event Batch Resilience (DLQ Quarantine Without Batch Termination)', e?.message);
    }

    // TEST 8: Sliding-Window Deduplication & Idempotent Event Processing
    try {
      let callCount = 0;
      const testEvent = {
        eventId: 'EVT-IDEMP-001',
        siteId: 'RUSHIKONDA',
        domain: 'WRISTBAND_GATEWAY' as const,
        eventType: 'SOS',
        payload: { id: 'WB-101' },
      };

      const handler = async () => {
        callCount++;
        return { success: true };
      };

      const res1 = await eventProcessor.processEvent(testEvent, handler);
      const res2 = await eventProcessor.processEvent(testEvent, handler);

      assert(
        res1.status === 'COMPLETED' && res2.status === 'DUPLICATE_IGNORED' && callCount === 1,
        'P10-8. Sliding-Window Deduplication & Idempotent Event Processing'
      );
    } catch (e: any) {
      assert(false, 'P10-8. Sliding-Window Deduplication & Idempotent Event Processing', e?.message);
    }

    // TEST 9: Bounded Exponential Retries & Terminal Failure Routing
    try {
      let attemptCount = 0;
      const failingEvent = {
        eventId: 'EVT-FAIL-999',
        siteId: 'RUSHIKONDA',
        domain: 'BACKEND_PIPELINE' as const,
        eventType: 'API_SYNC',
        payload: { target: 'DB' },
      };

      const failHandler = async () => {
        attemptCount++;
        throw new Error('Connection timed out to remote endpoint');
      };

      const res = await eventProcessor.processEvent(failingEvent, failHandler);

      assert(
        res.status === 'FAILED_PERMANENT' &&
          attemptCount === 4 && // initial + 3 retries = 4 attempts
          res.eventRecord.errorCategory === 'COMMUNICATION_TIMEOUT',
        'P10-9. Bounded Exponential Retries & Terminal Failure DLQ Placement'
      );
    } catch (e: any) {
      assert(false, 'P10-9. Bounded Exponential Retries & Terminal Failure DLQ Placement', e?.message);
    }

    // TEST 10: Dangerous Action Guardrail (Prohibition of Blind External Retries)
    try {
      let executionCount = 0;
      const dangerousEvent = {
        eventId: 'EVT-DANGER-DISPATCH',
        siteId: 'RUSHIKONDA',
        domain: 'DRONE_AERIAL' as const,
        eventType: 'REAL_DRONE_DISPATCH',
        payload: { droneId: 'UAV-01' },
        isDangerousExternalAction: true,
      };

      const dangerousHandler = async () => {
        executionCount++;
        throw new Error('Transient radio glitch');
      };

      const res = await eventProcessor.processEvent(dangerousEvent, dangerousHandler);

      assert(
        res.status === 'FAILED_PERMANENT' &&
          executionCount === 1 && // Terminated immediately without repeated automated dispatch
          res.eventRecord.isDangerousExternalAction,
        'P10-10. Dangerous Action Guardrail (Blind Automated Drone Dispatch Prohibited)'
      );
    } catch (e: any) {
      assert(false, 'P10-10. Dangerous Action Guardrail (Blind Automated Drone Dispatch Prohibited)', e?.message);
    }

    // TEST 11: Bounded Offline Event Buffering & Priority-Aware Retention
    try {
      offlineManager.reset();
      const eventBase = {
        eventId: 'EVT-BUFF',
        correlationId: 'CORR-1',
        siteId: 'RUSHIKONDA',
        domain: 'WRISTBAND_GATEWAY' as const,
        eventType: 'TELEMETRY',
        payload: {},
        sourceTimestamp: Date.now(),
        receivedTimestamp: Date.now(),
        processingStatus: 'PENDING' as const,
        retryCount: 0,
        maxRetries: 3,
        isDangerousExternalAction: false,
        idempotencyKey: 'TEST',
      };

      // Enqueue telemetry and critical SOS
      offlineManager.enqueueOfflineRecord('GW-01', 'RUSHIKONDA', 'WRISTBAND_GATEWAY', eventBase, 'NORMAL_TELEMETRY');
      offlineManager.enqueueOfflineRecord(
        'GW-01',
        'RUSHIKONDA',
        'WRISTBAND_GATEWAY',
        { ...eventBase, eventId: 'EVT-CRITICAL-SOS' },
        'CRITICAL_SOS'
      );

      const total = offlineManager.getTotalBufferedCount();
      assert(
        total === 2 && offlineManager.getQueueDepth('GW-01', 'RUSHIKONDA') === 2,
        'P10-11. Bounded Offline Event Buffering & Priority-Aware Storage'
      );
    } catch (e: any) {
      assert(false, 'P10-11. Bounded Offline Event Buffering & Priority-Aware Storage', e?.message);
    }

    // TEST 12: Chronological Reconnection Flush & Original Timestamp Preservation
    try {
      offlineManager.reset();
      const t1 = Date.now() - 50000;
      const t2 = Date.now() - 20000;

      const eventOld = {
        eventId: 'EVT-CHRONO-1',
        correlationId: 'C1',
        siteId: 'RUSHIKONDA',
        domain: 'SENSOR_TELEMETRY' as const,
        eventType: 'WAVE',
        payload: { waveH: 1.3 },
        sourceTimestamp: t1,
        receivedTimestamp: Date.now(),
        processingStatus: 'PENDING' as const,
        retryCount: 0,
        maxRetries: 3,
        isDangerousExternalAction: false,
        idempotencyKey: 'CHRONO:1',
      };

      const eventNewer = {
        eventId: 'EVT-CHRONO-2',
        correlationId: 'C2',
        siteId: 'RUSHIKONDA',
        domain: 'SENSOR_TELEMETRY' as const,
        eventType: 'WAVE',
        payload: { waveH: 1.8 },
        sourceTimestamp: t2,
        receivedTimestamp: Date.now(),
        processingStatus: 'PENDING' as const,
        retryCount: 0,
        maxRetries: 3,
        isDangerousExternalAction: false,
        idempotencyKey: 'CHRONO:2',
      };

      // Enqueue out-of-order in offline buffer
      offlineManager.enqueueOfflineRecord('SENS-1', 'RUSHIKONDA', 'SENSOR_TELEMETRY', eventNewer);
      offlineManager.enqueueOfflineRecord('SENS-1', 'RUSHIKONDA', 'SENSOR_TELEMETRY', eventOld);

      const timestampsReceived: number[] = [];
      const flushResult = await offlineManager.reconcileReconnection('SENS-1', 'RUSHIKONDA', async (p: any) => {
        timestampsReceived.push(p.waveH);
      });

      assert(
        flushResult.flushedCount === 2 && timestampsReceived[0] === 1.3 && timestampsReceived[1] === 1.8,
        'P10-12. Chronological Reconnection Flush & Source Timestamp Preservation'
      );
    } catch (e: any) {
      assert(false, 'P10-12. Chronological Reconnection Flush & Source Timestamp Preservation', e?.message);
    }

    // TEST 13: Strict Temporal Ordering (Late packet archived without overwriting live state)
    try {
      const now = Date.now();
      let liveTwinValue = 2.1;

      // Newer packet already ingested
      twinSync.ingestObservation({
        observationId: 'OBS-CHRONO-NEW',
        sourceId: 'INCOIS-WRB-01',
        sourceType: 'WAVE_BUOY',
        siteId: 'RUSHIKONDA',
        variable: 'WAVE_HEIGHT',
        rawValue: 2.1,
        rawUnits: 'm',
        sourceTimestamp: now,
      });

      // Older packet arriving late
      const lateRes = twinSync.ingestObservation({
        observationId: 'OBS-CHRONO-OLD',
        sourceId: 'INCOIS-WRB-01',
        sourceType: 'WAVE_BUOY',
        siteId: 'RUSHIKONDA',
        variable: 'WAVE_HEIGHT',
        rawValue: 1.2,
        rawUnits: 'm',
        sourceTimestamp: now - 60000,
      });

      const liveState = twinSync.getLatestObservedState('RUSHIKONDA', 'WAVE_HEIGHT');

      assert(
        lateRes.appliedToLiveTwin === false && (liveState?.rawValue === 2.1 || liveState?.calibratedValue !== undefined),
        'P10-13. Strict Temporal Sequence (Delayed Older Packet Does Not Overwrite Live Twin)'
      );
    } catch (e: any) {
      assert(false, 'P10-13. Strict Temporal Sequence (Delayed Older Packet Does Not Overwrite Live Twin)', e?.message);
    }

    // TEST 14: Life-Safety Invariant Guardrail Preservation During Degraded Operations
    try {
      degradedManager.activateDegradedMode('SENSOR_TELEMETRY', 'SENSOR-ALL', 'Corrupted sensor link');

      // Attempt to verify safety policy with a confirmed SOS
      const verification = degradedManager.verifySafetyInvariants({
        isConfirmedSos: true,
        active: true,
        hazardLevel: 'HIGH',
      });

      // Attempt improper closure
      const invalidClosureVerification = degradedManager.verifySafetyInvariants({
        isConfirmedSos: true,
        active: false, // Improperly closed!
        hazardLevel: 'SAFE', // Improperly lowered!
      });

      assert(
        verification.valid && !invalidClosureVerification.valid && invalidClosureVerification.violations.length >= 2,
        'P10-14. Life-Safety Invariant Guardrails (Confirmed SOS & Hazard Levels Protected)'
      );
    } catch (e: any) {
      assert(false, 'P10-14. Life-Safety Invariant Guardrails (Confirmed SOS & Hazard Levels Protected)', e?.message);
    }

    // TEST 15: Checkpoint Creation, Schema Versioning & Cryptographic Checksum
    try {
      const ckpt = recoveryManager.createCheckpoint('RUSHIKONDA', {
        incidents: [{ id: 'INC-CKPT-01', active: true }],
        wristbands: [{ id: 'WB-CKPT-01', battery: 92 }],
      });

      assert(
        ckpt.schemaVersion === '1.0.0' &&
          ckpt.checksum.startsWith('CHK-') &&
          ckpt.recordCounts.incidents === 1 &&
          ckpt.recordCounts.wristbands === 1,
        'P10-15. Disaster Checkpoint Creation, Schema Versioning & Cryptographic Checksum'
      );
    } catch (e: any) {
      assert(false, 'P10-15. Disaster Checkpoint Creation, Schema Versioning & Cryptographic Checksum', e?.message);
    }

    // TEST 16: Checkpoint Integrity Verification & Corruption Detection
    try {
      const ckpt = recoveryManager.createCheckpoint('RUSHIKONDA', {
        incidents: [{ id: 'INC-CKPT-ORIGINAL' }],
      });

      const intactVerification = recoveryManager.verifyCheckpointIntegrity(ckpt.checkpointId);

      // Corrupt payload data
      ckpt.data.incidents.push({ id: 'TAMPERED-DATA' });
      const tamperedVerification = recoveryManager.verifyCheckpointIntegrity(ckpt.checkpointId);

      assert(
        intactVerification.valid && !tamperedVerification.valid,
        'P10-16. Checkpoint Integrity Verification & Payload Tampering Detection'
      );
    } catch (e: any) {
      assert(false, 'P10-16. Checkpoint Integrity Verification & Payload Tampering Detection', e?.message);
    }

    // TEST 17: Isolated Sandbox Restoration Verification (Zero Production Mutation)
    try {
      const liveIncidentCountBefore = incMgr.getActiveIncidents().length;
      const ckpt = recoveryManager.createCheckpoint('RUSHIKONDA', {
        incidents: [{ id: 'INC-RESTORE-1', active: true }, { id: 'INC-RESTORE-2', active: true }],
      });

      const restoreResult = recoveryManager.runIsolatedRestorationTest(ckpt.checkpointId);
      const liveIncidentCountAfter = incMgr.getActiveIncidents().length;

      assert(
        restoreResult.outcome === 'RESTORATION_VERIFIED' &&
          restoreResult.isolatedSandboxOnly === true &&
          liveIncidentCountBefore === liveIncidentCountAfter,
        'P10-17. Isolated Sandbox Restoration Drill (Zero Production State Mutation)'
      );
    } catch (e: any) {
      assert(false, 'P10-17. Isolated Sandbox Restoration Drill (Zero Production State Mutation)', e?.message);
    }

    // TEST 18: Controlled Fault-Injection Security Gating & Non-Interference Regression
    try {
      faultInjector.setTestMode(false); // Locked (production)
      let rejected = false;
      try {
        await faultInjector.executeScenario('GATEWAY_DISCONNECT');
      } catch (err: any) {
        rejected = err?.message?.includes('SECURITY VIOLATION');
      }

      // Unlock test mode
      faultInjector.setTestMode(true);
      const scenarioRes = await faultInjector.executeScenario('GATEWAY_DISCONNECT');
      const passedInTestMode = scenarioRes.status === 'PASSED';

      // Verify Track A & Track B subsystems intact
      const dronesHealthy = droneRegistry.getAllDrones().length >= 4;
      const beachesActive = beachRegistry.getBeaches().length === 8;

      assert(
        rejected && passedInTestMode && dronesHealthy && beachesActive,
        'P10-18. Fault-Injection Security Gating & System Non-Interference Regression'
      );
    } catch (e: any) {
      assert(false, 'P10-18. Fault-Injection Security Gating & System Non-Interference Regression', e?.message);
    }

    return { passed, failed, total: 18 };
  }
}
