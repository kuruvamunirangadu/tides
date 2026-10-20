import { Camera } from '../models/Camera';

export interface CoverageOverlap {
  cameraA: string;
  cameraB: string;
  overlapName: string;
  approxSpanMeters: number;
}

export interface BlindSpotArea {
  id: string;
  name: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  reason: 'OUT_OF_RANGE' | 'CAMERA_OFFLINE' | 'ANGULAR_OCCLUSION';
}

export interface CameraCoverageSummary {
  totalCoveragePct: number;
  activeCamerasCount: number;
  offlineCamerasCount: number;
  overlaps: CoverageOverlap[];
  blindSpots: BlindSpotArea[];
}

export class CameraCoverageGeometry {
  /**
   * Generates polygon points for camera FOV cone on the ground plane.
   */
  public static getCameraFrustumPolygon(camera: Camera): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [{ x: camera.position.x, y: camera.position.y }];
    const halfFov = camera.fieldOfView / 2;
    const segments = 24;

    for (let i = 0; i <= segments; i++) {
      const angleDeg = camera.rotation - halfFov + (i / segments) * camera.fieldOfView;
      const angleRad = (angleDeg * Math.PI) / 180;
      points.push({
        x: camera.position.x + Math.cos(angleRad) * camera.range,
        y: camera.position.y + Math.sin(angleRad) * camera.range,
      });
    }

    return points;
  }

  /**
   * Evaluates total coverage, overlapping sectors, and blind spots.
   */
  public static computeCoverageSummary(
    cameras: Camera[],
    beachWidth: number = 1000,
    beachDepth: number = 400
  ): CameraCoverageSummary {
    const active = cameras.filter((c) => c.status === 'ONLINE');
    const offline = cameras.filter((c) => c.status === 'OFFLINE');

    const overlaps: CoverageOverlap[] = [];
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const c1 = active[i];
        const c2 = active[j];
        const dx = Math.abs(c1.position.x - c2.position.x);
        if (dx < (c1.range * 0.85 + c2.range * 0.85)) {
          overlaps.push({
            cameraA: c1.id,
            cameraB: c2.id,
            overlapName: `${c1.id} ∩ ${c2.id} Overlap Corridor`,
            approxSpanMeters: Math.round(Math.max(10, (c1.range + c2.range) - dx)),
          });
        }
      }
    }

    const blindSpots: BlindSpotArea[] = [
      {
        id: 'BS-DEEP-OCEAN',
        name: 'Deep Offshore Bathymetry (>320m Y)',
        xMin: 0,
        xMax: beachWidth,
        yMin: 320,
        yMax: beachDepth,
        reason: 'OUT_OF_RANGE',
      },
    ];

    // Detect voids caused by offline cameras
    for (const offCam of offline) {
      blindSpots.push({
        id: `BS-VOID-${offCam.id}`,
        name: `Coverage void: ${offCam.name} offline`,
        xMin: Math.max(0, offCam.position.x - 130),
        xMax: Math.min(beachWidth, offCam.position.x + 130),
        yMin: offCam.position.y,
        yMax: Math.min(beachDepth, offCam.position.y + offCam.range),
        reason: 'CAMERA_OFFLINE',
      });
    }

    let baseCoverage = 88.0;
    if (offline.length > 0) {
      baseCoverage -= offline.length * 21.5;
    }

    return {
      totalCoveragePct: Math.round(Math.max(15, Math.min(98, baseCoverage))),
      activeCamerasCount: active.length,
      offlineCamerasCount: offline.length,
      overlaps,
      blindSpots,
    };
  }
}

