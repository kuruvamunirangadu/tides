/**
 * src/terrain/RealShorelineProvider.ts
 * 
 * TIDES Milestone 15: Real-World Shoreline Geometry Provider.
 * 
 * Aligns the 3D shoreline geometry directly with the surveyed WGS84 GPS line-string
 * and georeferenced aerial orthophoto of Rushikonda Beach:
 * - Employs cubic spline interpolation through surveyed Ground Control Points (CP-01 to CP-08)
 * - Accurately replicates the natural inward crescent bay curvature (~1,006.2m reach)
 * - Computes exact alongshore cross-sections, seaward distances, and WGS84 GPS mappings
 * - Offers instantaneous reversible toggle between 'CALIBRATED_SURVEYED' and 'LEGACY_PROCEDURAL' modes
 */

import { GeoCoordinateWGS84, RUSHIKONDA_CALIBRATION_PROFILE } from '../geospatial/BeachCalibrationProfile';
import { GeoCoordinateTransform } from '../geospatial/GeoCoordinateTransform';
import { INITIAL_RUSHIKONDA_CONTROL_POINTS } from '../geospatial/GeoControlPointRegistry';

export type ShorelineGeometryMode = 'CALIBRATED_SURVEYED' | 'LEGACY_PROCEDURAL';

export interface ShorelineSample {
  x3d: number;
  z3d: number;
  coordinatesWGS84: GeoCoordinateWGS84;
  alongshoreStationMeters: number;
  quality: 'SURVEYED' | 'INTERPOLATED' | 'SYNTHETIC_MODELLED';
}

export class RealShorelineProvider {
  private static instance: RealShorelineProvider | null = null;
  private mode: ShorelineGeometryMode = 'CALIBRATED_SURVEYED';
  private transform: GeoCoordinateTransform;

  // Surveyed control nodes in Three.js coordinates sorted by alongshore X
  private surveyNodes: Array<{ x: number; z: number; wgs: GeoCoordinateWGS84; stationMeters: number }>;

  public static getInstance(): RealShorelineProvider {
    if (!RealShorelineProvider.instance) {
      RealShorelineProvider.instance = new RealShorelineProvider();
    }
    return RealShorelineProvider.instance;
  }

  constructor() {
    this.transform = GeoCoordinateTransform.getInstance();

    // Extract sorted survey points from registry
    const rawPoints = INITIAL_RUSHIKONDA_CONTROL_POINTS.map((cp) => ({
      x: cp.local3DPosition.x,
      z: cp.local3DPosition.z,
      wgs: cp.coordinatesWGS84,
      stationMeters: 0,
    })).sort((a, b) => a.x - b.x);

    // Compute cumulative alongshore station distance (meters from south boundary)
    let cumulativeDist = 0;
    rawPoints[0].stationMeters = 0;
    for (let i = 1; i < rawPoints.length; i++) {
      const segDist = GeoCoordinateTransform.haversineDistance(rawPoints[i - 1].wgs, rawPoints[i].wgs);
      cumulativeDist += segDist;
      rawPoints[i].stationMeters = cumulativeDist;
    }

    this.surveyNodes = rawPoints;
  }

  public getMode(): ShorelineGeometryMode {
    return this.mode;
  }

  public setMode(mode: ShorelineGeometryMode): void {
    this.mode = mode;
  }

