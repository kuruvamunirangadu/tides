/**
 * drone.types.ts
 * 
 * TIDES Drone Phase 1: Drone Registry and Shared Telemetry Foundation
 * 
 * Defines formal data models and strict typing for coastal drone operations:
 * - Roles: SURVEILLANCE, RESCUE_ASSISTANCE, MULTI_ROLE
 * - Operational status lifecycle
 * - Connectivity and data provenance (SIMULATED vs HARDWARE_DERIVED)
 * - Sensor & payload capability descriptors
 * - WGS84 Geodetic & Three.js 3D world coordinates
 */

export type DroneRole = 'SURVEILLANCE' | 'RESCUE_ASSISTANCE' | 'MULTI_ROLE';

export type DroneOperationalStatus =
  | 'IDLE'
  | 'PATROLLING'
  | 'DISPATCHED'
  | 'SEARCHING'
  | 'ASSISTING'
  | 'RETURNING'
  | 'CHARGING'
  | 'MAINTENANCE'
  | 'OFFLINE';

export type DroneConnectivity = 'CONNECTED' | 'DEGRADED' | 'DISCONNECTED';

export type DroneDataProvenance = 'SIMULATED' | 'HARDWARE_DERIVED';

export interface DronePayloadCapabilities {
  hasThermalCamera: boolean;
  hasOpticalZoom: boolean;
  hasMegaphoneSiren: boolean;
  hasFlotationPayload: boolean;
  flotationPayloadCapacityKg?: number;
  maxWindResistanceMps: number;
  maxFlightRangeMeters: number;
}

export interface DroneBatteryState {
  percentage: number; // 0 - 100%
  voltageVolts?: number; // e.g. 22.2V (6S LiPo)
  reserveThresholdPercent: number; // e.g. 20%
  isLowBattery: boolean;
  isCriticalBattery: boolean;
}

export interface DroneGeodeticPosition {
  latitude: number;
  longitude: number;
  altitudeAglMeters: number;
  gpsAccuracyCepMeters?: number;
}

export interface DroneWorld3DPosition {
  x: number;
  y: number;
  z: number;
}

export type DroneMovementState =
  | 'STATIONARY'
  | 'HOVERING'
  | 'CRUISING'
  | 'CLIMBING'
  | 'DESCENDING'
  | 'MANEUVERING';

export interface DroneRecord {
  droneId: string;
  callsign: string;
  modelName: string;
  role: DroneRole;
  status: DroneOperationalStatus;
  connectivity: DroneConnectivity;
  provenance: DroneDataProvenance;
  capabilities: DronePayloadCapabilities;
  battery: DroneBatteryState;
  currentMissionId?: string;
  assignedIncidentId?: string;
  position3D: DroneWorld3DPosition;
  positionGeo?: DroneGeodeticPosition;
  previousPosition3D?: DroneWorld3DPosition;
  targetPosition3D?: DroneWorld3DPosition;
  targetAltitudeMeters?: number;
  movementState?: DroneMovementState;
  headingDegrees: number;
  speedMps: number;
  lastObservationTimeMs: number;
  lastReceivedTimeMs: number;
  telemetryFreshnessSeconds: number;
  isStale: boolean;
  homeBaseId: string;
  homePosition3D: DroneWorld3DPosition;
}

export interface RawDroneTelemetryPacket {
  packetId: string;
  droneId: string;
  sourceTimestampMs: number;
  receivedTimestampMs?: number;
  provenance?: DroneDataProvenance;
  position3D: DroneWorld3DPosition;
  positionGeo?: DroneGeodeticPosition;
  previousPosition3D?: DroneWorld3DPosition;
  targetPosition3D?: DroneWorld3DPosition;
  movementState?: DroneMovementState;
  isRelocation?: boolean;
  headingDegrees: number;
  speedMps: number;
  altitudeMeters: number;
  batteryPercentage: number;
  voltageVolts?: number;
  connectivity?: DroneConnectivity;
}

export interface MissionAssignmentRequest {
  droneId: string;
  missionId: string;
  requiredRole?: DroneRole;
  requiredCapability?: keyof DronePayloadCapabilities;
  incidentId?: string;
  targetPosition3D?: DroneWorld3DPosition;
}

export interface MissionAssignmentResult {
  success: boolean;
  droneId: string;
  missionId: string;
  assignedStatus?: DroneOperationalStatus;
  rejectionReason?: string;
}

