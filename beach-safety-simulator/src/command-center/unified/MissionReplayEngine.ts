/**
 * MissionReplayEngine.ts
 * 
 * TIDES — Phase 13: Unified Command Center Dashboard & Mission Replay
 * 
 * Isolated Mission Replay Engine:
 * - Deterministic playback controller: Play, Pause, Resume, Restart, Seek, Speeds (0.5x, 1x, 2x, 5x).
 * - Synchronizes historical event timelines with chronological playback time.
 * - Resolves historical drone positions strictly from recorded telemetry samples.
 * - Gap detection: refuses to invent or fabricate flight paths across missing data.
 * 
 * MANDATORY REPLAY ISOLATION:
 * - Read-only controller.
 * - Zero writes to DroneRegistry, DroneMovementEngine, IncidentManager, or DroneRescueExecutionManager.
 * - Historical events never trigger live dispatch or recovery actions.
 * - Exiting replay cleanly stops timers and restores the live operational view.
 */

import { MissionRecorder } from './MissionRecorder';
import {
  RecordedSession,
  MissionReplayEvent,
  DroneTelemetrySample,
  PlaybackSpeed,
  ReplayPlaybackState,
} from './commandCenter.types';
import { DroneWorld3DPosition } from '../../drones/foundation/drone.types';

export class MissionReplayEngine {
  private static instance: MissionReplayEngine | null = null;

  private recorder: MissionRecorder;
  private isReplayActive: boolean = false;
  private selectedSessionId: string | null = null;
  private isPlaying: boolean = false;
  private playbackSpeed: PlaybackSpeed = 1.0;
  private currentSimTime: number = 0;
  private minSimTime: number = 0;
  private maxSimTime: number = 100;
  private selectedIncidentId: string | null = null;

  private listeners: Set<(state: ReplayPlaybackState) => void> = new Set();
  private playbackTimer: NodeJS.Timeout | null = null;

  public static getInstance(): MissionReplayEngine {
    if (!MissionReplayEngine.instance) {
      MissionReplayEngine.instance = new MissionReplayEngine();
    }
    return MissionReplayEngine.instance;
  }

  constructor(recorder: MissionRecorder = MissionRecorder.getInstance()) {
    this.recorder = recorder;

    // Load first benchmark session by default if available
    const sessions = this.recorder.getAllSessions();
    if (sessions.length > 0) {
      this.selectedSessionId = sessions[0].sessionId;
      this.minSimTime = sessions[0].startTimeSimSeconds;
      this.maxSimTime = sessions[0].endTimeSimSeconds;
      this.currentSimTime = this.minSimTime;
    }

    this.recorder.subscribe(() => {
      if (!this.selectedSessionId) {
        const all = this.recorder.getAllSessions();
        if (all.length > 0) {
          this.loadSession(all[0].sessionId);
        }
      }
      this.notify();
    });
  }

