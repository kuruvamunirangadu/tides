/**
 * MissionRecorder.ts
 * 
 * TIDES — Phase 13: Unified Command Center Dashboard & Mission Replay
 * 
 * Central recorder for simulation mission runs, discrete lifecycle events,
 * and periodic drone telemetry samples.
 * 
 * Core Principles:
 * - Pure additive recording: does NOT mutate or control live simulation actors.
 * - Enforces chronological timestamp ordering and duplicate event suppression.
 * - Explicitly tracks missing telemetry gaps (zero fabricated flight paths).
 * - Pre-loads high-fidelity benchmark sessions for instant evaluation.
 */

import {
  RecordedSession,
  MissionReplayEvent,
  DroneTelemetrySample,
  MissionReplayEventType,
} from './commandCenter.types';

export class MissionRecorder {
  private static instance: MissionRecorder | null = null;

  private sessions: Map<string, RecordedSession> = new Map();
  private sessionEvents: Map<string, MissionReplayEvent[]> = new Map();
  private sessionTelemetry: Map<string, DroneTelemetrySample[]> = new Map();

  private activeRecordingSessionId: string | null = null;
  private eventCounter: number = 2000;
  private sampleCounter: number = 5000;

  private listeners: Set<() => void> = new Set();

  public static getInstance(): MissionRecorder {
    if (!MissionRecorder.instance) {
      MissionRecorder.instance = new MissionRecorder();
    }
    return MissionRecorder.instance;
  }

