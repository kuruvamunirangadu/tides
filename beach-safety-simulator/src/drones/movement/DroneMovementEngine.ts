/**
 * DroneMovementEngine.ts
 * 
 * TIDES Drone Phase 3: Drone Movement, GPS & Telemetry Integration
 * 
 * Authoritative movement, flight dynamics, and telemetry synchronization engine:
 * - Coordinates simulated 3D world positions with WGS84 Geodetic GPS coordinates via GeoCoordinateTransform
 * - Smooth kinematic navigation along waypoints and autonomous patrol circuits
 * - Heading calculation with stationary deadband filter to eliminate rotation jitter
 * - Altitude AGL mapping and flight boundary constraints (datum floor & 120m ceiling)
 * - State-dependent movement determination (STATIONARY, HOVERING, CRUISING, CLIMBING, DESCENDING)
 * - Simulated battery drain during flight and automated charging on landing pads
 * - Emits sanitized telemetry packets through DroneTelemetryAdapter and DroneRegistry
 * - Supports simulation pause, resume, and manual target dispatch without breaking existing simulation logic
 */

import { DroneRegistry } from '../foundation/DroneRegistry';
import { DroneTelemetryAdapter } from '../foundation/DroneTelemetryAdapter';
import {
  DroneRecord,
  DroneWorld3DPosition,
  DroneGeodeticPosition,
  DroneMovementState,
  DroneOperationalStatus,
  RawDroneTelemetryPacket,
} from '../foundation/drone.types';
import { GeoCoordinateTransform } from '../../geospatial/GeoCoordinateTransform';

export interface DroneFlightProfile {
  droneId: string;
  waypoints: DroneWorld3DPosition[];
  currentWaypointIndex: number;
  targetPosition3D?: DroneWorld3DPosition;
  targetAltitudeMeters: number;
  cruiseSpeedMps: number;
  climbRateMps: number;
  holdTimerSec: number;
  holdDurationSec: number;
}

export class DroneMovementEngine {
  private static instance: DroneMovementEngine | null = null;

  public static readonly MIN_FLIGHT_ALTITUDE_AGL = 0.0; // Ground/water datum
  public static readonly MAX_FLIGHT_ALTITUDE_AGL = 120.0; // Regulatory ceiling
  public static readonly STATIONARY_SPEED_THRESHOLD = 0.2; // m/s deadband for heading jitter
  public static readonly DEFAULT_CRUISE_SPEED_MPS = 6.0; // 6 m/s (~22 km/h) coastal patrol speed
  public static readonly DEFAULT_CLIMB_RATE_MPS = 2.5; // 2.5 m/s vertical rate

  private registry: DroneRegistry;
  private geoTransform: GeoCoordinateTransform;
  private flightProfiles: Map<string, DroneFlightProfile> = new Map();
  private isPaused: boolean = false;
  private packetSequenceCounter: number = 1000;

  public static getInstance(): DroneMovementEngine {
    if (!DroneMovementEngine.instance) {
      DroneMovementEngine.instance = new DroneMovementEngine();
    }
    return DroneMovementEngine.instance;
  }

  constructor() {
    this.registry = DroneRegistry.getInstance();
    this.geoTransform = GeoCoordinateTransform.getInstance();
    this.initializeDefaultFlightProfiles();
  }

