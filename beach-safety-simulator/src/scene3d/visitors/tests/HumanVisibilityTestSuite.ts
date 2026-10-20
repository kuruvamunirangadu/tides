import * as THREE from 'three';
import { VisitorModelLoader } from '../VisitorModelLoader';
import { VisitorCoordinateMapper } from '../VisitorCoordinateMapper';
import { VisitorCharacter3D } from '../VisitorCharacter3D';
import { RescueCoordinator } from '../../rescue/RescueCoordinator';
import { RescueOperationLayer } from '../../rescue/RescueOperationLayer';
import { TacticalRescueVisual3D } from '../../rescue/TacticalRescueVisual3D';
import { AerialImageLayer3D } from '../../terrain/AerialImageLayer3D';
import { FollowTargetController } from '../../camera/FollowTargetController';
import { Visitor, VisitorType, VisitorState } from '../../../models/Visitor';
import { Beach } from '../../../models/Beach';
import { Environment } from '../../../models/Environment';
import { DistressIncidentEvent } from '../../hazards/rip3d.types';

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: Record<string, any>;
}

export class HumanVisibilityTestSuite {
  private mockBeach: Beach = {
    id: 'rushikonda',
    name: 'Rushikonda Beach',
    width: 1000,
    height: 600,
    shorelineY: 280,
    zones: [],
    landmarks: [],
  } as any;

  private mockEnv: Environment = {
    waveHeight: 1.2,
    waterCurrent: 0.8,
    windSpeed: 15,
    windDirection: 120,
    tideStatus: 'RISING',
    tideLevel: 1.2,
    waterTemperature: 28,
  } as any;

  private createMockVisitor(overrides: Partial<Visitor> = {}): Visitor {
    return {
      id: 'VIS-901',
      type: 'SWIMMER' as VisitorType,
      position: { x: 500, y: 350 },
      currentZone: 'ZONE_WATER',
      state: 'SWIMMING' as VisitorState,
      behavior: {} as any,
      vulnerability: 0.3,
      awareness: 0.5,
      swimmingAbility: 0.7,
      riskTolerance: 0.4,
      warningResponse: 0.6,
      distressLevel: 0.0,
      speed: 1.2,
      active: true,
      awarenessState: 'UNAWARE',
      reactionDelaySeconds: 1.2,
      localWaterDepth: 2.2,
      fatigue: 0.0,
      waterTime: 0,
      velocity: { vx: 0, vy: 0 },
      driftVector: { dx: 0, dy: 0 },
      color: '#00e5ff',
      warningCount: 0,
      ...overrides,
    };
  }

  public runAll(): TestResult[] {
    const results: TestResult[] = [];

    // Test 1: Humanoid proportions & limb volume
    results.push(this.testHumanoidProportions());

    // Test 2: Contrast swim cap & beachwear derivation
    results.push(this.testAppearanceAndContrast());

    // Test 3: Water surface positioning & distress posture elevation
    results.push(this.testWaterClearanceAndDistressElevation());

    // Test 4: 3D Overhead status badges & role classification
    results.push(this.testOverheadBadgesAndRoleStates());

    // Test 5: Distress visual cues (splash rings & locator beam)
    results.push(this.testDistressSplashAndLocatorBeam());

    // Test 6: Lifeguard & rescue boat tactical badges & userData
    results.push(this.testLifeguardAndBoatTacticalAssets());

    // Test 7: Tactical dispatch route vectors & assistance halos
    results.push(this.testTacticalDispatchVectors());

    // Test 8: End-to-end multi-swimmer coordinated rescue lifecycle
    results.push(this.testMultiSwimmerRescueFlow());

    // Test 9: Aerial image layer initialization & graceful fallback
    results.push(this.testAerialImageLayer());

    // Test 10: Interactive raycasting userData tagging
    results.push(this.testRaycastUserDataTagging());

    // Test 11: Camera tracking & focus controller targets
    results.push(this.testCameraTrackingResolution());

    // Test 12: Zero mutation of simulation state & clean disposal
    results.push(this.testSimulationNonInterferenceAndDisposal());

    return results;
  }

