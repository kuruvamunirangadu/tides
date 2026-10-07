import { Environment } from '../../models/Environment';
import { Position } from '../../models/Incident';
import { Zone } from '../../models/Zone';

export class CurrentDrift {
  /**
   * Calculates the drift vector induced by ocean currents, rip channels, and breaking waves.
   * Shoreline is roughly at y = 260. Sea extends downward (y > 260).
   */
  public static calculateDrift(
    pos: Position,
    currentZone: Zone | undefined,
    environment: Environment
  ): { dx: number; dy: number } {
    if (pos.y < 250) {
      return { dx: 0, dy: 0 };
    }

    const currentSpeed = environment.currentSpeed ?? environment.waterCurrent;
    const currentDir = environment.currentDirection ?? 160;

    const rad = ((currentDir - 90) * Math.PI) / 180;
    const baseSpeed = currentSpeed * 15; // Scaled to pixels/sec

    let dx = Math.cos(rad) * baseSpeed;
    let dy = Math.sin(rad) * baseSpeed;

    const ripProb = environment.ripProbability ?? (environment.waterCurrent > 0.8 ? 0.7 : 0.2);

    if (ripProb > 0.4 || (currentZone && currentZone.type === 'RESTRICTED')) {
      const ripStrength = ripProb * 25;
      dy += ripStrength;
      if (pos.x > 400 && pos.x < 700) {
        dy += 15;
      }
    }

    const waveSurge = Math.sin(Date.now() / 1500) * environment.waveHeight * 4;
    dy -= Math.max(0, waveSurge);

    return { dx, dy };
  }
}
