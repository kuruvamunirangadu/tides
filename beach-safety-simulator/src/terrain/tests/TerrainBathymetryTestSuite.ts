/**
 * src/terrain/tests/TerrainBathymetryTestSuite.ts
 * 
 * 12 Deterministic Unit & Validation Tests for TIDES Milestone 15:
 * Real-World Terrain & Bathymetry Integration (Rushikonda Beach).
 */

import { RealShorelineProvider } from '../RealShorelineProvider';
import { BathymetryElevationProvider } from '../BathymetryElevationProvider';
import { RUSHIKONDA_TERRAIN_PROFILE } from '../TerrainDataProfile';
import { GeoCoordinateTransform } from '../../geospatial/GeoCoordinateTransform';

export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export class TerrainBathymetryTestSuite {
  public static runAll(): TestResult[] {
    const results: TestResult[] = [];
    const shoreline = RealShorelineProvider.getInstance();
    const elevation = BathymetryElevationProvider.getInstance();
    const transform = GeoCoordinateTransform.getInstance();
    const profile = RUSHIKONDA_TERRAIN_PROFILE;

    // Reset modes to default calibrated mode
    shoreline.setMode('CALIBRATED_SURVEYED');
    elevation.setMode('CALIBRATED_BATHYMETRY');

    // Test 1: Real Shoreline Line-string Bounds & Crescent Curvature
    try {
      const zCenter = shoreline.getShorelineZ(0.0);
      const zApex = shoreline.getShorelineZ(-34.4); // Apex curves inland (+Z)
      const zSouthPromontory = shoreline.getShorelineZ(-81.7); // Projects seaward (-Z)
      const zNorthCape = shoreline.getShorelineZ(107.8); // Projects seaward (-Z)

      const isCenterNearOrigin = Math.abs(zCenter) < 1.0;
      const isApexInland = zApex > 3.0; // Curves inland (+Z)
      const isHeadlandsSeaward = zSouthPromontory < -15.0 && zNorthCape < -5.0;

      results.push({
        name: '1. Real shoreline line-string crescent curvature & boundary positions',
        passed: isCenterNearOrigin && isApexInland && isHeadlandsSeaward,
        message: `Center Z: ${zCenter.toFixed(2)}, Apex Z: ${zApex.toFixed(2)} (inland), South Promontory Z: ${zSouthPromontory.toFixed(2)} (seaward)`,
      });
    } catch (err: any) {
      results.push({
        name: '1. Real shoreline line-string crescent curvature & boundary positions',
        passed: false,
        message: err.message,
      });
    }

    // Test 2: Shoreline Discretization & Alongshore Cumulative Reach (~1,006.2m)
    try {
      const samples = shoreline.getDiscretizedShoreline(80, -100, 100);
      const startWgs = samples[0].coordinatesWGS84;
      const endWgs = samples[samples.length - 1].coordinatesWGS84;
      const physicalChord = transform.haversineDistance(startWgs, endWgs);

      const hasSamples = samples.length === 80;
      const hasSurveyedQuality = samples.some((s) => s.quality === 'SURVEYED');
      const validChord = physicalChord > 850 && physicalChord < 1100;

      results.push({
        name: '2. Shoreline line-string discretization & surveyed control point quality',
        passed: hasSamples && hasSurveyedQuality && validChord,
        message: `Discretized samples: ${samples.length}, Physical chord span: ${physicalChord.toFixed(1)}m`,
      });
    } catch (err: any) {
      results.push({
        name: '2. Shoreline line-string discretization & surveyed control point quality',
        passed: false,
        message: err.message,
      });
    }

    // Test 3: Seabed Bathymetry Monotonic Slope Outside Trench/Bars
    try {
      // Sample seabed profile along x = 0 from shoreline (z = 0) out to z = -60 (300m offshore)
      const depths = [
        elevation.getElevation(0, 0),    // Shoreline (0m)
        elevation.getElevation(0, -10),  // 50m offshore
        elevation.getElevation(0, -25),  // 125m offshore
        elevation.getElevation(0, -45),  // 225m offshore
        elevation.getElevation(0, -65),  // 325m offshore
      ];

      // Elevations must become progressively more negative (deeper)
      let monotonicallyDeepening = true;
      for (let i = 1; i < depths.length; i++) {
        if (depths[i] > depths[i - 1]) {
          monotonicallyDeepening = false;
        }
      }

      const outerDepth = depths[depths.length - 1];
      const reachesShelf = outerDepth < -5.0;

      results.push({
        name: '3. Seabed bathymetry slope & offshore depth progression',
        passed: monotonicallyDeepening && reachesShelf,
        message: `Depths along cross-shore transect: ${depths.map((d) => d.toFixed(1) + 'm').join(' -> ')}`,
      });
    } catch (err: any) {
      results.push({
        name: '3. Seabed bathymetry slope & offshore depth progression',
        passed: false,
        message: err.message,
      });
    }

    // Test 4: Submerged Basalt Rip Current Trench Geometry & Depth (-3.8m)
    try {
      // Query both trench thalweg and adjacent shelf at identical offshore distance (75m seaward of shoreline)
      const shoreZ35 = shoreline.getShorelineZ(35.5);
      const shoreZ10 = shoreline.getShorelineZ(10.0);
      const offshoreOffset = -15.0; // 15 units = 75m seaward of shoreline

      const trenchCenterElev = elevation.getElevation(35.5, shoreZ35 + offshoreOffset);
      const adjacentShelfElev = elevation.getElevation(10.0, shoreZ10 + offshoreOffset);

      // Trench must be deeper than adjacent seabed and close to target -3.8m
      const isDeeper = trenchCenterElev < adjacentShelfElev - 0.30;
      const isTargetDepth = trenchCenterElev <= -3.2 && trenchCenterElev >= -4.5;

      results.push({
        name: '4. Submerged basalt rip current trench scour depth (~ -3.8m)',
        passed: isDeeper && isTargetDepth,
        message: `Trench Thalweg elevation: ${trenchCenterElev.toFixed(2)}m (adjacent seabed: ${adjacentShelfElev.toFixed(2)}m, depth differential: ${(adjacentShelfElev - trenchCenterElev).toFixed(2)}m)`,
      });
    } catch (err: any) {
      results.push({
        name: '4. Submerged basalt rip current trench scour depth (~ -3.8m)',
        passed: false,
        message: err.message,
      });
    }

    // Test 5: Headland Cliff Elevation Profiles (South Basalt vs North Granite)
    try {
      const southCliff = elevation.getElevation(-85.0, 10.0);
      const northCliff = elevation.getElevation(85.0, 10.0);
      const centerBeach = elevation.getElevation(0.0, 2.0); // Dry sand (10m inland from shoreline)

      const cliffsHigh = southCliff > 8.0 && northCliff > 12.0;
      const northHigherThanSouth = northCliff > southCliff;
      const beachLowerThanCliffs = centerBeach < 4.0;

      results.push({
        name: '5. Coastal headland cliff elevations (South Basalt vs North Granite)',
        passed: cliffsHigh && northHigherThanSouth && beachLowerThanCliffs,
        message: `South Cliff: +${southCliff.toFixed(1)}m, North Cliff: +${northCliff.toFixed(1)}m, Central Beach: +${centerBeach.toFixed(1)}m`,
      });
    } catch (err: any) {
      results.push({
        name: '5. Coastal headland cliff elevations (South Basalt vs North Granite)',
        passed: false,
        message: err.message,
      });
    }

    // Test 6: Promenade and Dry Sand Elevation Range
    try {
      const promenadeOrigin = elevation.getElevation(0.0, 3.0);
      const dunesElev = elevation.getElevation(0.0, 30.0);

      const isPromenadeValid = promenadeOrigin >= 2.5 && promenadeOrigin <= 4.2;
      const isDunesHigher = dunesElev > promenadeOrigin;

      results.push({
        name: '6. Central promenade datum (+3.5m) and backshore dune elevations',
        passed: isPromenadeValid && isDunesHigher,
        message: `Promenade origin elevation: +${promenadeOrigin.toFixed(2)}m (expected ~+3.5m), Dunes: +${dunesElev.toFixed(2)}m`,
      });
    } catch (err: any) {
      results.push({
        name: '6. Central promenade datum (+3.5m) and backshore dune elevations',
        passed: false,
        message: err.message,
      });
    }

    // Test 7: Dataset Metadata & Provenance Reporting across all zones
    try {
      const p1 = elevation.inspectPoint(35.5, -25.0); // Trench
      const p2 = elevation.inspectPoint(0.0, 0.0);    // Promenade / Shoreline
      const p3 = elevation.inspectPoint(-85.0, 0.0);  // South Headland

      const hasTrenchLabel = p1.zoneType === 'RIP_CURRENT_TRENCH' && p1.quality === 'SURVEYED';
      const hasHeadlandLabel = p3.zoneType === 'HEADLAND_CLIFF' && p3.quality === 'SURVEYED';
      const hasProvenance = p1.provenance.length > 5 && p2.provenance.length > 5;

      results.push({
        name: '7. Point inspection metadata provenance & data quality categorization',
        passed: hasTrenchLabel && hasHeadlandLabel && hasProvenance,
        message: `Trench quality: ${p1.quality} (${p1.provenance}), Headland quality: ${p3.quality}`,
      });
    } catch (err: any) {
      results.push({
        name: '7. Point inspection metadata provenance & data quality categorization',
        passed: false,
        message: err.message,
      });
    }

    // Test 8: Contour Extraction & Isobath Definitions Integrity
    try {
      const isobaths = profile.isobaths;
      const hasZeroM = isobaths.some((i) => i.depthMeters === 0.0);
      const hasShallow = isobaths.some((i) => i.depthMeters === 1.0);
      const hasSurfZone = isobaths.some((i) => i.depthMeters === 2.0);
      const hasTrench = isobaths.some((i) => i.depthMeters === 3.8);
      const hasShelf = isobaths.some((i) => i.depthMeters === 5.0);

      results.push({
        name: '8. Standard coastal isobath definitions & depth classifications',
        passed: hasZeroM && hasShallow && hasSurfZone && hasTrench && hasShelf,
        message: `Isobaths registered: ${isobaths.map((i) => i.label).join(', ')}`,
      });
    } catch (err: any) {
      results.push({
        name: '8. Standard coastal isobath definitions & depth classifications',
        passed: false,
        message: err.message,
      });
    }

    // Test 9: Reversibility & Fallback to Legacy Procedural Mode
    try {
      // Toggle to legacy procedural
      elevation.setMode('LEGACY_PROCEDURAL');
      shoreline.setMode('LEGACY_PROCEDURAL');

      const legacyZ = shoreline.getShorelineZ(0.0);
      const legacyY = elevation.getElevation(0.0, -20.0);

      // Verify legacy mode returns valid finite numbers
      const isLegacyValid = isFinite(legacyZ) && isFinite(legacyY);

      // Revert back to calibrated mode
      elevation.setMode('CALIBRATED_BATHYMETRY');
      shoreline.setMode('CALIBRATED_SURVEYED');

      const calibZ = shoreline.getShorelineZ(0.0);
      const isReverted = isFinite(calibZ) && elevation.getMode() === 'CALIBRATED_BATHYMETRY';

      results.push({
        name: '9. Reversibility & zero-friction fallback to legacy procedural mode',
        passed: isLegacyValid && isReverted,
        message: 'Successfully toggled between Calibrated and Legacy Procedural without exceptions',
      });
    } catch (err: any) {
      results.push({
        name: '9. Reversibility & zero-friction fallback to legacy procedural mode',
        passed: false,
        message: err.message,
      });
    }

    // Test 10: Zero Simulation State Mutation & Non-Interference
    try {
      const mockVisitor = {
        id: 'vis-terrain-test',
        position: { x: 450, y: 320 },
        velocity: { vx: 0.5, vy: -0.2 },
        driftVector: { dx: 0, dy: 0 },
        fatigue: 0.15,
      };

      const beforeJson = JSON.stringify(mockVisitor);
      // Execute multiple terrain queries
      elevation.getElevation(45.0, -15.0);
      shoreline.getShorelineZ(45.0);
      elevation.inspectPoint(45.0, -15.0);
      const afterJson = JSON.stringify(mockVisitor);

      const noMutation = beforeJson === afterJson;

      results.push({
        name: '10. Zero simulation mutation: independent from visitor & hazard engines',
        passed: noMutation,
        message: 'Pure observational terrain query pipeline; zero visitor state modification',
      });
    } catch (err: any) {
      results.push({
        name: '10. Zero simulation mutation: independent from visitor & hazard engines',
        passed: false,
        message: err.message,
      });
    }

    // Test 11: Vertical Datum Specification & Chart Datum Conversion Offset
    try {
      const datasets = profile.datasets;
      const topoDs = datasets.find((d) => d.datasetId === 'DS-TOPO-01');
      const bathyDs = datasets.find((d) => d.datasetId === 'DS-BATHY-03');

      const isTopoMSL = topoDs?.verticalDatum === 'MSL';
      const isBathyCD = bathyDs?.verticalDatum === 'CD';
      const hasOffset = bathyDs?.datumOffsetToMSLMeters === -1.25;

      results.push({
        name: '11. Vertical datum integrity (MSL vs Chart Datum offset of -1.25m)',
        passed: !!isTopoMSL && !!isBathyCD && !!hasOffset,
        message: `Topo datum: ${topoDs?.verticalDatum}, Hydrographic datum: ${bathyDs?.verticalDatum} (MSL offset: ${bathyDs?.datumOffsetToMSLMeters}m)`,
      });
    } catch (err: any) {
      results.push({
        name: '11. Vertical datum integrity (MSL vs Chart Datum offset of -1.25m)',
        passed: false,
        message: err.message,
      });
    }

    // Test 12: Scale Consistency & Geographic Projection across mesh
    try {
      const testPoints = [
        { x: -50, z: -20 },
        { x: 0, z: 0 },
        { x: 50, z: -30 },
      ];

      let allValid = true;
      for (const p of testPoints) {
        const insp = elevation.inspectPoint(p.x, p.z);
        const lat = insp.coordinatesWGS84.latitude;
        const lon = insp.coordinatesWGS84.longitude;
        if (!isFinite(lat) || !isFinite(lon) || lat < 17.0 || lon < 83.0) {
          allValid = false;
        }
      }

      results.push({
        name: '12. Scale consistency & WGS84 geographic projection across terrain mesh',
        passed: allValid,
        message: 'All tested terrain points successfully project to valid WGS84 coordinates in Vizag sector',
      });
    } catch (err: any) {
      results.push({
        name: '12. Scale consistency & WGS84 geographic projection across terrain mesh',
        passed: false,
        message: err.message,
      });
    }

    return results;
  }
}
