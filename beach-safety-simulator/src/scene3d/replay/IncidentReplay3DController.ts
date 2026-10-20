import { IncidentEventRecorder } from '../../impact-lab/replay/IncidentEventRecorder';
import { ReplayableIncidentDossier, ReplayLifecycleEvent } from '../../impact-lab/replay/types';
import { ReplayState3D, SimulationViewMode } from './replay.types';

/**
 * IncidentReplay3DController.ts
 * 
 * Manages 3D Incident Replay for Milestone 5:
 * - Strict Read-Only isolation:
 *   - NEVER mutates live VisitorEngine or HazardEngine
 *   - NEVER dispatches live rescue fleet
 *   - NEVER triggers real-time emergency sirens
 * - Provides deterministic playback, seeking, and chronological event stepping
 * - Jumping to milestone stages: Distress, Alert, Dispatch, Arrival, Assistance, Resolution
 * - Exiting replay mode cleanly restores live 3D view without resetting live simulation
 */
export class IncidentReplay3DController {
  private static instance: IncidentReplay3DController | null = null;

  public viewMode: SimulationViewMode = 'LIVE';
  private selectedIncidentId: string = '';
  private isPlaying: boolean = false;
  private playbackSpeed: number = 1.0;
  private currentSimTime: number = 0;
  private lastWallClock: number = 0;

  private recorder: IncidentEventRecorder = IncidentEventRecorder.getInstance();
  private listeners: Set<(state: ReplayState3D) => void> = new Set();

  public static getInstance(): IncidentReplay3DController {
    if (!IncidentReplay3DController.instance) {
      IncidentReplay3DController.instance = new IncidentReplay3DController();
    }
    return IncidentReplay3DController.instance;
  }

  constructor() {
    const incidents = this.recorder.getIncidents();
    if (incidents.length > 0) {
      this.selectedIncidentId = incidents[0].incidentId;
      this.currentSimTime = incidents[0].onsetSimTime;
    }

    this.recorder.subscribe(() => {
      if (!this.selectedIncidentId) {
        const all = this.recorder.getIncidents();
        if (all.length > 0) {
          this.selectedIncidentId = all[0].incidentId;
          this.currentSimTime = all[0].onsetSimTime;
        }
      }
      this.notify();
    });
  }

  public subscribe(cb: (state: ReplayState3D) => void): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    const s = this.getState();
    this.listeners.forEach((cb) => cb(s));
  }

  public getState(): ReplayState3D {
    const dossier = this.getSelectedDossier();
    const minSimTime = dossier ? dossier.onsetSimTime : 0;
    const maxSimTime = dossier
      ? Math.max(minSimTime + 60, dossier.events[dossier.events.length - 1]?.simTimeSeconds || minSimTime + 60)
      : 100;

    const span = Math.max(1, maxSimTime - minSimTime);
    const progress = Math.max(0, Math.min(100, ((this.currentSimTime - minSimTime) / span) * 100));

    // Events that occurred up to current replayed time
    const activeEvents = dossier
      ? dossier.events.filter((e) => e.simTimeSeconds <= this.currentSimTime)
      : [];
    const currentEvent = activeEvents[activeEvents.length - 1] || null;

    return {
      viewMode: this.viewMode,
      selectedIncidentId: this.selectedIncidentId,
      isPlaying: this.isPlaying,
      playbackSpeed: this.playbackSpeed,
      currentSimTime: Number(this.currentSimTime.toFixed(1)),
      minSimTime,
      maxSimTime,
      progressPercent: Number(progress.toFixed(1)),
      activeEvents,
      currentEvent,
      hasRecordedIncidents: this.recorder.getIncidents().length > 0,
    };
  }

  public getSelectedDossier(): ReplayableIncidentDossier | null {
    if (!this.selectedIncidentId) return null;
    return this.recorder.getIncident(this.selectedIncidentId) || null;
  }

  public getAvailableIncidents(): ReplayableIncidentDossier[] {
    return this.recorder.getIncidents();
  }

  public selectIncident(incidentId: string): void {
    this.pause();
    this.selectedIncidentId = incidentId;
    const dossier = this.recorder.getIncident(incidentId);
    if (dossier) {
      this.currentSimTime = dossier.onsetSimTime;
    }
    this.notify();
  }

  public setViewMode(mode: SimulationViewMode): void {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    if (mode === 'LIVE') {
      this.pause();
    } else {
      // Replay mode entered
      const dossier = this.getSelectedDossier();
      if (dossier && this.currentSimTime < dossier.onsetSimTime) {
        this.currentSimTime = dossier.onsetSimTime;
      }
    }
    this.notify();
  }

  public togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public play(): void {
    this.isPlaying = true;
    this.lastWallClock = performance.now();
    this.notify();
  }

  public pause(): void {
    this.isPlaying = false;
    this.notify();
  }

  public setSpeed(speed: number): void {
    this.playbackSpeed = speed;
    this.notify();
  }

  public seekTo(simTime: number): void {
    const dossier = this.getSelectedDossier();
    if (!dossier) return;

    const min = dossier.onsetSimTime;
    const max = Math.max(min + 30, dossier.events[dossier.events.length - 1]?.simTimeSeconds || min + 60);

    this.currentSimTime = Math.max(min, Math.min(max, simTime));
    this.notify();
  }

  public seekToPercent(pct: number): void {
    const dossier = this.getSelectedDossier();
    if (!dossier) return;

    const min = dossier.onsetSimTime;
    const max = Math.max(min + 30, dossier.events[dossier.events.length - 1]?.simTimeSeconds || min + 60);
    const span = max - min;

    this.seekTo(min + (pct / 100) * span);
  }

  /**
   * Jumps playback directly to a specific canonical lifecycle event timestamp
   */
  public jumpToStage(eventType: string): boolean {
    const dossier = this.getSelectedDossier();
    if (!dossier) return false;

    const ev = dossier.events.find((e) => e.eventType === eventType);
    if (ev) {
      this.seekTo(ev.simTimeSeconds);
      return true;
    }
    return false;
  }

  /**
   * Per-frame animation update for replay clock
   */
  public update(delta: number): void {
    if (this.viewMode !== 'REPLAY' || !this.isPlaying) return;

    const dossier = this.getSelectedDossier();
    if (!dossier) return;

    const min = dossier.onsetSimTime;
    const max = Math.max(min + 30, dossier.events[dossier.events.length - 1]?.simTimeSeconds || min + 60);

    this.currentSimTime += delta * this.playbackSpeed;

    if (this.currentSimTime >= max) {
      this.currentSimTime = max;
      this.pause();
    } else {
      this.notify();
    }
  }
}

