import { Visitor } from '../../models/Visitor';
import { Beach } from '../../models/Beach';
import { Environment } from '../../models/Environment';
import { Hazard } from '../../models/Hazard';
import { RipCurrentSimulator } from '../hazards/RipCurrentSimulator';
import { BeachTerrain } from '../BeachTerrain';
import { AnimationState3D } from './visitor3d.types';

/**
 * SwimmerMotionAdapter.ts
 * 
 * TIDES Milestone 13: Realistic Swimmer Physics & Rip-Current Interaction Adapter.
 * 
 * Bridges authoritative simulation state with photorealistic 3D hydrodynamic movement:
 * - Current-dependent drift from live hazard data (rip velocity vector + channel convergence)
 * - Individualized swimming physiology (propulsion modulated by swim ability & fatigue)
 * - Lateral escape navigation for high-awareness swimmers (anti-drowning survival paths)
 * - Shoreline bathymetry transitions (dry beach -> shallow swash -> wadeable -> deep swimming)
 * - Wave surge interaction and buoyant vertical water surface bobbing
 * - Explainable distress: offshore drift alone does not infer drowning without physiological exhaustion
 * - Frame-rate independent (dt-invariant) kinematic integration
 * - Zero secondary state machine: mutates authoritative Visitor properties cleanly
 */

export type SwimmerMotionState =
  | 'NORMAL_SWIMMING'
  | 'RETURNING_TO_SHORE'
  | 'ENTERING_DEEP_WATER'
  | 'CURRENT_DRIFT'
  | 'LATERAL_ESCAPE_ATTEMPT'
  | 'STRUGGLING'
  | 'DISTRESS'
  | 'BEING_ASSISTED'
  | 'RESOLVED';

export type WaterDepthZone =
  | 'DRY_BEACH'       // depth <= 0.0m (sand & dunes)
  | 'SHALLOW_WATER'   // 0.0m < depth <= 0.4m (ankle-to-shin swash)
  | 'WADEABLE_WATER'  // 0.4m < depth <= 1.2m (waist-to-chest water)
  | 'SWIMMING_WATER'  // depth > 1.2m (floating prone or treading)
  | 'HAZARD_ZONE';    // deep rip trench / submerged reef channel

export interface SwimmerMotionStateInfo {
  visitorId: string;
  motionState: SwimmerMotionState;
  depthZone: WaterDepthZone;
  localDepthMeters: number;
  currentVelocity: { vx: number; vy: number }; // m/s in simulation coordinates
  swimmerVelocity: { vx: number; vy: number }; // m/s intentional propulsion
  resultantVelocity: { vx: number; vy: number }; // m/s combined vector
  driftMagnitudeMps: number;
  isInCurrentZone: boolean;
  waveDisplacementY: number; // 3D ocean wave offset
  escapeVector?: { dx: number; dy: number };
  animationState: AnimationState3D;
  headingYaw: number;
}

export class SwimmerMotionAdapter {
  private static instance: SwimmerMotionAdapter | null = null;

  // Track per-swimmer motion info by stable visitor ID
  private swimmerStates: Map<string, SwimmerMotionStateInfo> = new Map();
  private lastHeadings: Map<string, number> = new Map();
  private waveClock: number = 0;

  // Configurable Rushikonda demonstration rip channel boundaries
  public static readonly RIP_CHANNEL_X_MIN = 450;
  public static readonly RIP_CHANNEL_X_MAX = 670;
  public static readonly RIP_CHANNEL_CENTER_X = 560;

  // Physiological thresholds
  public static readonly STRUGGLE_FATIGUE_THRESHOLD = 0.58;
  public static readonly DISTRESS_FATIGUE_THRESHOLD = 0.82;
  public static readonly WADE_DEPTH_MAX = 1.15; // meters
  public static readonly SHALLOW_SWASH_MAX = 0.40; // meters

  public static getInstance(): SwimmerMotionAdapter {
    if (!SwimmerMotionAdapter.instance) {
      SwimmerMotionAdapter.instance = new SwimmerMotionAdapter();
    }
    return SwimmerMotionAdapter.instance;
  }

  /**
   * Resets internal caches (useful between test runs or scenario restarts)
   */
  public reset(): void {
    this.swimmerStates.clear();
    this.lastHeadings.clear();
    this.waveClock = 0;
  }

