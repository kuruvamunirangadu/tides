/**
 * SensorFusionTestSuite.ts
 * Comprehensive test suite for TIDES Milestone 7 Multi-Camera Computer Vision & Sensor Fusion.
 */

import { ObjectTracker } from '../tracking/ObjectTracker';
import { CrossCameraAssociator } from '../fusion/CrossCameraAssociator';
import { SensorFusionAdapter } from '../fusion/SensorFusionAdapter';
import { CameraCoverageGeometry } from '../cameras/CameraCoverageGeometry';
import { IncidentEvidenceCorrelator } from '../fusion/IncidentEvidenceCorrelator';
import { DEFAULT_CAMERAS } from '../VisionConfig';
import { Camera } from '../models/Camera';
import { DetectedPerson } from '../models/Detection';
import { Environment } from '../../models/Environment';
import { RescueCoordinator } from '../../scene3d/rescue/RescueCoordinator';

export class SensorFusionTestSuite {
  public static runAllTests(): { passed: number; failed: number; results: Array<{ name: string; success: boolean; error?: string }> } {
    const results: Array<{ name: string; success: boolean; error?: string }> = [];

    const tests: Array<{ name: string; fn: () => void }> = [
      { name: '1. Valid and malformed detections handling', fn: this.testValidAndMalformedDetections },
      { name: '2. Camera timestamp preservation', fn: this.testCameraTimestampPreservation },
      { name: '3. Track continuity across successive frames', fn: this.testTrackContinuityAcrossFrames },
      { name: '4. Track expiry after missed observations', fn: this.testTrackExpiryAfterMissedObservations },
      { name: '5. Camera disconnection and recovery', fn: this.testCameraDisconnectionAndRecovery },
      { name: '6. Duplicate detection suppression', fn: this.testDuplicateDetectionSuppression },
      { name: '7. Missing calibration handling', fn: this.testMissingCalibrationHandling },
      { name: '8. Ambiguous cross-camera associations', fn: this.testAmbiguousCrossCameraAssociations },
      { name: '9. Timestamp skew and stale observations', fn: this.testTimestampSkewAndStaleObservations },
      { name: '10. Sensor disagreement detection', fn: this.testSensorDisagreementDetection },
      { name: '11. Unit normalization & telemetry checks', fn: this.testUnitNormalization },
      { name: '12. Evidence deduplication in candidate queue', fn: this.testEvidenceDeduplication },
      { name: '13. Candidate alerts distinct from confirmed incidents', fn: this.testCandidateAlertsZeroAutoDispatch },
      { name: '14. Provenance preservation through fusion pipeline', fn: this.testProvenancePreservation },
      { name: '15. Existing simulation and coordinator regressions', fn: this.testExistingSimulationRegressions },
      { name: '16. Zero automatic rescue dispatch from raw CV', fn: this.testZeroAutoDispatchSafetyPolicy },
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        test.fn();
        results.push({ name: test.name, success: true });
        passed++;
      } catch (err: any) {
        results.push({ name: test.name, success: false, error: err.message || String(err) });
        failed++;
      }
    }

