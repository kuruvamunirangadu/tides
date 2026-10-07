import { Sensor, SensorType, SensorStatus, SensorHealth } from '../models/Sensor';
import { SensorReading } from '../models/SensorReading';
import { GeoPoint } from '../../gis/models/GeoPoint';

export class CurrentSensorAdapter implements Sensor {
  public id: string;
  public name: string;
  public type: SensorType = SensorType.CURRENT;
  public location: GeoPoint;
  public zoneId: string;
  public status: SensorStatus = 'ONLINE';
  public capabilities = ['CURRENT_VELOCITY'] as const;
  public metadata = {
    manufacturer: 'Nortek',
    model: 'Aquadopp Profiler ADCP 2MHz',
    firmwareVersion: 'v2.8.5',
    installationDate: '2025-02-10',
    calibrationDate: '2026-02-01',
    samplingIntervalSeconds: 2,
    batteryPowered: false,
    communicationProtocol: 'MQTT' as const,
  };
  public sourceMode: 'SIMULATION' | 'REAL_SENSOR';

  constructor(
    id: string = 'CURRENT-ADCP-01',
    name: string = 'Seabed ADCP Acoustic Doppler Current Profiler',
    location: GeoPoint = { latitude: 17.7095, longitude: 83.3200 },
    zoneId: string = 'SZ-02',
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
      signalStrength: 95,
      batteryLevel: 100,
      errorRate: 0.01,
      latencyMs: 50,
      uptimeSeconds: 125000,
    };
  }

  public generateReading(
    simCurrentSpeed: number,
    currentTime: number,
    timeDisplay: string
  ): SensorReading<number> {
    let value = simCurrentSpeed;
    let confidence = 0.96;

    if (this.sourceMode === 'REAL_SENSOR') {
      const turbulence = (Math.sin(currentTime * 1.2) * 0.04);
      value = Number((simCurrentSpeed + turbulence).toFixed(2));
      confidence = 0.94;
    }

    if (this.status === 'DEGRADED') {
      confidence = 0.55;
      value += 0.35;
    }

    return {
      sensorId: this.id,
      sensorType: SensorType.CURRENT,
      timestamp: currentTime,
      timeDisplay,
      value,
      unit: 'm/s',
      location: this.location,
      confidence,
      status: this.status === 'OFFLINE' ? 'FAILED' : 'VALID',
      source: this.sourceMode === 'REAL_SENSOR' ? 'REAL_SENSOR' : 'SIMULATOR',
    };
  }
}