  /**
   * Evaluates depth and depth category for any (x, y) coordinate on the beach.
   * Labeled demonstration bathymetry calibrated to the Rushikonda Bay cross-shore profile.
   */
  public calculateDepth(
    x: number,
    y: number,
    beach: Beach,
    environment?: Environment
  ): { depth: number; zone: WaterDepthZone } {
    const tideOffset = (((environment?.tideLevel ?? 1.2) - 1.2) * 15);
    const shorelineY = (beach.shorelineY || 280) + tideOffset;
    const distOffshore = y - shorelineY;

    if (distOffshore <= 0) {
      return { depth: 0, zone: 'DRY_BEACH' };
    }

    // Check if inside rip current trench (scoured deeper channel)
    const inRipCorridor =
      x >= SwimmerMotionAdapter.RIP_CHANNEL_X_MIN &&
      x <= SwimmerMotionAdapter.RIP_CHANNEL_X_MAX;

    let depth = 0;
    if (distOffshore <= 15) {
      // Swash zone
      depth = (distOffshore / 15) * SwimmerMotionAdapter.SHALLOW_SWASH_MAX;
    } else if (distOffshore <= 45) {
      // Wadeable sandbar
      const t = (distOffshore - 15) / 30;
      depth = SwimmerMotionAdapter.SHALLOW_SWASH_MAX + t * (SwimmerMotionAdapter.WADE_DEPTH_MAX - SwimmerMotionAdapter.SHALLOW_SWASH_MAX);
    } else {
      // Deep swimming waters
      const seaDist = distOffshore - 45;
      depth = SwimmerMotionAdapter.WADE_DEPTH_MAX + Math.min(2.5, Math.pow(seaDist, 0.72) * 0.08);
    }

    // Bathymetric channel depression in rip zone
    if (inRipCorridor && distOffshore > 10) {
      depth += 0.55;
    }

    // Categorize
    let zone: WaterDepthZone = 'SWIMMING_WATER';
    if (inRipCorridor && distOffshore > 20) {
      zone = 'HAZARD_ZONE';
    } else if (depth <= SwimmerMotionAdapter.SHALLOW_SWASH_MAX) {
      zone = 'SHALLOW_WATER';
    } else if (depth <= SwimmerMotionAdapter.WADE_DEPTH_MAX) {
      zone = 'WADEABLE_WATER';
    }

    return { depth: Math.max(0, Math.round(depth * 100) / 100), zone };
  }

  /**
   * Calculates water current drift vector for a bather.
   * Leverages existing environment.waterCurrent, currentDirection, and RipCurrentSimulator.
   */
  public calculateCurrentDrift(
    pos: { x: number; y: number },
    beach: Beach,
    environment?: Environment,
    ripActive: boolean = false,
    channelOffset: number = 0
  ): { vx: number; vy: number; inZone: boolean; magnitude: number } {
    const shorelineY = beach.shorelineY || 280;
    const inWater = pos.y >= shorelineY;

    if (!inWater || !environment) {
      return { vx: 0, vy: 0, inZone: false, magnitude: 0 };
    }

    const currentSpeed = environment.waterCurrent ?? environment.currentSpeed ?? 0.35;
    const currentDirDeg = environment.currentDirection ?? 180; // 180 = directly offshore (+y)
    const rad = ((currentDirDeg - 90) * Math.PI) / 180;

    const inRipCorridor =
      pos.x >= SwimmerMotionAdapter.RIP_CHANNEL_X_MIN - 10 &&
      pos.x <= SwimmerMotionAdapter.RIP_CHANNEL_X_MAX + 10 &&
      pos.y >= shorelineY;

    if (inRipCorridor && (ripActive || (environment.ripProbability ?? 0) > 0.45)) {
      // Powerful rip current jet
      const ripJetSpeed = Math.max(1.2, currentSpeed * 1.35); // m/s
      const channelCenter = SwimmerMotionAdapter.RIP_CHANNEL_CENTER_X + channelOffset;

      // Slight lateral convergence toward channel thalweg
      const lateralConvergence = (channelCenter - pos.x) * 0.15;

      return {
        vx: lateralConvergence,
        vy: ripJetSpeed * 1.8, // Calibrated simulation drift units
        inZone: true,
        magnitude: ripJetSpeed,
      };
    }

    // Outside rip current: gentle ambient coastal drift (longshore current)
    const ambientMagnitude = Math.min(0.4, currentSpeed * 0.25);
    const ambientVx = Math.cos(rad) * ambientMagnitude * 1.5;
    const ambientVy = Math.max(0, Math.sin(rad) * ambientMagnitude * 0.8);

    return {
      vx: ambientVx,
      vy: ambientVy,
      inZone: false,
      magnitude: ambientMagnitude,
    };
  }

