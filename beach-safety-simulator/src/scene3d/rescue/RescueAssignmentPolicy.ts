import { RescueResourceState3D } from './rescue.types';

export interface AssignmentDecision {
  selectedResource: RescueResourceState3D | null;
  rationale: string;
  distanceMeters: number;
  estimatedArrivalSec: number;
}

/**
 * RescueAssignmentPolicy.ts
 * 
 * Deterministic, transparent assignment policy:
 * - Offshore deep water incidents (>1.1m depth / rip channels) -> High-Speed Rescue Boat
 * - Shallow surf / nearshore incidents (<1.1m depth) -> Nearest Lifeguard Squad
 * - Evaluates distance, velocity capability, and operational availability
 */
export class RescueAssignmentPolicy {
  public static evaluateAssignment(
    targetX: number,
    targetY: number,
    targetZ: number,
    isDeepWater: boolean,
    resources: RescueResourceState3D[]
  ): AssignmentDecision {
    const available = resources.filter((r) => r.status === 'AVAILABLE');

    if (available.length === 0) {
      return {
        selectedResource: null,
        rationale: 'All rescue fleet units are currently dispatched or unavailable.',
        distanceMeters: 0,
        estimatedArrivalSec: 0,
      };
    }

    // 1. Deep-water rip channel incidents prioritize Rapid Response Rescue Boats
    if (isDeepWater) {
      const boat = available.find((r) => r.type === 'RESCUE_BOAT');
      if (boat) {
        const dx = targetX - boat.currentX;
        const dz = targetZ - boat.currentZ;
        const dist = Math.hypot(dx, dz);
        const eta = Math.max(1.5, dist / boat.speedMps);

        return {
          selectedResource: boat,
          rationale: `Rapid Rescue Boat assigned for offshore deep-water extraction (Distance: ${dist.toFixed(0)}m, ETA: ${eta.toFixed(1)}s, High-Speed Hull).`,
          distanceMeters: dist,
          estimatedArrivalSec: eta,
        };
      }
    }

    // 2. Nearest Lifeguard Squad for nearshore or fallback
    let bestResource: RescueResourceState3D | null = null;
    let minEta = Infinity;
    let bestDist = Infinity;

    for (const res of available) {
      const dx = targetX - res.currentX;
      const dz = targetZ - res.currentZ;
      const dist = Math.hypot(dx, dz);
      const eta = dist / res.speedMps;

      // Boats have higher top speed in water; lifeguards are faster across dry sand
      if (eta < minEta) {
        minEta = eta;
        bestDist = dist;
        bestResource = res;
      }
    }

    if (bestResource) {
      const unitTypeStr = bestResource.type === 'LIFEGUARD' ? 'Lifeguard Rescue Squad' : 'Rescue Boat';
      return {
        selectedResource: bestResource,
        rationale: `${unitTypeStr} assigned as closest available responder (Distance: ${bestDist.toFixed(0)}m, ETA: ${minEta.toFixed(1)}s).`,
        distanceMeters: bestDist,
        estimatedArrivalSec: minEta,
      };
    }

    return {
      selectedResource: null,
      rationale: 'No eligible rescue resource meets incident response criteria.',
      distanceMeters: 0,
      estimatedArrivalSec: 0,
    };
  }
}

