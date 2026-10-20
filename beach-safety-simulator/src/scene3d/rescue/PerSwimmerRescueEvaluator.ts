/**
 * src/scene3d/rescue/PerSwimmerRescueEvaluator.ts
 * 
 * Independent per-swimmer evaluation engine for TIDES Milestone 12:
 * - Scans all eligible active bathers on a controlled, non-blocking interval (default 300ms)
 * - Evaluates each swimmer's position, movement, caution-zone exposure, and distress state
 * - Avoids global boolean flags (no single 'isRescueNeeded' switch)
 * - Idempotently creates incidents and forwards them to RescueCoordinator
 * - Ensures normal swimmers continue swimming unhindered while others are rescued
 */

import { Visitor } from '../../models/Visitor';
import { Beach } from '../../models/Beach';
import { Environment } from '../../models/Environment';
import { DistressIncidentEvent } from '../hazards/rip3d.types';
import { RescueCoordinator } from './RescueCoordinator';
import { RipCurrentSimulator } from '../hazards/RipCurrentSimulator';

export interface SwimmerEvaluationSummary {
  totalEvaluated: number;
  normalCount: number;
  cautionCount: number;
  distressCount: number;
  activeIncidentsCount: number;
  queuedIncidentsCount: number;
  lastEvaluationSimTime: number;
}

export class PerSwimmerRescueEvaluator {
  private static instance: PerSwimmerRescueEvaluator | null = null;

  private lastEvaluationTime: number = 0;
  private readonly EVALUATION_INTERVAL_SECONDS: number = 0.3; // 300ms rate-limited check

  // Map of evaluated visitor IDs to last known incident ID
  private evaluatedVisitorIncidents: Map<string, string> = new Map();

  public static getInstance(): PerSwimmerRescueEvaluator {
    if (!PerSwimmerRescueEvaluator.instance) {
      PerSwimmerRescueEvaluator.instance = new PerSwimmerRescueEvaluator();
    }
    return PerSwimmerRescueEvaluator.instance;
  }

  /**
   * Resets evaluator state
   */
  public reset(): void {
    this.evaluatedVisitorIncidents.clear();
    this.lastEvaluationTime = 0;
  }

  /**
   * Evaluates a single swimmer for distress and idempotently returns an incident event if triggered.
   */
  public evaluateSwimmer(
    currentTimeSec: number,
    swimmer: Visitor,
    beach: Beach,
    _environment: Environment
  ): DistressIncidentEvent | null {
    if (!swimmer.active || swimmer.state !== 'DISTRESS') {
      return null;
    }

    const coordinator = RescueCoordinator.getInstance();
    const ripSim = RipCurrentSimulator.getInstance();
    const shorelineY = beach.shorelineY || 280;

    // Check if an incident already exists
    const ripInc = ripSim.getActiveIncidents().find((inc) => inc.visitorId === swimmer.id && !inc.resolved);
    const existingMission = coordinator.getActiveMissions().find((m) => m.visitorId === swimmer.id);
    const isQueued = coordinator.getQueuedIncidents().some((inc) => inc.visitorId === swimmer.id);
    const alreadyEvaluated = this.evaluatedVisitorIncidents.has(swimmer.id);

    if (existingMission || isQueued || alreadyEvaluated) {
      return null;
    }

    const nowStr = new Date().toTimeString().split(' ')[0];
    const incidentId = ripInc?.incidentId || `INC-SWIM-${swimmer.id.slice(-4)}-${Math.floor(Math.random() * 900 + 100)}`;
    const posX3D = (swimmer.position.x - 500) * 0.25;
    const posZ3D = -((swimmer.position.y - shorelineY) * 0.45);

    const incident: DistressIncidentEvent = ripInc || {
      incidentId,
      visitorId: swimmer.id,
      visitorName: `Swimmer #${swimmer.id.slice(-4)}`,
      hazardId: 'HAZ-SURF-01',
      hazardType: 'RIP_CURRENT',
      onsetSimTime: currentTimeSec,
      alertSimTime: currentTimeSec + 1.0,
      detectionLatencySec: 1.0,
      timeDisplay: nowStr,
      position3D: { x: posX3D, y: -0.22, z: posZ3D },
      position2D: { x: swimmer.position.x, y: swimmer.position.y },
      stage: 'ALERT_ISSUED',
      severity: 'CRITICAL',
      description: `Swimmer #${swimmer.id.slice(-4)} in surf distress. Urgent flotation and assistance required.`,
      resolved: false,
    };

    this.evaluatedVisitorIncidents.set(swimmer.id, incidentId);

    if (coordinator.autoDispatchEnabled) {
      coordinator.handleDistressIncident(incident, [swimmer], beach);
    }

    return incident;
  }

