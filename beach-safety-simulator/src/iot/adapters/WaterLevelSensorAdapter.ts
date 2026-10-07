import { Sensor, SensorType, SensorStatus, SensorHealth } from '../models/Sensor';
import { SensorReading } from '../models/SensorReading';
import { GeoPoint } from '../../gis/models/GeoPoint';

export class WaterLevelSensorAdapter implements Sensor {
  public id: string;
  public name: string;
  public type: SensorType = SensorType.WATER_LEVEL;
  public location: GeoPoint;
  public zoneId: string;
  public status: SensorStatus = 'ONLINE';
  public capabilities = ['TIDE_HEIGHT'] as const;
  public metadata = {
    manufacturer: 'Vega',
    model: 'VEGAPULS C 21 Non-contact Radar',
    firmwareVersion: 'v1.2.0',
    installationDate: '2025-03-01',
    calibrationDate: '2026-02-15',
    samplingIntervalSeconds: 5,
    batteryPowered: false,
    communicationProtocol: 'MQTT' as const,
  };
  public sourceMode: 'SIMULATION' | 'REAL_SENSOR';

  constructor(
    id: string = 'RADAR-LEVEL-02',
    name: string = 'Pier Head Non-contact Radar Water Level Sensor',
    location: GeoPoint = { latitude: 17.7118, longitude: 83.3220 },
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
      signalStrength: 90,
      batteryLevel: 100,
      errorRate: 0.01,
      latencyMs: 40,
      uptimeSeconds: 98000,
    };
  }

  public generateReading(
    simTideLevel: number,
    currentTime: number,
    timeDisplay: string
  ): SensorReading<number> {
    const value = Number((simTideLevel + 0.02).toFixed(2));
    return {
      sensorId: this.id,
      sensorType: SensorType.WATER_LEVEL,
      timestamp: currentTime,
      timeDisplay,
      value,
      unit: 'm',
      location: this.location,
      confidence: 0.97,
      status: this.status === 'OFFLINE' ? 'FAILED' : 'VALID',
      source: this.sourceMode === 'REAL_SENSOR' ? 'REAL_SENSOR' : 'SIMULATOR',
    };
  }
}

export class GPSAdapter implements Sensor {
  public id: string;
  public name: string;
  public type: SensorType = SensorType.GPS;
  public location: GeoPoint;
  public zoneId: string;
  public status: SensorStatus = 'ONLINE';
  public capabilities = ['GEOLOCATION'] as const;
  public metadata = {
    manufacturer: 'Garmin / Marine AIS',
    model: 'inReach Mini 2 / AIS Class B',
    firmwareVersion: 'v3.1.2',
    installationDate: '2025-01-01',
    calibrationDate: '2026-01-01',
    samplingIntervalSeconds: 1,
    batteryPowered: true,
    communicationProtocol: 'MQTT' as const,
  };
  public sourceMode: 'SIMULATION' | 'REAL_SENSOR';

  constructor(
    id: string = 'GPS-LIFEGUARD-01',
    name: string = 'Lifeguard Rescue Squad 1 GPS Beacon',
    location: GeoPoint = { latitude: 17.7115, longitude: 83.3165 },
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
      signalStrength: 88,
      batteryLevel: 82,
      errorRate: 0.01,
      latencyMs: 60,
      uptimeSeconds: 45000,
    };
  }

  public generateReading(
    currentPos: GeoPoint,
    currentTime: number,
    timeDisplay: string
  ): SensorReading<GeoPoint> {
    return {
      sensorId: this.id,
      sensorType: SensorType.GPS,
      timestamp: currentTime,
      timeDisplay,
      value: currentPos,
      unit: 'WGS84_GEO',
      location: currentPos,
      confidence: 0.99,
      status: this.status === 'OFFLINE' ? 'FAILED' : 'VALID',
      source: this.sourceMode === 'REAL_SENSOR' ? 'REAL_SENSOR' : 'SIMULATOR',
    };
  }
}