  /**
   * Sets up default patrol circuits and operational flight profiles for the fleet
   */
  public initializeDefaultFlightProfiles(): void {
    this.flightProfiles.clear();

    // 1. DRONE-01: Surveillance Specialist — 4-Waypoint Coastal Crescent Patrol Circuit
    this.flightProfiles.set('DRONE-01', {
      droneId: 'DRONE-01',
      waypoints: [
        { x: -30.0, y: 18.0, z: -40.0 }, // WP-1: South surf break / rocky cove
        { x: 0.0, y: 22.0, z: -45.0 },   // WP-2: Central rip current offshore boundary
        { x: 35.0, y: 20.0, z: -35.0 },  // WP-3: North swimming zone cove
        { x: 10.0, y: 18.0, z: -25.0 },  // WP-4: Mid-beach alongshore return line
      ],
      currentWaypointIndex: 0,
      targetAltitudeMeters: 18.0,
      cruiseSpeedMps: 6.0,
      climbRateMps: 2.5,
      holdTimerSec: 0,
      holdDurationSec: 4.0, // Brief observation pause at each sweep point
    });

    // 2. DRONE-02: Search & Rescue Flotation Delivery UAV — Promenade Standby
    this.flightProfiles.set('DRONE-02', {
      droneId: 'DRONE-02',
      waypoints: [],
      currentWaypointIndex: 0,
      targetAltitudeMeters: 20.0,
      cruiseSpeedMps: 10.0, // High-speed emergency response
      climbRateMps: 3.5,
      holdTimerSec: 0,
      holdDurationSec: 30.0,
    });

    // 3. DRONE-03: Multi-Role Sentinel — North Station Standby
    this.flightProfiles.set('DRONE-03', {
      droneId: 'DRONE-03',
      waypoints: [],
      currentWaypointIndex: 0,
      targetAltitudeMeters: 20.0,
      cruiseSpeedMps: 7.5,
      climbRateMps: 2.8,
      holdTimerSec: 0,
      holdDurationSec: 10.0,
    });

    // 4. DRONE-04: Standby Reserve Quad — South Tower Pad Charging
    this.flightProfiles.set('DRONE-04', {
      droneId: 'DRONE-04',
      waypoints: [],
      currentWaypointIndex: 0,
      targetAltitudeMeters: 0.0,
      cruiseSpeedMps: 5.0,
      climbRateMps: 2.0,
      holdTimerSec: 0,
      holdDurationSec: 0,
    });
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Resets all drone positions and flight states to default
   */
  public reset(): void {
    this.initializeDefaultFlightProfiles();
    this.isPaused = false;
  }

  /**
   * Assigns a custom target destination in 3D world coordinates
   */
  public dispatchToWorldPosition(
    droneId: string,
    target: DroneWorld3DPosition,
    targetAltitudeMeters: number = 20.0,
    missionId?: string
  ): boolean {
    const drone = this.registry.getDrone(droneId);
    if (!drone) return false;

    const profile = this.flightProfiles.get(droneId) || {
      droneId,
      waypoints: [],
      currentWaypointIndex: 0,
      targetAltitudeMeters,
      cruiseSpeedMps: DroneMovementEngine.DEFAULT_CRUISE_SPEED_MPS,
      climbRateMps: DroneMovementEngine.DEFAULT_CLIMB_RATE_MPS,
      holdTimerSec: 0,
      holdDurationSec: 20.0,
    };

    profile.targetPosition3D = { ...target, y: targetAltitudeMeters };
    profile.targetAltitudeMeters = targetAltitudeMeters;
    profile.holdTimerSec = 0;
    this.flightProfiles.set(droneId, profile);

    drone.status = 'DISPATCHED';
    drone.currentMissionId = missionId ?? `MSN-DISPATCH-${Date.now().toString().slice(-4)}`;
    return true;
  }

  /**
   * Assigns a target destination using real WGS84 GPS coordinates
   */
  public dispatchToGeoPosition(
    droneId: string,
    geoTarget: { latitude: number; longitude: number; altitudeAglMeters?: number },
    missionId?: string
  ): boolean {
    // Validate GPS coordinate boundaries
    if (
      isNaN(geoTarget.latitude) ||
      isNaN(geoTarget.longitude) ||
      geoTarget.latitude < -90 ||
      geoTarget.latitude > 90 ||
      geoTarget.longitude < -180 ||
      geoTarget.longitude > 180
    ) {
      return false;
    }

    const alt = geoTarget.altitudeAglMeters ?? 20.0;
    const target3D = this.geoTransform.wgs84ToThree({
      latitude: geoTarget.latitude,
      longitude: geoTarget.longitude,
      altitudeMeters: alt,
    });

    return this.dispatchToWorldPosition(droneId, target3D, alt, missionId);
  }

  /**
   * Commands a drone to return to its home launch pad
   */
  public returnToBase(droneId: string): boolean {
    const drone = this.registry.getDrone(droneId);
    if (!drone) return false;

    const profile = this.flightProfiles.get(droneId);
    if (profile) {
      profile.targetPosition3D = { ...drone.homePosition3D };
      profile.targetAltitudeMeters = drone.homePosition3D.y;
    }

    drone.status = 'RETURNING';
    return true;
  }

  /**
   * Retrieves active flight profile for a drone
   */
  public getFlightProfile(droneId: string): DroneFlightProfile | undefined {
    return this.flightProfiles.get(droneId);
  }

  /**
   * Directly assigns or updates a drone's flight profile
   */
  public setFlightProfile(droneId: string, profile: DroneFlightProfile): void {
    this.flightProfiles.set(droneId, profile);
  }

  /**
   * Configures an ordered patrol circuit route for a drone
   */
  public configurePatrolCircuit(
    droneId: string,
    waypoints: DroneWorld3DPosition[],
    cruiseSpeedMps: number = DroneMovementEngine.DEFAULT_CRUISE_SPEED_MPS,
    holdDurationSec: number = 4.0,
    missionId?: string
  ): boolean {
    const drone = this.registry.getDrone(droneId);
    if (!drone || waypoints.length === 0) return false;

    this.flightProfiles.set(droneId, {
      droneId,
      waypoints: waypoints.map((w) => ({ ...w })),
      currentWaypointIndex: 0,
      targetAltitudeMeters: waypoints[0].y,
      cruiseSpeedMps,
      climbRateMps: DroneMovementEngine.DEFAULT_CLIMB_RATE_MPS,
      holdTimerSec: 0,
      holdDurationSec,
    });

    drone.status = 'PATROLLING';
    drone.currentMissionId = missionId;
    return true;
  }

  /**
   * Commands a drone to halt translation and maintain stationary hover on station
   */
  public stopAndHold(droneId: string, holdAltitude?: number): boolean {
    const drone = this.registry.getDrone(droneId);
    if (!drone) return false;

    const currentAlt = holdAltitude ?? Math.max(10.0, drone.position3D.y);
    const profile = this.flightProfiles.get(droneId) || {
      droneId,
      waypoints: [],
      currentWaypointIndex: 0,
      targetAltitudeMeters: currentAlt,
      cruiseSpeedMps: DroneMovementEngine.DEFAULT_CRUISE_SPEED_MPS,
      climbRateMps: DroneMovementEngine.DEFAULT_CLIMB_RATE_MPS,
      holdTimerSec: 0,
      holdDurationSec: 60.0,
    };

    profile.targetPosition3D = { x: drone.position3D.x, y: currentAlt, z: drone.position3D.z };
    profile.targetAltitudeMeters = currentAlt;
    this.flightProfiles.set(droneId, profile);

    drone.status = 'SEARCHING';
    return true;
  }

  /**
   * Main per-frame simulation update loop.
   * Advances flight kinematics, calculates GPS mapping, manages battery drain,
   * and publishes sanitized telemetry packets to the DroneRegistry.
   */
  public update(deltaTimeSec: number, currentClockMs: number = Date.now()): void {
    if (this.isPaused || deltaTimeSec <= 0) return;

    // Clamp delta time to avoid large positional leaps on frame drops
    const dt = Math.min(deltaTimeSec, 0.1);
    const drones = this.registry.getAllDrones();

    for (const drone of drones) {
      this.updateDroneMovement(drone, dt, currentClockMs);
    }
  }

  /**
   * Steps an individual drone through flight kinematics, GPS transform, and telemetry emission
   */
  private updateDroneMovement(
    drone: DroneRecord,
    dt: number,
    currentClockMs: number
  ): void {
    const profile = this.flightProfiles.get(drone.droneId);
    const prevPos: DroneWorld3DPosition = { ...drone.position3D };
    let currentPos: DroneWorld3DPosition = { ...drone.position3D };
    let currentHeading = drone.headingDegrees;
    let currentSpeed = 0;
    let currentMovementState: DroneMovementState = 'STATIONARY';
    let targetPos: DroneWorld3DPosition | undefined = profile?.targetPosition3D;

    // 1. Determine active flight target
    if (drone.status === 'PATROLLING' && profile && profile.waypoints.length > 0) {
      targetPos = profile.waypoints[profile.currentWaypointIndex];
    } else if (drone.status === 'RETURNING') {
      targetPos = { ...drone.homePosition3D };
    }

    // 2. Compute flight kinematics if target exists
    if (targetPos && drone.status !== 'CHARGING' && drone.status !== 'MAINTENANCE' && drone.status !== 'OFFLINE') {
      const cruiseSpeed = profile?.cruiseSpeedMps ?? DroneMovementEngine.DEFAULT_CRUISE_SPEED_MPS;
      const climbRate = profile?.climbRateMps ?? DroneMovementEngine.DEFAULT_CLIMB_RATE_MPS;
      const targetAltitude = Math.min(
        DroneMovementEngine.MAX_FLIGHT_ALTITUDE_AGL,
        Math.max(DroneMovementEngine.MIN_FLIGHT_ALTITUDE_AGL, targetPos.y)
      );

      // A. Vertical Climb / Descent
      const altDiff = targetAltitude - currentPos.y;
      if (Math.abs(altDiff) > 0.05) {
        const altStep = Math.sign(altDiff) * Math.min(Math.abs(altDiff), climbRate * dt);
        currentPos.y += altStep;
        currentMovementState = altStep > 0 ? 'CLIMBING' : 'DESCENDING';
      }

      // B. Horizontal Vector Stepping
      const dx = targetPos.x - currentPos.x;
      const dz = targetPos.z - currentPos.z;
      const horizontalDist = Math.hypot(dx, dz);

      if (horizontalDist > 0.3) {
        const stepDist = Math.min(horizontalDist, cruiseSpeed * dt);
        const ratio = stepDist / horizontalDist;
        currentPos.x += dx * ratio;
        currentPos.z += dz * ratio;
        currentSpeed = cruiseSpeed;
        currentMovementState = currentMovementState === 'CLIMBING' || currentMovementState === 'DESCENDING'
          ? currentMovementState
          : 'CRUISING';

        // Calculate heading from movement direction with deadband
        // In Three.js: +X is alongshore right, -Z is seaward forward
        // heading: 0 = North (-Z), 90 = East (+X)
        const rad = Math.atan2(dx, -dz);
        let deg = (rad * 180) / Math.PI;
        if (deg < 0) deg += 360;
        currentHeading = Math.round(deg);
      } else {
        // Arrived at horizontal waypoint
        currentSpeed = 0;
        if (currentMovementState !== 'CLIMBING' && currentMovementState !== 'DESCENDING') {
          if (currentPos.y > (drone.homePosition3D.y + 1.0)) {
            currentMovementState = 'HOVERING';
          } else {
            currentMovementState = 'STATIONARY';
          }
        }

        if (Math.abs(altDiff) <= 0.1) {
          this.handleWaypointArrival(drone, profile, dt);
        }
      }
    } else {
      // Grounded / Stationary / Charging
      currentSpeed = 0;
      currentMovementState = 'STATIONARY';
    }

    // 3. Enforce Altitude Floor & Ceiling Constraints
    currentPos.y = Math.min(
      DroneMovementEngine.MAX_FLIGHT_ALTITUDE_AGL,
      Math.max(DroneMovementEngine.MIN_FLIGHT_ALTITUDE_AGL, currentPos.y)
    );

    // 4. Update Battery State
    this.updateBatteryState(drone, currentPos, currentSpeed, dt);

    // 5. Geographic Coordinate Transformation (Three.js 3D -> WGS84 GPS)
    const wgs84 = this.geoTransform.threeToWgs84(currentPos);
    const positionGeo: DroneGeodeticPosition = {
      latitude: wgs84.latitude,
      longitude: wgs84.longitude,
      altitudeAglMeters: currentPos.y,
      gpsAccuracyCepMeters: 0.8,
    };

    // 6. Construct and Emit Raw Telemetry Packet through Sanitation Adapter
    this.packetSequenceCounter++;
    const telemetryPacket: RawDroneTelemetryPacket = {
      packetId: `PKT-${drone.droneId}-${this.packetSequenceCounter}`,
      droneId: drone.droneId,
      sourceTimestampMs: currentClockMs,
      receivedTimestampMs: currentClockMs,
      provenance: drone.provenance ?? 'SIMULATED',
      position3D: {
        x: parseFloat(currentPos.x.toFixed(2)),
        y: parseFloat(currentPos.y.toFixed(2)),
        z: parseFloat(currentPos.z.toFixed(2)),
      },
      positionGeo,
      previousPosition3D: prevPos,
      targetPosition3D: targetPos,
      movementState: currentMovementState,
      headingDegrees: currentHeading,
      speedMps: parseFloat(currentSpeed.toFixed(2)),
      altitudeMeters: parseFloat(currentPos.y.toFixed(2)),
      batteryPercentage: drone.battery.percentage,
      voltageVolts: drone.battery.voltageVolts,
      connectivity: drone.connectivity,
    };

    // Update authoritative registry state
    this.registry.ingestTelemetry(telemetryPacket, currentClockMs);
  }

  /**
   * Handles target arrival and sequencing to next waypoint in the patrol circuit
   */
  private handleWaypointArrival(
    drone: DroneRecord,
    profile?: DroneFlightProfile,
    dt: number = 0.016
  ): void {
    if (!profile) return;

    if (drone.status === 'PATROLLING' && profile.waypoints.length > 0) {
      profile.holdTimerSec += dt;
      if (profile.holdTimerSec >= profile.holdDurationSec) {
        profile.holdTimerSec = 0;
        profile.currentWaypointIndex = (profile.currentWaypointIndex + 1) % profile.waypoints.length;
      }
    } else if (drone.status === 'DISPATCHED') {
      drone.status = 'SEARCHING';
      profile.holdTimerSec = 0;
    } else if (drone.status === 'SEARCHING') {
      profile.holdTimerSec += dt;
      if (profile.holdTimerSec >= profile.holdDurationSec) {
        // Complete mission and return to base
        this.returnToBase(drone.droneId);
      }
    } else if (drone.status === 'RETURNING') {
      // Descend to home pad elevation
      const homeY = drone.homePosition3D.y;
      if (Math.abs(drone.position3D.y - homeY) <= 0.1) {
        drone.status = 'CHARGING';
        drone.currentMissionId = undefined;
        drone.speedMps = 0;
      }
    }
  }

  /**
   * Simulates battery drain during flight and charging while on base station pad
   */
  private updateBatteryState(
    drone: DroneRecord,
    pos: DroneWorld3DPosition,
    speed: number,
    dt: number
  ): void {
    const isAirborne = pos.y > (drone.homePosition3D.y + 0.5);

    if (drone.status === 'CHARGING' || (!isAirborne && drone.battery.percentage < 100)) {
      // Charging rate: +12% per minute on pad
      const chargeRatePerSec = 12.0 / 60.0;
      drone.battery.percentage = Math.min(100, drone.battery.percentage + chargeRatePerSec * dt);
      drone.battery.voltageVolts = parseFloat((21.0 + (drone.battery.percentage / 100) * 1.8).toFixed(1));
      if (drone.battery.percentage >= 100) {
        drone.status = 'IDLE';
      }
    } else if (isAirborne) {
      // Discharge rate: ~3.0% per minute cruising, scaled by speed
      const baseDrainPerSec = 3.0 / 60.0;
      const speedFactor = 1.0 + (speed / 12.0) * 0.4;
      drone.battery.percentage = Math.max(0, drone.battery.percentage - baseDrainPerSec * speedFactor * dt);
      drone.battery.voltageVolts = parseFloat((21.0 + (drone.battery.percentage / 100) * 1.8).toFixed(1));

      // Automated Failsafe Return-to-Home if battery falls below reserve threshold
      if (drone.battery.percentage <= drone.battery.reserveThresholdPercent && drone.status !== 'RETURNING') {
        this.returnToBase(drone.droneId);
      }
    }

    drone.battery.isLowBattery = drone.battery.percentage <= drone.battery.reserveThresholdPercent;
    drone.battery.isCriticalBattery = drone.battery.percentage <= 10;
  }
}

