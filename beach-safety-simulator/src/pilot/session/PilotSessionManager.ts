/**
 * PilotSessionManager.ts
 * 
 * TIDES Phase 5: Controlled Field Pilot & Real-World Validation Framework
 * 
 * Manages full lifecycle and auditability of pilot validation sessions:
 * - Session creation, state machine transitions (PLANNED -> READY_FOR_TESTING -> RUNNING -> PAUSED -> COMPLETED)
 * - Required field validation and provenance enforcement
 * - Preflight checklist safety gating integration
 * - Non-volatile event timeline and notes preservation
 */

import { PilotSession, ProvenanceMode, SessionStatus, SessionType } from '../pilot.types';
import { DeviceReadinessManager } from './DeviceReadinessManager';

export interface CreateSessionInput {
  name: string;
  description: string;
  testLocation: string;
  sessionType: SessionType;
  provenanceMode: ProvenanceMode;
  plannedStartTimeMs: number;
  plannedEndTimeMs: number;
  leadOperatorId: string;
  safetySupervisorId: string;
  participatingCameraIds?: string[];
  participatingDroneIds?: string[];
  participatingWristbandIds?: string[];
  participatingGatewayIds?: string[];
  scenarioIds?: string[];
  sessionNotes?: string[];
}

export class PilotSessionManager {
  private static instance: PilotSessionManager | null = null;

  private sessions: Map<string, PilotSession> = new Map();
  private activeSessionId: string | null = null;
  private sessionCounter: number = 100;
  private changeListeners: Set<() => void> = new Set();

  private readinessManager: DeviceReadinessManager;

  public static getInstance(
    readinessManager: DeviceReadinessManager = DeviceReadinessManager.getInstance()
  ): PilotSessionManager {
    if (!PilotSessionManager.instance) {
      PilotSessionManager.instance = new PilotSessionManager(readinessManager);
    }
    return PilotSessionManager.instance;
  }

  constructor(readinessManager: DeviceReadinessManager = DeviceReadinessManager.getInstance()) {
    this.readinessManager = readinessManager;
    this.initializeDefaultSessions();
  }

  public reset(): void {
    this.sessions.clear();
    this.activeSessionId = null;
    this.sessionCounter = 100;
    this.initializeDefaultSessions();
    this.notifyChange();
  }

