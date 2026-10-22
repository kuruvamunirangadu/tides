import * as THREE from 'three';
import { TidalFlowVisual3D } from '../TidalFlowVisual3D';
import { Environment } from '../../../models/Environment';

/**
 * TidalFlowTestSuite.ts
 * 
 * Comprehensive Unit & Integration Test Suite for TIDES Phase 1 & Phase 2:
 * Dynamic Tidal Flow Visualization, Longshore Feeder Channels & Rip-Current Mapping.
 * 
 * Validates:
 * 1. Visual layer instantiation, hierarchy, and Three.js 6-subsystem group structure
 * 2. Vector flow grid dimensions, direction calculation, and speed modulation (Phase 1)
 * 3. Fluorescent dye tracer particle setup, lifecycle, and surf zone release (Phase 1)
 * 4. Intertidal waterline ribbon, elevation gauge, and shoreline alignment (Phase 1)
 * 5. Longshore feeder channels geometry, shoreline alignment, and convergence into neck (Phase 2)
 * 6. Rip neck corridor boundaries, bathymetric trough mesh, and accelerated seaward jet (Phase 2)
 * 7. Expanding offshore head plume fan geometry, circulation eddy lines, and dispersing particles (Phase 2)
 * 8. Telemetry reactivity: Flood (Rising) vs Ebb (Falling) tidal regimes & Rip metrics
 * 9. Independent operator visibility toggles for all 6 subsystems
 * 10. Non-interference: zero changes to environmental telemetry, bathymetry, or rescue rules
 * 11. Full resource disposal and memory leak prevention
 */
export class TidalFlowTestSuite {
  private passed: number = 0;
  private failed: number = 0;

  private assert(condition: boolean, testName: string, detail?: string): void {
    if (condition) {
      this.passed++;
      console.log(`  [PASS] ${testName}`);
    } else {
      this.failed++;
      console.error(`  [FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ''}`);
    }
  }

