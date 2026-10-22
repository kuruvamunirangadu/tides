import type { Beach } from './Beach';
import { Environment } from './Environment';
import type { Visitor } from './Visitor';

export type CurrentDataStatus = 'SIMULATED' | 'MEASURED' | 'UNAVAILABLE';
export type CurrentInfluenceCategory = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface CurrentFieldState {
  tideLevelMeters: number;
  tidePhase: NonNullable<Environment['tideStatus']>;
  currentSpeedMps: number;
  currentDirectionDeg: number;
  flowVector: { x: number; z: number };
  waveHeightMeters: number;
  dataStatus: CurrentDataStatus;
  isDemonstration: boolean;
  corridor: {
    centerX3d: number;
    widthMeters: number;
    neckSpeedMps: number;
    plumeRadiusMeters: number;
  };
}

export interface CurrentZoneImpact {
  zoneId: string;
  zoneName: string;
  currentSpeedMps: number;
  currentDirectionDeg: number;
  influenceScore: number;
  category: CurrentInfluenceCategory;
  affected: boolean;
  visitorIds: string[];
  source: CurrentDataStatus;
  reason: string;
}

export interface CoastalCurrentImpact {
  source: CurrentDataStatus;
  stale: boolean;
  tidePhase: CurrentFieldState['tidePhase'];
  currentSpeedMps: number;
  currentDirectionDeg: number;
  affectedZoneIds: string[];
  zoneImpacts: Record<string, CurrentZoneImpact>;
}

const DEFAULT_TIDE_PHASE: NonNullable<Environment['tideStatus']> = 'LOW';

export class CurrentFieldModel {
  public static fromEnvironment(environment: Environment): CurrentFieldState {
    const currentSpeed = environment.currentSpeed ?? environment.waterCurrent;
    const hasCurrent = Number.isFinite(currentSpeed) && currentSpeed >= 0;
    const speed = hasCurrent ? currentSpeed : 0;
    const direction = Number.isFinite(environment.currentDirection)
      ? environment.currentDirection!
      : environment.tideStatus === 'RISING' ? 10 : 190;
    const directionRad = (direction * Math.PI) / 180;
    const tidePhase = environment.tideStatus ?? DEFAULT_TIDE_PHASE;

    return {
      tideLevelMeters: environment.tideLevel,
      tidePhase,
      currentSpeedMps: speed,
      currentDirectionDeg: direction,
      flowVector: { x: Math.cos(directionRad), z: Math.sin(directionRad) },
      waveHeightMeters: environment.waveHeight,
      dataStatus: hasCurrent ? 'SIMULATED' : 'UNAVAILABLE',
      isDemonstration: true,
      corridor: {
        centerX3d: 12,
        widthMeters: 17,
        neckSpeedMps: Math.round(speed * 1.8 * 100) / 100,
        plumeRadiusMeters: 22.5,
      },
    };
  }

  public static assessZones(
    beach: Beach,
    visitors: Visitor[],
    field: CurrentFieldState
  ): CoastalCurrentImpact {
    const zoneImpacts: Record<string, CurrentZoneImpact> = {};
    const affectedZoneIds: string[] = [];

    for (const zone of beach.zones) {
      const centerX2d = zone.x + zone.width / 2;
      const centerX3d = (centerX2d / Math.max(1, beach.width) - 0.5) * 200;
      const distance = Math.abs(centerX3d - field.corridor.centerX3d);
      const corridorHalfWidth = field.corridor.widthMeters / 2;
      const influence = distance <= corridorHalfWidth
        ? 1
        : distance <= field.corridor.plumeRadiusMeters
        ? 0.65
        : 0;
      const tideMultiplier = field.tidePhase === 'LOW' || field.tidePhase === 'HIGH' ? 0.75 : 1;
      const influenceScore = Math.round(Math.min(100, field.currentSpeedMps / 1.2 * influence * tideMultiplier * 100));
      const category = influenceScore >= 80
        ? 'CRITICAL'
        : influenceScore >= 60
        ? 'HIGH'
        : influenceScore >= 35
        ? 'MODERATE'
        : 'LOW';
      const zoneVisitors = visitors.filter(
        (visitor) => visitor.active && (visitor.currentZone === zone.id || (
          visitor.position.x >= zone.x &&
          visitor.position.x <= zone.x + zone.width &&
          visitor.position.y >= zone.y &&
          visitor.position.y <= zone.y + zone.height
        ))
      );
      const affected = influenceScore >= 35;

      if (affected) affectedZoneIds.push(zone.id);
      zoneImpacts[zone.id] = {
        zoneId: zone.id,
        zoneName: zone.name,
        currentSpeedMps: field.currentSpeedMps,
        currentDirectionDeg: field.currentDirectionDeg,
        influenceScore,
        category,
        affected,
        visitorIds: zoneVisitors.map((visitor) => visitor.id),
        source: field.dataStatus,
        reason: affected
          ? `Simulated current influence ${influenceScore}/100 at ${distance.toFixed(1)}m from the rip corridor.`
          : 'Current corridor and plume do not materially overlap this zone.',
      };
    }

    return {
      source: field.dataStatus,
      stale: field.dataStatus === 'UNAVAILABLE',
      tidePhase: field.tidePhase,
      currentSpeedMps: field.currentSpeedMps,
      currentDirectionDeg: field.currentDirectionDeg,
      affectedZoneIds,
      zoneImpacts,
    };
  }
}