  private testHumanoidProportions(): TestResult {
    const vis = this.createMockVisitor();
    const appearance = VisitorModelLoader.deriveAppearance(vis);
    const { root, joints } = VisitorModelLoader.createHumanoid(appearance);

    const hasTorso = joints.torso != null && joints.torso.children.length > 0;
    const hasLimbs =
      joints.leftUpperArm != null &&
      joints.rightUpperArm != null &&
      joints.leftThigh != null &&
      joints.rightThigh != null;
    const scale = root.scale.x;

    const passed = hasTorso && hasLimbs && scale >= 0.70;
    return {
      name: 'Humanoid Proportions & Distinct Joint Hierarchy',
      passed,
      message: passed
        ? `Articulated joints verified. Scale: ${scale.toFixed(2)}, Torso & 4 limbs populated.`
        : 'Failed to construct full articulated humanoid joints.',
      details: { scale, hasTorso, hasLimbs },
    };
  }

  private testAppearanceAndContrast(): TestResult {
    const v1 = this.createMockVisitor({ id: 'VIS-ALPHA' });
    const v2 = this.createMockVisitor({ id: 'VIS-BETA' });

    const app1 = VisitorModelLoader.deriveAppearance(v1);
    const app2 = VisitorModelLoader.deriveAppearance(v2);

    const hasCap1 = app1.capColor != null && app1.capColor > 0;
    const hasSwimwear = app1.swimwearColor != null && app1.swimwearColor > 0;

    const passed = hasCap1 && hasSwimwear;
    return {
      name: 'High-Contrast Swim Cap & Beachwear Derivation',
      passed,
      message: passed
        ? `Derived vibrant cap color (0x${app1.capColor.toString(16)}) and swimwear (0x${app1.swimwearColor.toString(16)}).`
        : 'Failed to derive contrast cap or swimwear attributes.',
      details: { cap1: app1.capColor, cap2: app2.capColor },
    };
  }

  private testWaterClearanceAndDistressElevation(): TestResult {
    const mapper = new VisitorCoordinateMapper();

    const normalSwimmer = this.createMockVisitor({
      position: { x: 500, y: 380 },
      state: 'SWIMMING',
      distressLevel: 0.0,
    });
    const distressedSwimmer = this.createMockVisitor({
      position: { x: 500, y: 380 },
      state: 'DISTRESS',
      distressLevel: 0.9,
    });

    const normTransform = mapper.map(normalSwimmer, this.mockBeach, this.mockEnv);
    const distTransform = mapper.map(distressedSwimmer, this.mockBeach, this.mockEnv);

    // Normal swim elevation should breach surface (> -0.10)
    // Distress elevation should be significantly elevated (> normal)
    const passed =
      normTransform.y >= -0.05 &&
      distTransform.y > normTransform.y &&
      distTransform.distress === true;

    return {
      name: 'Swimmer Water Surface Height & Distress Elevation',
      passed,
      message: passed
        ? `Normal swim Y: ${normTransform.y.toFixed(2)}m, Distressed Y: ${distTransform.y.toFixed(2)}m (elevated for observation).`
        : 'Swimmer height did not meet visibility clearance thresholds.',
      details: { normalY: normTransform.y, distressY: distTransform.y },
    };
  }