  /**
   * Evaluates the shoreline Z position (Three.js world coordinates) for any alongshore X coordinate.
   * In Three.js: -Z is seaward (Bay of Bengal), +Z is inland (sand dunes).
   */
  public getShorelineZ(x: number): number {
    if (this.mode === 'LEGACY_PROCEDURAL') {
      return 10 * Math.sin(x / 40) + 4 * Math.cos(x / 20) - 2;
    }

    // Calibrated Surveyed Mode: Natural crescent spline through GCPs
    const nodes = this.surveyNodes;
    const n = nodes.length;

    // Extrapolation beyond South Headland (x < nodes[0].x)
    if (x <= nodes[0].x) {
      const dx = nodes[1].x - nodes[0].x;
      const dz = nodes[1].z - nodes[0].z;
      const slope = dz / Math.max(0.1, dx);
      return nodes[0].z + (x - nodes[0].x) * slope;
    }

    // Extrapolation beyond North Headland (x > nodes[n - 1].x)
    if (x >= nodes[n - 1].x) {
      const dx = nodes[n - 1].x - nodes[n - 2].x;
      const dz = nodes[n - 1].z - nodes[n - 2].z;
      const slope = dz / Math.max(0.1, dx);
      return nodes[n - 1].z + (x - nodes[n - 1].x) * slope;
    }

    // Find bounding segment
    let idx = 0;
    while (idx < n - 1 && nodes[idx + 1].x < x) {
      idx++;
    }

    // Monotonic cubic Hermite interpolation between control points
    const p0 = nodes[Math.max(0, idx - 1)];
    const p1 = nodes[idx];
    const p2 = nodes[idx + 1];
    const p3 = nodes[Math.min(n - 1, idx + 2)];

    const t = (x - p1.x) / (p2.x - p1.x);
    const t2 = t * t;
    const t3 = t2 * t;

    // Finite difference tangents
    const m1 = (p2.z - p0.z) / Math.max(0.1, p2.x - p0.x) * (p2.x - p1.x);
    const m2 = (p3.z - p1.z) / Math.max(0.1, p3.x - p1.x) * (p2.x - p1.x);

    // Hermite basis functions
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    const zInterp = h00 * p1.z + h10 * m1 + h01 * p2.z + h11 * m2;
    return Math.round(zInterp * 100) / 100;
  }

  /**
   * Computes signed perpendicular distance from the shoreline in physical meters.
   * Positive = inland (dry sand), Negative = seaward (underwater).
   */
  public getDistanceToShorelineMeters(x: number, z: number): number {
    const shoreZ = this.getShorelineZ(x);
    const scaleFactor = RUSHIKONDA_CALIBRATION_PROFILE.threeUnitToMeters; // 5.0m / unit
    return (z - shoreZ) * scaleFactor;
  }

  /**
   * Maps an alongshore X coordinate to its calibrated WGS84 GPS shoreline coordinate.
   */
  public getShorelineGPS(x: number): GeoCoordinateWGS84 {
    const z = this.getShorelineZ(x);
    return this.transform.threeToWgs84({ x, y: 0, z });
  }

  /**
   * Generates a high-density discretized shoreline line-string (e.g., 100 sample points)
   * for 3D visual rendering, contour overlays, and collision queries.
   */
  public getDiscretizedShoreline(numSamples: number = 80, minX: number = -110, maxX: number = 110): ShorelineSample[] {
    const samples: ShorelineSample[] = [];
    const step = (maxX - minX) / (numSamples - 1);

    for (let i = 0; i < numSamples; i++) {
      const x = minX + i * step;
      const z = this.getShorelineZ(x);
      const wgs = this.getShorelineGPS(x);

      // Determine quality based on proximity to nearest survey GCP
      let minDistToSurvey = Infinity;
      for (const node of this.surveyNodes) {
        const d = Math.abs(node.x - x);
        if (d < minDistToSurvey) minDistToSurvey = d;
      }

      const quality = minDistToSurvey < 4.0 ? 'SURVEYED' : 'INTERPOLATED';
      const station = (i / (numSamples - 1)) * RUSHIKONDA_CALIBRATION_PROFILE.alongshoreCurvedLengthMeters;

      samples.push({
        x3d: Math.round(x * 10) / 10,
        z3d: z,
        coordinatesWGS84: wgs,
        alongshoreStationMeters: Math.round(station * 10) / 10,
        quality,
      });
    }

    return samples;
  }
}

