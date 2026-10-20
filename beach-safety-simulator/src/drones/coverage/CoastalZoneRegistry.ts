/**
 * CoastalZoneRegistry.ts
 * 
 * TIDES Drone Phase 8: Authoritative Coastal Surveillance Zone Registry
 * 
 * Manages coastal zone configurations, geometric boundaries, surveillance priorities,
 * and observation requirements for the Rushikonda Beach Digital Twin.
 * 
 * Guarantees:
 * - Validates zone geometries and rejects invalid or degenerate boundaries.
 * - Does not modify or overwrite existing hazard zones or hydrodynamic models.
 * - Clearly documents scene-space coordinate boundaries [xMin, xMax, zMin, zMax].
 */

import {
  CoastalSurveillanceZone,
  CoastalZoneBoundary3D,
  CoastalZonePriority,
  CoastalCoverageStatus,
} from './droneCoverage.types';

export class CoastalZoneRegistry {
  private static instance: CoastalZoneRegistry | null = null;
  private zones: Map<string, CoastalSurveillanceZone> = new Map();
  private listeners: Set<() => void> = new Set();

  public static getInstance(): CoastalZoneRegistry {
    if (!CoastalZoneRegistry.instance) {
      CoastalZoneRegistry.instance = new CoastalZoneRegistry();
    }
    return CoastalZoneRegistry.instance;
  }

  constructor() {
    this.initializeDefaultZones();
  }

