import { VirtualDrone } from '../simulation/VirtualDrone';
import { DroneCapability } from '../models/Drone';
import { DroneMission } from '../models/DroneMission';

export interface AllocationScore {
  droneId: string;
  score: number; // Higher is better
  distanceMeters: number;
  etaSeconds: number;
  batteryPercent: number;
  isAvailable: boolean;
  capable: boolean;
}

export class DroneAllocator {
  /**
   * Find the optimal drone to handle an incident or monitoring target
   */
  public static selectBestDrone(
    drones: VirtualDrone[],
    targetPos: { x: number; y: number },
    requiredCapability: DroneCapability,
    priority: number = 2
  ): VirtualDrone | null {
    const candidates: Array<{ drone: VirtualDrone; score: number }> = [];

    for (const drone of drones) {
      // Check capability
      if (!drone.capabilities.includes(requiredCapability)) continue;

      // Check camera status
      if (drone.camera.status === 'OFFLINE') continue;

      // Availability check: 'AVAILABLE' is best, 'PATROLLING' can be pre-empted for Priority 1/2
      const isAvailable = drone.status === 'AVAILABLE';
      const isPreemptible = (drone.status === 'PATROLLING' || drone.status === 'SUPPORTING') && priority <= 2;
      if (!isAvailable && !isPreemptible) continue;

      // Distance & Battery calculation
      const dx = targetPos.x - drone.canvasPosition.x;
      const dy = targetPos.y - drone.canvasPosition.y;
      const dist = Math.hypot(dx, dy);
      const eta = dist / 12.0; // 12 m/s cruise

      // Reserve check (need enough battery to reach, monitor 2 mins, and return)
      const roundTripDist = dist + Math.hypot(targetPos.x - drone.homePosition.x, targetPos.y - drone.homePosition.y);
      const estFlightTimeSec = (roundTripDist / 12.0) + 120;
      const estDrainPercent = (estFlightTimeSec / 60) * drone.battery.consumptionRatePercentPerMin;
      if (drone.batteryLevel - estDrainPercent < drone.battery.minimumReturnPercent) {
        continue; // Insufficient battery margin
      }

      // Scoring: 50% Battery, 50% Proximity
      const proximityScore = Math.max(0, 100 - (dist / 10)); // 0-1000m -> 100-0
      const batteryScore = drone.batteryLevel;
      const statusBonus = isAvailable ? 20 : 0;

      const score = proximityScore * 0.4 + batteryScore * 0.4 + statusBonus;
      candidates.push({ drone, score });
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].drone;
  }
}
