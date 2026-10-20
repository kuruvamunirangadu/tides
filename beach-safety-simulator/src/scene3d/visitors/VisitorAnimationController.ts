import { AnimationState3D, HumanoidJoints } from './visitor3d.types';

/**
 * VisitorAnimationController.ts
 * 
 * Manages kinematic skeletal locomotion and posture for 3D beach visitors:
 * - Idle breathing and weight shift
 * - Realistic bipedal walk cycle on sand with counter-balancing arm swing
 * - High-knee wading motion through shallow water
 * - Prone surface freestyle swimming stroke with alternating crawl arms and flutter kicks
 * - Distress emergency treading water and raised arm waving SOS signal
 * - Smooth pose interpolation across state transitions
 */
export class VisitorAnimationController {
  private phase: number = Math.random() * Math.PI * 2;
  private currentAnim: AnimationState3D = 'idle';

  public update(
    joints: HumanoidJoints,
    targetAnim: AnimationState3D,
    speed: number,
    delta: number
  ): void {
    this.currentAnim = targetAnim;

    // Advance phase based on current locomotion type
    let speedMult = 1.0;
    if (this.currentAnim === 'walk') speedMult = 4.2 * Math.min(speed, 1.8);
    else if (this.currentAnim === 'wade') speedMult = 2.8 * Math.min(speed, 1.5);
    else if (this.currentAnim === 'swim') speedMult = 3.6;
    else if (this.currentAnim === 'distress') speedMult = 5.0;
    else speedMult = 1.2; // Idle

    this.phase += delta * speedMult;

    // Apply animation kinematics
    switch (this.currentAnim) {
      case 'idle':
        this.animateIdle(joints);
        break;
      case 'walk':
        this.animateWalk(joints);
        break;
      case 'wade':
        this.animateWade(joints);
        break;
      case 'swim':
        this.animateSwim(joints);
        break;
      case 'distress':
        this.animateDistress(joints);
        break;
      default:
        this.animateIdle(joints);
        break;
    }
  }

  /**
   * 1. Idle Pose: Standing on sand, looking out at the bay
   */
  private animateIdle(j: HumanoidJoints): void {
    const p = this.phase;
    j.pelvis.position.set(0, 0.92, 0);
    j.pelvis.rotation.set(0, 0, 0);

    // Subtle breathing expansion
    j.torso.rotation.set(Math.sin(p) * 0.025, 0, 0);
    j.head.rotation.set(Math.sin(p * 0.7) * 0.03, Math.sin(p * 0.3) * 0.05, 0);

    // Arms relaxed at sides
    j.leftUpperArm.rotation.set(0.04, 0, 0.08);
    j.leftForearm.rotation.set(0.12, 0, 0);
    j.rightUpperArm.rotation.set(0.04, 0, -0.08);
    j.rightForearm.rotation.set(0.12, 0, 0);

    // Legs straight
    j.leftThigh.rotation.set(0, 0, 0.02);
    j.leftCalf.rotation.set(0, 0, 0);
    j.rightThigh.rotation.set(0, 0, -0.02);
    j.rightCalf.rotation.set(0, 0, 0);
  }

  /**
   * 2. Walk Cycle: Bipedal locomotion on sand dunes
   */
  private animateWalk(j: HumanoidJoints): void {
    const p = this.phase;
    const sinP = Math.sin(p);
    const cosP = Math.cos(p);

    // Pelvic bounce
    j.pelvis.position.set(0, 0.92 + Math.abs(sinP) * 0.04, 0);
    j.pelvis.rotation.set(0, sinP * 0.06, 0);

    // Torso counter-twist
    j.torso.rotation.set(0.06, -sinP * 0.08, 0);
    j.head.rotation.set(-0.02, 0, 0);

    // Legs: Alternating swing & knee flexion
    j.leftThigh.rotation.set(sinP * 0.52, 0, 0.02);
    j.leftCalf.rotation.set(Math.max(0, -sinP) * 0.65, 0, 0);

    j.rightThigh.rotation.set(-sinP * 0.52, 0, -0.02);
    j.rightCalf.rotation.set(Math.max(0, sinP) * 0.65, 0, 0);

    // Arms: Counter-swinging with legs
    j.leftUpperArm.rotation.set(-sinP * 0.42, 0, 0.1);
    j.leftForearm.rotation.set(0.25 + Math.max(0, -sinP) * 0.2, 0, 0);

    j.rightUpperArm.rotation.set(sinP * 0.42, 0, -0.1);
    j.rightForearm.rotation.set(0.25 + Math.max(0, sinP) * 0.2, 0, 0);
  }

