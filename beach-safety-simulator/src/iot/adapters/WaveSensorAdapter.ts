import { Sensor, SensorType, SensorStatus, SensorHealth } from '../models/Sensor';
import { SensorReading, WaveReadingPayload } from '../models/SensorReading';
import { GeoPoint } from '../../gis/models/GeoPoint';

export class WaveSensorAdapter implements Sensor {
  public id: string;
  public name: string;
  public type: SensorType = SensorType.WAVE;
  public location: GeoPoint;
  public zoneId: string;
  public status: SensorStatus = 'ONLINE';
  public capabilities = ['WAVE_HEIGHT', 'WAVE_PERIOD'] as const;
  public metadata = {
    manufacturer: 'Datawell',
    model: 'Directional Waverider DWR-MKIII',
    firmwareVersion: 'v4.1.0',
    installationDate: '2024-11-20',
    calibrationDate: '2025-12-05',
    samplingIntervalSeconds: 3,
    batteryPowered: true,
    communicationProtocol: 'MQTT' as const,
  };
  public sourceMode: 'SIMULATION' | 'REAL_SENSOR';

  constructor(
    id: string = 'WAVE-BUOY-01',
    name: string = 'Offshore Wave Rider Buoy (Zone B Deep Surf)',
    location: GeoPoint = { latitude: 17.7085, longitude: 83.3210 },
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
      batteryLevel: 89,
      signalStrength: 85,
      errorRate: 0.02,
      latencyMs: 78,
      uptimeSeconds: 84000,
    };
  }

  public generateReading(
    simWaveHeight: number,
    currentTime: number,
    timeDisplay: string
  ): SensorReading<number> {
    let value = simWaveHeight;
    let confidence = 0.97;

    if (this.sourceMode === 'REAL_SENSOR') {
      const buoyBob = Math.sin(currentTime * 0.8) * 0.05;
      value = Number((simWaveHeight + buoyBob).toFixed(2));
      confidence = 0.95;
    }

    if (this.status === 'DEGRADED') {
      confidence = 0.60;
      value *= 0.7; // Dampened faulty sensor
    }

    return {
      sensorId: this.id,
      sensorType: SensorType.WAVE,
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
