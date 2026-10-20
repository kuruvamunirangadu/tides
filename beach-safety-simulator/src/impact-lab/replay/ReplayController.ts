/**
 * ReplayController.ts
 * 
 * TIDES Priority 2: Incident Replay Controller
 * 
 * Manages an independent replay-local clock for recorded incident reconstructions.
 * - Completely isolated: Never alters live simulation clock, physics, or visitor states.
 * - Supports incident selection, play, pause, seek, variable speed, and reset.
 * - Computes exact responder kinematics from recorded trajectory breadcrumbs without fabrication.
 * - Explicitly exposes missing lifecycle events and zero-trajectory states.
 */

import { IncidentEventRecorder } from './IncidentEventRecorder';
import {
  ReplayableIncidentDossier,
  ReplayLifecycleEvent,
  ResponderTrackingInfo,
  ResponderBreadcrumb,
} from './types';

export interface InterpolatedResponderState {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number };
  status: string;
  speed: number;
  hasRecordedTrajectory: boolean;
  isInterpolated: boolean;
}

export class ReplayController {
  private static instance: ReplayController | null = null;

  private recorder: IncidentEventRecorder = IncidentEventRecorder.getInstance();
  private selectedIncidentId: string = '';
  private isPlaying: boolean = false;
  private playbackSpeed: number = 1.0;
  private currentSimTime: number = 0;
  private lastTickWallClock: number = 0;
  private timerId: any = null;

  private listeners: Array<() => void> = [];

  public static getInstance(): ReplayController {
    if (!ReplayController.instance) {
      ReplayController.instance = new ReplayController();
    }
    return ReplayController.instance;
  }

