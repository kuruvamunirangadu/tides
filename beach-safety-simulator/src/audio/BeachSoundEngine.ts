/**
 * BeachSoundEngine - Web Audio API procedural sound synthesizer
 * Provides realistic coastal wave ambience, surf swash cycles, wind breeze,
 * and emergency safety sound effects (lifeguard whistle, alert sirens, SOS alarms).
 * 
 * Works 100% in-browser with zero external audio assets required.
 */

export interface SoundEngineState {
  isInitialized: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  oceanVolume: number;
  sfxVolume: number;
  activeAmbience: boolean;
  activeAlerts: boolean;
}

class BeachSoundEngineService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oceanGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  
  // Ocean Wave Ambience Nodes
  private noiseSource: AudioBufferSourceNode | null = null;
  private waveFilter: BiquadFilterNode | null = null;
  private waveLfoGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;

  // Wave rhythm timer
  private waveIntervalTimer: number | null = null;
  private wavePhase: number = 0;

  // State
  private isMuted: boolean = false;
  private oceanVolume: number = 0.45;
  private sfxVolume: number = 0.7;
  private ambienceEnabled: boolean = true;
  private alertsEnabled: boolean = true;
  private currentWaveHeight: number = 1.2;
  private currentWavePeriod: number = 8.0;

  private listeners: Set<(state: SoundEngineState) => void> = new Set();

  constructor() {
    // AudioContext will be lazily created on first user interaction
  }

  public subscribe(listener: (state: SoundEngineState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((l) => l(s));
  }

  public getState(): SoundEngineState {
    return {
      isInitialized: !!this.ctx,
      isPlaying: !!this.ctx && this.ctx.state === 'running' && this.ambienceEnabled && !this.isMuted,
      isMuted: this.isMuted,
      oceanVolume: this.oceanVolume,
      sfxVolume: this.sfxVolume,
      activeAmbience: this.ambienceEnabled,
      activeAlerts: this.alertsEnabled,
    };
  }

  /**
   * Initializes AudioContext on user interaction
   */
  public async initAudio(): Promise<boolean> {
    try {
      if (!this.ctx) {
        const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtxClass) return false;
        this.ctx = new AudioCtxClass();
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      if (!this.masterGain && this.ctx) {
        this.setupAudioGraph();
      }

      if (this.ambienceEnabled && !this.noiseSource) {
        this.startOceanAmbience();
      }

      this.notify();
      return true;
    } catch (err) {
      console.warn('[BeachSoundEngine] Failed to initialize AudioContext:', err);
      return false;
    }
  }

  private setupAudioGraph() {
    if (!this.ctx) return;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1.0, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.oceanGain = this.ctx.createGain();
    this.oceanGain.gain.setValueAtTime(this.oceanVolume, this.ctx.currentTime);
    this.oceanGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);
  }

  /**
   * Generates continuous natural pink/brown noise for authentic ocean waves
   */
  private createOceanNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 6; // 6-second loop
    const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Pink noise filtering
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
        b6 = white * 0.115926;
        data[i] = pink;
      }
    }
    return buffer;
  }

  /**
   * Starts procedural ambient ocean wave audio simulation
   */
  public startOceanAmbience() {
    if (!this.ctx || !this.oceanGain) return;
    if (this.noiseSource) {
      this.stopOceanAmbience();
    }

    const noiseBuffer = this.createOceanNoiseBuffer();
    if (!noiseBuffer) return;

    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;

    // Resonant lowpass filter for deep swell body
    this.waveFilter = this.ctx.createBiquadFilter();
    this.waveFilter.type = 'lowpass';
    this.waveFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
    this.waveFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    // Dynamic wave envelope gain
    this.waveLfoGain = this.ctx.createGain();
    this.waveLfoGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    // Gentle coastal breeze wind filter
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(650, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(0.8, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    // Connect noise to both swell wave filter and wind filter
    this.noiseSource.connect(this.waveFilter);
    this.waveFilter.connect(this.waveLfoGain);
    this.waveLfoGain.connect(this.oceanGain);

    this.noiseSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.oceanGain);

    this.noiseSource.start();

    // Rhythmic Swell Wave Cycle (Swash and Backwash modulation)
    this.startWaveCycleLoop();
    this.notify();
  }

  public stopOceanAmbience() {
    if (this.waveIntervalTimer) {
      window.clearInterval(this.waveIntervalTimer);
      this.waveIntervalTimer = null;
    }
    if (this.noiseSource) {
      try {
        this.noiseSource.stop();
        this.noiseSource.disconnect();
      } catch {
        // already stopped
      }
      this.noiseSource = null;
    }
    this.notify();
  }

  /**
   * Rhythmic swell modulation: swells up, crashes foam, and draws back
   */
  private startWaveCycleLoop() {
    if (this.waveIntervalTimer) {
      window.clearInterval(this.waveIntervalTimer);
    }

    const intervalMs = 120; // 8 updates per second for smooth analog curve
    this.waveIntervalTimer = window.setInterval(() => {
      if (!this.ctx || !this.waveFilter || !this.waveLfoGain || this.isMuted) return;

      const period = Math.max(4, this.currentWavePeriod);
      const waveFreq = (2 * Math.PI) / (period * (1000 / intervalMs));
      this.wavePhase = (this.wavePhase + waveFreq) % (2 * Math.PI);

      // Organic asymmetrical wave profile: gradual swell surge, fast crest crash, slow backwash
      const norm = Math.sin(this.wavePhase);
      const surge = Math.pow(Math.max(0, norm), 1.6); // Sharp breaker crest
      const wash = Math.max(0, -norm) * 0.35; // Gentle backwash

      const baseFreq = 220 + this.currentWaveHeight * 80;
      const targetFreq = baseFreq + surge * (700 + this.currentWaveHeight * 300) + wash * 120;
      const targetGain = 0.12 + surge * (0.45 + this.currentWaveHeight * 0.15) + wash * 0.18;

      const t = this.ctx.currentTime + 0.1;
      this.waveFilter.frequency.setTargetAtTime(targetFreq, t, 0.08);
      this.waveLfoGain.gain.setTargetAtTime(targetGain, t, 0.08);
    }, intervalMs);
  }

  /**
   * Update wave parameters from live simulation environment
   */
  public updateEnvironment(waveHeight: number, wavePeriod: number, windSpeed: number = 15) {
    this.currentWaveHeight = Math.max(0.4, Math.min(4.0, waveHeight));
    this.currentWavePeriod = Math.max(4.0, Math.min(16.0, wavePeriod));

    if (this.ctx && this.windGain && this.windFilter) {
      const windNorm = Math.min(1.0, windSpeed / 45);
      const windTargetGain = 0.04 + windNorm * 0.15;
      const windFreq = 500 + windNorm * 400;
      this.windGain.gain.setTargetAtTime(windTargetGain, this.ctx.currentTime, 0.2);
      this.windFilter.frequency.setTargetAtTime(windFreq, this.ctx.currentTime, 0.2);
    }
  }

  // =========================================================================
  // SAFETY SOUND EFFECTS (SFX)
  // =========================================================================

  /**
   * Authentic Lifeguard Whistle: High-pitch dual-oscillator acoustic blast with 25Hz vibrato
   */
  public playLifeguardWhistle() {
    if (!this.alertsEnabled || this.isMuted) return;
    this.initAudio().then(() => {
      if (!this.ctx || !this.sfxGain) return;

      const now = this.ctx.currentTime;
      const whistleGain = this.ctx.createGain();
      whistleGain.gain.setValueAtTime(0, now);
      whistleGain.gain.linearRampToValueAtTime(0.35, now + 0.03);
      whistleGain.gain.setValueAtTime(0.35, now + 0.18);
      whistleGain.gain.linearRampToValueAtTime(0.01, now + 0.28);
      // Double blast
      whistleGain.gain.linearRampToValueAtTime(0.4, now + 0.35);
      whistleGain.gain.setValueAtTime(0.4, now + 0.55);
      whistleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      whistleGain.connect(this.sfxGain);

      // Primary tone: 2880 Hz
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(2880, now);

      // Secondary tone: 3120 Hz (Acoustic beat frequency)
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(3120, now);

      // Vibrato LFO (Trill)
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(26, now);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(90, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfoGain.connect(osc2.frequency);

      osc1.connect(whistleGain);
      osc2.connect(whistleGain);

      lfo.start(now);
      osc1.start(now);
      osc2.start(now);

      lfo.stop(now + 0.8);
      osc1.stop(now + 0.8);
      osc2.stop(now + 0.8);
    });
  }

  /**
   * Sweeping Warning Siren: Alert tone for red flag zone breach
   */
  public playWarningSiren() {
    if (!this.alertsEnabled || this.isMuted) return;
    this.initAudio().then(() => {
      if (!this.ctx || !this.sfxGain) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(460, now + 0.5);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.65);
    });
  }

  /**
   * Distress Alarm: Urgent SOS sonar ping when swimmer is in distress
   */
  public playDistressAlarm() {
    if (!this.alertsEnabled || this.isMuted) return;
    this.initAudio().then(() => {
      if (!this.ctx || !this.sfxGain) return;

      const now = this.ctx.currentTime;
      [0, 0.22, 0.44].forEach((delay) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1180, now + delay);
        osc.frequency.exponentialRampToValueAtTime(740, now + delay + 0.16);

        gain.gain.setValueAtTime(0.28, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(now + delay);
        osc.stop(now + delay + 0.18);
      });
    });
  }

  /**
   * PA Announcement Chime (Two-tone broadcast chime)
   */
  public playPACallChime() {
    if (!this.alertsEnabled || this.isMuted) return;
    this.initAudio().then(() => {
      if (!this.ctx || !this.sfxGain) return;

      const now = this.ctx.currentTime;
      // Tone 1: C#5 (554 Hz)
      const osc1 = this.ctx.createOscillator();
      const g1 = this.ctx.createGain();
      osc1.frequency.setValueAtTime(554.37, now);
      g1.gain.setValueAtTime(0.3, now);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(g1);
      g1.connect(this.sfxGain);
      osc1.start(now);
      osc1.stop(now + 0.45);

      // Tone 2: A4 (440 Hz)
      const osc2 = this.ctx.createOscillator();
      const g2 = this.ctx.createGain();
      osc2.frequency.setValueAtTime(440, now + 0.3);
      g2.gain.setValueAtTime(0.3, now + 0.3);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc2.connect(g2);
      g2.connect(this.sfxGain);
      osc2.start(now + 0.3);
      osc2.stop(now + 0.85);
    });
  }

  // =========================================================================
  // CONTROL TOGGLES
  // =========================================================================

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1.0, this.ctx.currentTime);
    }
    this.notify();
    return this.isMuted;
  }

  public setOceanVolume(vol: number) {
    this.oceanVolume = Math.max(0, Math.min(1, vol));
    if (this.oceanGain && this.ctx) {
      this.oceanGain.gain.setValueAtTime(this.oceanVolume, this.ctx.currentTime);
    }
    this.notify();
  }

  public toggleAmbience(enabled?: boolean) {
    this.ambienceEnabled = enabled !== undefined ? enabled : !this.ambienceEnabled;
    if (this.ambienceEnabled) {
      this.startOceanAmbience();
    } else {
      this.stopOceanAmbience();
    }
    this.notify();
  }

  public toggleAlerts(enabled?: boolean) {
    this.alertsEnabled = enabled !== undefined ? enabled : !this.alertsEnabled;
    this.notify();
  }
}

export const soundEngine = new BeachSoundEngineService();
