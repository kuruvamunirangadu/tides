import { Beach } from '../../models/Beach';
import { Environment } from '../../models/Environment';
import { Visitor } from '../../models/Visitor';
import { BeachTerrain } from '../BeachTerrain';
import { AnimationState3D, Visitor3DTransform } from './visitor3d.types';
import { SwimmerMotionAdapter } from './SwimmerMotionAdapter';

/**
 * VisitorCoordinateMapper.ts
 * 
 * Maps 2D simulation coordinates (x, y) to photorealistic 3D world coordinates (X, Y, Z):
 * - Preserves exact relative visitor distribution and coastal boundaries
 * - Aligns feet with 3D beach topography on land
 * - Smoothly transitions across the dynamic shoreline without popping
 * - Maps physical velocity to character yaw heading
 * - Integrates with SwimmerMotionAdapter for dynamic wave surface bobbing, bathymetry, and animation
 */
export class VisitorCoordinateMapper {
  private lastHeadings: Map<string, number> = new Map();

  /**
   * Translates a simulation visitor into a 3D transform
   */
  public map(
    visitor: Visitor,
    beach: Beach,
    environment: Environment
  ): Visitor3DTransform {
    const beachWidth = beach.width || 1000;
    const beachHeight = beach.height || 600;
    const tideOffset = ((environment.tideLevel ?? 1.2) - 1.2) * 15;
    const shorelineY = (beach.shorelineY || 280) + tideOffset;

    // Optional physical motion info from Milestone 13 SwimmerMotionAdapter
    const motionInfo = SwimmerMotionAdapter.getInstance().getSwimmerMotion(visitor.id);

    // Pre-evaluate distress state for animation and water surface height clearance
    const isDistress =
      visitor.state === 'STRUGGLING' ||
      visitor.state === 'DISTRESS' ||
      (visitor.distressLevel ?? 0) > 0.6 ||
      motionInfo?.motionState === 'DISTRESS' ||
      motionInfo?.motionState === 'STRUGGLING';

    // 1. Calculate 3D X coordinate (-100 to +100)
    const normX = Math.max(0, Math.min(1, visitor.position.x / beachWidth));
    const x3d = (normX - 0.5) * 200;

    // 2. Shoreline boundary in 3D for this X
    const shoreZ = BeachTerrain.getShorelineZ(x3d);

    let z3d = shoreZ;
    let y3d = 0;
    let inWater = false;
    let waterDepth = motionInfo?.localDepthMeters ?? 0;

    // A. Visitor is on dry sand / dunes
    if (visitor.position.y < shorelineY) {
      const sandFrac = (shorelineY - visitor.position.y) / Math.max(1, shorelineY);
      z3d = shoreZ + sandFrac * 62; // Extending inland into dunes
      y3d = BeachTerrain.getElevation(x3d, z3d);
      inWater = false;
      waterDepth = 0;
    }
    // B. Visitor is in the ocean
    else {
      const waterFrac = (visitor.position.y - shorelineY) / Math.max(1, beachHeight - shorelineY);
      z3d = shoreZ - waterFrac * 70; // Extending seaward into the surf
      const bedElevation = BeachTerrain.getElevation(x3d, z3d);
      if (!motionInfo) {
        waterDepth = Math.max(0, -bedElevation);
      }
      inWater = true;

      // Shallow wading zone (under 1.1m depth)
      if (waterDepth < 1.1) {
        y3d = bedElevation; // Standing on underwater seabed
      }
      // Deeper swimming water: ensure head and torso breach water surface clearly
      else {
        const waveBob = motionInfo?.waveDisplacementY ?? 0;
        // Elevated water clearance ensures swimming and distress arms/head are unmistakably visible
        if (isDistress) {
          y3d = 0.16 + waveBob;
        } else {
          y3d = 0.04 + waveBob;
        }
      }
    }

    // 3. Heading rotation
    let heading = this.lastHeadings.get(visitor.id) ?? 0;

    if (motionInfo && (motionInfo.resultantVelocity.vx !== 0 || motionInfo.resultantVelocity.vy !== 0)) {
      heading = motionInfo.headingYaw;
      this.lastHeadings.set(visitor.id, heading);
    } else {
      const vx = visitor.velocity?.vx ?? 0;
      const vy = visitor.velocity?.vy ?? 0;
      const speedMag = Math.sqrt(vx * vx + vy * vy);

      if (speedMag > 0.05) {
        // 2D +x -> 3D +x, 2D +y (seaward) -> 3D -z
        heading = Math.atan2(vx, -vy);
        this.lastHeadings.set(visitor.id, heading);
      } else if (visitor.state === 'BEACH' || visitor.state === 'WAITING') {
        // Idle beachgoers naturally look out towards the sea (-Z)
        heading = Math.PI;
      }
    }

    // 4. Map simulation state to 3D animation state
    let animationState: AnimationState3D = 'walk';

    if (motionInfo?.animationState) {
      animationState = motionInfo.animationState;
    } else if (isDistress) {
      animationState = 'distress';
    } else if (visitor.state === 'SWIMMING' || visitor.state === 'DRIFTING') {
      animationState = 'swim';
    } else if (visitor.state === 'WATER_ENTRY') {
      animationState = 'wade';
    } else if (visitor.state === 'EXITING') {
      if (inWater) {
        animationState = waterDepth > 1.1 ? 'swim' : 'wade';
      } else {
        animationState = 'walk';
      }
    } else if (visitor.state === 'BEACH' || visitor.state === 'WAITING') {
      animationState = 'idle';
    } else if (visitor.state === 'WALKING' || visitor.state === 'ENTERING') {
      animationState = inWater ? 'wade' : 'walk';
    } else {
      // Fallback
      if (inWater) {
        animationState = waterDepth > 1.1 ? 'swim' : 'wade';
      } else {
        animationState = 'idle';
      }
    }

    const effectiveSpeed = Math.max(0.4, visitor.speed || 1.0);

    // Compute role classification for 3D overhead badges and indicators
    const isCaution = !isDistress && (
      ((visitor as any).riskLevel && (visitor as any).riskLevel > 0.5) ||
      visitor.vulnerability > 0.6 ||
      (visitor.distressLevel && visitor.distressLevel > 0.3) ||
      (inWater && Math.abs(x3d - 35.5) < 20 && z3d < -15) // Rip hazard corridor
    );

    const roleState = isDistress
      ? 'DISTRESS'
      : isCaution
      ? 'CAUTION'
      : 'NORMAL';

    return {
      x: x3d,
      y: y3d,
      z: z3d,
      rotationY: heading,
      animationState,
      speed: effectiveSpeed,
      inWater,
      waterDepth,
      distress: Boolean(isDistress),
      roleState,
      distressLevel: visitor.distressLevel ?? 0,
      visitorId: visitor.id,
      visitorName: (visitor as any).name || `Swimmer #${visitor.id.slice(-4)}`,
    };
  }

  /**
   * Cleanup on visitor departure
   */
  public removeVisitor(id: string): void {
    this.lastHeadings.delete(id);
  }

  public clear(): void {
    this.lastHeadings.clear();
  }
}