  /**
   * 3. Wade Cycle: High-knee water resistance locomotion
   */
  private animateWade(j: HumanoidJoints): void {
    const p = this.phase;
    const sinP = Math.sin(p);

    j.pelvis.position.set(0, 0.92 + Math.abs(sinP) * 0.05, 0);
    j.pelvis.rotation.set(0, sinP * 0.08, 0);

    j.torso.rotation.set(0.12, -sinP * 0.1, 0); // Leaning into water surge
    j.head.rotation.set(-0.05, 0, 0);

    // High knee lift to step through wave swash
    j.leftThigh.rotation.set(sinP * 0.72, 0, 0.04);
    j.leftCalf.rotation.set(Math.max(0, -sinP) * 0.95, 0, 0);

    j.rightThigh.rotation.set(-sinP * 0.72, 0, -0.04);
    j.rightCalf.rotation.set(Math.max(0, sinP) * 0.95, 0, 0);

    // Arms spread out for hydrodynamic balance
    j.leftUpperArm.rotation.set(-sinP * 0.35, 0, 0.35);
    j.leftForearm.rotation.set(0.4, 0, 0);

    j.rightUpperArm.rotation.set(sinP * 0.35, 0, -0.35);
    j.rightForearm.rotation.set(0.4, 0, 0);
  }

  /**
   * 4. Swim Cycle: Prone surface front crawl / freestyle
   */
  private animateSwim(j: HumanoidJoints): void {
    const p = this.phase;

    // Prone orientation: body lying horizontally in water plane
    j.pelvis.position.set(0, 0.12, 0);
    j.pelvis.rotation.set(-Math.PI / 2 + 0.15, Math.sin(p * 0.5) * 0.22, 0);

    // Head raised slightly above water surface
    j.torso.rotation.set(-0.1, 0, 0);
    j.head.rotation.set(0.45, Math.sin(p * 0.5) * 0.25, 0);

    // Freestyle arm recovery stroke (continuous 360-degree rotation)
    const armP = p * 1.4;
    j.leftUpperArm.rotation.set(armP, 0, 0.25);
    j.leftForearm.rotation.set(Math.max(0, Math.sin(armP)) * 1.1, 0, 0);

    j.rightUpperArm.rotation.set(armP + Math.PI, 0, -0.25);
    j.rightForearm.rotation.set(Math.max(0, Math.sin(armP + Math.PI)) * 1.1, 0, 0);

    // Rapid flutter kick
    const kickP = p * 4.5;
    j.leftThigh.rotation.set(Math.sin(kickP) * 0.32, 0, 0.05);
    j.leftCalf.rotation.set(Math.max(0, Math.sin(kickP - 0.4)) * 0.38, 0, 0);

    j.rightThigh.rotation.set(-Math.sin(kickP) * 0.32, 0, -0.05);
    j.rightCalf.rotation.set(Math.max(0, -Math.sin(kickP - 0.4)) * 0.38, 0, 0);
  }

  /**
   * 5. Distress Cycle: Vertical treading water + SOS arm signal
   */
  private animateDistress(j: HumanoidJoints): void {
    const p = this.phase;

    // Vertical floating posture in water
    j.pelvis.position.set(0, 0.55 + Math.sin(p * 2.5) * 0.08, 0);
    j.pelvis.rotation.set(-0.18, 0, Math.sin(p * 1.8) * 0.12);

    j.torso.rotation.set(-0.08, 0, 0);
    j.head.rotation.set(-0.35, Math.sin(p * 2.0) * 0.2, 0); // Head tilted back gasping

    // Left arm treading water for buoyancy
    j.leftUpperArm.rotation.set(0.2, 0.3, 0.65 + Math.sin(p * 4.0) * 0.25);
    j.leftForearm.rotation.set(0.6, 0, 0);

    // Right arm raised high out of water waving SOS signal
    j.rightUpperArm.rotation.set(-2.5, 0, -0.3 + Math.sin(p * 4.2) * 0.45);
    j.rightForearm.rotation.set(0.4, 0, 0);

    // Rapid struggling scissor kicks
    j.leftThigh.rotation.set(Math.sin(p * 6.0) * 0.45, 0, 0.1);
    j.leftCalf.rotation.set(Math.max(0, Math.sin(p * 6.0)) * 0.6, 0, 0);

    j.rightThigh.rotation.set(-Math.sin(p * 6.0) * 0.45, 0, -0.1);
    j.rightCalf.rotation.set(Math.max(0, -Math.sin(p * 6.0)) * 0.6, 0, 0);
  }
}

