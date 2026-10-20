import { PersonTrack } from '../models/PersonTrack';
import { Camera } from '../models/Camera';
import { Environment } from '../../models/Environment';
import { SensorHealthMonitor } from '../../impact-lab/reliability/SensorHealthMonitor';
import { SensorHealthRecord } from '../../impact-lab/types';

export interface SensorDisagreementRecord {
  property: string;
  sourceA: string;
  sourceB: string;
  valA: number;
  valB: number;
  unit: string;
  diff: number;
  severity: 'MILD' | 'SEVERE';
  explanation: string;
  timestamp: number;
}

export interface FusedPerceptionSummary {
  fusionVersion: string;
  timestamp: number;
  activeTracksCount: number;
  swimmersInWaterCount: number;
  avgDriftVelocityMps: number;
  adcpCurrentMps: number;
  waveHeightMeters: number;
  sensorHealths: SensorHealthRecord[];
  disagreements: SensorDisagreementRecord[];
}

export class SensorFusionAdapter {
  private static instance: SensorFusionAdapter | null = null;
  public readonly fusionVersion = 'v1.2.0-milestone7';

  public static getInstance(): SensorFusionAdapter {
    if (!SensorFusionAdapter.instance) {
      SensorFusionAdapter.instance = new SensorFusionAdapter();
    }
    return SensorFusionAdapter.instance;
  }

  public fusePerceptionData(
    tracks: PersonTrack[],
    cameras: Camera[],
    environment: Environment,
    simTime: number
  ): FusedPerceptionSummary {
    const healthMonitor = SensorHealthMonitor.getInstance();
    const sensorHealths = typeof (healthMonitor as any).getAllSensors === 'function' ? (healthMonitor as any).getAllSensors() : [];

    // Swimmers in water
    const activeInWater = tracks.filter(
      (t) => t.active && t.state !== 'EXPIRED' && (t.positions[t.positions.length - 1]?.y ?? 0) >= 260
    );

    const avgDrift =
      activeInWater.length > 0
        ? activeInWater.reduce((acc, t) => acc + t.speed, 0) / activeInWater.length
        : 0;

    const adcpCurrent = environment.waterCurrent ?? environment.currentSpeed ?? 0.35;
    const waveHeight = environment.waveHeight ?? 1.2;

    const disagreements: SensorDisagreementRecord[] = [];

    // Compare vision kinematic drift with ADCP acoustic current
    if (activeInWater.length > 0) {
      const diff = Math.abs(avgDrift - adcpCurrent);
      if (diff > 0.5) {
        disagreements.push({
          property: 'water_current_mps',
          sourceA: 'VISION_KINEMATICS',
          sourceB: 'CURRENT-ADCP-01',
          valA: Number(avgDrift.toFixed(2)),
          valB: Number(adcpCurrent.toFixed(2)),
          unit: 'm/s',
          diff: Number(diff.toFixed(2)),
          severity: diff > 1.0 ? 'SEVERE' : 'MILD',
          explanation: `Vision kinematic swimmer drift (${avgDrift.toFixed(2)} m/s) diverges from acoustic ADCP (${adcpCurrent.toFixed(2)} m/s) by ${diff.toFixed(2)} m/s.`,
          timestamp: simTime,
        });
      }
    }

    // Check for offline / degraded cameras
    for (const cam of cameras) {
      if (cam.status !== 'ONLINE') {
        disagreements.push({
          property: 'camera_availability',
          sourceA: cam.id,
          sourceB: 'SURVEILLANCE_GRID',
          valA: cam.status === 'DEGRADED' ? 0.5 : 0.0,
          valB: 1.0,
          unit: 'health_score',
          diff: cam.status === 'DEGRADED' ? 0.5 : 1.0,
          severity: cam.status === 'OFFLINE' ? 'SEVERE' : 'MILD',
          explanation: `Camera ${cam.name} (${cam.id}) is ${cam.status}. Vision blind spots present in sector.`,
          timestamp: simTime,
        });
      }
    }

    return {
      fusionVersion: this.fusionVersion,
      timestamp: simTime,
      activeTracksCount: tracks.filter((t) => t.active && t.state !== 'EXPIRED').length,
      swimmersInWaterCount: activeInWater.length,
      avgDriftVelocityMps: Number(avgDrift.toFixed(2)),
      adcpCurrentMps: Number(adcpCurrent.toFixed(2)),
      waveHeightMeters: Number(waveHeight.toFixed(2)),
      sensorHealths,
      disagreements,
    };
  }
}

