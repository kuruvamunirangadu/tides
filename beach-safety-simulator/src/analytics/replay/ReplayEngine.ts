import { ReplayFrame, ReplaySession } from './ReplayState';
import { SimulationState } from '../../models/Beach';
import { SimulationEvent } from '../metrics/Types';

export class ReplayEngine {
  private frames: ReplayFrame[] = [];
  private maxFrames: number = 600;
  private currentFrameIndex: number = 0;
  private isReplaying: boolean = false;
  private playbackSpeed: number = 1;
  private lastSampleTime: number = -1;

  public recordFrame(state: SimulationState, eventsInFrame: SimulationEvent[] = []): void {
    const simTime = state.time;
    // Record every 1 second of sim time
    if (this.lastSampleTime >= 0 && simTime - this.lastSampleTime < 1.0) {
      return;
    }
    this.lastSampleTime = simTime;

    const frame: ReplayFrame = {
      frameIndex: this.frames.length,
      simulationTime: simTime,
      timeDisplay: state.timeDisplay,
      realTimestamp: Date.now(),
      state: {
        environment: { ...state.environment },
        visitors: state.visitors.map((v) => ({ ...v, position: { ...v.position }, targetPosition: v.targetPosition ? { ...v.targetPosition } : undefined })),
        hazards: [...state.hazards],
        emergencyIncidents: [...state.emergencyIncidents],
        emergencyResources: [...state.emergencyResources],
        riskOverview: state.riskOverview,
        activeFailures: state.activeFailures ? [...state.activeFailures] : [],
        decisions: state.decisions ? [...state.decisions] : [],
        actions: state.actions ? [...state.actions] : [],
      },
      eventsTriggered: [...eventsInFrame],
    };

    this.frames.push(frame);
    if (this.frames.length > this.maxFrames) {
      this.frames.shift();
    }
  }

  public getFrames(): ReplayFrame[] {
    return [...this.frames];
  }

  public getFrameCount(): number {
    return this.frames.length;
  }

  public getCurrentFrame(): ReplayFrame | undefined {
    if (this.frames.length === 0) return undefined;
    return this.frames[Math.max(0, Math.min(this.frames.length - 1, this.currentFrameIndex))];
  }

  public seekToIndex(index: number): ReplayFrame | undefined {
    if (this.frames.length === 0) return undefined;
    this.currentFrameIndex = Math.max(0, Math.min(this.frames.length - 1, index));
    return this.getCurrentFrame();
  }

  public seekToTime(simulationTime: number): ReplayFrame | undefined {
    if (this.frames.length === 0) return undefined;
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < this.frames.length; i++) {
      const diff = Math.abs(this.frames[i].simulationTime - simulationTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    return this.seekToIndex(closestIdx);
  }

  public stepForward(): ReplayFrame | undefined {
    return this.seekToIndex(this.currentFrameIndex + 1);
  }

  public stepBackward(): ReplayFrame | undefined {
    return this.seekToIndex(this.currentFrameIndex - 1);
  }

  public startReplay(): void {
    this.isReplaying = true;
  }

  public pauseReplay(): void {
    this.isReplaying = false;
  }

  public isReplayActive(): boolean {
    return this.isReplaying;
  }

  public setSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.5, Math.min(10, speed));
  }

  public getSpeed(): number {
    return this.playbackSpeed;
  }

  public exportSession(name: string = 'Simulation Run Session'): ReplaySession {
    const first = this.frames[0];
    const last = this.frames[this.frames.length - 1];
    return {
      id: `SESS-${Date.now().toString().slice(-4)}`,
      name,
      startTime: first ? first.simulationTime : 0,
      endTime: last ? last.simulationTime : 0,
      durationSeconds: last && first ? last.simulationTime - first.simulationTime : 0,
      totalFrames: this.frames.length,
      frames: [...this.frames],
    };
  }

  public clear(): void {
    this.frames = [];
    this.currentFrameIndex = 0;
    this.isReplaying = false;
    this.lastSampleTime = -1;
  }
}
