/**
 * src/emergency/coordination/tests/EmergencyTestSuite.ts
 * Frontend test suite for TIDES Milestone 9:
 * Intelligent Emergency Coordination & Evacuation.
 */

import { EmergencyCoordinator } from '../EmergencyCoordinator';
import { EvacuationZoneManager } from '../EvacuationZoneManager';
import { EvacuationRoutePlanner } from '../EvacuationRoutePlanner';
import { EmergencyDecisionPolicy } from '../EmergencyDecisionPolicy';
import { EmergencyScenarioManager } from '../EmergencyScenarioManager';
import { Visitor } from '../../../models/Visitor';

export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export class EmergencyTestSuite {
  public static runAll(): TestResult[] {
    const results: TestResult[] = [];

    const test = (name: string, fn: () => void) => {
      try {
        fn();
        results.push({ name, passed: true });
      } catch (err: any) {
        results.push({ name, passed: false, message: err?.message || String(err) });
      }
    };

    // 1. Multiple simultaneous incidents
    test('1. Multiple simultaneous incidents', () => {
      const coordinator = new EmergencyCoordinator();
      coordinator.reset();
      const res1 = coordinator.reportDistressIncident('INC-TS-01', 'VIS-1', { x: 500, y: 350 }, 0.85);
      const res2 = coordinator.reportDistressIncident('INC-TS-02', 'VIS-2', { x: 520, y: 360 }, 0.90);

      const incidents = coordinator.getIncidents();
      if (incidents.length !== 2) throw new Error(`Expected 2 incidents, got ${incidents.length}`);
      if (res1.incident.incidentId !== 'INC-TS-01' || res2.incident.incidentId !== 'INC-TS-02') {
        throw new Error('Incident IDs not preserved');
      }
      if (incidents[0].priorityScore < incidents[1].priorityScore) {
        throw new Error('Higher distress incident should be ranked first by priority');
      }
    });

    // 2. Duplicate incident-event handling
    test('2. Duplicate incident-event handling', () => {
      const coordinator = new EmergencyCoordinator();
      coordinator.reset();
      const res1 = coordinator.reportDistressIncident('INC-DUP-01', 'VIS-1', { x: 500, y: 350 }, 0.85);
      if (!res1.dispatched) throw new Error('Expected initial dispatch to succeed');

      // Duplicate event
      const res2 = coordinator.reportDistressIncident('INC-DUP-01', 'VIS-1', { x: 500, y: 350 }, 0.85);
      if (res2.dispatched) throw new Error('Duplicate event triggered second dispatch!');
      if (!res2.message.includes('Duplicate')) throw new Error('Expected duplicate suppression message');
      if (coordinator.getIncidents().length !== 1) throw new Error('Duplicate incident inserted into queue');
    });

    // 3. Resource assignment conflicts
    test('3. Resource assignment conflicts', () => {
      const coordinator = new EmergencyCoordinator();
      coordinator.reset();
      const res1 = coordinator.reportDistressIncident('INC-CONF-01', 'VIS-1', { x: 500, y: 380 }, 0.95);
      const res2 = coordinator.reportDistressIncident('INC-CONF-02', 'VIS-2', { x: 520, y: 390 }, 0.90);

      if (!res1.incident.assignedResourceId || !res2.incident.assignedResourceId) {
        throw new Error('Expected resources to be assigned');
      }
      if (res1.incident.assignedResourceId === res2.incident.assignedResourceId) {
        throw new Error('Conflicting concurrent assignment: single resource assigned to two incidents!');
      }
    });

    // 4. Resource unavailability and exhaustion
    test('4. Resource unavailability', () => {
      const coordinator = new EmergencyCoordinator();
      coordinator.reset();
      // Dispatch all deep water craft (RB-01, RB-02)
      coordinator.reportDistressIncident('INC-EX-01', 'VIS-1', { x: 500, y: 400 }, 0.95);
      coordinator.reportDistressIncident('INC-EX-02', 'VIS-2', { x: 520, y: 410 }, 0.90);
      // Third deep incident
      const res3 = coordinator.reportDistressIncident('INC-EX-03', 'VIS-3', { x: 540, y: 420 }, 0.85);

      if (res3.dispatched) throw new Error('Dispatched without available craft!');
      if (res3.incident.status !== 'UNRESOLVED_RESOURCE_EXHAUSTION') {
        throw new Error(`Expected UNRESOLVED_RESOURCE_EXHAUSTION, got ${res3.incident.status}`);
      }
      if (coordinator.getUnresolvedCount() !== 1) {
        throw new Error(`Expected 1 unresolved incident, got ${coordinator.getUnresolvedCount()}`);
      }
    });

    // 5. Valid and invalid evacuation routes
    test('5. Valid and invalid evacuation routes', () => {
      const planner = new EvacuationRoutePlanner();
      const route = planner.findBestRoute(500, 240, 'ZONE-CENTRAL-SWIM');
      if (!route) throw new Error('Expected valid route for Central Swimming Bay');
      if (route.originZoneId !== 'ZONE-CENTRAL-SWIM') throw new Error('Mismatched origin zone');

      const invalidRoute = planner.findBestRoute(0, 0, 'ZONE-INVALID');
      if (invalidRoute !== null) throw new Error('Expected null route for invalid zone');
    });

    // 6. Blocked and reopened routes
    test('6. Blocked and reopened routes', () => {
      const planner = new EvacuationRoutePlanner();
      // Block primary boardwalk route
      planner.setRouteBlocked('ROUTE-CENTRAL-TO-PAVILION', true, 'Obstruction');

      const alternate = planner.findBestRoute(500, 240, 'ZONE-CENTRAL-SWIM');
      if (!alternate) throw new Error('Expected alternate route when primary is blocked');
      if (alternate.routeId !== 'ROUTE-CENTRAL-TO-NORTH') {
        throw new Error(`Expected rerouting to ROUTE-CENTRAL-TO-NORTH, got ${alternate.routeId}`);
      }

      // Reopen primary
      planner.setRouteBlocked('ROUTE-CENTRAL-TO-PAVILION', false);
      const restored = planner.findBestRoute(500, 240, 'ZONE-CENTRAL-SWIM');
      if (restored?.routeId !== 'ROUTE-CENTRAL-TO-PAVILION') {
        throw new Error('Expected primary route restored after reopening');
      }
    });

    // 7. Visitor route-following behavior
    test('7. Visitor route-following behavior', () => {
      const scenarioMgr = new EmergencyScenarioManager();
      const dummyVisitor: Visitor = {
        id: 'VIS-TEST-01',
        type: 'SWIMMER',
        position: { x: 500, y: 240 },
        currentZone: 'ZONE-CENTRAL-SWIM',
        state: 'BEACH',
        behavior: {} as any,
        vulnerability: 0.5,
        awareness: 0.5,
        swimmingAbility: 0.5,
        riskTolerance: 0.5,
        warningResponse: 0.9,
        distressLevel: 0,
        speed: 1.5,
        active: true,
        awarenessState: 'UNAWARE',
        reactionDelaySeconds: 1.0,
        localWaterDepth: 0,
      } as any;

      scenarioMgr.onEvacuationApproved([dummyVisitor]);
      const initialY = dummyVisitor.position.y;

      // Run 1 update tick (dt = 0.5s)
      scenarioMgr.update(0.5, [dummyVisitor], { width: 1000, height: 600 } as any);

      if (dummyVisitor.state !== 'EXITING') {
        throw new Error(`Expected visitor state EXITING, got ${dummyVisitor.state}`);
      }
      if (dummyVisitor.position.y >= initialY) {
        throw new Error('Visitor should move toward exit (lower Y / promenade)');
      }
    });

    // 8. Congestion and queue calculations
    test('8. Congestion and queue calculations', () => {
      const planner = new EvacuationRoutePlanner();
      // Set high queue on Central Pavilion
      const pavilionExit = planner.getExits().find((e) => e.exitId === 'EXIT-CENTRAL-PAVILION');
      if (!pavilionExit) throw new Error('Missing exit');
      pavilionExit.currentQueueCount = 40;

      // Due to queue penalty, alternate uncrowded North Ramp should be chosen
      const best = planner.findBestRoute(550, 240, 'ZONE-CENTRAL-SWIM');
      if (best?.exitId !== 'EXIT-NORTH-RAMP') {
        throw new Error(`Expected crowd redistribution to EXIT-NORTH-RAMP, got ${best?.exitId}`);
      }
    });

    // 9. Operator approval and rejection
    test('9. Operator approval and rejection', () => {
      const policy = new EmergencyDecisionPolicy();
      const zoneMgr = EvacuationZoneManager.getInstance();

      policy.evaluateRules(2, 0.75, 20, 1);
      const evacRec = policy.getRecommendations().find((r) => r.actionType === 'EVACUATE_ZONE');
      if (!evacRec) throw new Error('Expected EVACUATE_ZONE recommendation');

      // Reject test
      policy.reviewRecommendation(evacRec.recommendationId, false, 'OPERATOR-01');
      if (evacRec.status !== 'OPERATOR_REJECTED') {
        throw new Error(`Expected OPERATOR_REJECTED, got ${evacRec.status}`);
      }
      if (zoneMgr.getZone('ZONE-CENTRAL-SWIM')?.state === 'EVACUATION') {
        throw new Error('Zone state should not be EVACUATION when rejected!');
      }

      // Approve test
      policy.reviewRecommendation(evacRec.recommendationId, true, 'OPERATOR-01');
      if ((evacRec.status as string) !== 'OPERATOR_APPROVED') {
        throw new Error(`Expected OPERATOR_APPROVED, got ${evacRec.status}`);
      }
      if (zoneMgr.getZone('ZONE-CENTRAL-SWIM')?.state !== 'EVACUATION') {
        throw new Error('Zone state should transition to EVACUATION upon operator approval');
      }
    });

    // 10. Duplicate warnings and zone transitions
    test('10. Duplicate warnings and zone transitions', () => {
      const policy = new EmergencyDecisionPolicy();
      policy.evaluateRules(2, 0.75, 20, 0);
      const initialCount = policy.getRecommendations().length;

      // Second identical call
      policy.evaluateRules(2, 0.75, 20, 0);
      if (policy.getRecommendations().length !== initialCount) {
        throw new Error('Duplicate recommendations created for identical rule conditions');
      }
    });

    // 11. Missing timestamps and unavailable metrics
    test('11. Missing timestamps and unavailable metrics', () => {
      const scenarioMgr = new EmergencyScenarioManager();
      scenarioMgr.reset();
      const metrics = scenarioMgr.getMetrics();

      if (metrics.evacuationCompletionPct !== null) {
        throw new Error('Expected N/A (null) for evacuationCompletionPct when scenario is idle');
      }
      if (metrics.warningToMovementDelaySec !== null) {
        throw new Error('Expected N/A (null) for warningToMovementDelaySec when scenario is idle');
      }
      if (metrics.scenarioDurationSec !== null) {
        throw new Error('Expected N/A (null) for scenarioDurationSec when scenario is idle');
      }
    });

    // 12. Scenario reset and cancellation
    test('12. Scenario reset and cancellation', () => {
      const scenarioMgr = new EmergencyScenarioManager();
      const coord = EmergencyCoordinator.getInstance();
      coord.reportDistressIncident('INC-RESET-01', 'VIS-1', { x: 500, y: 350 }, 0.85);

      scenarioMgr.reset();

      if (coord.getIncidents().length !== 0) throw new Error('Incidents not cleared on reset');
      if (scenarioMgr.scenarioState !== 'IDLE') throw new Error('Scenario state not reset to IDLE');
    });

    // 13. Preservation of normal visitor behavior outside evacuation mode
    test('13. Preservation of normal visitor behavior outside evacuation mode', () => {
      const scenarioMgr = new EmergencyScenarioManager();
      scenarioMgr.reset();

      const normalVisitor: Visitor = {
        id: 'VIS-NORMAL-01',
        type: 'SWIMMER',
        position: { x: 500, y: 240 },
        currentZone: 'ZONE-CENTRAL-SWIM',
        state: 'BEACH',
        behavior: {} as any,
        vulnerability: 0.5,
        awareness: 0.5,
        swimmingAbility: 0.5,
        riskTolerance: 0.5,
        warningResponse: 0.9,
        distressLevel: 0,
        speed: 1.5,
        active: true,
        awarenessState: 'UNAWARE',
        reactionDelaySeconds: 1.0,
        localWaterDepth: 0,
      } as any;

      // Tick update when scenario is IDLE
      scenarioMgr.update(0.5, [normalVisitor], { width: 1000, height: 600 } as any);

      if (normalVisitor.state !== 'BEACH') {
        throw new Error(`Normal visitor state mutated! Expected BEACH, got ${normalVisitor.state}`);
      }
      if (normalVisitor.position.y !== 240) {
        throw new Error('Normal visitor position moved without active evacuation order!');
      }
    });

    // 14. Preservation of existing hazard and rescue behavior
    test('14. Preservation of existing hazard and rescue behavior', () => {
      const zoneMgr = EvacuationZoneManager.getInstance();
      const northRocks = zoneMgr.getZone('ZONE-NORTH-ROCKS');
      if (!northRocks || northRocks.state !== 'RESTRICTED') {
        throw new Error('North Cape Rocks should remain RESTRICTED baseline');
      }
    });

    // 15. Priority scoring boundary checks
    test('15. Priority scoring boundary checks', () => {
      const coordinator = new EmergencyCoordinator();
      const minScore = coordinator.calculatePriorityScore(0.0, 280.0, 0.0);
      const maxScore = coordinator.calculatePriorityScore(1.0, 480.0, 60.0);

      if (minScore !== 0.0) throw new Error(`Expected min priority 0.0, got ${minScore}`);
      if (maxScore !== 1.0) throw new Error(`Expected max priority 1.0, got ${maxScore}`);
    });

    return results;
  }
}
