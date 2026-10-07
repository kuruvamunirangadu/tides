import { Visitor, AwarenessState } from '../../models/Visitor';
import { Environment } from '../../models/Environment';
import { Zone } from '../../models/Zone';
import { Position } from '../../models/Incident';

export class SensoryPerceptionEngine {
  /**
   * Evaluates direct person-to-shore tactile and visual sensory cues:
   * 1. Sand liquefaction & strong undertow pull beneath feet
   * 2. Abrupt water drawdown (ocean receding before surging wave)
   * 3. Rapid tidal inundation & cut-off behind the bather
   * 4. Channelized rip current entrainment
   */
  public static evaluateSensoryPerception(
    visitor: Visitor,
    deltaTime: number,
    environment: Environment,
    currentZone?: Zone,
    zones: Zone[] = []
  ): void {
    if (!visitor.active) return;

    // 1. Calculate local water depth column at bather's coordinate
    const shorelineY = 250 + (environment.tideLevel - 1.2) * 15;
    let depth = 0;
    if (visitor.position.y > shorelineY) {
      const distFromShore = visitor.position.y - shorelineY;
      const baseSlope = 0.018; // 1.8% beach slope
      depth = distFromShore * baseSlope + Math.max(0, (environment.tideLevel - 1.2) * 0.4);

      // Bathymetric trench deepening in rip channel (x: 300 to 540)
      if (visitor.position.x >= 300 && visitor.position.x <= 540) {
        depth += 0.45;
      }
    }

    // Depth rate of change (tracking rapid surges or drawdowns)
    const prevDepth = visitor.previousDepth ?? depth;
    const depthRate = deltaTime > 0 ? (depth - prevDepth) / deltaTime : 0;
    visitor.previousDepth = depth;
    visitor.localWaterDepth = Math.round(depth * 100) / 100;
    visitor.depthRateOfChange = Math.round(depthRate * 1000) / 1000;

    // 2. Local water flow velocity magnitude around bather
    const driftSpeed = Math.hypot(visitor.driftVector?.dx || 0, visitor.driftVector?.dy || 0);
    const inRipChannel = (visitor.position.x >= 300 && visitor.position.x <= 540 && visitor.position.y > shorelineY);

    // 3. Evaluate Physical Tactile & Visual Warning Triggers
    const tactileUndertow = (driftSpeed > 18.0 && visitor.localWaterDepth > 0.1 && visitor.localWaterDepth < 0.9);
    const suddenSurge = (depthRate > 0.12 || (environment.waveHeight > 2.2 && visitor.localWaterDepth > 0.2));
    const suddenDrawdown = (depthRate < -0.15 && visitor.driftVector.dy > 12.0);
    const ripEntrainment = (inRipChannel && (environment.currentSpeed ?? environment.waterCurrent ?? 0.3) > 0.65);

    visitor.tactileUndertowDetected = tactileUndertow;
    visitor.suddenSurgeDetected = suddenSurge;
    visitor.drawdownDetected = suddenDrawdown;

    // 4. Awareness State Machine Transitions
    const currentAwareness = visitor.awarenessState || 'UNAWARE';

    if (currentAwareness === 'UNAWARE') {
      if (tactileUndertow || suddenSurge || suddenDrawdown || ripEntrainment) {
        visitor.awarenessState = 'SUSPICIOUS';
        // Initialize human reaction delay timer based on individual awareness
        const baseDelay = visitor.reactionDelaySeconds || 1.2;
        const awarenessMod = (1.1 - (visitor.awareness || 0.5));
        visitor.reactionTimer = Math.max(0.6, baseDelay * awarenessMod);
      }
    } else if (currentAwareness === 'SUSPICIOUS') {
      // Countdown reaction delay
      if (visitor.reactionTimer !== undefined) {
        visitor.reactionTimer -= deltaTime;
        if (visitor.reactionTimer <= 0) {
          visitor.awarenessState = 'FLEEING';
          this.computeAndApplyEscapeVector(visitor, environment, zones);
        }
      }
    } else if (currentAwareness === 'FLEEING') {
      // If caught deep in violent rip current with depleted stamina, bather becomes TRAPPED
      if (visitor.localWaterDepth > 1.6 && inRipChannel && visitor.fatigue > 0.75) {
        visitor.awarenessState = 'TRAPPED';
      } else if (visitor.position.y < shorelineY - 30 && visitor.localWaterDepth <= 0.05) {
        // Successfully reached dry safety!
        visitor.awarenessState = 'UNAWARE';
        visitor.escapeVector = undefined;
        visitor.state = 'BEACH';
      } else {
        // Continuously refresh escape vector while fleeing
        this.computeAndApplyEscapeVector(visitor, environment, zones);
      }
    } else if (currentAwareness === 'TRAPPED') {
      // Swimmer is isolated or exhausted; needs rescue assistance
      if (visitor.position.y < shorelineY && visitor.localWaterDepth <= 0.1) {
        visitor.awarenessState = 'UNAWARE';
        visitor.escapeVector = undefined;
      }
    }
  }

