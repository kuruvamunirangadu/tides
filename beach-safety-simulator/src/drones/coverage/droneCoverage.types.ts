/**
 * droneCoverage.types.ts
 * 
 * TIDES Drone Phase 8: Coastal Coverage & Multi-Drone Patrol Coordination Contracts
 * 
 * Strict Architectural Principles:
 * 1. Coverage derives strictly from valid, timestamped camera observations.
 * 2. An assigned drone, route, or camera FOV cone is NOT proof of observed coverage.
 * 3. The coverage planner assigns and coordinates missions; the existing DroneMovementEngine,
 *    DroneMissionManager, IncidentManager, and RescueCoordinator remain authoritative.
 * 4. Zero duplicate registries, competing movement engines, or parallel rescue managers.
 * 5. Rescue assistance missions and dedicated rescue drones (e.g. DRONE-02) are preserved
 *    and NEVER hijacked for routine surveillance patrol.
 */

export type CoastalZonePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type CoastalCoverageStatus =
  | 'UNASSIGNED'           // No drone assigned to monitor this zone
  | 'UNCOVERED'            // Drone assigned, but 0 valid observations received yet
  | 'COVERED'              // Valid observation received within required interval
  | 'PARTIALLY_COVERED'    // Observation received but insufficient temporal density
  | 'OVERLAPPING_COVERAGE' // Simultaneous fresh observations from multiple distinct drones/cameras
  | 'STALE_COVERAGE'       // Observation received previously, but expired past required interval
  | 'COVERAGE_DEGRADED'    // Assigned drone disconnected, low battery, or camera faulted
  | 'UNKNOWN';             // Incomplete telemetry or unestimated observation coordinates

export interface CoastalZoneBoundary3D {
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
}

export interface CoastalZoneRequiredCapabilities {
  requiresThermalCamera?: boolean;
  requiresOpticalZoom?: boolean;
  minFlightAltitudeMeters?: number;
  maxFlightAltitudeMeters?: number;
}

/**
 * Authoritative Coastal Surveillance Zone specification
 */
export interface CoastalSurveillanceZone {
  /** Unique stable zone identifier (e.g. CZ-SOUTH-SURF) */
  zoneId: string;
  /** Human-readable zone name */
  name: string;
  /** Operational description */
  description: string;
  /** Scene-space bounding box [xMin, xMax, zMin, zMax] in Three.js coordinates */
  boundary3D: CoastalZoneBoundary3D;
  /** Priority level for patrol allocation */
  priority: CoastalZonePriority;
  /** Maximum acceptable observation age before coverage becomes STALE (milliseconds) */
  requiredObservationIntervalMs: number;
  /** Payload capabilities required for effective surveillance */
  requiredCapabilities: CoastalZoneRequiredCapabilities;
  /** Compatible patrol route ID in DroneMissionManager (e.g. ROUTE-COASTAL-CRESCENT) */
  compatibleRouteId: string;
  /** Drone IDs currently assigned to this surveillance zone */
  assignedDroneIds: string[];
  /** Active mission ID in DroneMissionManager, if currently running */
  activeMissionId?: string;
  /** Epoch timestamp of most recent valid observation (ms) */
  lastValidObservationTimestampMs?: number;
  /** Ground coordinates of most recent valid observation */
  lastObservationCoordinates?: { x: number; y: number; z: number };
  /** Source camera ID of latest observation */
  lastObservationCameraId?: string;
  /** Current evaluated coverage status */
  coverageStatus: CoastalCoverageStatus;
  /** Total valid observations recorded since engine start */
  totalValidObservationsCount: number;
  /** Configuration provenance */
  provenance: 'SIMULATED_SCENE_SPACE';
}

/**
 * Individual Drone-to-Zone Allocation entry
 */
export interface ZoneDroneAllocation {
  zoneId: string;
  droneId: string;
  routeId: string;
  missionId?: string;
  allocationReason: string;
  status: 'PROPOSED' | 'COMMITTED' | 'REJECTED';
  rejectionReason?: string;
}

/**
 * Multi-drone patrol allocation plan
 */
export interface PatrolAllocationPlan {
  planId: string;
  timestampMs: number;
  allocations: ZoneDroneAllocation[];
  unassignedZoneIds: string[];
  idleDroneIds: string[];
  ineligibleDroneIds: string[];
  rejectionReasons: Record<string, string>;
}

/**
 * Coverage gap and blind spot classification
 */
export type CoverageGapType =
  | 'UNASSIGNED_ZONE'      // Zone has no assigned drone
  | 'UNOBSERVED_PATROL'    // Drone assigned but no observations confirmed
  | 'STALE_OBSERVATIONS'   // Observations exceeded freshness interval
  | 'DEGRADED_DRONE'       // Assigned drone telemetry degraded or camera faulted
  | 'UNSERVICED_PRIORITY'; // High/Critical priority zone unmonitored

export interface CoverageGap {
  gapId: string;
  zoneId: string;
  zoneName: string;
  priority: CoastalZonePriority;
  gapType: CoverageGapType;
  description: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  observationLagSeconds?: number;
  assignedDroneId?: string;
  recommendedAction: string;
}

/**
 * Structured coverage summary report with explicitly defined denominator
 */
export interface CoverageSummaryReport {
  reportId: string;
  generatedAtMs: number;
  /** Denominator: total number of configured coastal surveillance zones */
  totalConfiguredZones: number;
  /** Numerator: zones with valid fresh observations within required interval */
  coveredZonesCount: number;
  staleZonesCount: number;
  uncoveredZonesCount: number;
  unassignedZonesCount: number;
  degradedZonesCount: number;
  overlappingZonesCount: number;
  activePatrolDronesCount: number;
  /** Explicitly calculated: (coveredZonesCount / totalConfiguredZones) * 100 */
  coveragePercentage: number;
  blindSpots: CoverageGap[];
  zones: CoastalSurveillanceZone[];
}