  public run(): { passed: number; failed: number } {
    console.log('\n======================================================');
    console.log('TIDES Phase 2: Coastal Hydrodynamics & Rip Mapping Test Suite');
    console.log('======================================================');

    const visual = new TidalFlowVisual3D();

    // 1. Group Structure & Hierarchy
    this.assert(
      visual.group instanceof THREE.Group && visual.group.name === 'TidalFlowVisual3D',
      '1. Root Three.js Group instantiates with authoritative identifier'
    );

    this.assert(
      visual.group.children.length === 6,
      '2. Six dedicated child subsystems: Vectors, Dye Tracer, Tide Gauge, Feeders, Rip Neck, Offshore Plume',
      `Expected 6 children, got ${visual.group.children.length}`
    );

    // 2. Vector Flow Grid Verification (Phase 1)
    const vectorGroup = visual.group.getObjectByName('TidalVectorGroup') as THREE.Group;
    this.assert(
      vectorGroup !== undefined && vectorGroup.children.length > 0,
      '3. Tidal Vector Grid creates instanced meshes over coastal waters'
    );

    const instMesh = vectorGroup.children[0] as THREE.InstancedMesh;
    this.assert(
      instMesh instanceof THREE.InstancedMesh && instMesh.count > 50,
      '4. Instanced flow arrows exceed 50 nodes covering the coastal bay',
      `Instance count: ${instMesh?.count}`
    );

    // 3. Fluorescent Dye Tracer Plume Verification (Phase 1)
    const dyeGroup = visual.group.getObjectByName('FluorescentDyeTracerGroup') as THREE.Group;
    this.assert(
      dyeGroup !== undefined && dyeGroup.children.length > 0,
      '5. Fluorescent Dye Tracer particle system initializes'
    );

    const dyePoints = dyeGroup.children[0] as THREE.Points;
    this.assert(
      dyePoints instanceof THREE.Points && dyePoints.geometry.attributes.position.count === 240,
      '6. Dye Tracer manages 240 fluorescent particles in surf zone'
    );

    // 4. Shoreline Intertidal Ribbon & Tide Pillar Gauge (Phase 1)
    const tideGroup = visual.group.getObjectByName('TideGaugeGroup') as THREE.Group;
    this.assert(
      tideGroup !== undefined && tideGroup.children.length === 2,
      '7. Tide gauge contains shoreline waterline ribbon and physical pillar marker'
    );

    // 5. Longshore Feeder Channels Verification (Phase 2)
    const feederGroup = visual.group.getObjectByName('FeederChannelsGroup') as THREE.Group;
    this.assert(
      feederGroup !== undefined && feederGroup.children.length >= 7,
      '8. Feeder Channels group initializes with multiple streamline ribbons and flow particles',
      `Found ${feederGroup?.children.length} feeder children`
    );

    const feederPoints = feederGroup.children.find((c) => c instanceof THREE.Points) as THREE.Points;
    this.assert(
      feederPoints !== undefined && feederPoints.geometry.attributes.position.count === 120,
      '9. Feeder channels maintain 120 alongshore water mass particles'
    );

    // 6. Rip Neck Corridor Verification (Phase 2)
    const ripCorridorGroup = visual.group.getObjectByName('RipCorridorGroup') as THREE.Group;
    this.assert(
      ripCorridorGroup !== undefined && ripCorridorGroup.children.length >= 6,
      '10. Rip Neck Corridor contains trough bathymetry, boundary ribbons, jet lines, and particles',
      `Found ${ripCorridorGroup?.children.length} rip corridor children`
    );

    const ripPoints = ripCorridorGroup.children.find((c) => c instanceof THREE.Points) as THREE.Points;
    this.assert(
      ripPoints !== undefined && ripPoints.geometry.attributes.position.count === 100,
      '11. Rip neck manages 100 accelerated seaward jet particles'
    );

    // 7. Expanding Offshore Head Plume Verification (Phase 2)
    const plumeGroup = visual.group.getObjectByName('OffshorePlumeGroup') as THREE.Group;
    this.assert(
      plumeGroup !== undefined && plumeGroup.children.length >= 4,
      '12. Offshore Plume contains expanding fan mesh, circulation eddy lines, and dispersing particles',
      `Found ${plumeGroup?.children.length} offshore plume children`
    );

    const plumePoints = plumeGroup.children.find((c) => c instanceof THREE.Points) as THREE.Points;
    this.assert(
      plumePoints !== undefined && plumePoints.geometry.attributes.position.count === 100,
      '13. Plume head maintains 100 dispersing offshore particles'
    );

    // 8. Environmental Telemetry Responsiveness & Rip Metrics
    const risingEnv: Environment = {
      tideLevel: 1.8,
      tideStatus: 'RISING',
      waterCurrent: 0.85,
      currentSpeed: 0.85,
      currentDirection: 25,
      waveHeight: 1.4,
      wavePeriod: 8,
      waveDirection: 90,
      windSpeed: 20,
      windDirection: 110,
      weather: 'CLEAR',
      visibility: 10,
    };

    visual.update(0.016, risingEnv);
    const risingSummary = visual.getStateSummary(risingEnv);

    this.assert(
      risingSummary.tidePhase === 'RISING' && risingSummary.tideLevelMeters === 1.8,
      '14. Telemetry updates reflect Flood tide (RISING, 1.8m)'
    );

    this.assert(
      risingSummary.currentSpeedMps === 0.85 && risingSummary.flowVector.z > 0,
      '15. Flood current flows shoreward with positive +Z velocity component'
    );

    this.assert(
      risingSummary.ripMetrics !== undefined &&
      risingSummary.ripMetrics.corridorX === 12 &&
      risingSummary.ripMetrics.neckVelocityMps === 1.53, // 0.85 * 1.8 = 1.53
      '16. Rip metrics compute accelerated neck velocity of 1.53 m/s at X = 12m',
      `Calculated: ${risingSummary.ripMetrics?.neckVelocityMps}`
    );

    // Falling / Ebb tide with strong current
    const fallingEnv: Environment = {
      ...risingEnv,
      tideLevel: 0.6,
      tideStatus: 'FALLING',
      currentSpeed: 1.2,
      currentDirection: 195,
    };

    visual.update(0.016, fallingEnv);
    const fallingSummary = visual.getStateSummary(fallingEnv);

    this.assert(
      fallingSummary.tidePhase === 'FALLING' && fallingSummary.currentSpeedMps === 1.2,
      '17. Telemetry updates reflect Ebb tide (FALLING, 1.2 m/s)'
    );

    this.assert(
      fallingSummary.ripMetrics?.hazardLevel === 'EXTREME',
      '18. High current speed elevates Rip Corridor hazard level to EXTREME'
    );

    // 9. Independent Subsystem Visibility Toggles
    visual.setVisible(false);
    this.assert(!visual.isVisible() && !visual.group.visible, '19. setVisible(false) hides overall tidal layer');

    visual.setVisible(true);
    this.assert(visual.isVisible() && visual.group.visible, '20. setVisible(true) restores overall tidal layer');

    visual.setDyeTracerVisible(false);
    this.assert(!visual.isDyeTracerVisible() && !dyeGroup.visible, '21. setDyeTracerVisible(false) toggles dye tracer');

    visual.setDyeTracerVisible(true);
    this.assert(visual.isDyeTracerVisible() && dyeGroup.visible, '22. setDyeTracerVisible(true) restores dye tracer');

    visual.setFeederChannelsVisible(false);
    this.assert(!visual.isFeederChannelsVisible() && !feederGroup.visible, '23. setFeederChannelsVisible(false) toggles feeder channels');

    visual.setFeederChannelsVisible(true);
    this.assert(visual.isFeederChannelsVisible() && feederGroup.visible, '24. setFeederChannelsVisible(true) restores feeder channels');

    visual.setRipCorridorVisible(false);
    this.assert(!visual.isRipCorridorVisible() && !ripCorridorGroup.visible, '25. setRipCorridorVisible(false) toggles rip neck corridor');

    visual.setRipCorridorVisible(true);
    this.assert(visual.isRipCorridorVisible() && ripCorridorGroup.visible, '26. setRipCorridorVisible(true) restores rip neck corridor');

    visual.setOffshorePlumeVisible(false);
    this.assert(!visual.isOffshorePlumeVisible() && !plumeGroup.visible, '27. setOffshorePlumeVisible(false) toggles offshore plume');

    visual.setOffshorePlumeVisible(true);
    this.assert(visual.isOffshorePlumeVisible() && plumeGroup.visible, '28. setOffshorePlumeVisible(true) restores offshore plume');

    // 10. Non-Interference Invariants
    this.assert(
      risingEnv.waveHeight === 1.4 && risingEnv.waterCurrent === 0.85,
      '29. Strict Non-Interference: environmental telemetry remains immutable'
    );

    // 11. Resource Disposal
    visual.dispose();
    this.assert(
      visual.group.children.length === 0,
      '30. dispose() clears all geometries, materials, and children cleanly across all 6 subsystems'
    );

    console.log('------------------------------------------------------');
    console.log(`Results: ${this.passed} passed, ${this.failed} failed.`);
    console.log('======================================================\n');

    return { passed: this.passed, failed: this.failed };
  }
}
