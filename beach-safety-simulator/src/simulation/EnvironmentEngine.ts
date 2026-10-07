import { Environment, WeatherType } from '../models/Environment';
import { DEFAULT_ENVIRONMENT } from '../data/environmentDefaults';

export class EnvironmentEngine {
  private currentEnv: Environment;
  private manualOverrides: Partial<Environment> | null = null;

  constructor(initialEnv: Environment = DEFAULT_ENVIRONMENT) {
    this.currentEnv = { ...initialEnv };
  }

  public setManualEnvironment(overrides: Partial<Environment>): void {
    this.manualOverrides = {
      ...(this.manualOverrides || {}),
      ...overrides,
    };
    this.currentEnv = {
      ...this.currentEnv,
      ...this.manualOverrides,
    };
  }

  public resetManualOverrides(): void {
    this.manualOverrides = null;
    this.currentEnv = { ...DEFAULT_ENVIRONMENT };
  }

  public isManualActive(): boolean {
    return this.manualOverrides !== null && Object.keys(this.manualOverrides).length > 0;
  }

  public update(timeSeconds: number, _simDeltaSeconds: number): Environment {
    const hour = timeSeconds / 3600;

    // 1. Semi-diurnal Tidal Cycle (12.42 hour tidal period)
    const tidePhase = (hour / 12.42) * Math.PI * 2;
    const baseTide = 1.3 + Math.sin(tidePhase) * 0.75;
    const autoTide = Math.round(baseTide * 100) / 100;

    // 2. Diurnal Wind Cycle
    const afternoonWindFactor = Math.max(0, Math.sin(((hour - 8) / 14) * Math.PI));
    const baseWind = 10 + afternoonWindFactor * 16 + Math.sin(hour * 3) * 2;
    const autoWindSpeed = Math.round(Math.max(4, baseWind) * 10) / 10;
    const autoWindDir = Math.round((90 + Math.sin(hour * 0.5) * 30) % 360);

    // 3. Wave Height & Period
    const waveBase = 0.5 + (autoWindSpeed / 35) * 1.2 + (autoTide > 1.8 ? 0.3 : 0);
    const autoWaveHeight = Math.round(Math.max(0.4, waveBase) * 100) / 100;
    const autoWavePeriod = Math.round((7.0 + Math.sin(hour * 0.8) * 2.0) * 10) / 10;

    // 4. Water Current & Rip Probability
    const tideRate = Math.abs(Math.cos(tidePhase));
    const autoCurrent = Math.round((0.2 + (tideRate * 0.35) + (autoWaveHeight * 0.15)) * 100) / 100;
    const autoRipProb = autoCurrent > 0.8 || autoWaveHeight > 1.8 ? 0.75 : 0.2;

    // 5. Weather & Visibility
    const autoWeather = this.determineWeather(hour);
    const autoVisibility = this.determineVisibility(autoWeather);

    // 6. Water Quality, Temperature & Marine Life
    const autoWaterTemp = Math.round((24.5 + Math.sin((hour - 10) * 0.2) * 2.0) * 10) / 10;
    const autoTurbidity = Math.round((8 + autoWaveHeight * 6 + autoCurrent * 10) * 10) / 10;
    const autoUV = Math.max(1, Math.min(11, Math.round(Math.sin(((hour - 6) / 12) * Math.PI) * 10)));
    const autoTideStatus = Math.cos(tidePhase) > 0.1 ? 'RISING' : Math.cos(tidePhase) < -0.1 ? 'FALLING' : autoTide > 1.6 ? 'HIGH' : 'LOW';

    // Compose with active manual overrides
    this.currentEnv = {
      tideLevel: this.manualOverrides?.tideLevel ?? autoTide,
      tideStatus: this.manualOverrides?.tideStatus ?? autoTideStatus,
      tideChangeRate: this.manualOverrides?.tideChangeRate ?? Math.round(tideRate * 0.45 * 100) / 100,
      windSpeed: this.manualOverrides?.windSpeed ?? autoWindSpeed,
      windDirection: this.manualOverrides?.windDirection ?? autoWindDir,
      waveHeight: this.manualOverrides?.waveHeight ?? autoWaveHeight,
      wavePeriod: this.manualOverrides?.wavePeriod ?? autoWavePeriod,
      waveDirection: this.manualOverrides?.waveDirection ?? 180,
      waterCurrent: this.manualOverrides?.waterCurrent ?? this.manualOverrides?.currentSpeed ?? autoCurrent,
      currentSpeed: this.manualOverrides?.currentSpeed ?? this.manualOverrides?.waterCurrent ?? autoCurrent,
      currentDirection: this.manualOverrides?.currentDirection ?? 180,
      ripProbability: this.manualOverrides?.ripProbability ?? autoRipProb,
      weather: this.manualOverrides?.weather ?? autoWeather,
      visibility: this.manualOverrides?.visibility ?? autoVisibility,
      waterTemperature: this.manualOverrides?.waterTemperature ?? autoWaterTemp,
      waterTurbidity: this.manualOverrides?.waterTurbidity ?? autoTurbidity,
      uvIndex: this.manualOverrides?.uvIndex ?? autoUV,
      marineHazardLevel: this.manualOverrides?.marineHazardLevel ?? 0.0,
    };

    return { ...this.currentEnv };
  }

  private determineWeather(hour: number): WeatherType {
    const weatherIndex = Math.sin(hour * 0.7 + 1.2);
    if (weatherIndex > 0.85) return 'RAIN';
    if (weatherIndex > 0.45) return 'CLOUDY';
    if (hour > 5 && hour < 7) return 'FOG';
    return 'CLEAR';
  }

  private determineVisibility(weather: WeatherType): number {
    switch (weather) {
      case 'CLEAR':
        return 12;
      case 'CLOUDY':
        return 9;
      case 'RAIN':
        return 5;
      case 'STORM':
        return 2;
      case 'FOG':
        return 1.5;
      default:
        return 10;
    }
  }

  public getEnvironment(): Environment {
    return { ...this.currentEnv };
  }

  public reset(): void {
    this.manualOverrides = null;
    this.currentEnv = { ...DEFAULT_ENVIRONMENT };
  }
}