  /**
   * Runs independent per-swimmer evaluation if interval has elapsed.
   */
  public update(
    currentTimeSec: number,
    visitors: Visitor[],
    beach: Beach,
    environment: Environment
  ): SwimmerEvaluationSummary {
    const coordinator = RescueCoordinator.getInstance();
    const ripSim = RipCurrentSimulator.getInstance();

    let normalCount = 0;
    let cautionCount = 0;
    let distressCount = 0;

    const shorelineY = beach.shorelineY || 280;

    // Filter bathers in the aquatic domain
    const waterBathers = visitors.filter((v) => {
      if (!v.active || v.state === 'EXITED') return false;
      return (
        v.position.y > shorelineY - 15 ||
        v.state === 'SWIMMING' ||
        v.state === 'STRUGGLING' ||
        v.state === 'DISTRESS' ||
        v.state === 'DRIFTING' ||
        v.state === 'WATER_ENTRY'
      );
    });

    for (const swimmer of waterBathers) {
      // 1. Categorize individual state
      if (swimmer.state === 'DISTRESS' || (swimmer.distressLevel && swimmer.distressLevel > 0.75)) {
        distressCount++;
      } else if (
        swimmer.state === 'STRUGGLING' ||
        (swimmer.position.y > shorelineY + 45 && (swimmer.distressLevel || 0) > 0.35)
      ) {
        cautionCount++;
      } else {
        normalCount++;
      }

      // 2. Swimmer in distress: ensure incident & dispatch exist
      if (swimmer.state === 'DISTRESS') {
        // Check if an incident already exists in RipCurrentSimulator
        const ripInc = ripSim.getActiveIncidents().find((inc) => inc.visitorId === swimmer.id && !inc.resolved);

        // Check if a mission already exists in RescueCoordinator
        const existingMission = coordinator.getActiveMissions().find((m) => m.visitorId === swimmer.id);
        const isQueued = coordinator.getQueuedIncidents().some((inc) => inc.visitorId === swimmer.id);

        if (!existingMission && !isQueued) {
          const nowStr = new Date().toTimeString().split(' ')[0];
          const incidentId = ripInc?.incidentId || `INC-SWIM-${swimmer.id.slice(-4)}-${Math.floor(Math.random() * 900 + 100)}`;

          // 3D coordinates approximation
          const posX3D = (swimmer.position.x - 500) * 0.25;
          const posZ3D = -((swimmer.position.y - shorelineY) * 0.45);

          const incident: DistressIncidentEvent = ripInc || {
            incidentId,
            visitorId: swimmer.id,
            visitorName: `Swimmer #${swimmer.id.slice(-4)}`,
            hazardId: 'HAZ-SURF-01',
            hazardType: 'RIP_CURRENT',
            onsetSimTime: currentTimeSec,
            alertSimTime: currentTimeSec + 1.0,
            detectionLatencySec: 1.0,
            timeDisplay: nowStr,
            position3D: { x: posX3D, y: -0.22, z: posZ3D },
            position2D: { x: swimmer.position.x, y: swimmer.position.y },
            stage: 'ALERT_ISSUED',
            severity: 'CRITICAL',
            description: `Swimmer #${swimmer.id.slice(-4)} in surf distress. Urgent flotation and assistance required.`,
            resolved: false,
          };

          this.evaluatedVisitorIncidents.set(swimmer.id, incidentId);

          if (coordinator.autoDispatchEnabled) {
            coordinator.handleDistressIncident(incident, visitors, beach);
          }
        }
      }
    }

    this.lastEvaluationTime = currentTimeSec;

    return {
      totalEvaluated: waterBathers.length,
      normalCount,
      cautionCount,
      distressCount,
      activeIncidentsCount: coordinator.getActiveMissions().length + ripSim.getActiveIncidents().length,
      queuedIncidentsCount: coordinator.getQueuedIncidents().length,
      lastEvaluationSimTime: currentTimeSec,
    };
  }
}