  public subscribeChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private notifyChange(): void {
    this.changeListeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('Error in PilotSessionManager listener:', err);
      }
    });
  }

  private initializeDefaultSessions(): void {
    const now = Date.now();

    // 1. Benchmark Simulation Session
    this.createSession({
      name: 'Rushikonda Beach Baseline Multi-Hazard Simulation',
      description: 'End-to-end simulated baseline exercising dual rip currents, fixed cameras, aerial drones, and virtual wristband fleet.',
      testLocation: 'Rushikonda Beach Digital Twin (Simulated)',
      sessionType: 'SIMULATION',
      provenanceMode: 'SIMULATED',
      plannedStartTimeMs: now - 3600000,
      plannedEndTimeMs: now + 7200000,
      leadOperatorId: 'OP-SHARMA-01',
      safetySupervisorId: 'SUPV-KUMAR-01',
      participatingCameraIds: ['CAM-01', 'CAM-02'],
      participatingDroneIds: ['DRONE-01', 'DRONE-02'],
      participatingWristbandIds: ['WB-101', 'WB-102', 'WB-103', 'WB-104'],
      participatingGatewayIds: ['GW-TOWER-01', 'GW-COMMAND-02'],
      scenarioIds: ['SCN-01', 'SCN-02', 'SCN-04', 'SCN-05', 'SCN-15'],
      sessionNotes: ['Baseline digital twin pilot session for continuous integration and benchmark logging.'],
    });

    // 2. Controlled Hardware Bench Test Session
    this.createSession({
      name: 'Physical Safety Band & Gateway Radio Bench Drill',
      description: 'Supervised bench evaluation of HW-WB-001 IP68 prototype, SX1262 LoRa link, HMAC auth, and gateway forwarding.',
      testLocation: 'TIDES Coastal Electronics Lab Bench #1',
      sessionType: 'BENCH_TEST',
      provenanceMode: 'HARDWARE',
      plannedStartTimeMs: now,
      plannedEndTimeMs: now + 14400000,
      leadOperatorId: 'TECH-LEAD-01',
      safetySupervisorId: 'QA-INSPECTOR-02',
      participatingCameraIds: ['CAM-01'],
      participatingDroneIds: ['DRONE-01'],
      participatingWristbandIds: ['HW-WB-001'],
      participatingGatewayIds: ['GW-TOWER-01'],
      scenarioIds: ['SCN-01', 'SCN-05', 'SCN-07', 'SCN-08', 'SCN-11'],
      sessionNotes: ['Strict bench containment: zero radio emissions outside permitted IN865 band.'],
    });
  }

  public getAllSessions(): PilotSession[] {
    return Array.from(this.sessions.values());
  }

  public getSession(sessionId: string): PilotSession | undefined {
    return this.sessions.get(sessionId);
  }

  public getActiveSession(): PilotSession | undefined {
    if (!this.activeSessionId) return undefined;
    return this.sessions.get(this.activeSessionId);
  }

  public setActiveSession(sessionId: string): boolean {
    if (this.sessions.has(sessionId)) {
      this.activeSessionId = sessionId;
      this.notifyChange();
      return true;
    }
    return false;
  }

  /**
   * Creates and validates a new pilot validation session
   */
  public createSession(input: CreateSessionInput): {
    success: boolean;
    session?: PilotSession;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!input.name || input.name.trim().length === 0) {
      errors.push('Session name is required');
    }
    if (!input.testLocation || input.testLocation.trim().length === 0) {
      errors.push('Test location is required');
    }
    if (!input.leadOperatorId || input.leadOperatorId.trim().length === 0) {
      errors.push('Lead operator ID is required');
    }
    if (!input.safetySupervisorId || input.safetySupervisorId.trim().length === 0) {
      errors.push('Safety supervisor ID is required');
    }
    if (input.plannedEndTimeMs <= input.plannedStartTimeMs) {
      errors.push('Planned end time must be after planned start time');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    this.sessionCounter++;
    const sessionId = `PLT-SES-${this.sessionCounter}`;

    const session: PilotSession = {
      sessionId,
      name: input.name.trim(),
      description: input.description?.trim() || '',
      testLocation: input.testLocation.trim(),
      sessionType: input.sessionType,
      provenanceMode: input.provenanceMode,
      status: 'PLANNED',
      plannedStartTimeMs: input.plannedStartTimeMs,
      plannedEndTimeMs: input.plannedEndTimeMs,
      leadOperatorId: input.leadOperatorId.trim(),
      safetySupervisorId: input.safetySupervisorId.trim(),
      participatingCameraIds: input.participatingCameraIds || [],
      participatingDroneIds: input.participatingDroneIds || [],
      participatingWristbandIds: input.participatingWristbandIds || [],
      participatingGatewayIds: input.participatingGatewayIds || [],
      scenarioIds: input.scenarioIds || [],
      executedScenarioIds: [],
      traceCorrelationIds: [],
      readinessDossierIds: [],
      environmentalRecordIds: [],
      sessionNotes: input.sessionNotes || [],
      timeline: [
        {
          timestampMs: Date.now(),
          action: 'SESSION_CREATED',
          operatorId: input.leadOperatorId,
          details: `Session created with ${input.scenarioIds?.length || 0} planned scenarios. Type: ${input.sessionType}`,
        },
      ],
    };

    this.sessions.set(sessionId, session);
    if (!this.activeSessionId) {
      this.activeSessionId = sessionId;
    }

    this.notifyChange();
    return { success: true, session, errors: [] };
  }

  /**
   * Transitions session to RUNNING with preflight safety gating check
   */
  public startSession(
    sessionId: string,
    operatorId: string,
    clockMs: number = Date.now()
  ): { success: boolean; errors: string[] } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, errors: [`Session ${sessionId} not found`] };
    }

    if (session.status === 'RUNNING') {
      return { success: true, errors: [] };
    }

    // Safety Gating Check
    const validation = this.readinessManager.validateDeviceReadinessForSession(session);
    if (!validation.canStart) {
      session.timeline.push({
        timestampMs: clockMs,
        action: 'START_BLOCKED_SAFETY_CHECK',
        operatorId,
        details: `Session start blocked by safety preflight: ${validation.reasons.join('; ')}`,
      });
      this.notifyChange();
      return {
        success: false,
        errors: [`Cannot start session: Preflight safety checks failed.`, ...validation.reasons],
      };
    }

    session.status = 'RUNNING';
    if (!session.actualStartTimeMs) {
      session.actualStartTimeMs = clockMs;
    }
    this.activeSessionId = sessionId;

    session.timeline.push({
      timestampMs: clockMs,
      action: 'SESSION_STARTED',
      operatorId,
      details: `Session started in ${session.sessionType} mode. All safety checks passed.`,
    });

    this.notifyChange();
    return { success: true, errors: [] };
  }

  public pauseSession(sessionId: string, operatorId: string, rationale: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'RUNNING') return false;

    session.status = 'PAUSED';
    session.timeline.push({
      timestampMs: Date.now(),
      action: 'SESSION_PAUSED',
      operatorId,
      details: `Session paused: ${rationale}`,
    });

    this.notifyChange();
    return true;
  }

  public completeSession(sessionId: string, operatorId: string, conclusionSummary: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = 'COMPLETED';
    session.actualEndTimeMs = Date.now();
    session.sessionNotes.push(`Conclusion: ${conclusionSummary}`);

    session.timeline.push({
      timestampMs: Date.now(),
      action: 'SESSION_COMPLETED',
      operatorId,
      details: `Session completed. Summary: ${conclusionSummary}`,
    });

    this.notifyChange();
    return true;
  }

  public cancelSession(sessionId: string, operatorId: string, reason: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = 'CANCELLED';
    session.actualEndTimeMs = Date.now();

    session.timeline.push({
      timestampMs: Date.now(),
      action: 'SESSION_CANCELLED',
      operatorId,
      details: `Session cancelled: ${reason}`,
    });

    this.notifyChange();
    return true;
  }

  public appendNote(sessionId: string, note: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.sessionNotes.push(`[${new Date().toLocaleTimeString()}] ${note}`);
    this.notifyChange();
    return true;
  }
}