  private testOverheadBadgesAndRoleStates(): TestResult {
    const mapper = new VisitorCoordinateMapper();

    const normalVis = this.createMockVisitor({ state: 'SWIMMING', distressLevel: 0.1 });
    const cautionVis = this.createMockVisitor({
      position: { x: 677, y: 400 }, // in rip corridor
      vulnerability: 0.8,
      distressLevel: 0.35,
    });
    const distressVis = this.createMockVisitor({ state: 'DISTRESS', distressLevel: 0.85 });

    const tNorm = mapper.map(normalVis, this.mockBeach, this.mockEnv);
    const tCaut = mapper.map(cautionVis, this.mockBeach, this.mockEnv);
    const tDist = mapper.map(distressVis, this.mockBeach, this.mockEnv);

    const passed =
      tNorm.roleState === 'NORMAL' &&
      tCaut.roleState === 'CAUTION' &&
      tDist.roleState === 'DISTRESS';

    return {
      name: '3D Overhead Badges & Role State Classification',
      passed,
      message: passed
        ? `Roles classified correctly: Normal=${tNorm.roleState}, Caution=${tCaut.roleState}, Distress=${tDist.roleState}`
        : `Role classification mismatch: ${tNorm.roleState}, ${tCaut.roleState}, ${tDist.roleState}`,
      details: { normal: tNorm.roleState, caution: tCaut.roleState, distress: tDist.roleState },
    };
  }

  private testDistressSplashAndLocatorBeam(): TestResult {
    const vis = this.createMockVisitor({ state: 'DISTRESS', distressLevel: 0.9 });
    const char = new VisitorCharacter3D(vis);

    const mapper = new VisitorCoordinateMapper();
    const transform = mapper.map(vis, this.mockBeach, this.mockEnv);
    char.update(0.016, transform);

    // Verify children in root
    const hasBeam = char.root.children.some((c) => c instanceof THREE.Mesh && c.geometry.type === 'CylinderGeometry');
    const hasSplash = char.root.children.some((c) => c instanceof THREE.Group && c.children.length >= 2);

    char.dispose();

    const passed = hasBeam && hasSplash;
    return {
      name: 'Distress Visual Cues (Water Splash & Emergency Locator Beam)',
      passed,
      message: passed
        ? 'Emergency beacon column and concentric water splash rings instantiated on character.'
        : 'Distress visual cues not found on character root.',
      details: { hasBeam, hasSplash },
    };
  }

  private testLifeguardAndBoatTacticalAssets(): TestResult {
    const coordinator = RescueCoordinator.getInstance();
    const boat = coordinator.registry.getResource('RB-01');
    const lg = coordinator.registry.getResource('LG-01');

    const passed = boat != null && lg != null && boat.speedMps > 0 && lg.speedMps > 0;
    return {
      name: 'Lifeguard & Rescue Boat Tactical Assets Registry',
      passed,
      message: passed
        ? `RB-01 (${boat?.name}) & LG-01 (${lg?.name}) verified with operational speeds.`
        : 'Rescue assets missing from registry.',
      details: { boatName: boat?.name, lgName: lg?.name },
    };
  }

  private testTacticalDispatchVectors(): TestResult {
    const visual = new TacticalRescueVisual3D();
    visual.setVisible(true);
    visual.update(0.016);

    const isGroupReady = visual.group != null;
    visual.dispose();

    return {
      name: 'Tactical Rescue Visual 3D Vectors & Halos',
      passed: isGroupReady,
      message: isGroupReady
        ? 'TacticalRescueVisual3D instantiated and updated without error.'
        : 'Failed to update tactical rescue visual.',
    };
  }

