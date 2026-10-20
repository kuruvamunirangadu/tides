import { BeachTerrain } from '../BeachTerrain';
import { RescueResourceState3D } from './rescue.types';

export interface NavigationStepResult {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  hasArrived: boolean;
  distanceRemaining: number;
}

/**
 * RescueNavigation.ts
 * 
 * Smooth waypoint navigation for rescue boats and lifeguards:
 * - Smooth yaw rotation towards destination vector (no snapping)
 * - Acceleration and bounded velocity progression
 * - Dynamic arrival detection within assistance radius
 * - Terrain elevation snapping for lifeguards, water surface tracking for boats
 */
export class RescueNavigation {
  public static step(
    resource: RescueResourceState3D,
    targetX: number,
    targetY: number,
    targetZ: number,
    delta: number,
    arrivalRadius: number = 4.5
  ): NavigationStepResult {
    const dx = targetX - resource.currentX;
    const dz = targetZ - resource.currentZ;
    const dist = Math.hypot(dx, dz);

    if (dist <= arrivalRadius) {
      return {
        x: resource.currentX,
        y: resource.currentY,
        z: resource.currentZ,
        rotationY: resource.rotationY,
        hasArrived: true,
        distanceRemaining: dist,
      };
    }

    // 1. Calculate target heading (Three.js Z forward/backward)
    const targetHeading = Math.atan2(dx, dz);

    // 2. Shortest-arc smooth turning
    let diff = targetHeading - resource.rotationY;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    const turnRate = Math.min(1.0, delta * 4.5);
    const newRotationY = resource.rotationY + diff * turnRate;

    // 3. Forward linear step
    const stepDistance = Math.min(dist, delta * resource.speedMps);
    const stepRatio = stepDistance / dist;
    const newX = resource.currentX + dx * stepRatio;
    const newZ = resource.currentZ + dz * stepRatio;

    // 4. Elevation
    let newY = resource.currentY;
    if (resource.type === 'RESCUE_BOAT') {
      newY = 0.08; // Floating on water surface
    } else {
      newY = BeachTerrain.getElevation(newX, newZ);
    }

    return {
      x: newX,
      y: newY,
      z: newZ,
      rotationY: newRotationY,
      hasArrived: dist - stepDistance <= arrivalRadius,
      distanceRemaining: Math.max(0, dist - stepDistance),
    };
  }
}

