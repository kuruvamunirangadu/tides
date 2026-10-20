import { RescueCoordinator } from '../RescueCoordinator';
import { RescueAssignmentPolicy } from '../RescueAssignmentPolicy';
import { RescueNavigation } from '../RescueNavigation';
import { RescueMetrics } from '../RescueMetrics';
import { RescueMissionDossier, RescueResourceState3D } from '../rescue.types';
import { DistressIncidentEvent } from '../../hazards/rip3d.types';
import { Visitor } from '../../../models/Visitor';
import { Beach } from '../../../models/Beach';

export class RescueTestSuite {
  public static runAll(): { name: string; passed: boolean; message?: string }[] {
    const results: { name: string; passed: boolean; message?: string }[] = [];

    // Mock Beach & Visitor
    const mockBeach: Beach = {
      id: 'b-01',
      name: 'Test Beach',
      shorelineY: 280,
      width: 1000,
      length: 800,
    } as any;

    const createMockVisitor = (id: string, x: number, y: number): Visitor => ({
      id,
      name: `Swimmer ${id}`,
      active: true,
      state: 'DISTRESS',
      position: { x, y },
      speed: 1.0,
      distressLevel: 0.9,
      fatigue: 0.8,
      awarenessState: 'TRAPPED',
    } as any);

    const createMockIncident = (incidentId: string, z: number): DistressIncidentEvent => ({
      incidentId,
      visitorId: 'vis-101',
      visitorName: 'Swimmer #101',
      hazardId: 'HAZ-RIP-01',
      hazardType: 'RIP_CURRENT',
      onsetSimTime: 100.0,
      alertSimTime: 101.2,
      detectionLatencySec: 1.2,
      timeDisplay: '14:30:00',
      position3D: { x: 10, y: 0, z },
      position2D: { x: 550, y: 380 },
      stage: 'ALERT_ISSUED',
      severity: 'CRITICAL',
      description: 'Offshore rip distress test incident',
      resolved: false,
    });

    // Test 1: Assignment Policy - Deep Water
    try {
      const coordinator = new RescueCoordinator();
      const resources = coordinator.registry.getResources();
      const decision = RescueAssignmentPolicy.evaluateAssignment(10, 0, -35, true, resources);

      if (decision.selectedResource && decision.selectedResource.type === 'RESCUE_BOAT' && decision.selectedResource.id === 'RB-01') {
        results.push({ name: 'Policy: Deep-water incident assigns Rescue Boat (RB-01)', passed: true });
      } else {
        results.push({
          name: 'Policy: Deep-water incident assigns Rescue Boat (RB-01)',
          passed: false,
          message: `Expected RB-01, got ${decision.selectedResource?.id}`,
        });
      }
    } catch (e: any) {
      results.push({ name: 'Policy: Deep-water incident assigns Rescue Boat (RB-01)', passed: false, message: e.message });
    }

    // Test 2: Assignment Policy - Shallow Water / Surf Zone
    try {
      const coordinator = new RescueCoordinator();
      const resources = coordinator.registry.getResources();
      const decision = RescueAssignmentPolicy.evaluateAssignment(-20, 0, 15, false, resources);

      if (decision.selectedResource && decision.selectedResource.type === 'LIFEGUARD') {
        results.push({ name: 'Policy: Shallow-water incident assigns nearest Lifeguard Squad', passed: true });
      } else {
        results.push({
          name: 'Policy: Shallow-water incident assigns nearest Lifeguard Squad',
          passed: false,
          message: `Expected LIFEGUARD, got ${decision.selectedResource?.type}`,
        });
      }
    } catch (e: any) {
      results.push({ name: 'Policy: Shallow-water incident assigns nearest Lifeguard Squad', passed: false, message: e.message });
    }

    // Test 3: Idempotency - Duplicate Dispatch Prevention
    try {
      const coordinator = new RescueCoordinator();
      const visitor = createMockVisitor('vis-101', 550, 380);
      const incident = createMockIncident('INC-TEST-01', -30);

      const firstDispatch = coordinator.handleDistressIncident(incident, [visitor], mockBeach);
      const secondDispatch = coordinator.handleDistressIncident(incident, [visitor], mockBeach);

      if (firstDispatch === true && secondDispatch === false && coordinator.activeMission != null) {
        results.push({ name: 'Idempotency: Prevents duplicate dispatches for active incident', passed: true });
      } else {
        results.push({
          name: 'Idempotency: Prevents duplicate dispatches for active incident',
          passed: false,
          message: `first=${firstDispatch}, second=${secondDispatch}`,
        });
      }
    } catch (e: any) {
      results.push({ name: 'Idempotency: Prevents duplicate dispatches for active incident', passed: false, message: e.message });
    }

    // Test 4: Smooth Navigation - Zero Teleportation
    try {
      const res: RescueResourceState3D = {
        id: 'RB-01',
        name: 'Boat',
        type: 'RESCUE_BOAT',
        currentX: 0,
        currentY: 0,
        currentZ: 0,
        rotationY: 0,
        standbyX: 0,
        standbyY: 0,
        standbyZ: 0,
        speedMps: 10,
        status: 'EN_ROUTE',
        assignedIncidentId: 'INC-1',
        color: '#000',
      };

      const delta = 0.5; // 0.5s at 10 m/s -> max travel distance is 5.0m
      const step = RescueNavigation.step(res, 100, 0, 0, delta, 2.0);
      const distTraveled = Math.hypot(step.x - res.currentX, step.z - res.currentZ);

      if (distTraveled <= 5.01 && distTraveled >= 4.99 && !step.hasArrived) {
        results.push({ name: 'Navigation: Speed-governed progression without teleportation', passed: true });
      } else {
        results.push({
          name: 'Navigation: Speed-governed progression without teleportation',
          passed: false,
          message: `Traveled ${distTraveled}m, expected 5m`,
        });
      }
    } catch (e: any) {
      results.push({ name: 'Navigation: Speed-governed progression without teleportation', passed: false, message: e.message });
    }

    // Test 5: Full Lifecycle & Bather Recovery
    try {
      const coordinator = new RescueCoordinator();
      const visitor = createMockVisitor('vis-101', 550, 380);
      const incident = createMockIncident('INC-TEST-02', -25);

      coordinator.handleDistressIncident(incident, [visitor], mockBeach);
      const mission = coordinator.activeMission!;

      // Fast-forward navigation by setting resource close to target
      const res = coordinator.registry.getResource(mission.assignedResourceId)!;
      coordinator.registry.updateResource(res.id, {
        currentX: res.targetX,
        currentZ: res.targetZ,
      });

      // Update coordinator to trigger arrival
      coordinator.update(0.1, [visitor], mockBeach, {} as any);
      const isArrived = mission.stage === 'ARRIVED' || mission.stage === 'ASSISTING';

      // Simulate assistance completion
      coordinator.update(4.0, [visitor], mockBeach, {} as any);
      const isRecovered = visitor.state === 'BEACH' && visitor.distressLevel === 0 && visitor.position.y === 160;

      if (isArrived && isRecovered && mission.stage === 'RETURNING') {
        results.push({ name: 'Lifecycle: Assistance completed and bather recovered to safe beach', passed: true });
      } else {
        results.push({
          name: 'Lifecycle: Assistance completed and bather recovered to safe beach',
          passed: false,
          message: `isArrived=${isArrived}, isRecovered=${isRecovered}, stage=${mission.stage}`,
        });
      }
    } catch (e: any) {
      results.push({ name: 'Lifecycle: Assistance completed and bather recovered to safe beach', passed: false, message: e.message });
    }

    // Test 6: Golden Window SLA & Metrics Computation
    try {
      const mockDossier: RescueMissionDossier = {
        missionId: 'MSN-001',
        incidentId: 'INC-001',
        visitorId: 'vis-101',
        assignedResourceId: 'RB-01',
        assignedResourceName: 'Rescue Boat',
        resourceType: 'RESCUE_BOAT',
        assignmentRationale: 'Test',
        stage: 'COMPLETED',
        distressSimTime: 100.0,
        alertSimTime: 101.5,
        dispatchSimTime: 102.0,
        departSimTime: 102.5,
        arrivalSimTime: 118.0,
        assistanceStartSimTime: 118.0,
        assistanceEndSimTime: 122.0,
        resolutionSimTime: 122.0,
      };

      const metrics = RescueMetrics.compute(mockDossier);

      const alertOk = metrics.alertLatencySec === 1.5;
      const dispatchOk = metrics.dispatchLatencySec === 2.0;
      const travelOk = metrics.travelTimeSec === 15.5;
      const ttaOk = metrics.timeToAssistanceSec === 18.0;
      const slaOk = metrics.goldenWindowSLA.compliant === true;

      if (alertOk && dispatchOk && travelOk && ttaOk && slaOk) {
        results.push({ name: 'Metrics: Verifiable timestamps and Golden Window SLA calculation', passed: true });
      } else {
        results.push({
          name: 'Metrics: Verifiable timestamps and Golden Window SLA calculation',
          passed: false,
          message: `alert=${metrics.alertLatencySec}, dispatch=${metrics.dispatchLatencySec}, travel=${metrics.travelTimeSec}, tta=${metrics.timeToAssistanceSec}, sla=${metrics.goldenWindowSLA.compliant}`,
        });
      }
    } catch (e: any) {
      results.push({ name: 'Metrics: Verifiable timestamps and Golden Window SLA calculation', passed: false, message: e.message });
    }

    return results;
  }
}