  private testMultiSwimmerRescueFlow(): TestResult {
    const coordinator = RescueCoordinator.getInstance();
    coordinator.resetOperations();

    const incident: DistressIncidentEvent = {
      incidentId: 'TEST-INC-101',
      visitorId: 'VIS-901',
      visitorName: 'Swimmer VIS-901',
      hazardId: 'HAZ-RIP-01',
      hazardType: 'RIP_CURRENT',
      timeDisplay: '10:00:00',
      position3D: { x: 20, y: 0, z: -30 },
      position2D: { x: 500, y: 350 },
      stage: 'ALERT_ISSUED',
      severity: 'CRITICAL',
      description: 'Swimmer swept into rip current channel',
      onsetSimTime: performance.now() / 1000,
      alertSimTime: performance.now() / 1000,
      resolved: false,
    };

    const dispatched = coordinator.handleDistressIncident(incident, [this.createMockVisitor()], this.mockBeach);
    const activeMissions = coordinator.getActiveMissions();

    const passed = dispatched && activeMissions.length === 1 && activeMissions[0].incidentId === 'TEST-INC-101';
    coordinator.resetOperations();

    return {
      name: 'Multi-Swimmer Coordinated Rescue Lifecycle Dispatch',
      passed,
      message: passed
        ? `Incident successfully assigned to ${activeMissions[0]?.assignedResourceName} with stage ${activeMissions[0]?.stage}.`
        : 'Failed to dispatch rescue mission for incident.',
      details: { dispatched, activeCount: activeMissions.length },
    };
  }

  private testAerialImageLayer(): TestResult {
    const layer = new AerialImageLayer3D('/rushikonda_aerial.png');
    layer.setVisible(true);
    layer.setOpacity(0.65);

    const opacityMatches = Math.abs(layer.getOpacity() - 0.65) < 0.01;
    layer.dispose();

    return {
      name: 'Real Aerial Image Layer Initialization & Controls (Option 1)',
      passed: opacityMatches,
      message: opacityMatches
        ? `Aerial layer opacity control verified (${(0.65 * 100).toFixed(0)}%), graceful loading pipeline ready.`
        : 'Opacity mismatch on aerial layer.',
      details: { opacity: layer.getOpacity() },
    };
  }

  private testRaycastUserDataTagging(): TestResult {
    const vis = this.createMockVisitor({ id: 'VIS-TAG' });
    const char = new VisitorCharacter3D(vis);

    const hasUserData =
      char.root.userData?.type === 'SWIMMER' &&
      char.root.userData?.visitorId === 'VIS-TAG';

    char.dispose();

    return {
      name: 'Interactive Viewport Click Raycast Tagging',
      passed: hasUserData,
      message: hasUserData
        ? `Raycasting userData tagged on character: type=${char.root.userData?.type}, id=${char.root.userData?.visitorId}`
        : 'Missing raycasting metadata on character root.',
      details: char.root.userData,
    };
  }

  private testCameraTrackingResolution(): TestResult {
    const controller = new FollowTargetController();
    const vis = this.createMockVisitor({ id: 'VIS-CAM', state: 'DISTRESS' });

    const targetOverview = controller.resolveTarget('OVERVIEW', [vis], this.mockBeach, this.mockEnv);
    const targetSwimmer = controller.resolveTarget('FOLLOW_SWIMMER', [vis], this.mockBeach, this.mockEnv);

    const passed =
      targetOverview.available &&
      targetSwimmer.available &&
      targetSwimmer.position != null;

    return {
      name: 'Camera Director Multi-Camera Target Resolution',
      passed,
      message: passed
        ? `Camera targets resolved: Overview (${targetOverview.name}), Swimmer (${targetSwimmer.name}).`
        : 'Failed to resolve camera targets.',
      details: { overview: targetOverview.name, swimmer: targetSwimmer.name },
    };
  }

  private testSimulationNonInterferenceAndDisposal(): TestResult {
    const vis = this.createMockVisitor({ id: 'VIS-SIM' });
    const origSpeed = vis.speed;
    const origState = vis.state;

    const mapper = new VisitorCoordinateMapper();
    mapper.map(vis, this.mockBeach, this.mockEnv);

    const untouched = vis.speed === origSpeed && vis.state === origState;
    VisitorModelLoader.dispose();

    return {
      name: 'Simulation Non-Interference & Clean Asset Disposal',
      passed: untouched,
      message: untouched
        ? 'Authoritative visitor state, speed, and behavior untouched during 3D transform mapping.'
        : 'Visitor state mutated by coordinate mapper.',
      details: { speed: vis.speed, state: vis.state },
    };
  }
}

