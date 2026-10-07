export class SimulationClock {
  private timeSeconds: number;
  private readonly initialTimeSeconds: number;

  constructor(initialHour: number = 8, initialMinute: number = 0) {
    this.initialTimeSeconds = (initialHour * 3600) + (initialMinute * 60);
    this.timeSeconds = this.initialTimeSeconds;
  }

  public tick(realDeltaSeconds: number, speedMultiplier: number): number {
    // 1x = 1 simulation minute per real second (60 sim sec / real sec)
    // Speed multipliers scale this linearly (2x = 120s, 5x = 300s, 10x = 600s)
    const simSecondsPerRealSecond = 60 * speedMultiplier;
    this.timeSeconds += realDeltaSeconds * simSecondsPerRealSecond;

    // Wrap around 24 hours (86400 seconds)
    if (this.timeSeconds >= 86400) {
      this.timeSeconds = this.timeSeconds % 86400;
    }

    return this.timeSeconds;
  }

  public getTimeSeconds(): number {
    return this.timeSeconds;
  }

  public getFormattedTime(): string {
    const totalMinutes = Math.floor(this.timeSeconds / 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  public getHourDecimal(): number {
    return this.timeSeconds / 3600;
  }

  public reset(): void {
    this.timeSeconds = this.initialTimeSeconds;
  }
}