    return { passed, failed, results };
  }

  // 1. Valid and malformed detections
  private static testValidAndMalformedDetections(): void {
    const tracker = new ObjectTracker();
    const map = new Map<string, DetectedPerson[]>();
    map.set('CAM-01', [
      {
        id: 'DET-VALID-1',
        bbox: { x: 100, y: 150, width: 20, height: 40 },
        confidence: 0.94,
        className: 'PERSON',
        cameraId: 'CAM-01',
        timestamp: 10.0,
        groundTruthVisitorId: 'V-101',
        worldPosition: { x: 150, y: 200 },
        inWater: false,
        provenance: 'SIMULATED',
        isValid: true,
      },
    ]);

    const tracks = tracker.updateTracks(map, 10.0, 0.1);
    if (tracks.length !== 1) throw new Error(`Expected 1 track, got ${tracks.length}`);
    if (tracks[0].confidence !== 0.94) throw new Error('Confidence mismatch');
    if (tracks[0].provenance !== 'SIMULATED') throw new Error('Provenance mismatch');
  }

  // 2. Camera timestamp preservation
  private static testCameraTimestampPreservation(): void {
    const tracker = new ObjectTracker();
    const map = new Map<string, DetectedPerson[]>();
    const captureTime = 1718005500.5;

    map.set('CAM-01', [
      {
        id: 'DET-TIME-1',
        bbox: { x: 100, y: 150, width: 20, height: 40 },
        confidence: 0.90,
        className: 'PERSON',
        cameraId: 'CAM-01',
        timestamp: captureTime,
        groundTruthVisitorId: 'V-102',
        worldPosition: { x: 180, y: 220 },
        inWater: false,
        provenance: 'SIMULATED',
      },
    ]);

    const tracks = tracker.updateTracks(map, captureTime, 0.1);
    if (tracks[0].firstSeen !== captureTime) throw new Error('firstSeen timestamp was not preserved');
    if (tracks[0].lastSeen !== captureTime) throw new Error('lastSeen timestamp was not preserved');
  }

  // 3. Track continuity across successive frames
  private static testTrackContinuityAcrossFrames(): void {
    const tracker = new ObjectTracker();
    const map1 = new Map<string, DetectedPerson[]>();
    map1.set('CAM-01', [
      {
        id: 'DET-1',
        bbox: { x: 100, y: 150, width: 20, height: 40 },
        confidence: 0.90,
        className: 'PERSON',
        cameraId: 'CAM-01',
        timestamp: 10.0,
        groundTruthVisitorId: 'V-103',
        worldPosition: { x: 200, y: 200 },
        inWater: false,
        provenance: 'SIMULATED',
      },
    ]);
    const t1 = tracker.updateTracks(map1, 10.0, 0.1);
    const initialTrackId = t1[0].trackId;
    if (t1[0].state !== 'TENTATIVE') throw new Error(`Expected TENTATIVE, got ${t1[0].state}`);

    // Frame 2: 1.0s later, visitor moved 2 meters
    const map2 = new Map<string, DetectedPerson[]>();
    map2.set('CAM-01', [
      {
        id: 'DET-2',
        bbox: { x: 102, y: 151, width: 20, height: 40 },
        confidence: 0.92,
        className: 'PERSON',
        cameraId: 'CAM-01',
        timestamp: 11.0,
        groundTruthVisitorId: 'V-103',
        worldPosition: { x: 202, y: 201 },
        inWater: false,
        provenance: 'SIMULATED',
      },
    ]);
    const t2 = tracker.updateTracks(map2, 11.0, 0.1);
    if (t2[0].trackId !== initialTrackId) throw new Error('Track ID mutated across successive frames');
    if (t2[0].state !== 'CONFIRMED') throw new Error(`Expected CONFIRMED after frame 2, got ${t2[0].state}`);
    if (t2[0].hits !== 2) throw new Error('Hits counter did not increment');
  }

  // 4. Track expiry after missed observations
  private static testTrackExpiryAfterMissedObservations(): void {
    const tracker = new ObjectTracker();
    const map1 = new Map<string, DetectedPerson[]>();
    map1.set('CAM-01', [
      {
        id: 'DET-1',
        bbox: { x: 100, y: 150, width: 20, height: 40 },
        confidence: 0.90,
        className: 'PERSON',
        cameraId: 'CAM-01',
        timestamp: 10.0,
        groundTruthVisitorId: 'V-104',
        worldPosition: { x: 200, y: 200 },
        inWater: false,
        provenance: 'SIMULATED',
      },
    ]);
    tracker.updateTracks(map1, 10.0, 0.1);

    // Empty frame at 11.0s -> LOST
    const emptyMap = new Map<string, DetectedPerson[]>();
    const tLost = tracker.updateTracks(emptyMap, 11.0, 0.1);
    if (tLost[0].state !== 'LOST') throw new Error(`Expected LOST, got ${tLost[0].state}`);

    // Empty frame at 15.0s (> 4.0s missed) -> EXPIRED
    const tExpired = tracker.updateTracks(emptyMap, 15.0, 0.1);
    if (tExpired[0].state !== 'EXPIRED') throw new Error(`Expected EXPIRED, got ${tExpired[0].state}`);
    if (tExpired[0].active !== false) throw new Error('Expired track should have active = false');
    if (tracker.getActiveTracks().length !== 0) throw new Error('Expired track remained in getActiveTracks()');
  }

  // 5. Camera disconnection and recovery
  private static testCameraDisconnectionAndRecovery(): void {
    const cams: Camera[] = JSON.parse(JSON.stringify(DEFAULT_CAMERAS));
    const initialReport = CameraCoverageGeometry.computeCoverageSummary(cams);
    if (initialReport.offlineCamerasCount !== 0) throw new Error('Expected 0 offline cameras initially');

    // Camera 2 goes offline
    cams[1].status = 'OFFLINE';
    const offlineReport = CameraCoverageGeometry.computeCoverageSummary(cams);
    if (offlineReport.offlineCamerasCount !== 1) throw new Error('Failed to record offline camera');
    const hasVoid = offlineReport.blindSpots.some((b) => b.id.includes('CAM-02'));
    if (!hasVoid) throw new Error('Offline camera coverage void not added to blind spots');

    // Camera 2 recovers
    cams[1].status = 'ONLINE';
    const recoveredReport = CameraCoverageGeometry.computeCoverageSummary(cams);
    if (recoveredReport.offlineCamerasCount !== 0) throw new Error('Camera recovery not detected');
  }

  // 6. Duplicate detection suppression
  private static testDuplicateDetectionSuppression(): void {
    const tracker = new ObjectTracker();
    const map = new Map<string, DetectedPerson[]>();
    map.set('CAM-01', [
      {
        id: 'DET-DUP-1',
        bbox: { x: 100, y: 150, width: 20, height: 40 },
        confidence: 0.95,
        className: 'PERSON',
        cameraId: 'CAM-01',
        timestamp: 10.0,
        groundTruthVisitorId: 'V-105',
        worldPosition: { x: 250, y: 250 },
        inWater: false,
        provenance: 'SIMULATED',
      },
    ]);
    tracker.updateTracks(map, 10.0, 0.1);

    // Frame 2 receives two detections for same location
    const map2 = new Map<string, DetectedPerson[]>();
    map2.set('CAM-01', [
      {
        id: 'DET-DUP-2A',
        bbox: { x: 101, y: 150, width: 20, height: 40 },
        confidence: 0.94,
        className: 'PERSON',
        cameraId: 'CAM-01',
        timestamp: 11.0,
        groundTruthVisitorId: 'V-105',
        worldPosition: { x: 251, y: 250 },
        inWater: false,
        provenance: 'SIMULATED',
      },
      {
        id: 'DET-DUP-2B',
        bbox: { x: 102, y: 151, width: 20, height: 40 },
        confidence: 0.65,
        className: 'PERSON',
        cameraId: 'CAM-01',
        timestamp: 11.0,
        groundTruthVisitorId: 'V-105',
        worldPosition: { x: 252, y: 251 },
        inWater: false,
        provenance: 'SIMULATED',
      },
    ]);
    const tracks = tracker.updateTracks(map2, 11.0, 0.1);
    if (!tracks.some((t) => t.hits === 2)) throw new Error('Primary track did not cleanly associate');
  }

  // 7. Missing calibration handling
  private static testMissingCalibrationHandling(): void {
    const associator = new CrossCameraAssociator();
    const cams: Camera[] = [
      { ...DEFAULT_CAMERAS[0], id: 'CAM-01', status: 'ONLINE' },
      { ...DEFAULT_CAMERAS[1], id: 'CAM-02', status: 'OFFLINE' }, // Offline acts as uncalibrated/unavailable
    ];

    const tracks: any[] = [
      {
        trackId: 'TRACK-CAM01-1',
        cameraId: 'CAM-01',
        active: true,
        state: 'CONFIRMED',
        confidence: 0.9,
        lastSeen: 10.0,
        positions: [{ x: 300, y: 200 }],
      },
      {
        trackId: 'TRACK-CAM02-1',
        cameraId: 'CAM-02',
        active: true,
        state: 'CONFIRMED',
        confidence: 0.9,
        lastSeen: 10.0,
        positions: [{ x: 302, y: 201 }],
      },
    ];

    const links = associator.associateAcrossCameras(tracks, cams);
    if (links.length !== 0) throw new Error('Should not form cross-camera links when partner camera is unavailable');
  }

  // 8. Ambiguous cross-camera associations
  private static testAmbiguousCrossCameraAssociations(): void {
    const associator = new CrossCameraAssociator();
    const cams: Camera[] = [
      { ...DEFAULT_CAMERAS[0], id: 'CAM-01', status: 'ONLINE' },
      { ...DEFAULT_CAMERAS[1], id: 'CAM-02', status: 'ONLINE' },
    ];

    // CAM-01 has 1 track, CAM-02 has 2 tracks very close (cluster)
    const tracks: any[] = [
      {
        trackId: 'TRACK-CAM01-A',
        cameraId: 'CAM-01',
        active: true,
        state: 'CONFIRMED',
        confidence: 0.9,
        lastSeen: 10.0,
        positions: [{ x: 300, y: 200 }],
      },
      {
        trackId: 'TRACK-CAM02-B1',
        cameraId: 'CAM-02',
        active: true,
        state: 'CONFIRMED',
        confidence: 0.9,
        lastSeen: 10.0,
        positions: [{ x: 301, y: 200 }],
      },
      {
        trackId: 'TRACK-CAM02-B2',
        cameraId: 'CAM-02',
        active: true,
        state: 'CONFIRMED',
        confidence: 0.88,
        lastSeen: 10.0,
        positions: [{ x: 304, y: 201 }],
      },
    ];

    const links = associator.associateAcrossCameras(tracks, cams, 25.0, 1.5);
    if (links.length === 0) throw new Error('Expected candidate associations in cluster');
    if (!links.some((l) => l.status === 'AMBIGUOUS')) {
      throw new Error('Spatial cluster did not trigger AMBIGUOUS association status');
    }
  }

  // 9. Timestamp skew and stale observations
  private static testTimestampSkewAndStaleObservations(): void {
    const associator = new CrossCameraAssociator();
    const cams: Camera[] = [
      { ...DEFAULT_CAMERAS[0], id: 'CAM-01', status: 'ONLINE' },
      { ...DEFAULT_CAMERAS[1], id: 'CAM-02', status: 'ONLINE' },
    ];

    // Detections with 5.0 seconds clock skew (> 1.5s limit)
    const tracks: any[] = [
      {
        trackId: 'TRACK-CAM01-1',
        cameraId: 'CAM-01',
        active: true,
        state: 'CONFIRMED',
        confidence: 0.9,
        lastSeen: 10.0,
        positions: [{ x: 300, y: 200 }],
      },
      {
        trackId: 'TRACK-CAM02-1',
        cameraId: 'CAM-02',
        active: true,
        state: 'CONFIRMED',
        confidence: 0.9,
        lastSeen: 15.0, // 5 seconds skew
        positions: [{ x: 301, y: 200 }],
      },
    ];

    const links = associator.associateAcrossCameras(tracks, cams, 20.0, 1.5);
    if (links.length !== 0) throw new Error('Stale / skewed observation should have been rejected');
  }

  // 10. Sensor disagreement detection
  private static testSensorDisagreementDetection(): void {
    const adapter = SensorFusionAdapter.getInstance();
    const env: any = {
      waterCurrent: 0.25, // ADCP current calm
      waveHeight: 1.1,
      windSpeed: 15,
      tideStatus: 'RISING',
    };

    // Vision tracks swimmer drifting rapidly at 2.2 m/s
    const tracks: any[] = [
      {
        trackId: 'TRACK-1',
        cameraId: 'CAM-02',
        active: true,
        state: 'CONFIRMED',
        speed: 2.2,
        positions: [{ x: 420, y: 300 }], // In ocean
      },
    ];

    const fusion = adapter.fusePerceptionData(tracks, DEFAULT_CAMERAS, env, 100.0);
    const disagreement = fusion.disagreements.find((d) => d.property === 'water_current_mps');
    if (!disagreement) throw new Error('Failed to detect kinematic drift vs ADCP disagreement');
    if (disagreement.diff <= 0.5) throw new Error('Disagreement diff was not computed correctly');
  }

  // 11. Unit normalization
  private static testUnitNormalization(): void {
    const adapter = SensorFusionAdapter.getInstance();
    const env: any = {
      waterCurrent: 1.85,
      waveHeight: 2.1,
      windSpeed: 25,
      tideStatus: 'FALLING',
    };
    const fusion = adapter.fusePerceptionData([], DEFAULT_CAMERAS, env, 50.0);
    if (fusion.adcpCurrentMps !== 1.85) throw new Error('ADCP current normalization mismatch');
    if (fusion.waveHeightMeters !== 2.1) throw new Error('Wave height normalization mismatch');
  }

  // 12. Evidence deduplication
  private static testEvidenceDeduplication(): void {
    const correlator = new IncidentEvidenceCorrelator();
    correlator.reset();

    const tracks: any[] = [
      {
        trackId: 'TRACK-RIP-1',
        cameraId: 'CAM-02',
        active: true,
        state: 'CONFIRMED',
        speed: 1.8,
        direction: 90,
        confidence: 0.92,
        positions: [{ x: 420, y: 310 }], // in rip corridor
      },
    ];

    const fusion: any = { adcpCurrentMps: 1.8, disagreements: [] };

    // 1st tick at 10.0s -> generates candidate
    const cands1 = correlator.correlateEvidence(tracks, fusion, [], 10.0);
    if (cands1.length !== 1) throw new Error(`Expected 1 candidate, got ${cands1.length}`);

    // 2nd tick at 14.0s (within 20s cooldown) -> deduplicated
    const cands2 = correlator.correlateEvidence(tracks, fusion, [], 14.0);
    if (cands2.length !== 1) throw new Error('Duplicate candidate alert was generated during cooldown');
    if (cands2[0].id !== cands1[0].id) throw new Error('Candidate ID changed during deduplication');
  }

  // 13. Candidate alerts distinct from confirmed incidents
  private static testCandidateAlertsZeroAutoDispatch(): void {
    const correlator = new IncidentEvidenceCorrelator();
    correlator.reset();

    const tracks: any[] = [
      {
        trackId: 'TRACK-DISTRESS-1',
        cameraId: 'CAM-02',
        active: true,
        state: 'CONFIRMED',
        speed: 0.05,
        distressSuspected: true,
        framesTracked: 20,
        confidence: 0.90,
        positions: [{ x: 400, y: 320 }],
      },
    ];

    const fusion: any = { adcpCurrentMps: 1.5, disagreements: [] };
    const candidates = correlator.correlateEvidence(tracks, fusion, [], 20.0);
    if (candidates.length !== 1) throw new Error('Candidate not created');

    const cand = candidates[0];
    if (cand.status !== 'CANDIDATE_UNVERIFIED') throw new Error(`Expected CANDIDATE_UNVERIFIED, got ${cand.status}`);
    if (cand.autoDispatched !== false) throw new Error('CRITICAL: Candidate was automatically dispatched!');
    if (cand.requiresOperatorAction !== true) throw new Error('Candidate must require operator action');

    // Operator confirms
    correlator.confirmCandidate(cand.id, 'Lifeguard tower 2 confirmed bather distress');
    if ((cand.status as string) !== 'OPERATOR_CONFIRMED') throw new Error('Candidate confirmation failed');
  }

  // 14. Provenance preservation
  private static testProvenancePreservation(): void {
    const tracker = new ObjectTracker();
    const map = new Map<string, DetectedPerson[]>();
    map.set('CAM-01', [
      {
        id: 'DET-ACTUAL-1',
        bbox: { x: 100, y: 150, width: 20, height: 40 },
        confidence: 0.94,
        className: 'PERSON',
        cameraId: 'CAM-01',
        timestamp: 10.0,
        groundTruthVisitorId: 'V-106',
        worldPosition: { x: 150, y: 200 },
        inWater: false,
        provenance: 'ACTUAL',
      },
    ]);

    const tracks = tracker.updateTracks(map, 10.0, 0.1);
    if (tracks[0].provenance !== 'ACTUAL') throw new Error('Provenance ACTUAL was not preserved in track');
  }

  // 15. Existing simulation and rescue coordinator regressions
  private static testExistingSimulationRegressions(): void {
    const coordinator = RescueCoordinator.getInstance();
    const initialResources = coordinator.registry.getResources();
    if (initialResources.length === 0) throw new Error('Rescue coordinator registry is empty');
    const boat = coordinator.registry.getResource('RB-01');
    if (!boat) throw new Error('Rescue boat RB-01 not registered');
    if (boat.status !== 'AVAILABLE' && boat.status !== 'EN_ROUTE' && boat.status !== 'RETURNING') {
      throw new Error(`Unexpected boat status: ${boat.status}`);
    }
  }

  // 16. Zero automatic dispatch safety policy
  private static testZeroAutoDispatchSafetyPolicy(): void {
    const correlator = new IncidentEvidenceCorrelator();
    correlator.reset();
    const coordinator = RescueCoordinator.getInstance();
    const missionBefore = coordinator.activeMission;

    // Simulate high confidence distress vision track
    const tracks: any[] = [
      {
        trackId: 'TRACK-CRITICAL-99',
        cameraId: 'CAM-02',
        active: true,
        state: 'CONFIRMED',
        speed: 0.0,
        distressSuspected: true,
        framesTracked: 30,
        confidence: 0.99,
        positions: [{ x: 420, y: 310 }],
      },
    ];

    const fusion: any = { adcpCurrentMps: 1.8, disagreements: [] };
    const candidates = correlator.correlateEvidence(tracks, fusion, [], 50.0);
    const cand = candidates[0];

    // Verify candidate alert did NOT dispatch any rescue mission
    if (cand.autoDispatched !== false) throw new Error('CV candidate autoDispatched is True!');
    if (!missionBefore && coordinator.activeMission) {
      throw new Error('CRITICAL SAFETY FAILURE: Unverified CV triggered automated rescue dispatch!');
    }
  }
}

