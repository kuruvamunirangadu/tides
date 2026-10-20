import { RipCurrentSimulator } from '../RipCurrentSimulator';
import { VisitorCoordinateMapper } from '../../visitors/VisitorCoordinateMapper';
import { Visitor } from '../../../models/Visitor';
import { Beach } from '../../../models/Beach';
import { Environment } from '../../../models/Environment';

/**
 * RipCurrentTestSuite.ts
 * 
 * Automated validation suite for Milestone 3:
 * 1. Default inactive state validation
 * 2. Scenario trigger & bather entrainment
 * 3. Physical offshore transport & fatigue progression
 * 4. State transitions: SWIMMING -> STRUGGLING -> DISTRESS
 * 5. Incident generation & single-alert deduplication
 * 6. Clean reset & return to safe state
 * 7. 3D coordinate continuity and boundary constraints
 */
export class RipCurrentTestSuite {
  public static runTests(): {
    passed: boolean;
    totalTests: number;
    passedTests: number;
    results: Array<{ testName: string; passed: boolean; message: string }>;
  } {
    const results: Array<{ testName: string; passed: boolean; message: string }> = [];

    const mockBeach: Beach = {
      id: 'BEACH-TEST',
      name: 'Rushikonda Beach Test',
      width: 1000,
      height: 600,
      shorelineY: 280,
      zones: [],
      lifeguardStations: [],
      emergencyPoints: [],
    };

    const mockEnvironment: Environment = {
      tideLevel: 1.2,
      waveHeight: 1.5,
      wavePeriod: 8.0,
      waveDirection: 120,
      windSpeed: 18,
      windDirection: 120,
      weather: 'CLEAR',
      visibility: 10,
      waterCurrent: 1.9,
    };

    const mockVisitors: Visitor[] = [
      {
        id: 'V-TEST-001',
        type: 'SWIMMER',
        position: { x: 550, y: 310 },
        currentZone: 'SZ-02',
        state: 'SWIMMING',
        behavior: {} as any,
        vulnerability: 0.3,
        awareness: 0.5,
        swimmingAbility: 0.6,
        riskTolerance: 0.4,
        warningResponse: 0.8,
        distressLevel: 0.1,
        speed: 1.2,
        active: true,
        awarenessState: 'UNAWARE',
        reactionDelaySeconds: 1.2,
        localWaterDepth: 1.5,
        fatigue: 0.2,
        waterTime: 60,
        velocity: { vx: 0, vy: 0 },
        driftVector: { dx: 0, dy: 0 },
        color: '#06b6d4',
        warningCount: 0,
      },
      {
        id: 'V-TEST-002',
        type: 'TOURIST',
        position: { x: 200, y: 150 }, // On dry sand
        currentZone: 'BZ-01',
        state: 'WALKING',
        behavior: {} as any,
        vulnerability: 0.4,
        awareness: 0.7,
        swimmingAbility: 0.2,
        riskTolerance: 0.2,
        warningResponse: 0.9,
        distressLevel: 0,
        speed: 1.0,
        active: true,
        awarenessState: 'UNAWARE',
        reactionDelaySeconds: 1.0,
        localWaterDepth: 0,
        fatigue: 0.1,
        waterTime: 0,
        velocity: { vx: 0.5, vy: 0 },
        driftVector: { dx: 0, dy: 0 },
        color: '#f59e0b',
        warningCount: 0,
      },
    ];

    const sim = RipCurrentSimulator.getInstance();

    // Test 1: Inactive by default
    sim.resetScenario(mockVisitors);
    const test1Passed = sim.active === false && sim.getActiveIncident() === null;
    results.push({
      testName: '1. Inactive State Verification',
      passed: test1Passed,
      message: test1Passed ? 'Rip simulator initialized in dormant safe state' : 'Simulator was unexpectedly active',
    });

    // Test 2: Trigger scenario & entrain bather
    sim.triggerRipScenario(mockVisitors, mockBeach);
    const test2Passed = sim.active === true && sim.targetVisitorId === 'V-TEST-001';
    results.push({
      testName: '2. Scenario Activation & Swimmer Entrainment',
      passed: test2Passed,
      message: test2Passed ? 'Swimmer V-TEST-001 successfully assigned to rip neck' : 'Failed to entrain target bather',
    });

    // Test 3: Simulation step & offshore transport
    const initialY = mockVisitors[0].position.y;
    sim.update(1.0, mockVisitors, mockBeach, mockEnvironment);
    const movedOffshore = mockVisitors[0].position.y > initialY;
    results.push({
      testName: '3. Physical Seaward Transport',
      passed: movedOffshore,
      message: movedOffshore
        ? `Swimmer transported offshore from y=${initialY.toFixed(1)} to y=${mockVisitors[0].position.y.toFixed(1)}`
        : 'Swimmer position did not advance seaward',
    });

    // Test 4: Progression to STRUGGLING
    // Advance several seconds to simulate offshore drift
    for (let i = 0; i < 4; i++) {
      sim.update(1.0, mockVisitors, mockBeach, mockEnvironment);
    }
    const strugglingOrDistress = mockVisitors[0].state === 'STRUGGLING' || mockVisitors[0].state === 'DISTRESS';
    results.push({
      testName: '4. Physiological Fatigue & Struggle Progression',
      passed: strugglingOrDistress,
      message: strugglingOrDistress
        ? `Swimmer entered ${mockVisitors[0].state} state (Fatigue: ${(mockVisitors[0].fatigue * 100).toFixed(0)}%)`
        : `Swimmer state remained ${mockVisitors[0].state}`,
    });

    // Test 5: Acute Distress & Incident Logging with Deduplication
    for (let i = 0; i < 6; i++) {
      sim.update(1.0, mockVisitors, mockBeach, mockEnvironment);
    }
    const incident = sim.getActiveIncident();
    const distressTriggered = mockVisitors[0].state === 'DISTRESS' && incident !== null;
    results.push({
      testName: '5. Acute Distress State Transition & Incident Logging',
      passed: distressTriggered,
      message: distressTriggered
        ? `Incident #${incident?.incidentId} generated with ${incident?.severity} severity at ${incident?.timeDisplay}`
        : 'Distress transition or incident generation failed',
    });

    // Test 6: Deduplication Check (Repeated updates must NOT recreate or duplicate incident ID)
    const originalIncId = incident?.incidentId;
    sim.update(1.0, mockVisitors, mockBeach, mockEnvironment);
    sim.update(1.0, mockVisitors, mockBeach, mockEnvironment);
    const sameIncident = sim.getActiveIncident()?.incidentId === originalIncId;
    results.push({
      testName: '6. Single-Alert Deduplication Across Render Frames',
      passed: sameIncident,
      message: sameIncident
        ? `Stable incident identity preserved without duplicate alerts (#${originalIncId})`
        : 'Incident was duplicated across frames',
    });

    // Test 7: Coordinate Mapper Consistency
    const mapper = new VisitorCoordinateMapper();
    const t3d = mapper.map(mockVisitors[0], mockBeach, mockEnvironment);
    const valid3D = t3d.inWater === true && t3d.animationState === 'distress' && t3d.z < 0;
    results.push({
      testName: '7. 3D Coordinate Mapping & Animation State Synchronization',
      passed: valid3D,
      message: valid3D
        ? `Mapped 3D: [${t3d.x.toFixed(1)}, ${t3d.y.toFixed(1)}, ${t3d.z.toFixed(1)}], Animation: ${t3d.animationState}`
        : '3D coordinate mapping produced inconsistent values',
    });

    // Test 8: Reset Verification
    sim.resetScenario(mockVisitors);
    const resetSuccess = sim.active === false && sim.getActiveIncident() === null && mockVisitors[0].state === 'BEACH';
    results.push({
      testName: '8. Scenario Reset & Safe State Recovery',
      passed: resetSuccess,
      message: resetSuccess ? 'Scenario reset cleanly; bather returned to safe beach state' : 'Reset failed to restore safe state',
    });

    const passedTests = results.filter((r) => r.passed).length;
    return {
      passed: passedTests === results.length,
      totalTests: results.length,
      passedTests,
      results,
    };
  }
}

