import { Drone, DroneType, DroneStatus, DroneCapability } from '../models/Drone';
import { DroneTelemetry } from '../models/DroneTelemetry';
import { DroneCamera } from '../models/DroneCamera';
import { DroneBattery } from '../models/DroneBattery';
import { DroneCoverage } from '../models/DroneCoverage';
import { DroneMission } from '../models/DroneMission';
import { DronePhysics } from './DronePhysics';
import { GeoPoint } from '../../gis/models/GeoPoint';

export class VirtualDrone implements Drone {
  public id: string;
  public name: string;
  public type: DroneType;
  public position: GeoPoint;
  public canvasPosition: { x: number; y: number };
  public altitude: number = 0; // 0m on pad, cruising at 25-45m
  public heading: number = 0;
  public speed: number = 0; // m/s
  public batteryLevel: number = 100;
  public status: DroneStatus = 'AVAILABLE';
  public capabilities: DroneCapability[];
  public cameraId?: string;
  public currentMissionId?: string;
  public homeStationId: string;
  public homePosition: { x: number; y: number; geo: GeoPoint };
  public payloadDeployed: boolean = false;

  // Sub-systems
  public camera: DroneCamera;
  public battery: DroneBattery;
  public currentMission?: DroneMission;

  // Target flight vectors
  private targetCanvasPos?: { x: number; y: number };
  private targetAltitude: number = 0;
  private maxCruiseSpeed: number = 12.0; // 12 m/s (~43 km/h)
  private climbRate: number = 3.0; // 3 m/s
  private holdTimerSec: number = 0;

  constructor(
    id: string,
    name: string,
    type: DroneType,
    homeCanvasPos: { x: number; y: number },
    homeGeo: GeoPoint,
    homeStationId: string,
    capabilities: DroneCapability[] = [
      DroneCapability.SURVEILLANCE,
      DroneCapability.PERSON_DETECTION,
      DroneCapability.TRACKING,
      DroneCapability.DISTRESS_DETECTION,
      DroneCapability.LIVE_VIDEO,
      DroneCapability.GPS,
      DroneCapability.HIGH_RISK_MONITORING,
    ]
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.canvasPosition = { ...homeCanvasPos };
    this.homePosition = { x: homeCanvasPos.x, y: homeCanvasPos.y, geo: { ...homeGeo } };
    this.position = { ...homeGeo };
    this.homeStationId = homeStationId;
    this.capabilities = capabilities;
    this.cameraId = `CAM-${id}`;

    this.camera = {
      id: `CAM-${id}`,
      droneId: id,
      resolution: { width: 3840, height: 2160 }, // 4K 60FPS
      fps: 60,
      fieldOfView: 70, // 70° FOV
      zoomLevel: 1.0,
      orientation: { pitch: -60, yaw: 0, roll: 0 },
      status: 'ONLINE',
    };

    this.battery = {
      droneId: id,
      currentPercent: 100,
      consumptionRatePercentPerMin: 3.2,
      minimumReturnPercent: 25,
      criticalPercent: 10,
      charging: false,
      chargingRatePercentPerMin: 12.0,
      estimatedFlightTimeRemainingSec: 1800,
    };
  }

  public assignMission(mission: DroneMission): void {
    this.currentMission = mission;
    this.currentMissionId = mission.id;
    this.status = 'DISPATCHED';
    this.holdTimerSec = 0;

    if (mission.targetCanvasPos) {
      this.targetCanvasPos = { ...mission.targetCanvasPos };
      this.targetAltitude = 35.0; // Standard surveillance altitude
    } else if (mission.waypoints && mission.waypoints.length > 0) {
      this.targetCanvasPos = { ...mission.waypoints[0] };
      this.targetAltitude = mission.waypoints[0].altitude || 35.0;
    }
  }

  public abortToReturn(): void {
    this.status = 'RETURNING';
    this.targetCanvasPos = { x: this.homePosition.x, y: this.homePosition.y };
    this.targetAltitude = 20.0;
    if (this.currentMission) {
      this.currentMission.status = 'CANCELLED';
    }
  }

  public tick(
    deltaTimeSec: number,
    currentTime: number,
    timeDisplay: string
  ): void {
    // 1. Handle Battery Dynamics
    this.updateBattery(deltaTimeSec);

    // 2. Automated Return-To-Home (RTH) Failsafe
    if (
      this.battery.currentPercent <= this.battery.minimumReturnPercent &&
      this.status !== 'RETURNING' &&
      this.status !== 'CHARGING' &&
      this.status !== 'AVAILABLE'
    ) {
      this.abortToReturn();
    }

    // 3. Flight Kinematics by State
    switch (this.status) {
      case 'AVAILABLE':
      case 'CHARGING':
        this.speed = 0;
        this.altitude = 0;
        break;

      case 'DISPATCHED':
      case 'PATROLLING':
      case 'SEARCHING':
      case 'TRACKING':
      case 'SUPPORTING':
        this.stepFlight(deltaTimeSec);
        break;

      case 'RETURNING':
        this.stepReturnFlight(deltaTimeSec);
        break;
    }

    // 4. Update camera orientation & zoom to track target
    this.updateCameraGimbal();
  }

  private updateBattery(deltaTimeSec: number): void {
    if (this.status === 'CHARGING' || (this.status === 'AVAILABLE' && this.altitude === 0)) {
      if (this.battery.currentPercent < 100) {
        this.battery.charging = true;
        this.battery.currentPercent = Math.min(
          100,
          this.battery.currentPercent + (this.battery.chargingRatePercentPerMin / 60) * deltaTimeSec
        );
      } else {
        this.battery.charging = false;
        this.status = 'AVAILABLE';
      }
    } else {
      this.battery.charging = false;
      const drain = (this.battery.consumptionRatePercentPerMin / 60) * deltaTimeSec * (1 + (this.speed / this.maxCruiseSpeed) * 0.3);
      this.battery.currentPercent = Math.max(0, this.battery.currentPercent - drain);
    }
    this.batteryLevel = Math.round(this.battery.currentPercent);
    this.battery.estimatedFlightTimeRemainingSec = Math.round((this.battery.currentPercent / this.battery.consumptionRatePercentPerMin) * 60);
  }

