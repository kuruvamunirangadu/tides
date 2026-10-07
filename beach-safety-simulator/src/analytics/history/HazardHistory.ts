import { Environment } from '../../models/Environment';
import { HazardSample } from '../metrics/Types';

export class HazardHistory {
  private samples: HazardSample[] = [];
  private maxSamples: number = 100;
  private peakWave: number = 0;
  private peakCurrent: number = 0;
  private peakRip: number = 0;

  public sample(
    simTime: number,
    timeDisplay: string,
    env: Environment,
    activeHazardCount: number
  ): void {
    const wave = env.waveHeight ?? 0;
    const current = env.waterCurrent ?? 0;
    const rip = env.ripProbability ?? 0;

    this.peakWave = Math.max(this.peakWave, wave);
    this.peakCurrent = Math.max(this.peakCurrent, current);
    this.peakRip = Math.max(this.peakRip, rip);

    // Sample periodically (every 5 seconds of sim time or if significant change)
    const last = this.samples[this.samples.length - 1];
    if (!last || simTime - last.simulationTime >= 5 || Math.abs(last.waveHeight - wave) > 0.2) {
      this.samples.push({
        simulationTime: simTime,
        timeDisplay,
        waveHeight: Number(wave.toFixed(2)),
        waterCurrent: Number(current.toFixed(2)),
        ripProbability: Number(rip.toFixed(2)),
        visibility: Number((env.visibility ?? 10).toFixed(1)),
        windSpeed: Number((env.windSpeed ?? 0).toFixed(1)),
        activeHazardCount,
      });

      if (this.samples.length > this.maxSamples) {
        this.samples.shift();
      }
    }
  }

  public getSamples(): HazardSample[] {
    return [...this.samples];
  }

  public getPeaks() {
    return {
      peakWave: this.peakWave,
      peakCurrent: this.peakCurrent,
      peakRip: this.peakRip,
    };
  }

  public reset(): void {
    this.samples = [];
    this.peakWave = 0;
    this.peakCurrent = 0;
    this.peakRip = 0;
  }
}
