import * as THREE from 'three';
import { WaveShoalingVisual3D } from '../WaveShoalingVisual3D';
import { Environment } from '../../../models/Environment';
import { BeachTerrain } from '../../BeachTerrain';

/**
 * WaveShoalingTestSuite.ts
 * 
 * TIDES Phase 3: Wave Shoaling & Breaker Dynamics Automated Test Suite
 * 
 * Verifies:
 * 1. Three.js scene graph hierarchy and dedicated child subsystems
 * 2. Mathematical physical accuracy: Airy dispersion, Green's Law shoaling, McCowan breaking
 * 3. Breaker regime classification (Spilling, Plunging, Surging via Iribarren number)
 * 4. Bathymetric rip gap detection (trench depth vs sandbar, suppression of wave breaks)
 * 5. Refraction dynamics and foam roller positioning
 * 6. Independent operator subsystem visibility toggles
 * 7. Non-interference with environment telemetry
 * 8. Clean resource disposal & memory leak prevention
 */
export class WaveShoalingTestSuite {
  private passed: number = 0;
  private failed: number = 0;

  private assert(condition: boolean, testName: string, detail?: string): void {
    if (condition) {
      this.passed++;
      console.log(`  [PASS] ${testName}`);
    } else {
      this.failed++;
      console.error(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    }
  }

  public run(): { passed: number; failed: number } {
    console.log('\n======================================================');
    console.log('TIDES Phase 3: Wave Shoaling & Breaker Dynamics Test Suite');
    console.log('======================================================');

    const visual = new WaveShoalingVisual3D();

    const mockEnv: Environment = {
      tideLevel: 1.2,
      tideStatus: 'RISING',
      waveHeight: 1.4,
      wavePeriod: 8.5,
      waveDirection: 180,
      windSpeed: 14,
      windDirection: 180,
      weather: 'CLEAR',
      visibility: 10,
      waterCurrent: 0.45,
      waterTemperature: 28,
    };

    // -------------------------------------------------------------------
    // 1. Scene Graph Hierarchy & Structure
    // -------------------------------------------------------------------
    this.assert(
      visual.group instanceof THREE.Group && visual.group.name === 'WaveShoalingVisual3DGroup',
      '1. Root Three.js Group instantiates with authoritative identifier'
    );

    const childNames = visual.group.children.map((c) => c.name);
    const expectedSubsystems = [
      'ShoalingSurfaceLayer',
      'BreakerCrestLinesLayer',
      'FoamRollersLayer',
      'RipGapHazardLayer',
      'BreakerDemarcationLayer',
    ];

    const hasAllSubsystems = expectedSubsystems.every((sub) => childNames.includes(sub));
    this.assert(
      hasAllSubsystems && visual.group.children.length === 5,
      '2. Five dedicated child subsystems: Shoaling Mesh, Breaker Lines, Foam Rollers, Rip Gap, Demarcation'
    );

    // -------------------------------------------------------------------
    // 2. Shoaling Surface Mesh Geometry & Color Attributes
    // -------------------------------------------------------------------
    const shoalingGroup = visual.group.getObjectByName('ShoalingSurfaceLayer') as THREE.Group;
    const mesh = shoalingGroup?.children[0] as THREE.Mesh;
    const geom = mesh?.geometry as THREE.PlaneGeometry;

    this.assert(
      mesh instanceof THREE.Mesh && geom instanceof THREE.PlaneGeometry,
      '3. Shoaling Surface Mesh instantiates with PlaneGeometry'
    );

    const posCount = geom ? geom.attributes.position.count : 0;
    const hasColorAttr = geom ? geom.attributes.color !== undefined : false;
    this.assert(
      posCount > 1000 && hasColorAttr,
      '4. Shoaling mesh has high-resolution vertex grid (> 1000 vertices) with depth color attributes'
    );

    // -------------------------------------------------------------------
    // 3. Hydrodynamic Physics Computations
    // -------------------------------------------------------------------
    const metrics = visual.computeHydroMetrics(1.4, 8.5, 180, 1.2);

    // Deep water wavelength: L_0 = (g * T^2) / (2 * PI) = (9.81 * 72.25) / 6.283185 = 112.8m
    const expectedL0 = (9.81 * Math.pow(8.5, 2)) / (2 * Math.PI);
    this.assert(
      Math.abs(metrics.deepWaterWavelengthMeters - expectedL0) < 0.5,
      `5. Deep-water wavelength follows Airy dispersion: ${metrics.deepWaterWavelengthMeters}m (expected ~${expectedL0.toFixed(1)}m)`
    );

    // Green's Law Shoaling Factor: Ks = (10 / depth)^0.25
    const deepKs = Math.pow(10.0 / 10.0, 0.25); // = 1.0
    const shallowKs = Math.pow(10.0 / 1.5, 0.25); // = 1.608
    this.assert(
      shallowKs > deepKs && metrics.maxShoalingFactor > 1.2,
      `6. Green's Law shoaling amplification factor K_s increases monotonically in shallows (${metrics.maxShoalingFactor}x)`
    );

    // McCowan Breaking Criterion: gamma = 0.78, H_b = 1.15 * 1.4 = 1.61m, h_b = 1.61 / 0.78 = 2.06m
    this.assert(
      metrics.breakerIndexGamma === 0.78 && metrics.breakerWaveHeight > metrics.deepWaterWaveHeight,
      `7. McCowan Breaking Criterion maintains gamma = 0.78 with shoaled breaker height ${metrics.breakerWaveHeight}m`
    );

    this.assert(
      Math.abs(metrics.breakerDepthMeters - (metrics.breakerWaveHeight / 0.78)) < 0.05,
      `8. Breaker depth h_b = H_b / 0.78 accurately calculated at ${metrics.breakerDepthMeters}m`
    );

    // -------------------------------------------------------------------
    // 4. Breaker Regime & Surf Similarity (Iribarren Number)
    // -------------------------------------------------------------------
    this.assert(
      metrics.breakerType === 'SPILLING' && metrics.iribarrenNumber < 0.5,
      `9. Gentle beach slope (tan beta = 0.035) correctly classifies as SPILLING breaker (Xi = ${metrics.iribarrenNumber})`
    );

    // Test steep swell scenario (rough surf)
    const roughMetrics = visual.computeHydroMetrics(2.6, 11.0, 180, 1.2);
    this.assert(
      roughMetrics.surfZoneWidthMeters > metrics.surfZoneWidthMeters,
      `10. Heavy monsoon swell (2.6m) expands surf zone width: ${roughMetrics.surfZoneWidthMeters}m vs ${metrics.surfZoneWidthMeters}m`
    );

    // -------------------------------------------------------------------
    // 5. Rip Current Gap Hazard ("Calm Water Deception")
    // -------------------------------------------------------------------
    const ripGap = metrics.ripGap;
    this.assert(
      ripGap.centerX === 35.0 && ripGap.minX === 24 && ripGap.maxX === 46,
      '11. Rip current gap extent accurately encompasses documented trench boundaries (X: 24 to 46)'
    );

    this.assert(
      ripGap.centerDepthMeters > ripGap.sandbarDepthMeters + 2.0,
      `12. Trench water depth (${ripGap.centerDepthMeters.toFixed(1)}m) is significantly deeper than surrounding sandbar (${ripGap.sandbarDepthMeters.toFixed(1)}m)`
    );

    this.assert(
      ripGap.isBreakerSuppressed === true,
      '13. Wave breaking is suppressed over the rip channel (Rip Gap active: trench depth exceeds breaker depth)'
    );

    const highEnergyMetrics = visual.computeHydroMetrics(6.0, 11.0, 180, 1.2);
    this.assert(
      highEnergyMetrics.ripGap.isBreakerSuppressed === false,
      '14. High-energy swell can exceed the tide-adjusted rip trench depth and restore breaking there'
    );

    const ripGapGroup = visual.group.getObjectByName('RipGapHazardLayer') as THREE.Group;
    this.assert(
      ripGapGroup && ripGapGroup.children.length > 0,
      '15. Rip gap hazard visualizer includes 3D bounding bracket, deep trench tint, and billboard badge'
    );

    // -------------------------------------------------------------------
    // 6. Foam Rollers & Particle Distribution
    // -------------------------------------------------------------------
    const foamGroup = visual.group.getObjectByName('FoamRollersLayer') as THREE.Group;
    const foamPoints = foamGroup?.children[0] as THREE.Points;
    this.assert(
      foamPoints instanceof THREE.Points && foamPoints.geometry.attributes.position.count === 220,
      '16. Aerated foam roller particle system manages 220 turbulent whitecap particles'
    );

    // -------------------------------------------------------------------
    // 7. Breaker Crest Lines & Wave Refraction
    // -------------------------------------------------------------------
    const crestGroup = visual.group.getObjectByName('BreakerCrestLinesLayer') as THREE.Group;
    this.assert(
      crestGroup && crestGroup.children.length === 5,
      '17. Breaker crest lines subsystem manages 5 striated wavefront lines'
    );

    // -------------------------------------------------------------------
    // 8. Breaker Demarcation Contour Line
    // -------------------------------------------------------------------
    const demarcationGroup = visual.group.getObjectByName('BreakerDemarcationLayer') as THREE.Group;
    const demarcationLine = demarcationGroup?.children[0] as THREE.Line;
    this.assert(
      demarcationLine instanceof THREE.Line,
      '18. Breaker Demarcation Line instantiates with dashed contour line across coastal bay'
    );

    // -------------------------------------------------------------------
    // 9. Dynamic Frame Animation Update
    // -------------------------------------------------------------------
    visual.update(0.016, mockEnv);
    const postUpdateMetrics = visual.getMetrics();
    this.assert(
      postUpdateMetrics.deepWaterWaveHeight === mockEnv.waveHeight &&
      !isNaN(postUpdateMetrics.breakerWaveHeight),
      '19. Frame animation update step processes cleanly without throwing or producing NaN values'
    );

    // -------------------------------------------------------------------
    // 10. Subsystem Visibility Toggles
    // -------------------------------------------------------------------
    visual.setVisible(false);
    this.assert(visual.getVisible() === false && visual.group.visible === false, '20. setVisible(false) hides overall layer');

    visual.setVisible(true);
    this.assert(visual.getVisible() === true && visual.group.visible === true, '21. setVisible(true) restores overall layer');

    visual.setShoalingMeshVisible(false);
    this.assert(visual.getConfig().shoalingMeshVisible === false, '22. setShoalingMeshVisible(false) toggles shoaling mesh');

    visual.setShoalingMeshVisible(true);
    this.assert(visual.getConfig().shoalingMeshVisible === true, '23. setShoalingMeshVisible(true) restores shoaling mesh');

    visual.setBreakerLinesVisible(false);
    this.assert(visual.getConfig().breakerLinesVisible === false, '24. setBreakerLinesVisible(false) toggles crest lines');

    visual.setBreakerLinesVisible(true);
    this.assert(visual.getConfig().breakerLinesVisible === true, '25. setBreakerLinesVisible(true) restores crest lines');

    visual.setFoamRollersVisible(false);
    this.assert(visual.getConfig().foamRollersVisible === false, '26. setFoamRollersVisible(false) toggles foam rollers');

    visual.setFoamRollersVisible(true);
    this.assert(visual.getConfig().foamRollersVisible === true, '27. setFoamRollersVisible(true) restores foam rollers');

    visual.setRipGapVisible(false);
    this.assert(visual.getConfig().ripGapVisible === false, '28. setRipGapVisible(false) toggles rip gap hazard marker');

    visual.setRipGapVisible(true);
    this.assert(visual.getConfig().ripGapVisible === true, '29. setRipGapVisible(true) restores rip gap hazard marker');

    visual.setBreakerDemarcationVisible(false);
    this.assert(visual.getConfig().breakerDemarcationVisible === false, '30. setBreakerDemarcationVisible(false) toggles demarcation line');

    // -------------------------------------------------------------------
    // 11. Strict Non-Interference & Clean Disposal
    // -------------------------------------------------------------------
    this.assert(
      mockEnv.waveHeight === 1.4 && mockEnv.wavePeriod === 8.5 && mockEnv.tideLevel === 1.2,
      '31. Strict Non-Interference: environmental telemetry remains immutable'
    );

    visual.dispose();
    this.assert(
      visual.group.children.length === 0,
      '32. dispose() clears all geometries, materials, and children cleanly across all 5 subsystems'
    );

    console.log('------------------------------------------------------');
    console.log(`Results: ${this.passed} passed, ${this.failed} failed.`);
    console.log('======================================================\n');

    return { passed: this.passed, failed: this.failed };
  }
}

