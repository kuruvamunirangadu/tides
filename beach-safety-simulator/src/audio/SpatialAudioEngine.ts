import * as THREE from 'three';

export interface SpatialAudioState {
  isInitialized: boolean;
  isMuted: boolean;
  masterVolume: number;
  ambienceVolume: number;
  alertVolume: number;
  engineVolume: number;
  spatialPannerActive: boolean;
}

/**
 * SpatialAudioEngine.ts
 * 
 * 3D Positional Audio Synthesizer (Milestone 5):
 * - Spatializes sound sources (ocean waves, rescue boat engines, lifeguard whistles, distress sirens)
 * - Uses Web Audio API PannerNode and Listener coordinates synchronized to the 3D camera
 * - Smooth distance attenuation (inverse distance model)
 * - Independent volume controls and safe user-interaction unlock
 * - Zero external assets required (100% procedural synthesized audio)
 */
export class SpatialAudioEngine {
  private static instance: SpatialAudioEngine | null = null;

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private alertGain: GainNode | null = null;
  private engineGain: GainNode | null = null;

  // Rescue boat continuous engine synthesis
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private enginePanner: PannerNode | null = null;
  private engineGainNode: GainNode | null = null;
  private isEngineRunning: boolean = false;

  // Wave ambience panner
  private wavePanner: PannerNode | null = null;

  // Volumes
  private isMuted: boolean = false;
  private masterVolume: number = 0.8;
  private ambienceVolume: number = 0.5;
  private alertVolume: number = 0.75;
  private engineVolume: number = 0.6;

  private listeners: Set<(state: SpatialAudioState) => void> = new Set();

  public static getInstance(): SpatialAudioEngine {
    if (!SpatialAudioEngine.instance) {
      SpatialAudioEngine.instance = new SpatialAudioEngine();
    }
    return SpatialAudioEngine.instance;
  }

  constructor() {
    // Lazily unlocked on first user interaction
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.initAudio();
        window.removeEventListener('click', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('click', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
    }
  }

  public subscribe(cb: (state: SpatialAudioState) => void): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    const s = this.getState();
    this.listeners.forEach((cb) => cb(s));
  }

  public getState(): SpatialAudioState {
    return {
      isInitialized: !!this.ctx,
      isMuted: this.isMuted,
      masterVolume: this.masterVolume,
      ambienceVolume: this.ambienceVolume,
      alertVolume: this.alertVolume,
      engineVolume: this.engineVolume,
      spatialPannerActive: !!this.ctx && !this.isMuted,
    };
  }

  public async initAudio(): Promise<boolean> {
    try {
      if (typeof window === 'undefined') return false;

      if (!this.ctx) {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtxClass) return false;
        this.ctx = new AudioCtxClass();
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      if (!this.masterGain && this.ctx) {
        this.setupAudioGraph();
      }

      this.notify();
      return true;
    } catch (err) {
      console.warn('[SpatialAudioEngine] Audio initialization fallback:', err);
      return false;
    }
  }

  private setupAudioGraph(): void {
    if (!this.ctx) return;

    // Master
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Sub-buses
    this.ambienceGain = this.ctx.createGain();
    this.ambienceGain.gain.setValueAtTime(this.ambienceVolume, this.ctx.currentTime);
    this.ambienceGain.connect(this.masterGain);

    this.alertGain = this.ctx.createGain();
    this.alertGain.gain.setValueAtTime(this.alertVolume, this.ctx.currentTime);
    this.alertGain.connect(this.masterGain);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(this.engineVolume, this.ctx.currentTime);
    this.engineGain.connect(this.masterGain);

    // Setup Rescue Boat Engine Nodes
    this.setupBoatEngine();
  }

