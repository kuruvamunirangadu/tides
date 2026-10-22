import { Beach } from '../../models/Beach';
import { Environment } from '../../models/Environment';
import { Visitor } from '../../models/Visitor';
import { SwimmerMotionAdapter } from '../../scene3d/visitors/SwimmerMotionAdapter';
import { SwimmerFeelingControlManager, SwimmerFeelingState } from '../../wristbands/feeling/SwimmerFeelingControlManager';

export type SwimmerAssessmentCategory = 'NORMAL_OBSERVED' | 'UNUSUAL_MOVEMENT' | 'ELEVATED_CONCERN' | 'CONFIRMED_DISTRESS' | 'UNAVAILABLE';

export interface SwimmerMovementFeature {
  speedMps: number;
  directionChangeDegrees: number;
  driftAgainstIntentMps: number;
  timeInHazardSeconds: number;
  positionFresh: boolean;
}

export interface SwimmerBehaviorAssessment {
  visitorId: string;
  visitorName: string;
  wristbandId?: string;
  evaluatedAtSimTime: number;
  category: SwimmerAssessmentCategory;
  movement: SwimmerMovementFeature;
  environment: { currentSpeedMps: number; riskContext: 'ELEVATED' | 'NORMAL' | 'UNAVAILABLE' };
  telemetry: { available: boolean; provenance: 'SIMULATED' | 'UNAVAILABLE'; fatiguePercent?: number; heartRateBpm?: number; isSosActive: boolean };
  anomalies: string[];
  explanation: string;
  acknowledged: boolean;
}

interface PositionSample { x: number; y: number; simTime: number; }

export class SwimmerBehaviorAnalysisService {
  private static instance: SwimmerBehaviorAnalysisService | null = null;
  private readonly history = new Map<string, PositionSample[]>();
  private readonly acknowledged = new Set<string>();
  private readonly hazardSeconds = new Map<string, number>();
  private latestAssessments: SwimmerBehaviorAssessment[] = [];

  public static getInstance(): SwimmerBehaviorAnalysisService {
    if (!SwimmerBehaviorAnalysisService.instance) SwimmerBehaviorAnalysisService.instance = new SwimmerBehaviorAnalysisService();
    return SwimmerBehaviorAnalysisService.instance;
  }