  public subscribe(cb: (state: ReplayPlaybackState) => void): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    const s = this.getState();
    this.listeners.forEach((cb) => {
      try {
        cb(s);
      } catch (err) {
        console.error('MissionReplayEngine listener error:', err);
      }
    });
  }

  // ==========================================================================
  // Replay State & Snapshot Construction
  // ==========================================================================

  public getState(): ReplayPlaybackState {
    const session = this.selectedSessionId
      ? this.recorder.getSession(this.selectedSessionId) ?? null
      : null;

    const events = this.selectedSessionId
      ? this.recorder.getSessionEvents(this.selectedSessionId)
      : [];

    const activeEvents = events.filter((e) => e.simTimeSeconds <= this.currentSimTime);
    const currentEvent = activeEvents.length > 0 ? activeEvents[activeEvents.length - 1] : null;

    const span = Math.max(1, this.maxSimTime - this.minSimTime);
    const progressPercent = Math.max(
      0,
      Math.min(100, ((this.currentSimTime - this.minSimTime) / span) * 100)
    );

    // Resolve historical drone positions from telemetry samples
    const historicalDronePositions = new Map<string, DroneTelemetrySample>();
    const uncertainDrones = new Set<string>();
    const activeRouteWaypoints: DroneWorld3DPosition[] = [];

    if (this.selectedSessionId) {
      const allSamples = this.recorder.getSessionTelemetrySamples(this.selectedSessionId);
      const droneIds = session ? session.droneIds : Array.from(new Set(allSamples.map((s) => s.droneId)));

      for (const droneId of droneIds) {
        const droneSamples = allSamples
          .filter((s) => s.droneId === droneId && s.simTimeSeconds <= this.currentSimTime)
          .sort((a, b) => b.simTimeSeconds - a.simTimeSeconds);

        if (droneSamples.length > 0) {
          const latestSample = droneSamples[0];
          // Check for telemetry gap (> 5 seconds from current time)
          const gap = this.currentSimTime - latestSample.simTimeSeconds;
          if (gap > 5.0) {
            uncertainDrones.add(droneId);
            historicalDronePositions.set(droneId, {
              ...latestSample,
              isPositionUncertain: true,
            });
          } else {
            historicalDronePositions.set(droneId, latestSample);
          }
        }
      }

      // If an incident or event has positions, build active route segments without fabrication
      if (currentEvent && currentEvent.position3D) {
        activeRouteWaypoints.push(currentEvent.position3D);
      }
    }

    return {
      isReplayActive: this.isReplayActive,
      selectedSessionId: this.selectedSessionId,
      selectedSession: session,
      isPlaying: this.isPlaying,
      playbackSpeed: this.playbackSpeed,
      currentSimTime: Number(this.currentSimTime.toFixed(1)),
      minSimTime: this.minSimTime,
      maxSimTime: this.maxSimTime,
      progressPercent: Number(progressPercent.toFixed(1)),
      activeEvents,
      currentEvent,
      historicalDronePositions,
      uncertainDrones,
      activeRouteWaypoints,
      selectedIncidentId: this.selectedIncidentId,
    };
  }

  // ==========================================================================
  // Session Selection & Replay Mode Activation
  // ==========================================================================

  public enterReplay(sessionId?: string): void {
    this.isReplayActive = true;
    if (sessionId) {
      this.loadSession(sessionId);
    } else if (!this.selectedSessionId) {
      const all = this.recorder.getAllSessions();
      if (all.length > 0) {
        this.loadSession(all[0].sessionId);
      }
    }
    this.notify();
  }

  public exitReplay(): void {
    this.pause();
    this.isReplayActive = false;
    this.notify();
  }

  public loadSession(sessionId: string): boolean {
    const session = this.recorder.getSession(sessionId);
    if (!session) return false;

    this.selectedSessionId = sessionId;
    const events = this.recorder.getSessionEvents(sessionId);
    if (events.length > 0) {
      this.minSimTime = events[0].simTimeSeconds;
      this.maxSimTime = Math.max(this.minSimTime + 1, events[events.length - 1].simTimeSeconds);
    } else {
      this.minSimTime = session.startTimeSimSeconds;
      this.maxSimTime = Math.max(this.minSimTime + 1, session.endTimeSimSeconds);
    }

    this.currentSimTime = this.minSimTime;
    this.selectedIncidentId = session.incidentIds[0] || null;
    this.notify();
    return true;
  }

  // ==========================================================================
  // Playback Controls
  // ==========================================================================

  public play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    // If reached max, loop to start
    if (this.currentSimTime >= this.maxSimTime) {
      this.currentSimTime = this.minSimTime;
    }

    this.startClock();
    this.notify();
  }

  public pause(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.stopClock();
    this.notify();
  }

  public togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public restart(): void {
    this.pause();
    this.currentSimTime = this.minSimTime;
    this.notify();
  }

  public setPlaybackSpeed(speed: PlaybackSpeed): void {
    this.playbackSpeed = speed;
    if (this.isPlaying) {
      this.stopClock();
      this.startClock();
    }
    this.notify();
  }

  public seekToSimTime(simTime: number): void {
    this.currentSimTime = Math.max(this.minSimTime, Math.min(this.maxSimTime, simTime));
    this.notify();
  }

  public seekToPercent(percent: number): void {
    const span = this.maxSimTime - this.minSimTime;
    const target = this.minSimTime + (span * (percent / 100));
    this.seekToSimTime(target);
  }

  public stepForward(stepSeconds: number = 2.0): void {
    this.seekToSimTime(this.currentSimTime + stepSeconds);
  }

  public stepBackward(stepSeconds: number = 2.0): void {
    this.seekToSimTime(this.currentSimTime - stepSeconds);
  }

  public jumpToEvent(eventId: string): void {
    if (!this.selectedSessionId) return;
    const events = this.recorder.getSessionEvents(this.selectedSessionId);
    const target = events.find((e) => e.eventId === eventId);
    if (target) {
      this.seekToSimTime(target.simTimeSeconds);
    }
  }

  // ==========================================================================
  // Update Loop (Driven by 60 FPS Three.js animate cycle or interval)
  // ==========================================================================

  public update(deltaSec: number): void {
    if (!this.isReplayActive || !this.isPlaying) return;

    const advance = deltaSec * this.playbackSpeed;
    this.currentSimTime += advance;

    if (this.currentSimTime >= this.maxSimTime) {
      this.currentSimTime = this.maxSimTime;
      this.pause();
    }

    this.notify();
  }

  private startClock(): void {
    this.stopClock();
    // Fallback interval clock at 10 Hz when not driven by Three.js loop
    this.playbackTimer = setInterval(() => {
      this.update(0.1);
    }, 100);
  }

  private stopClock(): void {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  public destroy(): void {
    this.stopClock();
    this.listeners.clear();
  }
}

