import { DroneCameraRegistry } from '../../camera/DroneCameraRegistry';
import { DroneRegistry } from '../../foundation/DroneRegistry';
import { DroneMissionManager } from '../../missions/DroneMissionManager';
import { CoastalZoneRegistry } from '../CoastalZoneRegistry';
import { DroneCoverageAllocator } from '../DroneCoverageAllocator';
import { DroneCoverageTracker } from '../DroneCoverageTracker';
import { IntelligentSurveillanceService } from '../IntelligentSurveillanceService';

export class IntelligentSurveillanceTestSuite {
  private passed = 0;
  private failed = 0;

  private assert(condition: boolean, name: string): void {
    if (condition) {
      this.passed++;
      console.log(`  [PASS] ${name}`);
    } else {
      this.failed++;
      console.error(`  [FAIL] ${name}`);
    }
  }

  public run(): { passed: number; failed: number } {
    const zones = new CoastalZoneRegistry();
    const drones = new DroneRegistry();
    const cameras = new DroneCameraRegistry();
    const missions = new DroneMissionManager();
    const tracker = new DroneCoverageTracker(zones, drones, cameras);
    const allocator = new DroneCoverageAllocator(zones, drones, missions);
    const service = new IntelligentSurveillanceService(zones, tracker, allocator, cameras, drones, missions);
    const snapshot = service.getSnapshot(Date.now());

    this.assert(snapshot.regions.length === 4, 'All configured surveillance regions are represented');
    this.assert(snapshot.gaps.length > 0, 'Uncovered or unassigned regions are surfaced as coverage gaps');
    this.assert(snapshot.patrolPlan.allocations.length > 0, 'Patrol recommendations are generated from eligible drones');
    this.assert(snapshot.unavailableCameras >= 1, 'Standby or unavailable camera states remain distinct from active feeds');
    this.assert(snapshot.simulatedDataNotice.includes('not proof'), 'Modeled coverage limitation is explicit');

    const rescueDrone = drones.getDrone('DRONE-02');
    const rescueCheck = service.confirmPatrol('CZ-02-CENTRAL-RIP', rescueDrone?.droneId || 'DRONE-02');
    this.assert(!rescueCheck.success, 'Patrol confirmation cannot claim a dedicated rescue drone');
    this.assert(missions.getActiveMissions().length === 0, 'Surveillance recommendation does not create a mission automatically');

    console.log(`Results: ${this.passed} passed, ${this.failed} failed.`);
    return { passed: this.passed, failed: this.failed };
  }
}