  public evaluate(
    visitors: Visitor[],
    beach: Beach,
    environment: Environment,
    simTimeSeconds: number,
    feelings: SwimmerFeelingState[] = SwimmerFeelingControlManager.getInstance().getAllFeelings()
  ): SwimmerBehaviorAssessment[] {
    const motionAdapter = SwimmerMotionAdapter.getInstance();
    const feelingByVisitor = new Map(feelings.map((feeling) => [feeling.visitorId, feeling]));
    const currentSpeed = environment.currentSpeed ?? environment.waterCurrent;
    const currentAvailable = Number.isFinite(currentSpeed);
    const assessments: SwimmerBehaviorAssessment[] = [];

    for (const visitor of visitors) {
      if (!visitor.active || visitor.state === 'EXITED') continue;
      const samples = this.history.get(visitor.id) ?? [];
      const previous = samples[samples.length - 1];
      const previousPrevious = samples[samples.length - 2];
      const elapsed = previous ? simTimeSeconds - previous.simTime : 0;
      const dx = previous ? visitor.position.x - previous.x : 0;
      const dy = previous ? visitor.position.y - previous.y : 0;
      const speedMps = elapsed > 0 ? Math.hypot(dx, dy) / elapsed : 0;
      const previousDx = previous && previousPrevious ? previous.x - previousPrevious.x : 0;
      const previousDy = previous && previousPrevious ? previous.y - previousPrevious.y : 0;
      const currentDirection = Math.atan2(dy, dx);
      const previousDirection = Math.atan2(previousDy, previousDx);
      const directionChangeDegrees = previous && previousPrevious
        ? Math.round(Math.abs(Math.atan2(Math.sin(currentDirection - previousDirection), Math.cos(currentDirection - previousDirection))) * 180 / Math.PI)
        : 0;
      const motion = motionAdapter.getSwimmerMotion(visitor.id);
      const driftAgainstIntentMps = motion ? Math.max(0, motion.driftMagnitudeMps - Math.hypot(motion.swimmerVelocity.vx, motion.swimmerVelocity.vy)) : 0;
      const shoreline = beach.shorelineY || 280;
      const inHazard = visitor.position.y > shoreline + 20 && visitor.position.x >= 450 && visitor.position.x <= 670;
      const hazardTime = (this.hazardSeconds.get(visitor.id) ?? 0) + (inHazard && elapsed > 0 ? elapsed : 0);
      this.hazardSeconds.set(visitor.id, hazardTime);
      const feeling = feelingByVisitor.get(visitor.id);
      const hasConfirmedDistress = visitor.state === 'DISTRESS' || Boolean(visitor.isSuffocating) || Boolean(feeling?.isSuffering) || Boolean(feeling?.feeling === 'CRITICAL_PANIC');
      const anomalies: string[] = [];
      if (inHazard && driftAgainstIntentMps > 0.7) anomalies.push('Current drift exceeds intentional propulsion.');
      if (inHazard && hazardTime >= 20) anomalies.push(`Inside simulated current hazard for ${Math.round(hazardTime)}s.`);
      if (visitor.fatigue >= 0.58 && inHazard) anomalies.push(`Fatigue is elevated at ${Math.round(visitor.fatigue * 100)}%.`);
      if (feeling && feeling.heartRateBpm >= 145 && !hasConfirmedDistress) anomalies.push(`Simulated wristband heart rate is elevated at ${feeling.heartRateBpm} BPM.`);

      const category: SwimmerAssessmentCategory = hasConfirmedDistress
        ? 'CONFIRMED_DISTRESS'
        : !currentAvailable
        ? 'UNAVAILABLE'
        : anomalies.length >= 2 ? 'ELEVATED_CONCERN' : anomalies.length === 1 ? 'UNUSUAL_MOVEMENT' : 'NORMAL_OBSERVED';
      const telemetryAvailable = Boolean(feeling);
      assessments.push({
        visitorId: visitor.id,
        visitorName: visitor.name || `Swimmer #${visitor.id.slice(-4)}`,
        wristbandId: visitor.wristbandId || feeling?.wristbandId,
        evaluatedAtSimTime: simTimeSeconds,
        category,
        movement: { speedMps, directionChangeDegrees, driftAgainstIntentMps, timeInHazardSeconds: hazardTime, positionFresh: !previous || elapsed >= 0 },
        environment: { currentSpeedMps: currentAvailable ? currentSpeed : 0, riskContext: currentAvailable ? (inHazard ? 'ELEVATED' : 'NORMAL') : 'UNAVAILABLE' },
        telemetry: { available: telemetryAvailable, provenance: telemetryAvailable ? 'SIMULATED' : 'UNAVAILABLE', fatiguePercent: feeling?.fatiguePercent, heartRateBpm: feeling?.heartRateBpm, isSosActive: Boolean(feeling?.feeling === 'CRITICAL_PANIC') },
        anomalies,
        explanation: hasConfirmedDistress ? 'Confirmed distress remains authoritative through the existing distress workflow.' : anomalies.length > 0 ? anomalies.join(' ') : 'Movement is consistent with observed simulated swimming behavior.',
        acknowledged: this.acknowledged.has(visitor.id),
      });
      samples.push({ x: visitor.position.x, y: visitor.position.y, simTime: simTimeSeconds });
      this.history.set(visitor.id, samples.slice(-20));
    }
    this.latestAssessments = assessments;
    return assessments;
  }

  public getLatestAssessments(): SwimmerBehaviorAssessment[] { return [...this.latestAssessments]; }
  public acknowledge(visitorId: string): void { this.acknowledged.add(visitorId); }
  public reset(): void { this.history.clear(); this.hazardSeconds.clear(); this.acknowledged.clear(); this.latestAssessments = []; }
}