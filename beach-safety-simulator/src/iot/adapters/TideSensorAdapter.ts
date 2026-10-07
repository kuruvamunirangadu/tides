import { Sensor, SensorType, SensorStatus, SensorHealth } from '../models/Sensor';
import { SensorReading, TideReadingPayload } from '../models/SensorReading';
import { GeoPoint } from '../../gis/models/GeoPoint';

export class TideSensorAdapter implements Sensor {
  public id: string;
  public name: string;
  public type: SensorType = SensorType.TIDE;
  public location: GeoPoint;
  public zoneId: string;
  public status: SensorStatus = 'ONLINE';
  public capabilities = ['TIDE_HEIGHT'] as const;
  public metadata = {
    manufacturer: 'Ott Hydromet / SonTek',
    model: 'OTT RLS Radar Level Sensor',
    firmwareVersion: 'v3.4.1',
    installationDate: '2025-01-15',
    calibrationDate: '2026-01-10',
    samplingIntervalSeconds: 5,
    batteryPowered: false,
    communicationProtocol: 'MQTT' as const,
  };
  public sourceMode: 'SIMULATION' | 'REAL_SENSOR';

  private currentReading: number = 1.45;
  private errorRate: number = 0.01;
  private uptimeSeconds: number = 36000;

  constructor(
    id: string = 'TIDE-RK-01',
    name: string = 'RK Beach Central Acoustic Tide Gauge',
    location: GeoPoint = { latitude: 17.7112, longitude: 83.3180 },
    zoneId: string = 'SZ-01',
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
      signalStrength: 92,
      batteryLevel: 98,
      errorRate: this.errorRate,
      latencyMs: 45,
      uptimeSeconds: this.uptimeSeconds,
    };
  }

  public generateReading(
    simTideLevel: number,
    currentTime: number,
    timeDisplay: string
  ): SensorReading<number> {
    // If REAL mode, apply subtle calibration jitter (+- 0.03m)
    let value = simTideLevel;
    let confidence = 0.98;

    if (this.sourceMode === 'REAL_SENSOR') {
      const jitter = (Math.sin(currentTime * 0.2) * 0.03);
      value = Number((simTideLevel + jitter).toFixed(2));
      confidence = 0.96;
    }

    if (this.status === 'DEGRADED') {
      confidence = 0.65;
      value += 0.25; // Drift bias
    }

    return {
      sensorId: this.id,
      sensorType: SensorType.TIDE,
      timestamp: currentTime,
      timeDisplay,
      value,
      unit: 'm',
      location: this.location,
      confidence,
      status: this.status === 'OFFLINE' ? 'FAILED' : 'VALID',
      source: this.sourceMode === 'REAL_SENSOR' ? 'REAL_SENSOR' : 'SIMULATOR',
    };
  }
}