  /**
   * Determines intentional swimmer propulsion based on swimming ability, fatigue, and awareness.
   */
  public calculateIntentionalVelocity(
    visitor: Visitor,
    depth: number,
    inRipZone: boolean,
    beach: Beach
  ): { vx: number; vy: number; state: SwimmerMotionState; escapeVector?: { dx: number; dy: number } } {
    const shorelineY = beach.shorelineY || 280;
    const fatigue = visitor.fatigue ?? 0.1;
    const ability = visitor.swimmingAbility ?? 0.7;
    const awareness = visitor.awarenessState ?? 'UNAWARE';

    // 1. Being assisted by rescue craft or lifeguard
    if (
      visitor.state === 'WAITING' &&
      Boolean(visitor.distressState && !visitor.distressState.assistanceRequired)
    ) {
      return { vx: 0, vy: -1.2, state: 'BEING_ASSISTED' };
    }

    // 2. Resolved incident: resting safely on dry sand / swash
    if (visitor.position.y <= shorelineY && visitor.distressLevel === 0 && fatigue < 0.3) {
      return { vx: 0, vy: 0, state: 'RESOLVED' };
    }

    // 3. Acute Distress: propulsion collapses, unable to maintain headway
    if (
      visitor.state === 'DISTRESS' ||
      fatigue >= SwimmerMotionAdapter.DISTRESS_FATIGUE_THRESHOLD ||
      (visitor.distressLevel ?? 0) > 0.75
    ) {
      // Ineffective flailing/bobbing
      return {
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.08,
        state: 'DISTRESS',
      };
    }

    // 4. Struggling against current
    if (
      visitor.state === 'STRUGGLING' ||
      (fatigue >= SwimmerMotionAdapter.STRUGGLE_FATIGUE_THRESHOLD && inRipZone)
    ) {
      // Panicked swimmer tries to swim straight against the rip towards shore (-y)
      const degradedPropulsion = 0.55 * ability * (1.0 - fatigue * 0.6);
      return {
        vx: 0,
        vy: -degradedPropulsion,
        state: 'STRUGGLING',
      };
    }

    // 5. Intelligent Lateral Escape: Aware or experienced swimmer in rip channel
    if (inRipZone && depth > SwimmerMotionAdapter.SHALLOW_SWASH_MAX) {
      const isAware = awareness === 'FLEEING' || awareness === 'SUSPICIOUS' || ability > 0.75;
      if (isAware) {
        // Swim laterally to exit the narrow rip channel into adjacent sandbars
        const distToLeft = Math.abs(visitor.position.x - SwimmerMotionAdapter.RIP_CHANNEL_X_MIN);
        const distToRight = Math.abs(visitor.position.x - SwimmerMotionAdapter.RIP_CHANNEL_X_MAX);
        const escapeDirX = distToLeft < distToRight ? -1 : 1;
        const escapeSpeed = 1.1 * ability * (1.0 - fatigue * 0.4);

        const escapeVector = { dx: escapeDirX * escapeSpeed, dy: -0.2 };
        return {
          vx: escapeVector.dx,
          vy: escapeVector.dy,
          state: 'LATERAL_ESCAPE_ATTEMPT',
          escapeVector,
        };
      }
    }

    // 6. Entrained in current without awareness
    if (inRipZone && depth > SwimmerMotionAdapter.WADE_DEPTH_MAX) {
      return {
        vx: 0,
        vy: 0.1, // Drifting passively with current
        state: 'CURRENT_DRIFT',
      };
    }

    // 7. Normal swimming / exiting behavior
    if (visitor.state === 'EXITING' || visitor.awarenessState === 'FLEEING') {
      const exitSpeed = (depth > SwimmerMotionAdapter.WADE_DEPTH_MAX ? 1.2 : 0.8) * ability;
      return {
        vx: 0,
        vy: -exitSpeed,
        state: 'RETURNING_TO_SHORE',
      };
    }

    // 8. Normal bathing within swim zone
    const swimSpeed = 0.8 * ability * (1.0 - fatigue * 0.3);
    const wanderX = visitor.velocity?.vx ?? ((Math.sin(visitor.position.x * 0.05) * 0.3));
    const wanderY = visitor.velocity?.vy ?? 0;

    return {
      vx: wanderX,
      vy: wanderY,
      state: 'NORMAL_SWIMMING',
    };
  }

