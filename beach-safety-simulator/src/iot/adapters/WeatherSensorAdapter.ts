import { Sensor, SensorType, SensorStatus, SensorHealth } from '../models/Sensor';
import { SensorReading, WeatherReadingPayload } from '../models/SensorReading';
import { GeoPoint } from '../../gis/models/GeoPoint';

export class WeatherSensorAdapter implements Sensor {
  public id: string;
  public name: string;
  public type: SensorType = SensorType.WEATHER;
  public location: GeoPoint;
  public zoneId: string;
  public status: SensorStatus = 'ONLINE';
  public capabilities = ['WIND_VECTOR', 'ATMOSPHERIC_PRESSURE', 'WATER_TEMPERATURE'] as const;
  public metadata = {
    manufacturer: 'Vaisala',
    model: 'WXT530 All-in-One Weather Transmitter',
    firmwareVersion: 'v5.0.2',
    installationDate: '2025-01-10',
    calibrationDate: '2026-01-05',
    samplingIntervalSeconds: 10,
    batteryPowered: false,
    communicationProtocol: 'MQTT' as const,
  };
  public sourceMode: 'SIMULATION' | 'REAL_SENSOR';

  constructor(
    id: string = 'MET-STATION-01',
    name: string = 'Promenade Coastal Meteorological Mast',
    location: GeoPoint = { latitude: 17.7125, longitude: 83.3170 },
    zoneId: string = 'PZ-01',
    sourceMode: 'SIMULATION' | 'REAL_SENSOR' = 'REAL_SENSOR'
  ) {
    this.id = id;
    this.name = name;
    this.location = location;
    this.zoneId = zoneId;
    this.sourceMode = sourceMode;
  }

  public async start(): Promise<void> {
    this.status = 'ONLINE';
  }

  public async stop(): Promise<void> {
    this.status = 'OFFLINE';
  }

  public getHealth(): SensorHealth {
    return {
      sensorId: this.id,
      status: this.status,
      lastReadingAt: Date.now(),
      signalStrength: 98,
      batteryLevel: 100,
      errorRate: 0.005,
      latencyMs: 35,
      uptimeSeconds: 150000,
    };
  }

  public generateReading(
    simWindSpeed: number,
    simWeatherCondition: 'CLEAR' | 'CLOUDY' | 'RAIN' | 'STORM' | 'FOG',
    currentTime: number,
    timeDisplay: string
  ): SensorReading<WeatherReadingPayload> {
    const payload: WeatherReadingPayload = {
      temperatureC: 28.5,
      humidityPct: 75,
      windSpeedKmh: simWindSpeed,
      windDirectionDeg: 120,
      pressureHpa: 1012.4,
      visibilityKm: simWeatherCondition === 'FOG' ? 1.5 : simWeatherCondition === 'RAIN' ? 5.0 : 12.0,
      rainfallMm: simWeatherCondition === 'RAIN' ? 12.5 : 0.0,
      condition: simWeatherCondition,
    };

    return {
      sensorId: this.id,
      sensorType: SensorType.WEATHER,
      timestamp: currentTime,
      timeDisplay,
      value: payload,
      unit: 'MET_COMPOSITE',
      location: this.location,
      confidence: 0.99,
      status: this.status === 'OFFLINE' ? 'FAILED' : 'VALID',
      source: this.sourceMode === 'REAL_SENSOR' ? 'REAL_SENSOR' : 'SIMULATOR',
    };
  }
}
