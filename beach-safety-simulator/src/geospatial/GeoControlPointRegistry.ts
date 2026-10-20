/**
 * src/geospatial/GeoControlPointRegistry.ts
 * 
 * Geographic Control Point Registry for TIDES Rushikonda 1 km Coastal Digital Twin.
 * 
 * Manages 8 surveyed ground control points (GCPs) and independent checkpoints distributed
 * across the 1,008m shoreline crescent of Rushikonda Blue Flag Beach:
 * - South Basalt Promontory to North Headland
 * - Surveyed GPS coordinates (WGS84)
 * - Three.js 3D world coordinates (X, Y, Z)
 * - Source imagery pixel coordinates (u, v) in rushikonda_aerial.png
 * - Automated residual evaluation & Root-Mean-Square Error (RMSE) validation
 */

import { GeoCoordinateWGS84 } from './BeachCalibrationProfile';
import { GeoCoordinateTransform } from './GeoCoordinateTransform';

export type ControlPointCategory =
  | 'HEADLAND'
  | 'WATCHTOWER'
  | 'SHORELINE_BEND'
  | 'PROMENADE_DATUM'
  | 'HAZARD_FEATURE'
  | 'BOAT_LAUNCH';

export type VerificationStatus = 'VERIFIED' | 'INDEPENDENT_CHECKPOINT' | 'UNVERIFIED';

export type PointProvenance =
  | 'SURVEYED_GNSS'
  | 'GEOREFERENCED_ORTHOPHOTO'
  | 'COASTAL_BENCHMARK'
  | 'MANUAL_ESTIMATE';

export interface GeoControlPoint {
  id: string;
  name: string;
  category: ControlPointCategory;
  coordinatesWGS84: GeoCoordinateWGS84;
  local3DPosition: { x: number; y: number; z: number };
  imagePixels?: { u: number; v: number };
  provenance: PointProvenance;
  verificationStatus: VerificationStatus;
  uncertaintyMeters: number;
  description: string;
}

export interface CalibrationResiduals {
  pointResiduals: Map<string, { residualMeters: number; dxMeters: number; dzMeters: number }>;
  overallRmseMeters: number;
  checkPointRmseMeters: number;
  maxResidualMeters: number;
  isWithinTolerance: boolean; // RMSE < 2.5m tolerance
}

export const INITIAL_RUSHIKONDA_CONTROL_POINTS: GeoControlPoint[] = [
  {
    id: 'CP-01',
    name: 'South Basalt Rocky Promontory',
    category: 'HEADLAND',
    coordinatesWGS84: { latitude: 17.779240, longitude: 83.384650, altitudeMeters: 4.8 },
    local3DPosition: { x: -81.74, y: 1.3, z: -23.87 },
    imagePixels: { u: 160, v: 910 },
    provenance: 'COASTAL_BENCHMARK',
    verificationStatus: 'VERIFIED',
    uncertaintyMeters: 1.2,
    description: 'Prominent basaltic reef rock formation framing southern boundary of Rushikonda bay',
  },
  {
    id: 'CP-02',
    name: 'South Blue Flag Watchtower',
    category: 'WATCHTOWER',
    coordinatesWGS84: { latitude: 17.780520, longitude: 83.384380, altitudeMeters: 3.2 },
    local3DPosition: { x: -59.58, y: -0.3, z: -5.32 },
    imagePixels: { u: 320, v: 760 },
    provenance: 'SURVEYED_GNSS',
    verificationStatus: 'VERIFIED',
    uncertaintyMeters: 0.8,
    description: 'Permanent elevated lifeguard tower #1 overlooking southern shallow bathing zone',
  },
  {
    id: 'CP-03',
    name: 'Central Bathing Crescent Apex',
    category: 'SHORELINE_BEND',
    coordinatesWGS84: { latitude: 17.781750, longitude: 83.384500, altitudeMeters: 1.2 },
    local3DPosition: { x: -34.44, y: -2.3, z: 5.43 },
    imagePixels: { u: 580, v: 610 },
    provenance: 'GEOREFERENCED_ORTHOPHOTO',
    verificationStatus: 'INDEPENDENT_CHECKPOINT',
    uncertaintyMeters: 1.5,
    description: 'Natural crescent bend of the swash zone where water currents transition',
  },
  {
    id: 'CP-04',
    name: 'Rushikonda Blue Flag Promenade Datum',
    category: 'PROMENADE_DATUM',
    coordinatesWGS84: { latitude: 17.783000, longitude: 83.385500, altitudeMeters: 3.5 },
    local3DPosition: { x: 0.0, y: 0.0, z: 0.0 },
    imagePixels: { u: 720, v: 540 },
    provenance: 'SURVEYED_GNSS',
    verificationStatus: 'VERIFIED',
    uncertaintyMeters: 0.5,
    description: 'Central plaza flagpole and main pedestrian boardwalk origin anchor point',
  },
  {
    id: 'CP-05',
    name: 'Primary Rip Current Channel Thalweg',
    category: 'HAZARD_FEATURE',
    coordinatesWGS84: { latitude: 17.784200, longitude: 83.386700, altitudeMeters: -0.8 },
    local3DPosition: { x: 35.49, y: -4.3, z: -9.69 },
    imagePixels: { u: 940, v: 440 },
    provenance: 'SURVEYED_GNSS',
    verificationStatus: 'VERIFIED',
    uncertaintyMeters: 2.1,
    description: 'Submerged bathymetric rip current trench thalweg scoured between central sandbars',
  },
  {
    id: 'CP-06',
    name: 'Water Sports & Jet Ski Launch Ramp',
    category: 'BOAT_LAUNCH',
    coordinatesWGS84: { latitude: 17.785280, longitude: 83.387430, altitudeMeters: 1.5 },
    local3DPosition: { x: 63.88, y: -2.0, z: -11.89 },
    imagePixels: { u: 1220, v: 330 },
    provenance: 'SURVEYED_GNSS',
    verificationStatus: 'VERIFIED',
    uncertaintyMeters: 0.9,
    description: 'Reinforced launch ramp for rescue boats RB-01 and RB-02',
  },
  {
    id: 'CP-07',
    name: 'North Lifeguard Station 2',
    category: 'WATCHTOWER',
    coordinatesWGS84: { latitude: 17.786220, longitude: 83.387920, altitudeMeters: 2.8 },
    local3DPosition: { x: 87.13, y: -0.7, z: -11.09 },
    imagePixels: { u: 1480, v: 220 },
    provenance: 'SURVEYED_GNSS',
    verificationStatus: 'INDEPENDENT_CHECKPOINT',
    uncertaintyMeters: 1.1,
    description: 'Watchtower overlooking northern rocky swimming sector',
  },
  {
    id: 'CP-08',
    name: 'North Rocky Cape & Headland Boundary',
    category: 'HEADLAND',
    coordinatesWGS84: { latitude: 17.787070, longitude: 83.388330, altitudeMeters: 6.2 },
    local3DPosition: { x: 107.81, y: 2.7, z: -9.75 },
    imagePixels: { u: 1760, v: 110 },
    provenance: 'COASTAL_BENCHMARK',
    verificationStatus: 'VERIFIED',
    uncertaintyMeters: 1.8,
    description: 'Northern boundary granite headland terminating the 1,008m coastal study reach',
  },
];

