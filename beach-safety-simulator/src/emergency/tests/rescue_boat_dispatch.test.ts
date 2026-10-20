import { EmergencyResponseEngine } from '../EmergencyResponseEngine';
import { Incident } from '../../models/Incident';
import { VisitorEngine } from '../../visitors/VisitorEngine';
import { SimulationEngine } from '../../simulation/SimulationEngine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runRescueBoatTests() {
  console.log('======================================================================');
  console.log('TIDES — Rescue Boat Dispatch, Dynamic Tracking & Kinematics Test Suite');
  console.log('======================================================================');

  // Test 1: Critical Swimmer Distress in Water Allocates and Dispatches Rescue Boat
  console.log('\n--- TEST 1: Critical Swimmer Distress in Water Allocates Rescue Boat ---');
  {
    const engine = new EmergencyResponseEngine();
    const visitorEngine = new VisitorEngine();
    const incident: Incident = {
      id: 'INC-CRITICAL-01',
      type: 'DISTRESS',
      visitorIds: ['V-001'],
      zoneId: 'SZ-01',
      severity: 'CRITICAL',
      title: 'Distressed Swimmer (CRITICAL)',
      description: 'Swimmer caught in rip current channel',
      location: { x: 560, y: 310 }, // Water region (y >= 250)
      startedAt: 100,
      active: true,
    };

    const resBefore = engine.getResourceManager().getById('BOAT-01');
    assert(resBefore?.status === 'AVAILABLE', 'BOAT-01 starts AVAILABLE');

    const result = engine.tick([incident], [], undefined, visitorEngine, 105, 1.0);
    const boat = engine.getResourceManager().getById('BOAT-01');
    assert(boat !== undefined, 'BOAT-01 exists');
    assert(
      boat!.status === 'DISPATCHED' || boat!.status === 'EN_ROUTE',
      `BOAT-01 must be DISPATCHED or EN_ROUTE, got ${boat!.status}`
    );
    assert(boat!.targetPosition?.x === 560 && boat!.targetPosition?.y === 310, 'Boat target position is set to victim');
    assert(result.incidents.length === 1, '1 Emergency incident tracked');
    assert(result.incidents[0].assignedResourceIds.includes('BOAT-01'), 'Incident assigned BOAT-01');
    console.log('[PASS] Test 1: Rescue boat successfully allocated and dispatched for critical in-water distress');
  }

  // Test 2: Dynamic Intercept Tracking as Swimmer Drifts Offshore
  console.log('\n--- TEST 2: Dynamic Intercept Tracking as Swimmer Drifts Offshore ---');
  {
    const engine = new EmergencyResponseEngine();
    const visitorEngine = new VisitorEngine();
    const incident: Incident = {
      id: 'INC-DRIFT-01',
      type: 'DISTRESS',
      visitorIds: ['V-002'],
      zoneId: 'SZ-01',
      severity: 'CRITICAL',
      title: 'Drifting Swimmer',
      description: 'Swimmer drifting seaward',
      location: { x: 560, y: 310 },
      startedAt: 100,
      active: true,
    };

    engine.tick([incident], [], undefined, visitorEngine, 100, 0.1);
    const boat = engine.getResourceManager().getById('BOAT-01')!;
    assert(boat.targetPosition?.y === 310, 'Initial target y=310');

    // Simulate swimmer drifting further offshore to y = 380, x = 580
    incident.location = { x: 580, y: 380 };
    engine.tick([incident], [], undefined, visitorEngine, 101, 0.1);

    assert(boat.targetPosition?.x === 580, 'Boat target x updated to live drifting location (580)');
    assert(boat.targetPosition?.y === 380, 'Boat target y updated to live drifting location (380)');
    console.log('[PASS] Test 2: Dispatched rescue boat dynamically synchronized target with drifting swimmer');
  }

  // Test 3: Kinematic Movement Advances Boat Coordinates Toward Victim
  console.log('\n--- TEST 3: Kinematic Movement Advances Boat Coordinates Toward Victim ---');
  {
    const engine = new EmergencyResponseEngine();
    const visitorEngine = new VisitorEngine();
    const incident: Incident = {
      id: 'INC-MOVE-01',
      type: 'DISTRESS',
      visitorIds: ['V-003'],
      zoneId: 'SZ-01',
      severity: 'CRITICAL',
      title: 'Distressed Swimmer Moving',
      description: 'Swimmer requiring rescue',
      location: { x: 560, y: 340 },
      startedAt: 100,
      active: true,
    };

    const initialPos = { ...engine.getResourceManager().getById('BOAT-01')!.position };
    // Tick forward 2 seconds with deltaTime = 1.0s
    engine.tick([incident], [], undefined, visitorEngine, 101, 1.0);
    engine.tick([incident], [], undefined, visitorEngine, 102, 1.0);

    const updatedPos = engine.getResourceManager().getById('BOAT-01')!.position;
    const initialDist = Math.hypot(560 - initialPos.x, 340 - initialPos.y);
    const updatedDist = Math.hypot(560 - updatedPos.x, 340 - updatedPos.y);

    assert(updatedDist < initialDist, `Boat must be moving towards victim (initialDist: ${initialDist}, updatedDist: ${updatedDist})`);
    console.log(`[PASS] Test 3: Boat physically advanced closer to victim: distance reduced from ${initialDist.toFixed(1)}px to ${updatedDist.toFixed(1)}px`);
  }

  // Test 4: SimulationEngine injectHazardScenario('RIP_CURRENT') triggers Boat Movement
  console.log('\n--- TEST 4: SimulationEngine injectHazardScenario RIP_CURRENT Triggers Boat Dispatch ---');
  {
    const sim = new SimulationEngine();
    sim.injectHazardScenario('RIP_CURRENT');

    // Run a few ticks of the simulation engine
    for (let i = 0; i < 5; i++) {
      sim.tick(0.5);
    }

    const state = sim.getState();
    const boat = state.emergencyResources.find((r) => r.type === 'RESCUE_BOAT');
    assert(boat !== undefined, 'RESCUE_BOAT found in simulation state');
    assert(
      boat!.status === 'DISPATCHED' || boat!.status === 'EN_ROUTE' || boat!.status === 'ON_SCENE',
      `Boat status must be active dispatch, got ${boat!.status}`
    );
    assert(boat!.targetPosition !== undefined, 'Boat has target position assigned');
    console.log(`[PASS] Test 4: RIP_CURRENT injection initiated active boat dispatch with status ${boat!.status}`);
  }

  console.log('\n======================================================================');
  console.log('ALL 4 RESCUE BOAT TESTS PASSED (100%)');
  console.log('======================================================================');
}

runRescueBoatTests().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});