  /**
   * Computes the intelligent escape vector based on local bathymetry & hydrodynamic conditions:
   * - Deep Rip Channel -> Lateral Traverse (parallel to shore along X-axis out of the trench)
   * - Shallow / Swash Zone -> Directional gradient toward highest dry sand dunes (Y <= 100)
   */
  public static computeAndApplyEscapeVector(
    visitor: Visitor,
    environment: Environment,
    zones: Zone[]
  ): { dx: number; dy: number } {
    let escapeDir = { dx: 0, dy: -1 }; // Default straight to backshore
    const inRipChannel = (visitor.position.x >= 300 && visitor.position.x <= 540);

    if (visitor.localWaterDepth > 1.1 && inRipChannel) {
      // CAUGHT IN OFFSHORE RIP JET:
      // Escape parallel to shore: Move laterally along X-axis to exit narrow rip channel into shallow sandbars
      const channelCenter = 420;
      const lateralDir = visitor.position.x >= channelCenter ? 1.0 : -1.0;
      escapeDir = { dx: lateralDir, dy: -0.2 }; // Lateral with slight shoreward angle

      const targetX = lateralDir > 0 ? 580 : 260;
      visitor.targetSafetyCoord = { x: targetX, y: Math.max(160, visitor.position.y - 40) };
      visitor.targetPosition = { ...visitor.targetSafetyCoord };
    } else {
      // IN SHALLOW WATER / SWASH / BEACH:
      // Move toward highest dry sand dunes / backshore elevation
      const safeX = visitor.position.x;
      const safeY = 60; // Safe dry dune line
      const angle = Math.atan2(safeY - visitor.position.y, safeX - visitor.position.x);

      escapeDir = {
        dx: Math.cos(angle),
        dy: Math.sin(angle),
      };

      visitor.targetSafetyCoord = { x: safeX, y: safeY };
      visitor.targetPosition = { ...visitor.targetSafetyCoord };
    }

    visitor.escapeVector = escapeDir;
    return escapeDir;
  }

  /**
   * Triggered when acoustic sirens, drone loudspeakers, or geofence push alerts broadcast to bathers.
   * Immediately overcomes human hesitation and triggers active FLEEING along safe escape vector.
   */
  public static propagateSystemWarning(
    visitor: Visitor,
    environment: Environment,
    zones: Zone[],
    warningSource: 'ACOUSTIC_SIREN' | 'DRONE_LOUDSPEAKER' | 'GEOFENCE_PUSH'
  ): void {
    if (!visitor.active) return;

    visitor.warningCount += 1;
    visitor.awarenessState = 'FLEEING';
    visitor.reactionTimer = 0;
    this.computeAndApplyEscapeVector(visitor, environment, zones);
  }
}