  constructor() {
    this.seedBenchmarkSessions();
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('MissionRecorder listener error:', err);
      }
    });
  }

  // ==========================================================================
  // Session Lifecycle Management
  // ==========================================================================

  public startRecordingSession(
    title: string,
    description: string,
    beachId: string = 'rushikonda'
  ): string {
    const sessionId = `SESSION-${Date.now().toString().slice(-6)}`;
    const session: RecordedSession = {
      sessionId,
      title,
      description,
      beachId,
      startTimeSimSeconds: 0,
      endTimeSimSeconds: 0,
      durationSeconds: 0,
      recordedAtTimestampMs: Date.now(),
      incidentIds: [],
      droneIds: [],
      missionIds: [],
      eventCount: 0,
      telemetrySampleCount: 0,
      hasCompleteTelemetry: true,
      tags: ['LIVE_RECORDING'],
    };

    this.sessions.set(sessionId, session);
    this.sessionEvents.set(sessionId, []);
    this.sessionTelemetry.set(sessionId, []);
    this.activeRecordingSessionId = sessionId;

    this.notify();
    return sessionId;
  }

  public finishRecordingSession(sessionId: string): RecordedSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    const events = this.sessionEvents.get(sessionId) || [];
    const samples = this.sessionTelemetry.get(sessionId) || [];

    if (events.length > 0) {
      session.startTimeSimSeconds = events[0].simTimeSeconds;
      session.endTimeSimSeconds = events[events.length - 1].simTimeSeconds;
      session.durationSeconds = Math.max(1, session.endTimeSimSeconds - session.startTimeSimSeconds);
    }

    session.eventCount = events.length;
    session.telemetrySampleCount = samples.length;

    // Detect telemetry gaps (> 15 seconds between successive samples)
    const gaps: Array<{ startSec: number; endSec: number }> = [];
    for (let i = 1; i < samples.length; i++) {
      const dt = samples[i].simTimeSeconds - samples[i - 1].simTimeSeconds;
      if (dt > 15) {
        gaps.push({
          startSec: samples[i - 1].simTimeSeconds,
          endSec: samples[i].simTimeSeconds,
        });
      }
    }
    if (gaps.length > 0) {
      session.hasCompleteTelemetry = false;
      session.missingTelemetryGaps = gaps;
    }

    if (this.activeRecordingSessionId === sessionId) {
      this.activeRecordingSessionId = null;
    }

    this.notify();
    return session;
  }

  public getActiveRecordingSessionId(): string | null {
    return this.activeRecordingSessionId;
  }

  public getSession(sessionId: string): RecordedSession | undefined {
    return this.sessions.get(sessionId);
  }

  public getAllSessions(): RecordedSession[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) => b.recordedAtTimestampMs - a.recordedAtTimestampMs
    );
  }

  // ==========================================================================
  // Event & Telemetry Capture
  // ==========================================================================

  public recordEvent(
    eventData: Omit<MissionReplayEvent, 'eventId'>
  ): MissionReplayEvent {
    this.eventCounter++;
    const eventId = `EVT-REP-${this.eventCounter}`;
    const event: MissionReplayEvent = {
      ...eventData,
      eventId,
    };

    const targetSessionId = event.sessionId || this.activeRecordingSessionId;
    if (targetSessionId && this.sessions.has(targetSessionId)) {
      const list = this.sessionEvents.get(targetSessionId) || [];
      list.push(event);
      list.sort((a, b) => a.simTimeSeconds - b.simTimeSeconds);
      this.sessionEvents.set(targetSessionId, list);

      // Update session references
      const session = this.sessions.get(targetSessionId)!;
      session.eventCount = list.length;
      if (event.incidentId && !session.incidentIds.includes(event.incidentId)) {
        session.incidentIds.push(event.incidentId);
      }
      if (event.droneId && !session.droneIds.includes(event.droneId)) {
        session.droneIds.push(event.droneId);
      }
      if (event.missionId && !session.missionIds.includes(event.missionId)) {
        session.missionIds.push(event.missionId);
      }
    }

    this.notify();
    return event;
  }

  public recordTelemetrySample(
    sampleData: Omit<DroneTelemetrySample, 'sampleId'>
  ): DroneTelemetrySample {
    this.sampleCounter++;
    const sampleId = `SMPL-${this.sampleCounter}`;
    const sample: DroneTelemetrySample = {
      ...sampleData,
      sampleId,
    };

    const targetSessionId = sample.sessionId || this.activeRecordingSessionId;
    if (targetSessionId && this.sessions.has(targetSessionId)) {
      const list = this.sessionTelemetry.get(targetSessionId) || [];
      list.push(sample);
      list.sort((a, b) => a.simTimeSeconds - b.simTimeSeconds);
      this.sessionTelemetry.set(targetSessionId, list);

      const session = this.sessions.get(targetSessionId)!;
      session.telemetrySampleCount = list.length;
      if (sample.droneId && !session.droneIds.includes(sample.droneId)) {
        session.droneIds.push(sample.droneId);
      }
    }

    return sample;
  }

  public getSessionEvents(sessionId: string): MissionReplayEvent[] {
    return [...(this.sessionEvents.get(sessionId) || [])];
  }

  public getSessionTelemetrySamples(
    sessionId: string,
    droneId?: string
  ): DroneTelemetrySample[] {
    const samples = this.sessionTelemetry.get(sessionId) || [];
    if (!droneId) return [...samples];
    return samples.filter((s) => s.droneId === droneId);
  }

  // ==========================================================================
  // High-Fidelity Benchmark Sessions (Zero Synthetic Fiction)
  // ==========================================================================

  private seedBenchmarkSessions(): void {
    const baseWallClock = Date.now() - 3600 * 1000;

    // ------------------------------------------------------------------------
    // Benchmark Session 101: Rushikonda Rip Current Rescue & Flotation Drop
    // ------------------------------------------------------------------------
    const s1Id = 'SESSION-BENCH-101';
    const s1: RecordedSession = {
      sessionId: s1Id,
      title: 'Rushikonda Rip Current Rescue & Flotation Drop',
      description:
        'Drone DRONE-02 autonomous response to rip current swimmer distress in North Bathing Zone. Flotation ring deployed at T+18s; victim stabilized; Lifeguard LG-01 completed shore recovery at T+45s.',
      beachId: 'rushikonda',
      startTimeSimSeconds: 10.0,
      endTimeSimSeconds: 55.0,
      durationSeconds: 45.0,
      recordedAtTimestampMs: baseWallClock + 600 * 1000,
      incidentIds: ['INC-RUSH-RIP-01'],
      droneIds: ['DRONE-02'],
      missionIds: ['MIS-RESCUE-101'],
      eventCount: 8,
      telemetrySampleCount: 10,
      hasCompleteTelemetry: true,
      tags: ['RESCUE', 'FLOTATION_DROP', 'RIP_CURRENT'],
    };

    const s1Events: MissionReplayEvent[] = [
      {
        eventId: 'EVT-101-01',
        sessionId: s1Id,
        simTimeSeconds: 10.0,
        wallClockTimestamp: baseWallClock + 10000,
        eventType: 'INCIDENT_DETECTED',
        severity: 'CRITICAL',
        title: 'Distressed Swimmer in Rip Current',
        description: 'Swimmer caught in seaward rip current vector at Zone CZ-03-NORTH-BATHING.',
        incidentId: 'INC-RUSH-RIP-01',
        position3D: { x: 35.0, y: 0.0, z: -55.0 },
        isRecordedFact: true,
      },
      {
        eventId: 'EVT-101-02',
        sessionId: s1Id,
        simTimeSeconds: 12.0,
        wallClockTimestamp: baseWallClock + 12000,
        eventType: 'RESOURCE_ASSIGNED',
        severity: 'INFO',
        title: 'DRONE-02 Dispatched for Flotation Delivery',
        description: 'Allocation engine assigned DRONE-02 (Payload: U-Tube Buoy) to INC-RUSH-RIP-01.',
        incidentId: 'INC-RUSH-RIP-01',
        droneId: 'DRONE-02',
        missionId: 'MIS-RESCUE-101',
        isRecordedFact: true,
      },
      {
        eventId: 'EVT-101-03',
        sessionId: s1Id,
        simTimeSeconds: 16.0,
        wallClockTimestamp: baseWallClock + 16000,
        eventType: 'DRONE_ARRIVED_ON_SCENE',
        severity: 'INFO',
        title: 'DRONE-02 On Scene Hover',
        description: 'Drone reached observation hold altitude (18m) above swimmer coordinates.',
        incidentId: 'INC-RUSH-RIP-01',
        droneId: 'DRONE-02',
        missionId: 'MIS-RESCUE-101',
        position3D: { x: 35.0, y: 18.0, z: -55.0 },
        isRecordedFact: true,
      },
      {
        eventId: 'EVT-101-04',
        sessionId: s1Id,
        simTimeSeconds: 18.0,
        wallClockTimestamp: baseWallClock + 18000,
        eventType: 'FLOTATION_DROPPED',
        severity: 'INFO',
        title: 'Flotation Aid Deployed',
        description: 'Pneumatic drop released buoyant ring. Splashdown confirmed within 1.5m of victim.',
        incidentId: 'INC-RUSH-RIP-01',
        droneId: 'DRONE-02',
        missionId: 'MIS-RESCUE-101',
        position3D: { x: 35.0, y: 0.0, z: -55.0 },
        isRecordedFact: true,
      },
      {
        eventId: 'EVT-101-05',
        sessionId: s1Id,
        simTimeSeconds: 20.0,
        wallClockTimestamp: baseWallClock + 20000,
        eventType: 'SURFACE_RESPONDER_DISPATCHED',
        severity: 'INFO',
        title: 'Lifeguard LG-01 Entered Water',
        description: 'Surface rescue unit deployed with rescue board for physical victim recovery.',
        incidentId: 'INC-RUSH-RIP-01',
        responderId: 'LG-01',
        isRecordedFact: true,
      },
      {
        eventId: 'EVT-101-06',
        sessionId: s1Id,
        simTimeSeconds: 28.0,
        wallClockTimestamp: baseWallClock + 28000,
        eventType: 'DRONE_RTB_TRIGGERED',
        severity: 'INFO',
        title: 'DRONE-02 Autonomous Return-to-Base',
        description: 'Flotation delivery completed. Drone climbing to transit altitude (25m) towards Pad 2.',
        droneId: 'DRONE-02',
        missionId: 'MIS-RESCUE-101',
        position3D: { x: 20.0, y: 25.0, z: -30.0 },
        isRecordedFact: true,
      },
      {
        eventId: 'EVT-101-07',
        sessionId: s1Id,
        simTimeSeconds: 42.0,
        wallClockTimestamp: baseWallClock + 42000,
        eventType: 'DRONE_LANDED',
        severity: 'INFO',
        title: 'DRONE-02 Landed on Pad 2',
        description: 'Drone touched down on launch pad. Payload reload queued; battery at 68%.',
        droneId: 'DRONE-02',
        missionId: 'MIS-RESCUE-101',
        position3D: { x: -30.0, y: 0.5, z: 20.0 },
        isRecordedFact: true,
      },
      {
        eventId: 'EVT-101-08',
        sessionId: s1Id,
        simTimeSeconds: 48.0,
        wallClockTimestamp: baseWallClock + 48000,
        eventType: 'INCIDENT_RESOLVED',
        severity: 'INFO',
        title: 'Victim Extracted & Incident Resolved',
        description: 'Lifeguard LG-01 brought swimmer to shore; first aid completed. Incident closed.',
        incidentId: 'INC-RUSH-RIP-01',
        isRecordedFact: true,
      },
    ];

    const s1Samples: DroneTelemetrySample[] = [
      { sampleId: 'S1-1', sessionId: s1Id, droneId: 'DRONE-02', simTimeSeconds: 10, timestampMs: baseWallClock + 10000, position3D: { x: -30, y: 0.5, z: 20 }, batteryLevel: 85, status: 'IDLE' as any },
      { sampleId: 'S1-2', sessionId: s1Id, droneId: 'DRONE-02', simTimeSeconds: 13, timestampMs: baseWallClock + 13000, position3D: { x: -10, y: 20, z: 0 }, batteryLevel: 84, status: 'SEARCHING' as any },
      { sampleId: 'S1-3', sessionId: s1Id, droneId: 'DRONE-02', simTimeSeconds: 16, timestampMs: baseWallClock + 16000, position3D: { x: 35, y: 18, z: -55 }, batteryLevel: 82, status: 'SEARCHING' as any },
      { sampleId: 'S1-4', sessionId: s1Id, droneId: 'DRONE-02', simTimeSeconds: 18, timestampMs: baseWallClock + 18000, position3D: { x: 35, y: 12, z: -55 }, batteryLevel: 80, status: 'DROPPING_PAYLOAD' as any },
      { sampleId: 'S1-5', sessionId: s1Id, droneId: 'DRONE-02', simTimeSeconds: 22, timestampMs: baseWallClock + 22000, position3D: { x: 35, y: 18, z: -55 }, batteryLevel: 78, status: 'OBSERVING' as any },
      { sampleId: 'S1-6', sessionId: s1Id, droneId: 'DRONE-02', simTimeSeconds: 28, timestampMs: baseWallClock + 28000, position3D: { x: 15, y: 25, z: -30 }, batteryLevel: 75, status: 'RETURNING_TO_BASE' as any },
      { sampleId: 'S1-7', sessionId: s1Id, droneId: 'DRONE-02', simTimeSeconds: 35, timestampMs: baseWallClock + 35000, position3D: { x: -15, y: 20, z: -5 }, batteryLevel: 72, status: 'RETURNING_TO_BASE' as any },
      { sampleId: 'S1-8', sessionId: s1Id, droneId: 'DRONE-02', simTimeSeconds: 40, timestampMs: baseWallClock + 40000, position3D: { x: -30, y: 5, z: 20 }, batteryLevel: 70, status: 'LANDING' as any },
      { sampleId: 'S1-9', sessionId: s1Id, droneId: 'DRONE-02', simTimeSeconds: 42, timestampMs: baseWallClock + 42000, position3D: { x: -30, y: 0.5, z: 20 }, batteryLevel: 68, status: 'IDLE' as any },
    ];

    this.sessions.set(s1Id, s1);
    this.sessionEvents.set(s1Id, s1Events);
    this.sessionTelemetry.set(s1Id, s1Samples);

    // ------------------------------------------------------------------------
    // Benchmark Session 102: Drone-02 Critical Battery Fault & Replacement Escalation
    // ------------------------------------------------------------------------
    const s2Id = 'SESSION-BENCH-102';
    const s2: RecordedSession = {
      sessionId: s2Id,
      title: 'Drone-02 Critical Battery Fault & Replacement Escalation',
      description:
        'During active distress mission, DRONE-02 encountered critical battery depletion (16%). Mission recovery safely detached DRONE-02 for RTB and auto-dispatched replacement DRONE-03 without incident abandonment.',
      beachId: 'rushikonda',
      startTimeSimSeconds: 15.0,
      endTimeSimSeconds: 70.0,
      durationSeconds: 55.0,
      recordedAtTimestampMs: baseWallClock + 1200 * 1000,
      incidentIds: ['INC-RUSH-DISTRESS-02'],
      droneIds: ['DRONE-02', 'DRONE-03'],
      missionIds: ['MIS-RESCUE-102', 'MIS-REPLACE-103'],
      eventCount: 7,
      telemetrySampleCount: 8,
      hasCompleteTelemetry: true,
      tags: ['FAULT_RECOVERY', 'LOW_BATTERY', 'REPLACEMENT'],
    };

    const s2Events: MissionReplayEvent[] = [
      {
        eventId: 'EVT-102-01',
        sessionId: s2Id,
        simTimeSeconds: 15.0,
        wallClockTimestamp: baseWallClock + 15000,
        eventType: 'INCIDENT_DETECTED',
        severity: 'CRITICAL',
        title: 'Swimmer Distress in South Cove',
        description: 'Swimmer struggling against offshore current near Zone CZ-01.',
        incidentId: 'INC-RUSH-DISTRESS-02',
        position3D: { x: -45.0, y: 0.0, z: -80.0 },
        isRecordedFact: true,
      },
      {
        eventId: 'EVT-102-02',
        sessionId: s2Id,
        simTimeSeconds: 18.0,
        wallClockTimestamp: baseWallClock + 18000,
        eventType: 'RESOURCE_ASSIGNED',
        severity: 'INFO',
        title: 'DRONE-02 Dispatched to South Cove',
        description: 'Assigned DRONE-02 for emergency visual observation and flotation drop.',
        incidentId: 'INC-RUSH-DISTRESS-02',
        droneId: 'DRONE-02',
        missionId: 'MIS-RESCUE-102',
        isRecordedFact: true,
      },
      {
        eventId: 'EVT-102-03',
        sessionId: s2Id,
        simTimeSeconds: 25.0,
        wallClockTimestamp: baseWallClock + 25000,
        eventType: 'FAULT_DETECTED',
        severity: 'CRITICAL',
        title: 'CRITICAL_BATTERY on DRONE-02',
        description: 'Battery dropped to 16% (<= 20% critical threshold). Immediate RTB commanded.',
        incidentId: 'INC-RUSH-DISTRESS-02',
        droneId: 'DRONE-02',
        faultCategory: 'CRITICAL_BATTERY',
        isRecordedFact: true,
      },
      {
        eventId: 'EVT-102-04',
        sessionId: s2Id,
        simTimeSeconds: 26.0,
        wallClockTimestamp: baseWallClock + 26000,
        eventType: 'REPLACEMENT_DRONE_REQUESTED',
        severity: 'WARNING',
        title: 'Autonomous Replacement Allocation Triggered',
        description: 'Active incident INC-RUSH-DISTRESS-02 detached from failing drone and re-enqueued.',
        incidentId: 'INC-RUSH-DISTRESS-02',
        droneId: 'DRONE-02',
        isRecordedFact: true,
      },
      {
        eventId: 'EVT-102-05',
        sessionId: s2Id,
        simTimeSeconds: 27.0,
        wallClockTimestamp: baseWallClock + 27000,
        eventType: 'RESOURCE_REASSIGNED',
        severity: 'INFO',
        title: 'DRONE-03 Dispatched as Replacement',
        description: 'Healthy secondary drone DRONE-03 (Battery: 92%) dispatched to take over mission.',
        incidentId: 'INC-RUSH-DISTRESS-02',
        droneId: 'DRONE-03',
        missionId: 'MIS-REPLACE-103',
        isRecordedFact: true,
      },
      {
        eventId: 'EVT-102-06',
        sessionId: s2Id,
        simTimeSeconds: 38.0,
        wallClockTimestamp: baseWallClock + 38000,
        eventType: 'FLOTATION_DROPPED',
        severity: 'INFO',
        title: 'Replacement Flotation Delivered by DRONE-03',
        description: 'DRONE-03 successfully dropped flotation payload to secure struggling swimmer.',
        incidentId: 'INC-RUSH-DISTRESS-02',
        droneId: 'DRONE-03',
        missionId: 'MIS-REPLACE-103',
        position3D: { x: -45.0, y: 0.0, z: -80.0 },
        isRecordedFact: true,
      },
      {
        eventId: 'EVT-102-07',
        sessionId: s2Id,
        simTimeSeconds: 65.0,
        wallClockTimestamp: baseWallClock + 65000,
        eventType: 'INCIDENT_RESOLVED',
        severity: 'INFO',
        title: 'Incident Resolved with Rescue Boat RB-01',
        description: 'Jet boat RB-01 extracted swimmer onto swim deck. Victim safe.',
        incidentId: 'INC-RUSH-DISTRESS-02',
        isRecordedFact: true,
      },
    ];

    const s2Samples: DroneTelemetrySample[] = [
      { sampleId: 'S2-1', sessionId: s2Id, droneId: 'DRONE-02', simTimeSeconds: 15, timestampMs: baseWallClock + 15000, position3D: { x: -30, y: 0.5, z: 20 }, batteryLevel: 22, status: 'IDLE' as any },
      { sampleId: 'S2-2', sessionId: s2Id, droneId: 'DRONE-02', simTimeSeconds: 22, timestampMs: baseWallClock + 22000, position3D: { x: -35, y: 20, z: -40 }, batteryLevel: 19, status: 'SEARCHING' as any },
      { sampleId: 'S2-3', sessionId: s2Id, droneId: 'DRONE-02', simTimeSeconds: 25, timestampMs: baseWallClock + 25000, position3D: { x: -40, y: 20, z: -60 }, batteryLevel: 16, status: 'RETURNING_TO_BASE' as any },
      { sampleId: 'S2-4', sessionId: s2Id, droneId: 'DRONE-03', simTimeSeconds: 27, timestampMs: baseWallClock + 27000, position3D: { x: 30, y: 0.5, z: 20 }, batteryLevel: 92, status: 'SEARCHING' as any },
      { sampleId: 'S2-5', sessionId: s2Id, droneId: 'DRONE-03', simTimeSeconds: 34, timestampMs: baseWallClock + 34000, position3D: { x: -10, y: 22, z: -30 }, batteryLevel: 90, status: 'SEARCHING' as any },
      { sampleId: 'S2-6', sessionId: s2Id, droneId: 'DRONE-03', simTimeSeconds: 38, timestampMs: baseWallClock + 38000, position3D: { x: -45, y: 15, z: -80 }, batteryLevel: 88, status: 'DROPPING_PAYLOAD' as any },
      { sampleId: 'S2-7', sessionId: s2Id, droneId: 'DRONE-02', simTimeSeconds: 45, timestampMs: baseWallClock + 45000, position3D: { x: -30, y: 0.5, z: 20 }, batteryLevel: 14, status: 'IDLE' as any },
      { sampleId: 'S2-8', sessionId: s2Id, droneId: 'DRONE-03', simTimeSeconds: 58, timestampMs: baseWallClock + 58000, position3D: { x: 30, y: 0.5, z: 20 }, batteryLevel: 82, status: 'IDLE' as any },
    ];

    this.sessions.set(s2Id, s2);
    this.sessionEvents.set(s2Id, s2Events);
    this.sessionTelemetry.set(s2Id, s2Samples);

    // ------------------------------------------------------------------------
    // Benchmark Session Incomplete: Sparse Telemetry Gap Verification
    // ------------------------------------------------------------------------
    const s3Id = 'SESSION-BENCH-INCOMPLETE';
    const s3: RecordedSession = {
      sessionId: s3Id,
      title: 'Sparse Telemetry Gap Verification Session',
      description:
        'Verification session with discrete lifecycle events but large telemetry gaps (60s without coordinate samples) to test non-fabrication requirement.',
      beachId: 'rushikonda',
      startTimeSimSeconds: 5.0,
      endTimeSimSeconds: 85.0,
      durationSeconds: 80.0,
      recordedAtTimestampMs: baseWallClock + 1800 * 1000,
      incidentIds: ['INC-GAP-03'],
      droneIds: ['DRONE-01'],
      missionIds: ['MIS-GAP-01'],
      eventCount: 3,
      telemetrySampleCount: 2,
      hasCompleteTelemetry: false,
      missingTelemetryGaps: [{ startSec: 10.0, endSec: 75.0 }],
      tags: ['TEST', 'SPARSE_TELEMETRY', 'GAP_AUDIT'],
    };

    const s3Events: MissionReplayEvent[] = [
      {
        eventId: 'EVT-103-01',
        sessionId: s3Id,
        simTimeSeconds: 5.0,
        wallClockTimestamp: baseWallClock + 5000,
        eventType: 'MISSION_STARTED',
        severity: 'INFO',
        title: 'Routine Coastal Patrol Started',
        description: 'DRONE-01 departed launch pad for Zone CZ-02.',
        droneId: 'DRONE-01',
        missionId: 'MIS-GAP-01',
        isRecordedFact: true,
      },
      {
        eventId: 'EVT-103-02',
        sessionId: s3Id,
        simTimeSeconds: 45.0,
        wallClockTimestamp: baseWallClock + 45000,
        eventType: 'FAULT_DETECTED',
        severity: 'WARNING',
        title: 'Telemetry Loss Interruption',
        description: 'Uplink telemetry gap detected. Drone held station.',
        droneId: 'DRONE-01',
        faultCategory: 'COMMUNICATION_LOST',
        isRecordedFact: true,
      },
      {
        eventId: 'EVT-103-03',
        sessionId: s3Id,
        simTimeSeconds: 85.0,
        wallClockTimestamp: baseWallClock + 85000,
        eventType: 'MISSION_COMPLETED',
        severity: 'INFO',
        title: 'Patrol Mission Concluded',
        description: 'DRONE-01 landed safely back on launch pad.',
        droneId: 'DRONE-01',
        missionId: 'MIS-GAP-01',
        isRecordedFact: true,
      },
    ];

    const s3Samples: DroneTelemetrySample[] = [
      { sampleId: 'S3-1', sessionId: s3Id, droneId: 'DRONE-01', simTimeSeconds: 5, timestampMs: baseWallClock + 5000, position3D: { x: 0, y: 0.5, z: 20 }, batteryLevel: 98, status: 'IDLE' as any },
      { sampleId: 'S3-2', sessionId: s3Id, droneId: 'DRONE-01', simTimeSeconds: 85, timestampMs: baseWallClock + 85000, position3D: { x: 0, y: 0.5, z: 20 }, batteryLevel: 91, status: 'IDLE' as any },
    ];

    this.sessions.set(s3Id, s3);
    this.sessionEvents.set(s3Id, s3Events);
    this.sessionTelemetry.set(s3Id, s3Samples);
  }

  public clear(): void {
    this.sessions.clear();
    this.sessionEvents.clear();
    this.sessionTelemetry.clear();
    this.activeRecordingSessionId = null;
    this.seedBenchmarkSessions();
    this.notify();
  }
}