  public reset(): void {
    this.zones.clear();
    this.initializeDefaultZones();
    this.notifyListeners();
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notifyListeners(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Error in CoastalZoneRegistry listener:', err);
      }
    });
  }

  /**
   * Initializes standard Rushikonda Beach coastal surveillance sectors
   */
  public initializeDefaultZones(): void {
    this.zones.clear();

    // 1. South Cove & Surf Break (Recreational Surfers & Shallow Water Bathers)
    this.registerZone({
      zoneId: 'CZ-01-SOUTH-SURF',
      name: 'South Cove & Surf Break',
      description: 'South coastal reef approach and recreational surf break corridor',
      boundary3D: { xMin: -120, xMax: -30, zMin: -75, zMax: 10 },
      priority: 'MEDIUM',
      requiredObservationIntervalMs: 30000, // 30s
      requiredCapabilities: { requiresOpticalZoom: false },
      compatibleRouteId: 'ROUTE-COASTAL-CRESCENT',
      assignedDroneIds: [],
      coverageStatus: 'UNASSIGNED',
      totalValidObservationsCount: 0,
      provenance: 'SIMULATED_SCENE_SPACE',
    });

    // 2. Central Rip Current Hazard Channel (High-Risk Seaward Feeder Corridor)
    this.registerZone({
      zoneId: 'CZ-02-CENTRAL-RIP',
      name: 'Central Rip Current Hazard Channel',
      description: 'Persistent seaward hydrodynamic rip channel entraining distressed bathers',
      boundary3D: { xMin: -30, xMax: 45, zMin: -80, zMax: 15 },
      priority: 'CRITICAL',
      requiredObservationIntervalMs: 20000, // 20s
      requiredCapabilities: { requiresOpticalZoom: true },
      compatibleRouteId: 'ROUTE-OFFSHORE-RIP-WATCH',
      assignedDroneIds: [],
      coverageStatus: 'UNASSIGNED',
      totalValidObservationsCount: 0,
      provenance: 'SIMULATED_SCENE_SPACE',
    });

    // 3. North High-Density Bathing Zone (Family Bathing & Tourist Swimmers)
    this.registerZone({
      zoneId: 'CZ-03-NORTH-BATHING',
      name: 'North High-Density Bathing Zone',
      description: 'Designated safe swimming sector with highest visitor crowd density',
      boundary3D: { xMin: 45, xMax: 140, zMin: -60, zMax: 20 },
      priority: 'HIGH',
      requiredObservationIntervalMs: 25000, // 25s
      requiredCapabilities: { requiresOpticalZoom: false },
      compatibleRouteId: 'ROUTE-COASTAL-CRESCENT',
      assignedDroneIds: [],
      coverageStatus: 'UNASSIGNED',
      totalValidObservationsCount: 0,
      provenance: 'SIMULATED_SCENE_SPACE',
    });

    // 4. Offshore Seaward Drift Corridor (Deep Water Advection Corridor)
    this.registerZone({
      zoneId: 'CZ-04-OFFSHORE-DEEP',
      name: 'Offshore Seaward Drift Corridor',
      description: 'Deep offshore coastal waters beyond the primary breaker bar',
      boundary3D: { xMin: -80, xMax: 100, zMin: -130, zMax: -75 },
      priority: 'HIGH',
      requiredObservationIntervalMs: 35000, // 35s
      requiredCapabilities: { requiresOpticalZoom: true },
      compatibleRouteId: 'ROUTE-OFFSHORE-RIP-WATCH',
      assignedDroneIds: [],
      coverageStatus: 'UNASSIGNED',
      totalValidObservationsCount: 0,
      provenance: 'SIMULATED_SCENE_SPACE',
    });
  }

  /**
   * Validates geometric boundary parameters
   */
  public validateBoundary(b: CoastalZoneBoundary3D): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!b || typeof b !== 'object') {
      return { valid: false, errors: ['Boundary is null or undefined.'] };
    }
    if (isNaN(b.xMin) || isNaN(b.xMax) || isNaN(b.zMin) || isNaN(b.zMax)) {
      errors.push('Boundary contains NaN values.');
    }
    if (b.xMin >= b.xMax) {
      errors.push(`xMin (${b.xMin}) must be strictly less than xMax (${b.xMax}).`);
    }
    if (b.zMin >= b.zMax) {
      errors.push(`zMin (${b.zMin}) must be strictly less than zMax (${b.zMax}).`);
    }
    // Operational bounding box constraints for Rushikonda
    if (b.xMin < -250 || b.xMax > 250 || b.zMin < -200 || b.zMax > 150) {
      errors.push('Boundary exceeds Rushikonda digital twin coastal coordinate bounds.');
    }
    return { valid: errors.length === 0, errors };
  }

  /**
   * Registers or updates a surveillance zone with geometric validation
   */
  public registerZone(zone: CoastalSurveillanceZone): boolean {
    const validation = this.validateBoundary(zone.boundary3D);
    if (!validation.valid) {
      console.warn(`Cannot register zone ${zone.zoneId}: ${validation.errors.join(', ')}`);
      return false;
    }

    this.zones.set(zone.zoneId, { ...zone });
    this.notifyListeners();
    return true;
  }

  public getZone(zoneId: string): CoastalSurveillanceZone | undefined {
    return this.zones.get(zoneId);
  }

  public getAllZones(): CoastalSurveillanceZone[] {
    return Array.from(this.zones.values());
  }

  public getZonesByPriority(priority: CoastalZonePriority): CoastalSurveillanceZone[] {
    return Array.from(this.zones.values()).filter((z) => z.priority === priority);
  }

  /**
   * Checks if a 3D coordinate falls inside a zone's boundary
   */
  public coordinateIntersectsZone(coord: { x: number; z: number }, zoneId: string): boolean {
    const zone = this.zones.get(zoneId);
    if (!zone) return false;
    const b = zone.boundary3D;
    return coord.x >= b.xMin && coord.x <= b.xMax && coord.z >= b.zMin && coord.z <= b.zMax;
  }

  /**
   * Finds all zones intersected by a given ground coordinate
   */
  public findIntersectingZones(coord: { x: number; z: number }): CoastalSurveillanceZone[] {
    return Array.from(this.zones.values()).filter((zone) => {
      const b = zone.boundary3D;
      return coord.x >= b.xMin && coord.x <= b.xMax && coord.z >= b.zMin && coord.z <= b.zMax;
    });
  }

  /**
   * Updates zone status and metadata
   */
  public updateZoneStatus(
    zoneId: string,
    coverageStatus: CoastalCoverageStatus,
    observationMeta?: { timestampMs: number; coords: { x: number; y: number; z: number }; cameraId: string }
  ): boolean {
    const zone = this.zones.get(zoneId);
    if (!zone) return false;

    zone.coverageStatus = coverageStatus;
    if (observationMeta) {
      zone.lastValidObservationTimestampMs = observationMeta.timestampMs;
      zone.lastObservationCoordinates = { ...observationMeta.coords };
      zone.lastObservationCameraId = observationMeta.cameraId;
      zone.totalValidObservationsCount++;
    }

    this.notifyListeners();
    return true;
  }

  /**
   * Sets drone assignments for a zone
   */
  public setZoneDroneAssignment(zoneId: string, droneIds: string[], missionId?: string): boolean {
    const zone = this.zones.get(zoneId);
    if (!zone) return false;

    zone.assignedDroneIds = [...droneIds];
    zone.activeMissionId = missionId;
    if (droneIds.length === 0) {
      zone.coverageStatus = 'UNASSIGNED';
    } else if (zone.coverageStatus === 'UNASSIGNED') {
      zone.coverageStatus = 'UNCOVERED';
    }

    this.notifyListeners();
    return true;
  }

  /**
   * Helper to assign a single drone to a zone
   */
  public assignDroneToZone(zoneId: string, droneId: string, missionId?: string): boolean {
    const zone = this.zones.get(zoneId);
    if (!zone) return false;
    const current = new Set(zone.assignedDroneIds);
    current.add(droneId);
    return this.setZoneDroneAssignment(zoneId, Array.from(current), missionId);
  }
}
