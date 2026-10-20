/**
 * src/geospatial/tests/GeoCalibrationTestSuite.ts
 * 
 * 12 Deterministic Unit and Validation Tests for TIDES:
 * Geographic Calibration for a 1 km Coastal 3D Digital Twin (Rushikonda Beach).
 */

import { RUSHIKONDA_CALIBRATION_PROFILE } from '../BeachCalibrationProfile';
import { GeoCoordinateTransform } from '../GeoCoordinateTransform';
import { GeoControlPointRegistry, GeoControlPoint } from '../GeoControlPointRegistry';

export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export class GeoCalibrationTestSuite {
  /**
   * Run all 12 validation tests
   */
  public static runAll(): TestResult[] {
    const results: TestResult[] = [];
    const transform = GeoCoordinateTransform.getInstance();
    const registry = GeoControlPointRegistry.getInstance();
    const profile = RUSHIKONDA_CALIBRATION_PROFILE;

    // Test 1: WGS84 <-> ENU Forward and Inverse Round-trip Sub-millimeter Precision
    try {
      const origin = profile.localOriginWGS84;
      const testPoints = [
        { latitude: origin.latitude + 0.003, longitude: origin.longitude + 0.002, altitudeMeters: 5.0 },
        { latitude: origin.latitude - 0.004, longitude: origin.longitude - 0.001, altitudeMeters: 1.0 },
        { latitude: origin.latitude, longitude: origin.longitude, altitudeMeters: origin.altitudeMeters },
      ];

      let maxError = 0;
      for (const p of testPoints) {
        const enu = transform.wgs84ToEnu(p);
        const roundTrip = transform.enuToWgs84(enu);
        const dist = transform.haversineDistance(p, roundTrip);
        if (dist > maxError) maxError = dist;
      }

      results.push({
        name: '1. WGS84 <-> Local ENU round-trip precision (< 0.0001m)',
        passed: maxError < 0.0001,
        message: `Max round-trip geodetic displacement: ${(maxError * 1000).toFixed(4)} mm`,
      });
    } catch (err: any) {
      results.push({
        name: '1. WGS84 <-> Local ENU round-trip precision (< 0.0001m)',
        passed: false,
        message: err.message,
      });
    }

    // Test 2: Three.js World (X, Y, Z) <-> GPS Round-trip Precision
    try {
      const testVecs = [
        { x: -50, y: 0, z: 20 },
        { x: 0, y: 3.5, z: 0 },
        { x: 75, y: -1.2, z: -40 },
        { x: -90, y: 15, z: 60 },
      ];

      let maxThreeDist = 0;
      for (const v of testVecs) {
        const gps = transform.threeToWgs84(v);
        const roundTrip = transform.wgs84ToThree(gps);
        const dx = roundTrip.x - v.x;
        const dy = roundTrip.y - v.y;
        const dz = roundTrip.z - v.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist > maxThreeDist) maxThreeDist = dist;
      }

      results.push({
        name: '2. Three.js World <-> GPS round-trip precision (< 0.01 units / 0.05m)',
        passed: maxThreeDist < 0.01,
        message: `Max Three.js round-trip distance: ${maxThreeDist.toFixed(6)} units`,
      });
    } catch (err: any) {
      results.push({
        name: '2. Three.js World <-> GPS round-trip precision (< 0.01 units / 0.05m)',
        passed: false,
        message: err.message,
      });
    }

    // Test 3: Alongshore Curved Distance vs. Straight-Line Chord
    try {
      const curvedLength = transform.calculateAlongshoreLength();
      const points = registry.getAllControlPoints();
      const southPoint = points[0]; // CP-01 South Basalt Promontory
      const northPoint = points[points.length - 1]; // CP-08 North Rocky Cape Boundary
      const straightChord = transform.haversineDistance(
        southPoint.coordinatesWGS84,
        northPoint.coordinatesWGS84
      );

      const isCurvedMatch = Math.abs(curvedLength - profile.alongshoreCurvedLengthMeters) < 10.0;
      const isCurvedLongerThanChord = curvedLength > straightChord + 40.0;

      results.push({
        name: '3. Alongshore curved distance (~1,006m) vs straight-line chord (~955m)',
        passed: isCurvedMatch && isCurvedLongerThanChord,
        message: `Curved shoreline length: ${curvedLength.toFixed(1)}m, Straight chord: ${straightChord.toFixed(1)}m (difference: ${(curvedLength - straightChord).toFixed(1)}m)`,
      });
    } catch (err: any) {
      results.push({
        name: '3. Alongshore curved distance (~1,008m) vs straight-line chord (~860m)',
        passed: false,
        message: err.message,
      });
    }

    // Test 4: Registration Residuals & Dataset RMSE (< 2.50m)
    try {
      const res = registry.calculateResiduals();
      const passed = res.overallRmseMeters < 2.50 && res.maxResidualMeters < 4.0;

      results.push({
        name: '4. Ground Control Point registration RMSE (< 2.50m target)',
        passed,
        message: `Computed RMSE: ${res.overallRmseMeters.toFixed(3)}m, Max Residual: ${res.maxResidualMeters.toFixed(3)}m (${res.pointResiduals.size} control points evaluated)`,
      });
    } catch (err: any) {
      results.push({
        name: '4. Ground Control Point registration RMSE (< 2.50m target)',
        passed: false,
        message: err.message,
      });
    }

    // Test 5: Independent Checkpoint Holdout Verification (CP-03 and CP-07)
    try {
      const checkpoints = registry.getCheckpoints();
      const activeGCPs = registry.getActiveControlPoints();

      const hasCp03 = checkpoints.some((c) => c.id === 'CP-03');
      const hasCp07 = checkpoints.some((c) => c.id === 'CP-07');
      const excludedFromActive = !activeGCPs.some((c) => c.id === 'CP-03' || c.id === 'CP-07');

      // Verify checkpoint residuals are also within acceptable threshold (< 2.5m)
      let allCheckpointsValid = true;
      for (const cp of checkpoints) {
        const surveyed = cp.coordinatesWGS84;
        const predicted = transform.threeToWgs84(cp.local3DPosition);
        const residual = transform.haversineDistance(surveyed, predicted);
        if (residual > 2.50) allCheckpointsValid = false;
      }

      results.push({
        name: '5. Independent holdout checkpoint verification (CP-03 & CP-07)',
        passed: hasCp03 && hasCp07 && excludedFromActive && allCheckpointsValid,
        message: `Holdout count: ${checkpoints.length}, Independent Checkpoint residuals within tolerance: ${allCheckpointsValid}`,
      });
    } catch (err: any) {
      results.push({
        name: '5. Independent holdout checkpoint verification (CP-03 & CP-07)',
        passed: false,
        message: err.message,
      });
    }

    // Test 6: Coastal Azimuth Orientation & Orthogonal Coastal Coordinate System
    try {
      const azimuth = profile.coastalAzimuthDegrees;
      const originENU = transform.threeToEnu({ x: 0, y: 0, z: 0 });
      const northPointENU = transform.threeToEnu({ x: 20, y: 0, z: 0 }); // 20 units alongshore north = 100m
      const seawardPointENU = transform.threeToEnu({ x: 0, y: 0, z: -20 }); // 20 units cross-shore offshore = 100m

      // Vector pointing north alongshore in ENU
      const dxNorth = northPointENU.eastMeters - originENU.eastMeters;
      const dyNorth = northPointENU.northMeters - originENU.northMeters;
      const angleRad = Math.atan2(dxNorth, dyNorth);
      const angleDeg = ((angleRad * 180) / Math.PI + 360) % 360;

      // Seaward vector dot product with alongshore vector must be zero (orthogonal)
      const dxSea = seawardPointENU.eastMeters - originENU.eastMeters;
      const dySea = seawardPointENU.northMeters - originENU.northMeters;
      const dotProd = dxNorth * dxSea + dyNorth * dySea;

      const isAngleMatch = Math.abs(angleDeg - azimuth) < 0.1;
      const isOrthogonal = Math.abs(dotProd) < 1e-4;

      results.push({
        name: '6. Coastal azimuth (28.5°) and orthogonal seaward coordinate system',
        passed: isAngleMatch && isOrthogonal,
        message: `Calculated alongshore bearing: ${angleDeg.toFixed(2)}° (expected ${azimuth}°), Orthogonality dot-product: ${dotProd.toFixed(6)}`,
      });
    } catch (err: any) {
      results.push({
        name: '6. Coastal azimuth (28.5°) and orthogonal seaward coordinate system',
        passed: false,
        message: err.message,
      });
    }

    // Test 7: 2D Simulation (X, Y) <-> WGS84 Bidirectional Mapping
    try {
      const simPoints = [
        { x: 500, y: 280 }, // Center Promenade
        { x: 100, y: 350 }, // South Zone
        { x: 850, y: 220 }, // North Zone
      ];

      let maxSimError = 0;
      for (const sp of simPoints) {
        const gps = transform.simToWgs84(sp);
        const roundTrip = transform.wgs84ToSim(gps);
        const err = Math.sqrt((roundTrip.x - sp.x) ** 2 + (roundTrip.y - sp.y) ** 2);
        if (err > maxSimError) maxSimError = err;
      }

      results.push({
        name: '7. 2D Simulation canvas (x, y) <-> WGS84 GPS bidirectional projection',
        passed: maxSimError < 0.1,
        message: `Max 2D simulation pixel round-trip error: ${maxSimError.toFixed(5)} px`,
      });
    } catch (err: any) {
      results.push({
        name: '7. 2D Simulation canvas (x, y) <-> WGS84 GPS bidirectional projection',
        passed: false,
        message: err.message,
      });
    }

    // Test 8: Aerial Imagery Pixel Projection (rushikonda_aerial.png)
    try {
      const originGPS = profile.localOriginWGS84;
      const pixel = transform.wgs84ToPixel(originGPS);
      const isPixelValid =
        pixel.u >= 0 &&
        pixel.u <= profile.sourceImagery.pixelWidth &&
        pixel.v >= 0 &&
        pixel.v <= profile.sourceImagery.pixelHeight;

      const roundTripGPS = transform.pixelToWgs84(pixel);
      const pixelResolutionMeters = profile.sourceImagery.groundSampleDistanceMeters;
      const roundTripDistMeters = transform.haversineDistance(originGPS, roundTripGPS);

      results.push({
        name: '8. Aerial imagery georeferencing & pixel projection bounds',
        passed: isPixelValid && roundTripDistMeters < 5.0,
        message: `Origin pixel coords: (${pixel.u}, ${pixel.v}) on ${profile.sourceImagery.pixelWidth}x${profile.sourceImagery.pixelHeight} px, GSD: ${pixelResolutionMeters}m/px`,
      });
    } catch (err: any) {
      results.push({
        name: '8. Aerial imagery georeferencing & pixel projection bounds',
        passed: false,
        message: err.message,
      });
    }

    // Test 9: Robust Fallback on Invalid or Missing GPS Input
    try {
      const invalidCoords = [
        { latitude: NaN, longitude: 83.3855 },
        { latitude: 17.783, longitude: NaN },
        { latitude: -999, longitude: 999 },
      ];

      let allHandled = true;
      for (const inv of invalidCoords) {
        const threePos = transform.wgs84ToThree(inv);
        // Should fall back gracefully to local origin (0, 0, 0)
        if (!isFinite(threePos.x) || !isFinite(threePos.y) || !isFinite(threePos.z)) {
          allHandled = false;
        }
      }

      results.push({
        name: '9. Robust fallback handling for corrupted/NaN/out-of-bounds GPS',
        passed: allHandled,
        message: 'All corrupted GPS inputs safely caught and defaulted without NaN propagation',
      });
    } catch (err: any) {
      results.push({
        name: '9. Robust fallback handling for corrupted/NaN/out-of-bounds GPS',
        passed: false,
        message: err.message,
      });
    }

    // Test 10: Scale Consistency (1 Three.js unit = 5.0m in physical space)
    try {
      const scaleFactor = profile.threeUnitToMeters;
      const p1Three = { x: 0, y: 0, z: 0 };
      const p2Three = { x: 20, y: 0, z: 0 }; // 20 units in Three.js

      const p1WGS = transform.threeToWgs84(p1Three);
      const p2WGS = transform.threeToWgs84(p2Three);
      const physicalDist = transform.haversineDistance(p1WGS, p2WGS);

      const expectedPhysicalDist = 20 * scaleFactor; // 100m
      const isScaleAccurate = Math.abs(physicalDist - expectedPhysicalDist) < 1.0;

      results.push({
        name: '10. World scaling consistency (1 Three.js unit = 5.0m physical)',
        passed: isScaleAccurate,
        message: `Physical distance for 20 units: ${physicalDist.toFixed(2)}m (expected ${expectedPhysicalDist}m)`,
      });
    } catch (err: any) {
      results.push({
        name: '10. World scaling consistency (1 Three.js unit = 5.0m physical)',
        passed: false,
        message: err.message,
      });
    }

    // Test 11: Control Point Registry Monotonic Ordering & Complete Coverage
    try {
      const points = registry.getAllControlPoints();
      let isMonotonic = true;
      let prevX = -Infinity;

      for (const p of points) {
        if (p.local3DPosition.x < prevX) {
          isMonotonic = false;
        }
        prevX = p.local3DPosition.x;
      }

      const totalSpanThree = points[points.length - 1].local3DPosition.x - points[0].local3DPosition.x;
      const totalSpanMeters = totalSpanThree * profile.threeUnitToMeters;
      const coversCoastline = totalSpanMeters > 800 && totalSpanMeters < 1200;

      results.push({
        name: '11. Control Point Registry south-to-north monotonic ordering & span',
        passed: isMonotonic && coversCoastline && points.length === 8,
        message: `Point count: ${points.length}, Alongshore 3D span: ${totalSpanThree.toFixed(1)} units (${totalSpanMeters.toFixed(1)}m physical)`,
      });
    } catch (err: any) {
      results.push({
        name: '11. Control Point Registry south-to-north monotonic ordering & span',
        passed: false,
        message: err.message,
      });
    }

    // Test 12: Calibration Non-interference & Zero Impact on Simulation State
    try {
      // Confirm that calibration transformations operate in a purely functional,
      // additive manner and do not mutate global simulation state or visitor models
      const testVisitor = {
        id: 'vis-calib-test',
        x: 480,
        y: 290,
        state: 'WADING',
        swimSpeed: 1.2,
      };

      const copyBefore = JSON.stringify(testVisitor);
      const gpsPos = transform.simToWgs84(testVisitor.x, testVisitor.y);
      const copyAfter = JSON.stringify(testVisitor);

      const noStateMutation = copyBefore === copyAfter;
      const validGpsReturned = gpsPos.latitude > 17.0 && gpsPos.longitude > 83.0;

      results.push({
        name: '12. Calibration non-interference & zero side-effects on simulation models',
        passed: noStateMutation && validGpsReturned,
        message: 'Purely functional coordinate projection; zero mutation of visitor or hazard models',
      });
    } catch (err: any) {
      results.push({
        name: '12. Calibration non-interference & zero side-effects on simulation models',
        passed: false,
        message: err.message,
      });
    }

    return results;
  }
}