  constructor() {
    const incidents = this.recorder.getIncidents();
    if (incidents.length > 0) {
      this.selectedIncidentId = incidents[0].incidentId;
      this.reset();
    }

    // Subscribe to new incidents recorded in live simulation
    this.recorder.subscribe(() => {
      if (!this.selectedIncidentId) {
        const all = this.recorder.getIncidents();
        if (all.length > 0) {
          this.selectIncident(all[0].incidentId);
        }
      }
      this.notify();
    });
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  // ---------------------------------------------------------------------------
  // INCIDENT SELECTION & TIME BOUNDS
  // ---------------------------------------------------------------------------

  public getSelectedIncident(): ReplayableIncidentDossier | null {
    if (!this.selectedIncidentId) return null;
    return this.recorder.getIncident(this.selectedIncidentId) || null;
  }

  public getSelectedIncidentId(): string {
    return this.selectedIncidentId;
  }

  public selectIncident(incidentId: string): void {
    this.pause();
    this.selectedIncidentId = incidentId;
    this.reset();
    this.notify();
  }

  public getMinSimTime(): number {
    const incident = this.getSelectedIncident();
    if (!incident || !incident.events || incident.events.length === 0) return 0;
    return incident.events[0].simTimeSeconds;
  }

  public getMaxSimTime(): number {
    const incident = this.getSelectedIncident();
    if (!incident || !incident.events || incident.events.length === 0) return 100;
    const lastEvent = incident.events[incident.events.length - 1];
    return lastEvent.simTimeSeconds;
  }

  public getCurrentSimTime(): number {
    return this.currentSimTime;
  }

  public getFormattedCurrentTime(): string {
    const incident = this.getSelectedIncident();
    if (!incident) return '00:00:00';

    // Find the closest active event display or format offset
    const active = this.getActiveEvents();
    if (active.length > 0) {
      const latest = active[active.length - 1];
      const delta = Math.max(0, Math.round(this.currentSimTime - latest.simTimeSeconds));
      if (delta === 0) return latest.timeDisplay;
      return `${latest.timeDisplay} (+${delta}s)`;
    }
    return incident.startTimeDisplay || '08:00:00';
  }

  public getProgressFraction(): number {
    const min = this.getMinSimTime();
    const max = this.getMaxSimTime();
    if (max <= min) return 0;
    return Math.min(1, Math.max(0, (this.currentSimTime - min) / (max - min)));
  }

  // ---------------------------------------------------------------------------
  // PLAYBACK CONTROLS (ISOLATED REPLAY-LOCAL CLOCK)
  // ---------------------------------------------------------------------------

  public isPlaybackRunning(): boolean {
    return this.isPlaying;
  }

  public getPlaybackSpeed(): number {
    return this.playbackSpeed;
  }

  public setSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.25, Math.min(10, speed));
    this.notify();
  }

  public play(): void {
    const max = this.getMaxSimTime();
    if (this.currentSimTime >= max) {
      this.currentSimTime = this.getMinSimTime();
    }
    this.isPlaying = true;
    this.lastTickWallClock = performance.now();
    this.startTicker();
    this.notify();
  }

  public pause(): void {
    this.isPlaying = false;
    this.stopTicker();
    this.notify();
  }

  public togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public reset(): void {
    this.pause();
    this.currentSimTime = this.getMinSimTime();
    this.notify();
  }

  public seek(targetSimTime: number): void {
    const min = this.getMinSimTime();
    const max = this.getMaxSimTime();
    this.currentSimTime = Math.min(max, Math.max(min, targetSimTime));
    this.notify();
  }

  public seekToFraction(fraction: number): void {
    const min = this.getMinSimTime();
    const max = this.getMaxSimTime();
    const target = min + fraction * (max - min);
    this.seek(target);
  }

  public seekToEventIndex(index: number): void {
    const incident = this.getSelectedIncident();
    if (!incident || !incident.events || incident.events.length === 0) return;
    const clampedIndex = Math.max(0, Math.min(incident.events.length - 1, index));
    this.seek(incident.events[clampedIndex].simTimeSeconds);
  }

  public stepForward(): void {
    const incident = this.getSelectedIncident();
    if (!incident || !incident.events) return;
    const nextEvent = incident.events.find((e) => e.simTimeSeconds > this.currentSimTime);
    if (nextEvent) {
      this.seek(nextEvent.simTimeSeconds);
    } else {
      this.seek(this.currentSimTime + 5);
    }
  }

  public stepBackward(): void {
    const incident = this.getSelectedIncident();
    if (!incident || !incident.events) return;
    const prevEvents = incident.events.filter((e) => e.simTimeSeconds < this.currentSimTime);
    if (prevEvents.length > 0) {
      this.seek(prevEvents[prevEvents.length - 1].simTimeSeconds);
    } else {
      this.seek(this.getMinSimTime());
    }
  }

  private startTicker(): void {
    this.stopTicker();
    this.timerId = setInterval(() => {
      this.tick();
    }, 50);
  }

  private stopTicker(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private tick(): void {
    if (!this.isPlaying) return;

    const now = performance.now();
    const dtSeconds = (now - this.lastTickWallClock) / 1000;
    this.lastTickWallClock = now;

    // Advance local clock strictly by dt * speed
    const advance = dtSeconds * this.playbackSpeed;
    const nextTime = this.currentSimTime + advance;
    const max = this.getMaxSimTime();

    if (nextTime >= max) {
      this.currentSimTime = max;
      this.pause();
    } else {
      this.currentSimTime = nextTime;
      this.notify();
    }
  }

  // ---------------------------------------------------------------------------
  // EVENT & SCENE QUERY METHODS
  // ---------------------------------------------------------------------------

  public getActiveEvents(): ReplayLifecycleEvent[] {
    const incident = this.getSelectedIncident();
    if (!incident || !incident.events) return [];
    return incident.events.filter((e) => e.simTimeSeconds <= this.currentSimTime);
  }

  public getLatestActiveEvent(): ReplayLifecycleEvent | null {
    const active = this.getActiveEvents();
    if (active.length === 0) return null;
    return active[active.length - 1];
  }

  /**
   * Scene Classification:
   * Scene 1: Incident Detected (Distress onset detected, alert broadcast)
   * Scene 2: Response Dispatched (Responder assigned, departed, underway)
   * Scene 3: Assistance & Resolution (On scene, assistance secured, resolved)
   */
  public getCurrentScene(): 1 | 2 | 3 {
    const incident = this.getSelectedIncident();
    if (!incident || !incident.events) return 1;

    const activeStages = this.getActiveEvents().map((e) => e.eventType);

    if (
      activeStages.includes('RESPONDER_ARRIVED') ||
      activeStages.includes('ASSISTANCE_BEGAN') ||
      activeStages.includes('INCIDENT_RESOLVED')
    ) {
      return 3;
    }

    if (
      activeStages.includes('RESPONDER_ASSIGNED') ||
      activeStages.includes('RESPONDER_DEPARTED')
    ) {
      return 2;
    }

    return 1;
  }

  public getVictimLocation(): { x: number; y: number } | null {
    const incident = this.getSelectedIncident();
    if (!incident) return null;

    // Look for detection coordinates in events
    const detEvent = incident.events.find(
      (e) => e.eventType === 'DISTRESS_DETECTED' || e.eventType === 'HAZARD_OBSERVED'
    );
    if (detEvent && detEvent.coordinates) {
      return detEvent.coordinates;
    }
    return null;
  }

  /**
   * Computes the responder position at the current replay-local timestamp.
   * If a recorded trajectory exists, performs linear interpolation between nearest breadcrumbs.
   * If NO trajectory exists, returns the initial static position without fabricating motion.
   */
  public getInterpolatedResponder(responderId?: string): InterpolatedResponderState | null {
    const incident = this.getSelectedIncident();
    if (!incident || !incident.assignedResponders || incident.assignedResponders.length === 0) {
      return null;
    }

    const responder = responderId
      ? incident.assignedResponders.find((r) => r.id === responderId) || incident.assignedResponders[0]
      : incident.assignedResponders[0];

    if (!responder) return null;

    const trajectory = responder.trajectory;

    // Zero-Fabrication: If no trajectory was recorded, return static assigned position
    if (!trajectory || trajectory.length === 0) {
      return {
        id: responder.id,
        name: responder.name,
        type: responder.type,
        position: { ...responder.position },
        status: responder.status,
        speed: 0,
        hasRecordedTrajectory: false,
        isInterpolated: false,
      };
    }

    // Trajectory exists: find bounding breadcrumbs
    const t = this.currentSimTime;

    // If before first breadcrumb
    if (t <= trajectory[0].simTimeSeconds) {
      return {
        id: responder.id,
        name: responder.name,
        type: responder.type,
        position: { ...trajectory[0].position },
        status: trajectory[0].status || responder.status,
        speed: trajectory[0].speed || 0,
        hasRecordedTrajectory: true,
        isInterpolated: false,
      };
    }

    // If after last breadcrumb
    if (t >= trajectory[trajectory.length - 1].simTimeSeconds) {
      const last = trajectory[trajectory.length - 1];
      return {
        id: responder.id,
        name: responder.name,
        type: responder.type,
        position: { ...last.position },
        status: last.status || responder.status,
        speed: last.speed || 0,
        hasRecordedTrajectory: true,
        isInterpolated: false,
      };
    }

    // Interpolate between two consecutive breadcrumbs
    for (let i = 0; i < trajectory.length - 1; i++) {
      const p1 = trajectory[i];
      const p2 = trajectory[i + 1];

      if (t >= p1.simTimeSeconds && t <= p2.simTimeSeconds) {
        const dt = p2.simTimeSeconds - p1.simTimeSeconds;
        const alpha = dt > 0 ? (t - p1.simTimeSeconds) / dt : 0;

        const posX = p1.position.x + alpha * (p2.position.x - p1.position.x);
        const posY = p1.position.y + alpha * (p2.position.y - p1.position.y);
        const speed = (p1.speed || responder.currentSpeed) * (1 - alpha) + (p2.speed || responder.currentSpeed) * alpha;

        return {
          id: responder.id,
          name: responder.name,
          type: responder.type,
          position: { x: posX, y: posY },
          status: alpha > 0.5 ? p2.status || responder.status : p1.status || responder.status,
          speed,
          hasRecordedTrajectory: true,
          isInterpolated: true,
        };
      }
    }

    return null;
  }
}

