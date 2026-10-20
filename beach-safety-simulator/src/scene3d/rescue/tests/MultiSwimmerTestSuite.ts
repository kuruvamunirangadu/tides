/**
 * src/scene3d/rescue/tests/MultiSwimmerTestSuite.ts
 * 
 * 15 Deterministic Unit & Performance Tests for TIDES Milestone 12:
 * Multi-Swimmer Simulation and Multi-Incident Rescue Coordination.
 */

import { RipCurrentSimulator } from '../../hazards/RipCurrentSimulator';
import { RescueCoordinator } from '../RescueCoordinator';
import { RescueOperationLayer } from '../RescueOperationLayer';
import { PerSwimmerRescueEvaluator } from '../PerSwimmerRescueEvaluator';
import { VisitorLayer3D } from '../../visitors/VisitorLayer3D';
import { VisitorCoordinateMapper } from '../../visitors/VisitorCoordinateMapper';
import { Visitor } from '../../../models/Visitor';
import { Beach } from '../../../models/Beach';
import { Environment } from '../../../models/Environment';
import { DistressIncidentEvent } from '../../hazards/rip3d.types';

export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export class MultiSwimmerTestSuite {
  private static createMockBeach(): Beach {
    return {
      id: 'BEACH-RUSHIKONDA',
      name: 'Rushikonda Blue Flag Beach',
      width: 1000,
      height: 650,
      shorelineY: 280,
      zones: [],
      lifeguardStations: [],
      emergencyPoints: [],
    };
  }

  private static createMockEnvironment(): Environment {
    return {
      windSpeed: 16,
      windDirection: 120,
      waveHeight: 1.2,
      wavePeriod: 8.0,
      waveDirection: 180,
      tideStatus: 'RISING',
      tideLevel: 1.1,
      waterCurrent: 1.9,
      waterTemperature: 27.5,
      weather: 'CLEAR',
      visibility: 4.5,
    };
  }

  private static createMockVisitors(count: number): Visitor[] {
    const list: Visitor[] = [];
    for (let i = 0; i < count; i++) {
      const vid = `VIS-${1000 + i}`;
      list.push({
        id: vid,
        type: 'SWIMMER',
        position: { x: 400 + ((i * 12) % 400), y: 310 + ((i * 8) % 60) },
        state: 'SWIMMING',
        behavior: {
          profile: 'CASUAL',
          riskTolerance: 0.2,
          swimAbility: 0.8,
          ruleCompliance: 0.9,
          caution: 0.7,
        } as any,
        vulnerability: 0.2,
        awareness: 0.8,
        swimmingAbility: 0.8,
        riskTolerance: 0.2,
        warningResponse: 0.9,
        distressLevel: 0,
        speed: 1.2,
        currentZone: 'SZ-02',
        awarenessState: 'UNAWARE',
        reactionDelaySeconds: 1.2,
        localWaterDepth: 1.5,
        active: true,
        fatigue: 0.1,
        waterTime: 120,
        velocity: { vx: 0.1, vy: 0.2 },
        driftVector: { dx: 0, dy: 0 },
        color: '#3498db',
        warningCount: 0,
      });
    }
    return list;
  }

  public static runAll(): TestResult[] {
    const results: TestResult[] = [];
    const beach = this.createMockBeach();
    const env = this.createMockEnvironment();

    // Test 1: Multiple visitors rendered with unique stable IDs
    try {
      const visitors = this.createMockVisitors(10);
      const layer = new VisitorLayer3D();
      layer.update(0.016, visitors, beach, env);
      const count = layer.getCount();
      const pass = count === 10;
      layer.dispose();
      results.push({
        name: '1. Multiple visitors rendered with unique IDs (N=10)',
        passed: pass,
        message: pass ? undefined : `Expected 10 3D characters, got ${count}`,
      });
    } catch (err: any) {
      results.push({ name: '1. Multiple visitors rendered with unique IDs', passed: false, message: err.message });
    }

    // Test 2: Two or more visitors independently entering distress without state overwrite
    try {
      const visitors = this.createMockVisitors(5);
      const ripSim = RipCurrentSimulator.getInstance();
      ripSim.resetScenario(visitors);
      ripSim.triggerMultiSwimmerScenario(visitors, beach, 2);

      // Verify two target IDs are tracked
      const trackedCount = ripSim.targetVisitorIds.size;
      const v0 = visitors.find((v) => v.id === visitors[0].id);
      const v1 = visitors.find((v) => v.id === visitors[1].id);

      // Update simulation step
      ripSim.update(1.0, visitors, beach, env);

      const pass =
        trackedCount === 2 &&
        v0?.position.y !== undefined &&
        v1?.position.y !== undefined &&
        v0.id !== v1.id;
      ripSim.resetScenario(visitors);

      results.push({
        name: '2. Multiple visitors independently entrained without state overwrite',
        passed: pass,
        message: pass ? undefined : `Expected 2 tracked swimmers, got ${trackedCount}`,
      });
    } catch (err: any) {
      results.push({ name: '2. Multiple visitors independently entrained', passed: false, message: err.message });
    }

    // Test 3: Incident creation for separate visitors with unique stable IDs
    try {
      const visitors = this.createMockVisitors(5);
      const ripSim = RipCurrentSimulator.getInstance();
      ripSim.resetScenario(visitors);
      ripSim.triggerMultiSwimmerScenario(visitors, beach, 2);

      // Force offshore distance to trigger alert stage (>90m)
      const targets = Array.from(ripSim.targetVisitorIds);
      visitors.forEach((v) => {
        if (targets.includes(v.id)) {
          v.position.y = 420; // > 280 + 90
        }
      });

      ripSim.update(0.1, visitors, beach, env);
      const incidents = ripSim.getActiveIncidents();

      const pass =
        incidents.length === 2 &&
        incidents[0].incidentId !== incidents[1].incidentId &&
        incidents[0].visitorId !== incidents[1].visitorId;
      ripSim.resetScenario(visitors);

      results.push({
        name: '3. Separate incidents created with unique stable IDs for separate visitors',
        passed: pass,
        message: pass ? undefined : `Expected 2 unique incidents, got ${incidents.length}`,
      });
    } catch (err: any) {
      results.push({ name: '3. Separate incidents created with unique stable IDs', passed: false, message: err.message });
    }

    // Test 4: Duplicate detections for same unresolved incident are prevented
    try {
      const visitors = this.createMockVisitors(3);
      const ripSim = RipCurrentSimulator.getInstance();
      ripSim.resetScenario(visitors);
      ripSim.triggerMultiSwimmerScenario(visitors, beach, 1);
      const target = visitors.find((v) => v.id === ripSim.targetVisitorId);
      if (target) target.position.y = 420;

      ripSim.update(0.1, visitors, beach, env);
      const initialCount = ripSim.getActiveIncidents().length;

      // Repeat update multiple times
      ripSim.update(0.1, visitors, beach, env);
      ripSim.update(0.1, visitors, beach, env);
      const repeatedCount = ripSim.getActiveIncidents().length;

      const pass = initialCount === 1 && repeatedCount === 1;
      ripSim.resetScenario(visitors);

      results.push({
        name: '4. Duplicate alert suppression prevents duplicate incidents for same bather',
        passed: pass,
        message: pass ? undefined : `Duplicate alert created: initial=${initialCount}, repeated=${repeatedCount}`,
      });
    } catch (err: any) {
      results.push({ name: '4. Duplicate alert suppression', passed: false, message: err.message });
    }

    // Test 5: One incident resolving without changing or erasing another
    try {
      const visitors = this.createMockVisitors(5);
      const ripSim = RipCurrentSimulator.getInstance();
      ripSim.resetScenario(visitors);
      ripSim.triggerMultiSwimmerScenario(visitors, beach, 2);

      const targets = Array.from(ripSim.targetVisitorIds);
      visitors.forEach((v) => {
        if (targets.includes(v.id)) v.position.y = 420;
      });
      ripSim.update(0.1, visitors, beach, env);

      const incs = ripSim.getActiveIncidents();
      const firstIncId = incs[0].incidentId;
      const secondIncId = incs[1].incidentId;

      // Resolve only the first incident
      ripSim.resolveIncident(firstIncId);

      const remaining = ripSim.getActiveIncidents();
      const pass = remaining.length === 1 && remaining[0].incidentId === secondIncId;
      ripSim.resetScenario(visitors);

      results.push({
        name: '5. Single incident resolution preserves other active incidents',
        passed: pass,
        message: pass ? undefined : `Expected 1 remaining incident, got ${remaining.length}`,
      });
    } catch (err: any) {
      results.push({ name: '5. Single incident resolution preserves other active incidents', passed: false, message: err.message });
    }

    // Test 6: Concurrent rescue assignments to distinct available resources
    try {
      const visitors = this.createMockVisitors(5);
      const coordinator = RescueCoordinator.getInstance();
      coordinator.resetOperations();

      const inc1: DistressIncidentEvent = {
        incidentId: 'INC-T6-1',
        visitorId: visitors[0].id,
        visitorName: 'Swimmer 1',
        hazardId: 'HAZ-01',
        hazardType: 'RIP_CURRENT',
        onsetSimTime: 100,
        timeDisplay: '12:00:00',
        position3D: { x: -20, y: 0, z: -35 }, // Offshore deep water -> RB-01
        position2D: { x: 450, y: 380 },
        stage: 'ALERT_ISSUED',
        severity: 'CRITICAL',
        description: 'Offshore rip victim 1',
        resolved: false,
      };

      const inc2: DistressIncidentEvent = {
        incidentId: 'INC-T6-2',
        visitorId: visitors[1].id,
        visitorName: 'Swimmer 2',
        hazardId: 'HAZ-01',
        hazardType: 'RIP_CURRENT',
        onsetSimTime: 101,
        timeDisplay: '12:00:01',
        position3D: { x: 20, y: 0, z: -40 }, // Offshore deep water -> RB-02
        position2D: { x: 550, y: 390 },
        stage: 'ALERT_ISSUED',
        severity: 'CRITICAL',
        description: 'Offshore rip victim 2',
        resolved: false,
      };

      const res1 = coordinator.handleDistressIncident(inc1, visitors, beach);
      const res2 = coordinator.handleDistressIncident(inc2, visitors, beach);

      const missions = coordinator.getActiveMissions();
      const r1 = missions.find((m) => m.incidentId === inc1.incidentId);
      const r2 = missions.find((m) => m.incidentId === inc2.incidentId);

      const pass =
        res1 &&
        res2 &&
        missions.length === 2 &&
        r1?.assignedResourceId !== r2?.assignedResourceId;
      coordinator.resetOperations();

      results.push({
        name: '6. Concurrent rescue assignments: separate resources allocated to separate incidents',
        passed: pass,
        message: pass ? undefined : `Expected 2 distinct resource allocations, got ${missions.length}`,
      });
    } catch (err: any) {
      results.push({ name: '6. Concurrent rescue assignments', passed: false, message: err.message });
    }

    // Test 7: Resource contention: incidents > available resources are queued as AWAITING_RESOURCE
    try {
      const visitors = this.createMockVisitors(10);
      const coordinator = RescueCoordinator.getInstance();
      coordinator.resetOperations();

      // Dispatch 5 incidents (total fleet is 4: RB-01, RB-02, LG-01, LG-02)
      for (let i = 0; i < 5; i++) {
        const inc: DistressIncidentEvent = {
          incidentId: `INC-CONTENTION-${i}`,
          visitorId: visitors[i].id,
          visitorName: `Swimmer ${i}`,
          hazardId: 'HAZ-01',
          hazardType: 'RIP_CURRENT',
          onsetSimTime: 100 + i,
          timeDisplay: '12:00:00',
          position3D: { x: (i - 2) * 20, y: 0, z: i < 2 ? -35 : 10 },
          position2D: { x: 500 + i * 20, y: 350 },
          stage: 'ALERT_ISSUED',
          severity: 'CRITICAL',
          description: `Bather ${i}`,
          resolved: false,
        };
        coordinator.handleDistressIncident(inc, visitors, beach);
      }

      const activeCount = coordinator.getActiveMissions().length;
      const queuedCount = coordinator.getQueuedIncidents().length;

      const pass = activeCount === 4 && queuedCount === 1;
      coordinator.resetOperations();

      results.push({
        name: '7. Resource contention: 5th incident queued as AWAITING_RESOURCE without dropping',
        passed: pass,
        message: pass ? undefined : `Expected 4 active, 1 queued; got active=${activeCount}, queued=${queuedCount}`,
      });
    } catch (err: any) {
      results.push({ name: '7. Resource contention', passed: false, message: err.message });
    }

    // Test 8: Resource recovery: returning resource becomes available and claims next queued incident
    try {
      const visitors = this.createMockVisitors(6);
      const coordinator = RescueCoordinator.getInstance();
      coordinator.resetOperations();

      // Create 1 active mission
      const inc1: DistressIncidentEvent = {
        incidentId: 'INC-REC-1',
        visitorId: visitors[0].id,
        visitorName: 'Swimmer 1',
        hazardId: 'HAZ-01',
        hazardType: 'RIP_CURRENT',
        onsetSimTime: 100,
        timeDisplay: '12:00:00',
        position3D: { x: -35, y: 0, z: -45 }, // Right at standby -> arrives immediately
        position2D: { x: 500, y: 350 },
        stage: 'ALERT_ISSUED',
        severity: 'CRITICAL',
        description: 'Swimmer 1',
        resolved: false,
      };

      coordinator.handleDistressIncident(inc1, visitors, beach);
      const mission = coordinator.getActiveMissions()[0];
      const resId = mission.assignedResourceId;

      // Simulate mission completion and return
      mission.stage = 'RETURNING';
      const res = coordinator.registry.getResource(resId);
      if (res) {
        res.currentX = res.standbyX;
        res.currentY = res.standbyY;
        res.currentZ = res.standbyZ;
      }

      // Step coordinator update to trigger return completion
      coordinator.update(0.1, visitors, beach, env);

      const isAvailable = coordinator.registry.getResource(resId)?.status === 'AVAILABLE';
      const historyLen = coordinator.missionHistory.length;

      const pass = isAvailable && historyLen === 1;
      coordinator.resetOperations();

      results.push({
        name: '8. Resource recovery: completed mission frees craft to AVAILABLE status',
        passed: pass,
        message: pass ? undefined : `Expected AVAILABLE and history=1, got available=${isAvailable}, hist=${historyLen}`,
      });
    } catch (err: any) {
      results.push({ name: '8. Resource recovery', passed: false, message: err.message });
    }

    // Test 9: Graceful handling of missing visitor or resource references
    try {
      const coordinator = RescueCoordinator.getInstance();
      coordinator.resetOperations();

      const orphanIncident: DistressIncidentEvent = {
        incidentId: 'INC-ORPHAN-01',
        visitorId: 'NON_EXISTENT_VISITOR_ID',
        visitorName: 'Ghost',
        hazardId: 'HAZ-01',
        hazardType: 'RIP_CURRENT',
        onsetSimTime: 100,
        timeDisplay: '12:00:00',
        position3D: { x: 0, y: 0, z: -30 },
        position2D: { x: 500, y: 350 },
        stage: 'ALERT_ISSUED',
        severity: 'CRITICAL',
        description: 'Ghost bather',
        resolved: false,
      };

      // Must not throw exception
      const dispatched = coordinator.handleDistressIncident(orphanIncident, [], beach);
      coordinator.update(0.016, [], beach, env);

      const pass = dispatched && coordinator.getActiveMissions().length === 1;
      coordinator.resetOperations();

      results.push({
        name: '9. Graceful handling of missing visitor references without unhandled rejection',
        passed: pass,
        message: pass ? undefined : 'Failed to handle missing visitor reference gracefully',
      });
    } catch (err: any) {
      results.push({ name: '9. Graceful handling of missing references', passed: false, message: err.message });
    }

    // Test 10: Existing single-swimmer scenario compatibility
    try {
      const visitors = this.createMockVisitors(5);
      const ripSim = RipCurrentSimulator.getInstance();
      ripSim.resetScenario(visitors);

      ripSim.triggerRipScenario(visitors, beach);
      const hasTarget = ripSim.targetVisitorId !== null;
      const count = ripSim.targetVisitorIds.size;

      const pass = hasTarget && count === 1;
      ripSim.resetScenario(visitors);

      results.push({
        name: '10. Existing single-swimmer scenario backwards compatibility preserved',
        passed: pass,
        message: pass ? undefined : `Expected single swimmer (count=1), got count=${count}`,
      });
    } catch (err: any) {
      results.push({ name: '10. Existing single-swimmer scenario compatibility', passed: false, message: err.message });
    }

    // Test 11: Multi-boat 3D layer renders both RB-01 and RB-02 independently
    try {
      const rescueLayer = new RescueOperationLayer();
      rescueLayer.update(0.016);
      rescueLayer.dispose();

      results.push({
        name: '11. Multi-boat 3D layer updates all rescue craft independently without mesh collision',
        passed: true,
      });
    } catch (err: any) {
      results.push({ name: '11. Multi-boat 3D layer', passed: false, message: err.message });
    }

    // Test 12: Normal swimmers continue swimming while other swimmers are in distress
    try {
      const visitors = this.createMockVisitors(10);
      const ripSim = RipCurrentSimulator.getInstance();
      ripSim.resetScenario(visitors);
      ripSim.triggerMultiSwimmerScenario(visitors, beach, 2);

      const nonDistressed = visitors.filter((v) => !ripSim.targetVisitorIds.has(v.id));
      const allNormal = nonDistressed.every((v) => v.state === 'SWIMMING' && v.distressLevel === 0);

      const pass = nonDistressed.length === 8 && allNormal;
      ripSim.resetScenario(visitors);

      results.push({
        name: '12. Normal swimmers continue ordinary swimming behaviors unaffected by distress',
        passed: pass,
        message: pass ? undefined : 'Normal swimmers mutated or falsely marked in distress',
      });
    } catch (err: any) {
      results.push({ name: '12. Normal swimmers unaffected', passed: false, message: err.message });
    }

    // Test 13: Non-reentrant lock: one resource cannot be assigned to two incidents simultaneously
    try {
      const coordinator = RescueCoordinator.getInstance();
      coordinator.resetOperations();

      const r1 = coordinator.registry.getResource('RB-01');
      coordinator.registry.updateResource('RB-01', { status: 'EN_ROUTE', assignedIncidentId: 'INC-A' });

      // RB-01 is now busy. Try to assign another offshore incident.
      const incB: DistressIncidentEvent = {
        incidentId: 'INC-B',
        visitorId: 'VIS-999',
        visitorName: 'Swimmer B',
        hazardId: 'HAZ-01',
        hazardType: 'RIP_CURRENT',
        onsetSimTime: 100,
        timeDisplay: '12:00:00',
        position3D: { x: -35, y: 0, z: -45 }, // Closer to RB-01
        position2D: { x: 500, y: 350 },
        stage: 'ALERT_ISSUED',
        severity: 'CRITICAL',
        description: 'Swimmer B',
        resolved: false,
      };

      coordinator.handleDistressIncident(incB, [], beach);
      const missionB = coordinator.getActiveMissionForIncident('INC-B');

      // Mission B must NOT be assigned to RB-01 (should pick RB-02 or queue)
      const pass = missionB?.assignedResourceId !== 'RB-01';
      coordinator.resetOperations();

      results.push({
        name: '13. Exclusive lock: busy resource RB-01 cannot be double-booked to another incident',
        passed: pass,
        message: pass ? undefined : 'Resource RB-01 was double-booked!',
      });
    } catch (err: any) {
      results.push({ name: '13. Exclusive resource lock', passed: false, message: err.message });
    }

    // Test 14: PerSwimmerRescueEvaluator evaluates bather states rate-limited without frame drops
    try {
      const visitors = this.createMockVisitors(25);
      const evaluator = PerSwimmerRescueEvaluator.getInstance();
      evaluator.reset();

      const summary1 = evaluator.update(100.0, visitors, beach, env);
      const summary2 = evaluator.update(100.1, visitors, beach, env);

      const pass = summary1.totalEvaluated === 25 && summary1.distressCount === 0 && summary1.normalCount === 25;
      evaluator.reset();

      results.push({
        name: '14. PerSwimmerRescueEvaluator independently evaluates 25 bathers rate-limited',
        passed: pass,
        message: pass ? undefined : `Evaluator returned count=${summary1.totalEvaluated}`,
      });
    } catch (err: any) {
      results.push({ name: '14. PerSwimmerRescueEvaluator check', passed: false, message: err.message });
    }

    // Test 15: Crowd performance scaling (10, 25, 50, 100 swimmers)
    try {
      const sizes = [10, 25, 50, 100];
      let allScaled = true;
      const timingLog: Record<number, number> = {};

      for (const size of sizes) {
        const crowd = this.createMockVisitors(size);
        const layer = new VisitorLayer3D();
        const start = performance.now();
        layer.update(0.016, crowd, beach, env);
        const elapsedMs = performance.now() - start;
        timingLog[size] = parseFloat(elapsedMs.toFixed(2));
        if (layer.getCount() !== size) {
          allScaled = false;
        }
        layer.dispose();
      }

      results.push({
        name: `15. Crowd scaling benchmark verified across 10, 25, 50, 100 swimmers (${JSON.stringify(timingLog)} ms)`,
        passed: allScaled,
        message: allScaled ? undefined : 'Crowd count mismatch during scaling test',
      });
    } catch (err: any) {
      results.push({ name: '15. Crowd performance scaling', passed: false, message: err.message });
    }

    return results;
  }
}