  /**
   * Superimposes intentional swimmer propulsion, current drift, and wave surge.
   */
  public calculateResultantVelocity(
    intentVx: number,
    intentVy: number,
    currentVx: number,
    currentVy: number,
    surgeVy: number,
    depth: number
  ): { vx: number; vy: number; speed: number } {
    // Water resistance in shallow swash
    let resistance = 1.0;
    if (depth > 0 && depth <= SwimmerMotionAdapter.WADE_DEPTH_MAX) {
      resistance = 0.65; // Water drag on legs
    }

    const totalVx = intentVx * resistance + currentVx;
    const totalVy = intentVy * resistance + currentVy + surgeVy;
    const speed = Math.hypot(totalVx, totalVy);

    return { vx: totalVx, vy: totalVy, speed };
  }

  /**
   * Maps physical motion and depth zone to 3D character animation.
   */
  public mapAnimationState(
    motionState: SwimmerMotionState,
    depthZone: WaterDepthZone,
    distress: boolean
  ): AnimationState3D {
    if (distress || motionState === 'DISTRESS' || motionState === 'STRUGGLING') {
      return 'distress';
    }

    switch (depthZone) {
      case 'DRY_BEACH':
        return motionState === 'RESOLVED' ? 'idle' : 'walk';
      case 'SHALLOW_WATER':
        return 'walk';
      case 'WADEABLE_WATER':
        return 'wade';
      case 'SWIMMING_WATER':
      case 'HAZARD_ZONE':
        return 'swim';
      default:
        return 'idle';
    }
  }

