export type WeatherType = 'CLEAR' | 'CLOUDY' | 'RAIN' | 'STORM' | 'FOG';

export interface Environment {
  tideLevel: number;        // meters (e.g. 0.4 to 2.4m)
  waveHeight: number;       // meters (e.g. 0.5 to 3.0m)
  wavePeriod: number;       // seconds (e.g. 6 to 14s)
  waveDirection: number;    // degrees (0 to 360)
  windSpeed: number;        // km/h (e.g. 5 to 45 km/h)
  windDirection: number;    // degrees (0 to 360)
  weather: WeatherType;     // CLEAR | CLOUDY | RAIN | STORM | FOG
  visibility: number;       // km (1 to 15 km)
  waterCurrent: number;     // m/s (0.1 to 1.2 m/s)
  currentSpeed?: number;    // alias for waterCurrent
  currentDirection?: number;// degrees (e.g. 180 for offshore)
  ripProbability?: number;  // 0.0 - 1.0
  tideStatus?: 'RISING' | 'FALLING' | 'HIGH' | 'LOW';
  tideChangeRate?: number;    // m/h (0.0 to 1.0 m/h)
  waterTemperature?: number;  // Celsius (10 to 35 C)
  waterTurbidity?: number;    // NTU (0 to 100 NTU)
  uvIndex?: number;           // 1 to 12
  marineHazardLevel?: number; // 0.0 - 1.0
}

export type EnvironmentState = Environment;