  private stepFlight(deltaTimeSec: number): void {
    if (!this.targetCanvasPos) return;

    // Climb to cruising altitude first
    this.altitude = DronePhysics.stepAltitude(this.altitude, this.targetAltitude, this.climbRate * deltaTimeSec);

    // Compute heading
    this.heading = DronePhysics.calculateHeading(
      this.canvasPosition.x,
      this.canvasPosition.y,
      this.targetCanvasPos.x,
      this.targetCanvasPos.y
    );

    // Step position towards target
    const stepDist = this.maxCruiseSpeed * deltaTimeSec;
    const res = DronePhysics.stepTowards(this.canvasPosition, this.targetCanvasPos, stepDist);
    this.canvasPosition = { x: res.x, y: res.y };
    this.speed = res.arrived ? 0 : this.maxCruiseSpeed;

    if (res.arrived) {
      this.handleTargetArrival(deltaTimeSec);
    }
  }

  private handleTargetArrival(deltaTimeSec: number): void {
    if (!this.currentMission) return;

    if (this.currentMission.type === 'PATROL' && this.currentMission.waypoints) {
      const idx = this.currentMission.currentWaypointIndex || 0;
      const nextIdx = (idx + 1) % this.currentMission.waypoints.length;
      this.currentMission.currentWaypointIndex = nextIdx;
      this.targetCanvasPos = { ...this.currentMission.waypoints[nextIdx] };
      this.status = 'PATROLLING';
    } else if (this.currentMission.type === 'TRACK' || this.currentMission.type === 'VERIFY_DISTRESS') {
      this.status = 'TRACKING';
      this.holdTimerSec += deltaTimeSec;
      if (this.holdTimerSec > 45) { // 45s continuous target surveillance complete
        this.currentMission.status = 'COMPLETED';
        this.abortToReturn();
      }
    } else if (this.currentMission.type === 'SEARCH') {
      this.status = 'SEARCHING';
      this.holdTimerSec += deltaTimeSec;
      if (this.holdTimerSec > 60) {
        this.currentMission.status = 'COMPLETED';
        this.abortToReturn();
      }
    } else if (this.currentMission.type === 'HIGH_RISK_MONITORING') {
      this.status = 'SUPPORTING';
    }
  }

  private stepReturnFlight(deltaTimeSec: number): void {
    const res = DronePhysics.stepTowards(
      this.canvasPosition,
      { x: this.homePosition.x, y: this.homePosition.y },
      this.maxCruiseSpeed * deltaTimeSec
    );
    this.canvasPosition = { x: res.x, y: res.y };
    this.speed = res.arrived ? 0 : this.maxCruiseSpeed;
    this.heading = DronePhysics.calculateHeading(
      this.canvasPosition.x,
      this.canvasPosition.y,
      this.homePosition.x,
      this.homePosition.y
    );

    if (res.arrived) {
      // Land
      this.altitude = DronePhysics.stepAltitude(this.altitude, 0, this.climbRate * deltaTimeSec);
      if (this.altitude === 0) {
        this.status = 'CHARGING';
        this.speed = 0;
        this.currentMission = undefined;
        this.currentMissionId = undefined;
      }
    }
  }

  private updateCameraGimbal(): void {
    if (this.status === 'TRACKING' || this.status === 'SEARCHING') {
      this.camera.orientation.pitch = -75; // Angled down towards swimmer
      this.camera.zoomLevel = 2.0;
    } else if (this.status === 'PATROLLING' || this.status === 'DISPATCHED') {
      this.camera.orientation.pitch = -45; // Wide forward-down scanning
      this.camera.zoomLevel = 1.0;
    } else {
      this.camera.orientation.pitch = -90; // Nadir
      this.camera.zoomLevel = 1.0;
    }
  }

  public getCoverage(): DroneCoverage {
    const radius = DronePhysics.calculateCoverageRadius(this.altitude, this.camera.fieldOfView);
    const pts: Array<{ x: number; y: number }> = [];
    const segments = 16;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      pts.push({
        x: this.canvasPosition.x + radius * Math.cos(angle),
        y: this.canvasPosition.y + radius * Math.sin(angle),
      });
    }

    return {
      droneId: this.id,
      altitude: this.altitude,
      radiusMeters: radius,
      canvasCoverage: {
        centerX: this.canvasPosition.x,
        centerY: this.canvasPosition.y,
        radiusX: radius,
        radiusY: radius,
        polygonPoints: pts,
      },
      confidence: this.camera.status === 'ONLINE' ? 0.95 : 0.4,
      timestamp: Date.now(),
    };
  }

  public getTelemetry(currentTime: number, timeDisplay: string): DroneTelemetry {
    return {
      droneId: this.id,
      timestamp: currentTime,
      timeDisplay,
      position: { ...this.position },
      canvasPosition: { ...this.canvasPosition },
      altitude: Math.round(this.altitude * 10) / 10,
      heading: this.heading,
      speed: Math.round(this.speed * 10) / 10,
      batteryLevel: this.batteryLevel,
      signalStrength: 96,
      gpsAccuracy: 0.8,
      cameraStatus: this.camera.status,
      communicationStatus: 'CONNECTED',
      flightMode: this.status,
    };
  }
}