export class GeoControlPointRegistry {
  private static instance: GeoControlPointRegistry | null = null;
  private points: Map<string, GeoControlPoint> = new Map();
  private transform: GeoCoordinateTransform;

  public static getInstance(): GeoControlPointRegistry {
    if (!GeoControlPointRegistry.instance) {
      GeoControlPointRegistry.instance = new GeoControlPointRegistry();
    }
    return GeoControlPointRegistry.instance;
  }

  constructor(initialPoints: GeoControlPoint[] = INITIAL_RUSHIKONDA_CONTROL_POINTS) {
    this.transform = GeoCoordinateTransform.getInstance();
    initialPoints.forEach((p) => this.points.set(p.id, { ...p }));
  }

  public getAllControlPoints(): GeoControlPoint[] {
    return Array.from(this.points.values());
  }

  public getVerifiedPoints(): GeoControlPoint[] {
    return this.getAllControlPoints().filter((p) => p.verificationStatus === 'VERIFIED');
  }

  public getActiveControlPoints(): GeoControlPoint[] {
    return this.getVerifiedPoints();
  }

  public getCheckPoints(): GeoControlPoint[] {
    return this.getAllControlPoints().filter((p) => p.verificationStatus === 'INDEPENDENT_CHECKPOINT');
  }

  public getCheckpoints(): GeoControlPoint[] {
    return this.getCheckPoints();
  }

  public getPointById(id: string): GeoControlPoint | undefined {
    return this.points.get(id);
  }

  public addControlPoint(point: GeoControlPoint): void {
    this.points.set(point.id, { ...point });
  }

  public updateControlPoint(id: string, updates: Partial<GeoControlPoint>): void {
    const existing = this.points.get(id);
    if (existing) {
      this.points.set(id, { ...existing, ...updates });
    }
  }

  /**
   * Evaluates registration residuals (discrepancy between surveyed GPS projected into 3D
   * versus physical 3D scene placement) and computes RMSE metrics.
   */
  public calculateResiduals(): CalibrationResiduals {
    const residuals = new Map<string, { residualMeters: number; dxMeters: number; dzMeters: number }>();
    let sumSqAll = 0;
    let sumSqCheck = 0;
    let maxResidual = 0;
    let countCheck = 0;

    const all = this.getAllControlPoints();

    for (const cp of all) {
      // Forward projection: GPS -> 3D
      const projected = this.transform.wgs84ToThree(cp.coordinatesWGS84);

      // In real-world scale (1 Three.js unit = 5.0m real world in 1km:200m scale)
      const scaleToReal = 5.0;
      const dxReal = (projected.x - cp.local3DPosition.x) * scaleToReal;
      const dzReal = (projected.z - cp.local3DPosition.z) * scaleToReal;
      const resMeters = Math.hypot(dxReal, dzReal);

      residuals.set(cp.id, {
        residualMeters: Math.round(resMeters * 100) / 100,
        dxMeters: Math.round(dxReal * 100) / 100,
        dzMeters: Math.round(dzReal * 100) / 100,
      });

      sumSqAll += resMeters * resMeters;
      if (resMeters > maxResidual) maxResidual = resMeters;

      if (cp.verificationStatus === 'INDEPENDENT_CHECKPOINT') {
        sumSqCheck += resMeters * resMeters;
        countCheck++;
      }
    }

    const overallRmse = all.length > 0 ? Math.sqrt(sumSqAll / all.length) : 0;
    const checkRmse = countCheck > 0 ? Math.sqrt(sumSqCheck / countCheck) : overallRmse;

    return {
      pointResiduals: residuals,
      overallRmseMeters: Math.round(overallRmse * 100) / 100,
      checkPointRmseMeters: Math.round(checkRmse * 100) / 100,
      maxResidualMeters: Math.round(maxResidual * 100) / 100,
      isWithinTolerance: overallRmse < 2.50, // Strict 2.5m tolerance
    };
  }
}
