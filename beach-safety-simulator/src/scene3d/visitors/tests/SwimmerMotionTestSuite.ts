import { SwimmerMotionAdapter } from '../SwimmerMotionAdapter';
import { VisitorCoordinateMapper } from '../VisitorCoordinateMapper';
import { VisitorLayer3D } from '../VisitorLayer3D';
import { RipCurrentSimulator } from '../../hazards/RipCurrentSimulator';
import { RescueCoordinator } from '../../rescue/RescueCoordinator';
import { PerSwimmerRescueEvaluator } from '../../rescue/PerSwimmerRescueEvaluator';
import { Visitor } from '../../../models/Visitor';
import { Beach } from '../../../models/Beach';
import { Environment } from '../../../models/Environment';

export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export class SwimmerMotionTestSuite {
  private static createMockBeach(): Beach {
    return {
      id: 'BEACH-RUSHIKONDA',
      name: 'Rushikonda Blue Flag Beach',
      width: 1000,
      height: 600,
      shorelineY: 280,
      zones: [
        {
          id: 'ZONE-A',
          name: 'Central Bathing Zone',
          type: 'SWIMMING',
          x: 200,
          y: 280,
          width: 600,
          height: 300,
          status: 'OPEN',
        },
      ],
      lifeguardStations: [],
      emergencyPoints: [],
    };
  }

  private static createMockEnvironment(): Environment {
    return {
      windSpeed: 16,
      windDirection: 120,
      waveHeight: 1.3,
      wavePeriod: 8.5,
      waveDirection: 180,
      tideStatus: 'RISING',
      tideLevel: 1.15,
      waterCurrent: 1.85,
      currentSpeed: 1.85,
      currentDirection: 180,
      waterTemperature: 28.0,
      weather: 'CLEAR',
      visibility: 5.0,
      ripProbability: 0.85,
    };
  }

  private static createMockVisitors(count: number): Visitor[] {
    const list: Visitor[] = [];
    for (let i = 0; i < count; i++) {
      const vid = `VIS-MOT-${1000 + i}`;
      list.push({
        id: vid,
        type: 'SWIMMER',
        position: { x: 300 + ((i * 35) % 400), y: 310 + ((i * 15) % 80) },
        state: 'SWIMMING',
        behavior: {
          profile: 'CASUAL',
          riskTolerance: 0.3,
          swimAbility: 0.75,
          ruleCompliance: 0.85,
          caution: 0.7,
        } as any,
        vulnerability: 0.2,
        awareness: 0.75,
        swimmingAbility: 0.75,
        riskTolerance: 0.3,
        warningResponse: 0.85,
        distressLevel: 0,
        speed: 1.2,
        currentZone: 'ZONE-A',
        awarenessState: 'UNAWARE',
        reactionDelaySeconds: 1.2,
        localWaterDepth: 1.6,
        active: true,
        fatigue: 0.12,
        waterTime: 90,
        velocity: { vx: 0.1, vy: 0.1 },
        driftVector: { dx: 0, dy: 0 },
        color: '#3498db',
        warningCount: 0,
      });
    }
    return list;
  }

  public static async runAll(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const adapter = SwimmerMotionAdapter.getInstance();
    adapter.reset();

    const beach = this.createMockBeach();
    const env = this.createMockEnvironment();

    // -------------------------------------------------------------
    // Test 1: Swimmer moving normally outside current zone
    // -------------------------------------------------------------
    try {
      const visitors = this.createMockVisitors(1);
      visitors[0].position = { x: 260, y: 350 }; // Deep ocean outside rip channel [450, 670]
      visitors[0].state = 'SWIMMING';

      adapter.update(0.1, visitors, beach, env);
      const motion = adapter.getSwimmerMotion(visitors[0].id);

      const passed =
        Boolean(motion) &&
        motion?.isInCurrentZone === false &&
        motion?.motionState === 'NORMAL_SWIMMING' &&
        motion?.animationState === 'swim' &&
        motion?.localDepthMeters > 1.2;

      results.push({
        name: '1. Swimmer moving normally outside current zone',
        passed,
        message: passed
          ? `Normal swimming verified: depth=${motion?.localDepthMeters}m, inZone=${motion?.isInCurrentZone}`
          : `Failed: motionState=${motion?.motionState}, inZone=${motion?.isInCurrentZone}`,
      });
    } catch (err: any) {
      results.push({
        name: '1. Swimmer moving normally outside current zone',
        passed: false,
        message: err.message,
      });
    }

    // -------------------------------------------------------------
    // Test 2: Swimmer entering configured current zone
    // -------------------------------------------------------------
    try {
      const visitors = this.createMockVisitors(1);
      visitors[0].position = { x: 550, y: 320 }; // Inside rip channel [450, 670]

      adapter.update(0.1, visitors, beach, env);
      const motion = adapter.getSwimmerMotion(visitors[0].id);

      const passed =
        Boolean(motion) &&
        motion?.isInCurrentZone === true &&
        motion?.currentVelocity.vy > 1.5 &&
        motion?.driftMagnitudeMps >= 1.2;

      results.push({
        name: '2. Swimmer entering configured current zone experiences rip drift',
        passed,
        message: passed
          ? `Rip drift active: inZone=${motion?.isInCurrentZone}, driftVy=${motion?.currentVelocity.vy.toFixed(2)}m/s`
          : `Failed: inZone=${motion?.isInCurrentZone}, vy=${motion?.currentVelocity.vy}`,
      });
    } catch (err: any) {
      results.push({
        name: '2. Swimmer entering configured current zone experiences rip drift',
        passed: false,
        message: err.message,
      });
    }

    // -------------------------------------------------------------
    // Test 3: Multiple swimmers experiencing different drift
    // -------------------------------------------------------------
    try {
      const visitors = this.createMockVisitors(2);
      // Swimmer A: Strong swimmer with low fatigue
      visitors[0].position = { x: 540, y: 320 };
      visitors[0].swimmingAbility = 0.95;
      visitors[0].fatigue = 0.05;

      // Swimmer B: Weak swimmer with high fatigue
      visitors[1].position = { x: 560, y: 320 };
      visitors[1].swimmingAbility = 0.25;
      visitors[1].fatigue = 0.70;

      adapter.update(0.1, visitors, beach, env);
      const motionA = adapter.getSwimmerMotion(visitors[0].id);
      const motionB = adapter.getSwimmerMotion(visitors[1].id);

      // Strong swimmer has better propulsion, weaker swimmer has higher drag/distress
      const passed =
        Boolean(motionA && motionB) &&
        motionA!.swimmerVelocity.vy !== motionB!.swimmerVelocity.vy &&
        motionB!.motionState === 'STRUGGLING';

      results.push({
        name: '3. Multiple swimmers experience different drift based on ability & fatigue',
        passed,
        message: passed
          ? `Verified: Swimmer A state=${motionA?.motionState}, Swimmer B state=${motionB?.motionState}`
          : `Failed: A=${motionA?.motionState}, B=${motionB?.motionState}`,
      });
    } catch (err: any) {
      results.push({
        name: '3. Multiple swimmers experience different drift based on ability & fatigue',
        passed: false,
        message: err.message,
      });
    }

    // -------------------------------------------------------------
    // Test 4: Swimmer moving toward shore
    // -------------------------------------------------------------
    try {
      const visitors = this.createMockVisitors(1);
      visitors[0].position = { x: 300, y: 340 };
      visitors[0].state = 'EXITING';

      adapter.update(0.1, visitors, beach, env);
      const motion = adapter.getSwimmerMotion(visitors[0].id);

      const passed =
        Boolean(motion) &&
        motion?.motionState === 'RETURNING_TO_SHORE' &&
        motion?.swimmerVelocity.vy < 0; // Negative vy in 2D is toward shore (-y)

      results.push({
        name: '4. Swimmer moving toward shore produces onshore propulsion',
        passed,
        message: passed
          ? `Onshore return verified: state=${motion?.motionState}, intentVy=${motion?.swimmerVelocity.vy.toFixed(2)}`
          : `Failed: state=${motion?.motionState}, intentVy=${motion?.swimmerVelocity.vy}`,
      });
    } catch (err: any) {
      results.push({
        name: '4. Swimmer moving toward shore produces onshore propulsion',
        passed: false,
        message: err.message,
      });
    }

    // -------------------------------------------------------------
    // Test 5: Swimmer leaving current zone via lateral escape
    // -------------------------------------------------------------
    try {
      const visitors = this.createMockVisitors(1);
      // Placed inside rip channel near left boundary (x=465) with high awareness
      visitors[0].position = { x: 465, y: 320 };
      visitors[0].awarenessState = 'FLEEING';
      visitors[0].swimmingAbility = 0.85;
      visitors[0].fatigue = 0.2;

      adapter.update(0.1, visitors, beach, env);
      const motion = adapter.getSwimmerMotion(visitors[0].id);

      const passed =
        Boolean(motion) &&
        motion?.motionState === 'LATERAL_ESCAPE_ATTEMPT' &&
        motion?.escapeVector !== undefined &&
        motion?.escapeVector.dx < 0; // Directed left toward x=450 boundary

      results.push({
        name: '5. Swimmer executes lateral escape vector to exit rip current channel',
        passed,
        message: passed
          ? `Lateral escape verified: state=${motion?.motionState}, dx=${motion?.escapeVector?.dx.toFixed(2)}`
          : `Failed: state=${motion?.motionState}, vector=${JSON.stringify(motion?.escapeVector)}`,
      });
    } catch (err: any) {
      results.push({
        name: '5. Swimmer executes lateral escape vector to exit rip current channel',
        passed: false,
        message: err.message,
      });
    }

    // -------------------------------------------------------------
    // Test 6: Missing or stale current information handling
    // -------------------------------------------------------------
    try {
      const visitors = this.createMockVisitors(1);
      const corruptEnv = {} as any; // Empty/missing current data

      // Should not throw and should default cleanly
      adapter.update(0.1, visitors, beach, corruptEnv);
      const motion = adapter.getSwimmerMotion(visitors[0].id);

      const passed =
        Boolean(motion) &&
        !isNaN(motion!.resultantVelocity.vx) &&
        !isNaN(motion!.resultantVelocity.vy) &&
        !isNaN(motion!.localDepthMeters);

      results.push({
        name: '6. Missing or stale current telemetry handled with graceful fallbacks',
        passed,
        message: passed
          ? `Handled corrupt env without exception: depth=${motion?.localDepthMeters}m, speed=${motion?.driftMagnitudeMps}m/s`
          : 'Failed: resulted in NaN or crash',
      });
    } catch (err: any) {
      results.push({
        name: '6. Missing or stale current telemetry handled with graceful fallbacks',
        passed: false,
        message: err.message,
      });
    }

    // -------------------------------------------------------------
    // Test 7: Dry-land and shoreline boundary handling
    // -------------------------------------------------------------
    try {
      // Test 4 distinct bathymetric zones
      const d1 = adapter.calculateDepth(300, 240, beach, env); // Dry dunes (y < 280)
      const d2 = adapter.calculateDepth(300, 288, beach, env); // Shallow swash (y=288, dist=8)
      const d3 = adapter.calculateDepth(300, 310, beach, env); // Wadeable water (y=310, dist=30)
      const d4 = adapter.calculateDepth(300, 370, beach, env); // Swimming water (y=370, dist=90)

      const passed =
        d1.zone === 'DRY_BEACH' && d1.depth === 0 &&
        d2.zone === 'SHALLOW_WATER' && d2.depth > 0 && d2.depth <= 0.4 &&
        d3.zone === 'WADEABLE_WATER' && d3.depth > 0.4 && d3.depth <= 1.2 &&
        d4.zone === 'SWIMMING_WATER' && d4.depth > 1.2;

      results.push({
        name: '7. Dry-land and shoreline bathymetry stratification verified',
        passed,
        message: passed
          ? `Stratification verified: Dry=0m, Swash=${d2.depth}m, Wade=${d3.depth}m, Swim=${d4.depth}m`
          : `Failed: Dry=${d1.zone}, Swash=${d2.zone}, Wade=${d3.zone}, Swim=${d4.zone}`,
      });
    } catch (err: any) {
      results.push({
        name: '7. Dry-land and shoreline bathymetry stratification verified',
        passed: false,
        message: err.message,
      });
    }

    // -------------------------------------------------------------
    // Test 8: Frame-rate invariance (30 FPS vs 60 FPS)
    // -------------------------------------------------------------
    try {
      adapter.reset();
      const visitorsA = this.createMockVisitors(1);
      visitorsA[0].position = { x: 500, y: 310 };

      // 60 FPS: 60 steps of delta = 1/60 (~1.0 sec total)
      for (let s = 0; s < 60; s++) {
        adapter.update(1 / 60, visitorsA, beach, env);
      }
      const finalPosA = { ...visitorsA[0].position };

      adapter.reset();
      const visitorsB = this.createMockVisitors(1);
      visitorsB[0].position = { x: 500, y: 310 };

      // 30 FPS: 30 steps of delta = 1/30 (~1.0 sec total)
      for (let s = 0; s < 30; s++) {
        adapter.update(1 / 30, visitorsB, beach, env);
      }
      const finalPosB = { ...visitorsB[0].position };

      const diffX = Math.abs(finalPosA.x - finalPosB.x);
      const diffY = Math.abs(finalPosA.y - finalPosB.y);
      const maxDiff = Math.max(diffX, diffY);
      const passed = maxDiff < 0.8; // Under 0.8m difference over 1 full second of simulation

      results.push({
        name: '8. Frame-rate invariance: 30 FPS vs 60 FPS yields consistent displacement',
        passed,
        message: passed
          ? `Displacement variance: diffX=${diffX.toFixed(3)}m, diffY=${diffY.toFixed(3)}m (tolerated < 0.8m)`
          : `Failed: variance ${maxDiff.toFixed(3)}m exceeds threshold`,
      });
    } catch (err: any) {
      results.push({
        name: '8. Frame-rate invariance: 30 FPS vs 60 FPS yields consistent displacement',
        passed: false,
        message: err.message,
      });
    }

    // -------------------------------------------------------------
    // Test 9: Distress remaining independent for each visitor
    // -------------------------------------------------------------
    try {
      const visitors = this.createMockVisitors(2);
      // Victim 1 in acute distress
      visitors[0].fatigue = 0.95;
      visitors[0].state = 'DISTRESS';
      visitors[0].distressLevel = 0.9;

      // Victim 2 swimming comfortably
      visitors[1].fatigue = 0.15;
      visitors[1].state = 'SWIMMING';
      visitors[1].distressLevel = 0;

      adapter.update(0.1, visitors, beach, env);
      const motion1 = adapter.getSwimmerMotion(visitors[0].id);
      const motion2 = adapter.getSwimmerMotion(visitors[1].id);

      const passed =
        motion1?.motionState === 'DISTRESS' &&
        motion1?.animationState === 'distress' &&
        motion2?.motionState === 'NORMAL_SWIMMING' &&
        motion2?.animationState === 'swim';

      results.push({
        name: '9. Distress states remain strictly independent per swimmer',
        passed,
        message: passed
          ? `Independent states verified: Swimmer 1=${motion1?.motionState}, Swimmer 2=${motion2?.motionState}`
          : `Failed: Swimmer 1=${motion1?.motionState}, Swimmer 2=${motion2?.motionState}`,
      });
    } catch (err: any) {
      results.push({
        name: '9. Distress states remain strictly independent per swimmer',
        passed: false,
        message: err.message,
      });
    }

    // -------------------------------------------------------------
    // Test 10: No duplicate incidents or rescue dispatches
    // -------------------------------------------------------------
    try {
      const evaluator = PerSwimmerRescueEvaluator.getInstance();
      evaluator.reset();
      const visitors = this.createMockVisitors(1);
      visitors[0].state = 'DISTRESS';
      visitors[0].fatigue = 0.95;

      const inc1 = evaluator.evaluateSwimmer(10.0, visitors[0], beach, env);
      const inc2 = evaluator.evaluateSwimmer(10.3, visitors[0], beach, env); // 300ms later

      const passed = Boolean(inc1) && inc2 === null; // Second scan must be suppressed

      results.push({
        name: '10. Duplicate incident and alert suppression across repeated evaluations',
        passed,
        message: passed
          ? `Suppressed: first=${inc1?.incidentId}, second=${inc2}`
          : `Failed duplicate suppression: first=${inc1?.incidentId}, second=${inc2?.incidentId}`,
      });
    } catch (err: any) {
      results.push({
        name: '10. Duplicate incident and alert suppression across repeated evaluations',
        passed: false,
        message: err.message,
      });
    }

    // -------------------------------------------------------------
    // Test 11: Single and Multi-Swimmer scenarios preserved
    // -------------------------------------------------------------
    try {
      const ripSim = RipCurrentSimulator.getInstance();
      ripSim.resetScenario();
      const visitors = this.createMockVisitors(3);

      ripSim.triggerMultiSwimmerScenario(visitors, beach, 2);
      const entrained = ripSim.getTargetVisitorIds();

      const passed = entrained.length === 2 && ripSim.active;
      ripSim.resetScenario();

      results.push({
        name: '11. Existing single and multi-swimmer scenarios remain fully operational',
        passed,
        message: passed
          ? `Multi-swimmer scenario verified: entrainedCount=${entrained.length}`
          : 'Failed multi-swimmer scenario trigger',
      });
    } catch (err: any) {
      results.push({
        name: '11. Existing single and multi-swimmer scenarios remain fully operational',
        passed: false,
        message: err.message,
      });
    }

    // -------------------------------------------------------------
    // Test 12: Swimmer Motion Adapter Crowd Scaling Benchmark
    // -------------------------------------------------------------
    try {
      const crowdCounts = [10, 25, 50, 100];
      const timings: Record<number, number> = {};

      for (const count of crowdCounts) {
        const pool = this.createMockVisitors(count);
        const start = performance.now();
        adapter.update(0.016, pool, beach, env);
        timings[count] = Math.round((performance.now() - start) * 100) / 100;
      }

      const passed = timings[100] < 20.0; // Under 20ms for 100 simultaneous physical swimmers

      results.push({
        name: `12. Crowd scaling benchmark verified across 10, 25, 50, 100 swimmers (${JSON.stringify(timings)} ms)`,
        passed,
        message: passed
          ? `Crowd scaling verified: 10=${timings[10]}ms, 25=${timings[25]}ms, 50=${timings[50]}ms, 100=${timings[100]}ms`
          : `Failed: 100 swimmers took ${timings[100]}ms (> 20ms)`,
      });
    } catch (err: any) {
      results.push({
        name: '12. Crowd scaling benchmark verified across 10, 25, 50, 100 swimmers',
        passed: false,
        message: err.message,
      });
    }

    return results;
  }
}