  private setupBoatEngine(): void {
    if (!this.ctx || !this.engineGain || this.isEngineRunning) return;

    try {
      this.enginePanner = this.createPanner(-35, 0, -45);
      this.engineGainNode = this.ctx.createGain();
      this.engineGainNode.gain.setValueAtTime(0.02, this.ctx.currentTime); // Low idle volume

      // Twin harmonics for marine twin-outboard engine
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // 55 Hz base rumble

      this.engineSubOsc = this.ctx.createOscillator();
      this.engineSubOsc.type = 'triangle';
      this.engineSubOsc.frequency.setValueAtTime(27.5, this.ctx.currentTime); // Sub-bass throttle

      // Lowpass filter to muffle harsh harmonics
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, this.ctx.currentTime);

      this.engineOsc.connect(filter);
      this.engineSubOsc.connect(filter);
      filter.connect(this.engineGainNode);
      this.engineGainNode.connect(this.enginePanner);
      this.enginePanner.connect(this.engineGain);

      this.engineOsc.start();
      this.engineSubOsc.start();
      this.isEngineRunning = true;
    } catch (e) {
      console.warn('[SpatialAudioEngine] Boat engine node init fallback:', e);
    }
  }

  private createPanner(x: number, y: number, z: number): PannerNode {
    if (!this.ctx) throw new Error('AudioContext not ready');

    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 15;
    panner.maxDistance = 300;
    panner.rolloffFactor = 1.2;
    panner.coneInnerAngle = 360;

    if (panner.positionX) {
      panner.positionX.setValueAtTime(x, this.ctx.currentTime);
      panner.positionY.setValueAtTime(y, this.ctx.currentTime);
      panner.positionZ.setValueAtTime(z, this.ctx.currentTime);
    } else {
      panner.setPosition(x, y, z);
    }

    return panner;
  }

  /**
   * Updates listener position from 3D camera
   */
  public updateListener(cameraPos: THREE.Vector3, cameraForward?: THREE.Vector3): void {
    if (!this.ctx || this.isMuted) return;

    try {
      const listener = this.ctx.listener;
      const t = this.ctx.currentTime;

      if (listener.positionX) {
        listener.positionX.setValueAtTime(cameraPos.x, t);
        listener.positionY.setValueAtTime(cameraPos.y, t);
        listener.positionZ.setValueAtTime(cameraPos.z, t);
      } else {
        listener.setPosition(cameraPos.x, cameraPos.y, cameraPos.z);
      }

      if (cameraForward) {
        if (listener.forwardX) {
          listener.forwardX.setValueAtTime(cameraForward.x, t);
          listener.forwardY.setValueAtTime(cameraForward.y, t);
          listener.forwardZ.setValueAtTime(cameraForward.z, t);
        } else {
          listener.setOrientation(cameraForward.x, cameraForward.y, cameraForward.z, 0, 1, 0);
        }
      }
    } catch {
      // Ignore in mock/non-browser test environments
    }
  }

  /**
   * Updates Rescue Boat position and engine throttle in 3D
   */
  public updateBoatEngine(
    boatX: number,
    boatY: number,
    boatZ: number,
    speedMps: number
  ): void {
    if (!this.ctx || !this.enginePanner || !this.engineGainNode || !this.engineOsc) return;

    try {
      const t = this.ctx.currentTime + 0.05;

      // Update 3D coordinates of boat sound source
      if (this.enginePanner.positionX) {
        this.enginePanner.positionX.setTargetAtTime(boatX, t, 0.05);
        this.enginePanner.positionY.setTargetAtTime(boatY, t, 0.05);
        this.enginePanner.positionZ.setTargetAtTime(boatZ, t, 0.05);
      } else {
        this.enginePanner.setPosition(boatX, boatY, boatZ);
      }

      // Modulate engine pitch and gain based on speed (idling at 0 m/s vs roaring at 18.5 m/s)
      const speedNorm = Math.min(1.0, speedMps / 18.5);
      const targetFreq = 50 + speedNorm * 85; // 50 Hz idle -> 135 Hz full throttle
      const targetGain = 0.03 + speedNorm * 0.22;

      this.engineOsc.frequency.setTargetAtTime(targetFreq, t, 0.1);
      this.engineGainNode.gain.setTargetAtTime(targetGain, t, 0.1);
    } catch {
      // Ignore
    }
  }

  /**
   * Plays a 3D localized sound at specific beach coordinates
   */
  public playSpatialAlert(
    soundType: 'DISTRESS' | 'WHISTLE' | 'SIREN' | 'CHIME',
    pos: { x: number; y: number; z: number }
  ): void {
    if (this.isMuted) return;

    this.initAudio().then(() => {
      if (!this.ctx || !this.alertGain) return;

      try {
        const panner = this.createPanner(pos.x, pos.y, pos.z);
        panner.connect(this.alertGain);

        const now = this.ctx.currentTime;

        if (soundType === 'WHISTLE') {
          // Spatialized Lifeguard Whistle (2880 Hz)
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(2880, now);

          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

          osc.connect(gain);
          gain.connect(panner);

          osc.start(now);
          osc.stop(now + 0.6);
        } else if (soundType === 'DISTRESS') {
          // Spatialized SOS Sonar Ping at swimmer's position
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1180, now);
          osc.frequency.exponentialRampToValueAtTime(740, now + 0.25);

          gain.gain.setValueAtTime(0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

          osc.connect(gain);
          gain.connect(panner);

          osc.start(now);
          osc.stop(now + 0.25);
        }
      } catch (err) {
        console.warn('[SpatialAudioEngine] Spatial alert playback error:', err);
      }
    });
  }

  // Volume Controls
  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
    this.notify();
  }

  public setAmbienceVolume(vol: number): void {
    this.ambienceVolume = Math.max(0, Math.min(1, vol));
    if (this.ambienceGain && this.ctx) {
      this.ambienceGain.gain.setValueAtTime(this.ambienceVolume, this.ctx.currentTime);
    }
    this.notify();
  }

  public setAlertVolume(vol: number): void {
    this.alertVolume = Math.max(0, Math.min(1, vol));
    if (this.alertGain && this.ctx) {
      this.alertGain.gain.setValueAtTime(this.alertVolume, this.ctx.currentTime);
    }
    this.notify();
  }

  public setEngineVolume(vol: number): void {
    this.engineVolume = Math.max(0, Math.min(1, vol));
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setValueAtTime(this.engineVolume, this.ctx.currentTime);
    }
    this.notify();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
    this.notify();
    return this.isMuted;
  }

  public dispose(): void {
    try {
      if (this.engineOsc) {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      }
      if (this.engineSubOsc) {
        this.engineSubOsc.stop();
        this.engineSubOsc.disconnect();
      }
      this.isEngineRunning = false;
      this.ctx?.close();
    } catch {
      // Ignore
    }
    this.ctx = null;
    this.listeners.clear();
  }
}

