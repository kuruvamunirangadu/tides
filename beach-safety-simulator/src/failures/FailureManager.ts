import { FailureEvent, FailureType, FailureSeverity } from './types/FailureTypes';
import { NetworkSimulator, NetworkCondition } from './network/NetworkSimulator';
import { PositionReading, SensorConflict, SensorReading } from './sensors/SensorReading';
import { Position } from '../models/Incident';

export class FailureManager {
  private activeFailures: Map<string, FailureEvent> = new Map();
  private networkSimulator: NetworkSimulator = new NetworkSimulator();
  private gpsErrorMeters: number = 0;
  private isNightMode: boolean = false;
  private isCameraOffline: boolean = false;
  private isWaveSensorOffline: boolean = false;
  private isCurrentSensorOffline: boolean = false;
  private activeConflict?: SensorConflict;

  public getNetworkSimulator(): NetworkSimulator {
    return this.networkSimulator;
  }

  public getActiveFailures(): FailureEvent[] {
    return Array.from(this.activeFailures.values()).filter((f) => f.active);
  }

  public injectFailure(
    type: FailureType,
    name: string,
    description: string,
    severity: FailureSeverity = 'HIGH',
    targetId?: string,
    duration?: number,
    parameters?: Record<string, any>
  ): FailureEvent {
    const id = `FAIL-${type}-${Date.now().toString().slice(-4)}`;
    const event: FailureEvent = {
      id,
      type,
      targetId,
      severity,
      startTime: Date.now() / 1000,
      duration,
      active: true,
      name,
      description,
      parameters,
    };

    this.activeFailures.set(id, event);
    this.applyFailureState(event);
    return event;
  }

  public removeFailure(id: string): void {
    const f = this.activeFailures.get(id);
    if (f) {
      f.active = false;
      this.revertFailureState(f);
      this.activeFailures.delete(id);
    }
  }

  public clearAllFailures(): void {
    this.activeFailures.forEach((f) => {
      this.revertFailureState(f);
    });
    this.activeFailures.clear();
    this.gpsErrorMeters = 0;
    this.isNightMode = false;
    this.isCameraOffline = false;
    this.isWaveSensorOffline = false;
    this.isCurrentSensorOffline = false;
    this.activeConflict = undefined;
    this.networkSimulator.setCondition('NORMAL');
  }

  private applyFailureState(f: FailureEvent): void {
    switch (f.type) {
      case 'GPS_ERROR':
        this.gpsErrorMeters = f.parameters?.errorRadius || 35;
        break;
      case 'NIGHT_MODE':
        this.isNightMode = true;
        break;
      case 'CAMERA_FAILURE':
        this.isCameraOffline = true;
        break;
      case 'SENSOR_FAILURE':
        if (f.targetId === 'WAVE_SENSOR') this.isWaveSensorOffline = true;
        if (f.targetId === 'CURRENT_SENSOR') this.isCurrentSensorOffline = true;
        break;
      case 'NETWORK_FAILURE':
        this.networkSimulator.setCondition(f.parameters?.condition || 'DEGRADED');
        break;
      case 'CONFLICTING_SENSORS':
        this.activeConflict = {
          parameter: 'WAVE_HEIGHT',
          sensorIds: ['BUOY_SENSOR_01', 'BUOY_SENSOR_02', 'CCTV_ESTIMATE'],
          readings: [
            { source: 'Acoustic Buoy 01', value: 2.3, confidence: 0.9 },
            { source: 'Optical Sensor 02', value: 0.8, confidence: 0.6 },
            { source: 'Vision Model', value: 2.1, confidence: 0.85 },
          ],
          disagreementScore: 0.72,
          resolvedValue: 1.95,
          resolutionMethod: 'WEIGHTED',
        };
        break;
      default:
        break;
    }
  }

  private revertFailureState(f: FailureEvent): void {
    switch (f.type) {
      case 'GPS_ERROR':
        this.gpsErrorMeters = 0;
        break;
      case 'NIGHT_MODE':
        this.isNightMode = false;
        break;
      case 'CAMERA_FAILURE':
        this.isCameraOffline = false;
        break;
      case 'SENSOR_FAILURE':
        if (f.targetId === 'WAVE_SENSOR') this.isWaveSensorOffline = false;
        if (f.targetId === 'CURRENT_SENSOR') this.isCurrentSensorOffline = false;
        break;
      case 'NETWORK_FAILURE':
        this.networkSimulator.setCondition('NORMAL');
        break;
      case 'CONFLICTING_SENSORS':
        this.activeConflict = undefined;
        break;
      default:
        break;
    }
  }

  public getGPSReading(actualPos: Position): PositionReading {
    if (this.gpsErrorMeters === 0) {
      return {
        actual: actualPos,
        estimated: { ...actualPos },
        errorRadius: 2,
        confidence: 0.98,
        status: 'VALID',
      };
    }

    // Offset coordinates by simulated error radius
    const angle = (Date.now() / 2000) * Math.PI;
    const offsetX = Math.cos(angle) * this.gpsErrorMeters;
    const offsetY = Math.sin(angle) * this.gpsErrorMeters;

    return {
      actual: actualPos,
      estimated: {
        x: Math.round(actualPos.x + offsetX),
        y: Math.round(actualPos.y + offsetY),
      },
      errorRadius: this.gpsErrorMeters,
      confidence: Math.max(0.4, 1.0 - this.gpsErrorMeters / 60),
      status: 'DEGRADED',
    };
  }

  public getNightMode(): boolean {
    return this.isNightMode;
  }

  public isCameraActive(): boolean {
    return !this.isCameraOffline;
  }

  public isWaveSensorActive(): boolean {
    return !this.isWaveSensorOffline;
  }

  public isCurrentSensorActive(): boolean {
    return !this.isCurrentSensorOffline;
  }

  public getSensorConflict(): SensorConflict | undefined {
    return this.activeConflict;
  }

  public getGPSErrorMeters(): number {
    return this.gpsErrorMeters;
  }
}