  /**
   * Main per-frame update loop.
   * Processes all visitors and updates their physical position, depth, and kinematics.
   */
  public update(
    delta: number,
    visitors: Visitor[],
    beach: Beach,
    environment?: Environment,
    ripSimulator?: RipCurrentSimulator,
    _hazards?: Hazard[]
  ): Map<string, SwimmerMotionStateInfo> {
    const safeDelta = Math.min(Math.max(delta, 0.001), 0.1);
    this.waveClock += safeDelta * (1.0 + (environment?.waterCurrent ?? 0.35) * 0.5);

    const activeIds = new Set<string>();
    const isRipScenarioActive = ripSimulator?.active ?? false;
    const entrainedIds = ripSimulator ? ripSimulator.getTargetVisitorIds() : [];

    const shorelineY = beach.shorelineY || 280;
    const beachWidth = beach.width || 1000;
    const beachHeight = beach.height || 600;

    for (let i = 0; i < visitors.length; i++) {
      const v = visitors[i];
      if (!v.active || v.state === 'EXITED') continue;

      activeIds.add(v.id);

      // 1. Calculate water depth & bathymetry zone
      const { depth, zone } = this.calculateDepth(v.position.x, v.position.y, beach, environment);
      v.localWaterDepth = depth;

      // 2. Check current zone & calculate drift vector
      const isEntrained = entrainedIds.includes(v.id);
      const channelOffset = ripSimulator?.getSwimmerOffset(v.id) ?? 0;
      const drift = this.calculateCurrentDrift(
        v.position,
        beach,
        environment,
        isRipScenarioActive || isEntrained,
        channelOffset
      );
      v.driftVector = { dx: drift.vx, dy: drift.vy };

      // 3. Shoreline wave surge (pushes slightly onshore in shallow swash)
      let surgeVy = 0;
      if (zone === 'SHALLOW_WATER' || zone === 'WADEABLE_WATER') {
        const waveAmp = environment?.waveHeight ?? 1.2;
        surgeVy = -Math.max(0, Math.sin(this.waveClock * 2.0)) * waveAmp * 0.28;
      }

      // 4. Calculate intentional swimmer velocity & behavior response
      const intent = this.calculateIntentionalVelocity(v, depth, drift.inZone, beach);

      // 5. Compute combined resultant velocity
      const resultant = this.calculateResultantVelocity(
        intent.vx,
        intent.vy,
        drift.vx,
        drift.vy,
        surgeVy,
        depth
      );

      v.velocity = { vx: resultant.vx, vy: resultant.vy };

      // 6. Update position with frame-rate invariant delta
      // Only move bathers in water or drifting
      const inWater = v.position.y >= shorelineY - 5;
      if (inWater || isEntrained) {
        v.position.x += resultant.vx * safeDelta * 12.0;
        v.position.y += resultant.vy * safeDelta * 12.0;

        // Boundary safety clamping: prevent walking through dry terrain into dunes while swimming
        if (v.state === 'SWIMMING' && v.position.y < shorelineY) {
          v.position.y = shorelineY;
          v.state = 'BEACH';
        }
        v.position.x = Math.max(20, Math.min(beachWidth - 20, v.position.x));
        v.position.y = Math.max(30, Math.min(beachHeight - 20, v.position.y));
      }

      // 7. Update physiological fatigue & distress for entrained bathers
      const isDistressed =
        intent.state === 'DISTRESS' ||
        v.state === 'DISTRESS' ||
        (v.distressLevel ?? 0) > 0.65;

      if (drift.inZone && inWater) {
        // High fatigue accumulation when fighting rip or drifting
        const fatigueBurn = intent.state === 'STRUGGLING' ? 0.045 : 0.02;
        v.fatigue = Math.min(1.0, (v.fatigue ?? 0.1) + safeDelta * fatigueBurn);

        // Transition from struggling to distress only after severe fatigue
        if (v.fatigue >= SwimmerMotionAdapter.DISTRESS_FATIGUE_THRESHOLD && v.state !== 'DISTRESS') {
          v.state = 'DISTRESS';
          v.distressLevel = 0.85;
        } else if (v.fatigue >= SwimmerMotionAdapter.STRUGGLE_FATIGUE_THRESHOLD && v.state === 'SWIMMING') {
          v.state = 'STRUGGLING';
        }
      }

      // 8. Dynamic 3D Wave Bobbing displacement
      const normX = Math.max(0, Math.min(1, v.position.x / beachWidth));
      const x3d = (normX - 0.5) * 200;
      const shoreZ = BeachTerrain.getShorelineZ(x3d);
      const waterFrac = (v.position.y - shorelineY) / Math.max(1, beachHeight - shorelineY);
      const z3d = shoreZ - waterFrac * 70;

      let waveDispY = 0;
      if (depth > SwimmerMotionAdapter.WADE_DEPTH_MAX) {
        const waveAmp = (environment?.waveHeight ?? 1.2) * 0.16;
        waveDispY = Math.sin(z3d * 0.14 + this.waveClock * 2.2) * waveAmp;
      }

      // 9. Yaw heading calculation
      let heading = this.lastHeadings.get(v.id) ?? 0;
      if (resultant.speed > 0.04) {
        heading = Math.atan2(resultant.vx, -resultant.vy);
        this.lastHeadings.set(v.id, heading);
      }

      // 10. Map animation state
      const animState = this.mapAnimationState(intent.state, zone, isDistressed);

      // Save state info
      const info: SwimmerMotionStateInfo = {
        visitorId: v.id,
        motionState: intent.state,
        depthZone: zone,
        localDepthMeters: depth,
        currentVelocity: { vx: drift.vx, vy: drift.vy },
        swimmerVelocity: { vx: intent.vx, vy: intent.vy },
        resultantVelocity: { vx: resultant.vx, vy: resultant.vy },
        driftMagnitudeMps: drift.magnitude,
        isInCurrentZone: drift.inZone,
        waveDisplacementY: waveDispY,
        escapeVector: intent.escapeVector,
        animationState: animState,
        headingYaw: heading,
      };

      this.swimmerStates.set(v.id, info);
    }

    // Clean up departed visitors
    for (const id of Array.from(this.swimmerStates.keys())) {
      if (!activeIds.has(id)) {
        this.swimmerStates.delete(id);
        this.lastHeadings.delete(id);
      }
    }

    return this.swimmerStates;
  }

  /**
   * Retrieves current motion info for a specific visitor.
   */
  public getSwimmerMotion(visitorId: string): SwimmerMotionStateInfo | undefined {
    return this.swimmerStates.get(visitorId);
  }

  /**
   * Retrieves all active swimmer motion states.
   */
  public getAllMotions(): Map<string, SwimmerMotionStateInfo> {
    return this.swimmerStates;
  }
}
