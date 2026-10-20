/**
 * src/regional/BeachRegistry.ts
 * 
 * TIDES — Phase 8: Multi-Beach Deployment & Coastal Network Coordination
 * 
 * Multi-beach registry managing Andhra Pradesh coastal monitoring locations.
 * Separates site configuration from local simulation mechanics.
 * 
 * Guarantees:
 * 1. Backward-compatible default active site is RUSHIKONDA (Anchor Digital Twin).
 * 2. Strict validation for site registration, update, and deactivation.
 * 3. Explicit tracking of geographic boundaries, sensor configurations, and operational status.
 * 4. Boundary uncertainty detection to avoid silent spatial misattribution.
 */

import {
  RegionalBeachRecord,
  RegionalSummaryKPIs,
  SiteBoundary,
  SiteConfiguration,
} from './types';

export class BeachRegistry {
  private static instance: BeachRegistry | null = null;
  private beaches: Map<string, RegionalBeachRecord> = new Map();
  private activeSiteId: string = 'RUSHIKONDA'; // Default anchor site

  constructor() {
    this.initializeRegistry();
  }

  public static getInstance(): BeachRegistry {
    if (!BeachRegistry.instance) {
      BeachRegistry.instance = new BeachRegistry();
    }
    return BeachRegistry.instance;
  }

  public getActiveSiteId(): string {
    return this.activeSiteId;
  }

  public setActiveSiteId(siteId: string): { success: boolean; error?: string } {
    const normalized = siteId.toUpperCase();
    if (!this.beaches.has(normalized)) {
      return { success: false, error: `Site '${siteId}' not found in regional registry.` };
    }
    this.activeSiteId = normalized;
    return { success: true };
  }

  public initializeRegistry(): void {
    this.beaches.clear();
    const now = Date.now();

    // 1. Anchor Connected Digital Twin Site: Rushikonda Blue Flag Beach
    this.beaches.set('RUSHIKONDA', {
      beachId: 'RUSHIKONDA',
      name: 'Rushikonda Blue Flag Beach, Visakhapatnam',
      district: 'Visakhapatnam',
      coastSector: 'North AP Coastal Sector',
      location: { latitude: 17.7815, longitude: 83.3855 },
      boundary: { minLat: 17.770, maxLat: 17.795, minLng: 83.375, maxLng: 83.395 },
      configuration: {
        shorelineLengthMeters: 1000,
        safeSwimWidthMeters: 300,
        cameraIds: ['CAM-TWR-01', 'CAM-CCTV-02', 'CAM-GIMBAL-01'],
        droneIds: ['DRONE-01', 'DRONE-02', 'DRONE-03', 'DRONE-04'],
        gatewayIds: ['GW-RUSHIKONDA-01'],
        wristbandPrefix: 'WB-RK-',
        maxOffshoreDistanceMeters: 400,
        timeZone: 'Asia/Kolkata',
      },
      status: 'ACTIVE',
      provenance: 'SIMULATED',
      dataFreshness: 'FRESH',
      lastUpdated: now,
      connected: true,
      hasActiveSimulator: true,
      activeIncidentsCount: 0,
      activeHazardsCount: 1,
      availableResourcesCount: 4,
      totalResourcesCount: 4,
      sensorHealthPct: 98.5,
      notes: 'Primary connected digital twin pilot site with 3D environment, multi-sensor telemetry & automated rescue.',
    });

    // 2. Demonstration Site: Ramakrishna (RK) Beach
    this.beaches.set('RK_BEACH', {
      beachId: 'RK_BEACH',
      name: 'Ramakrishna (RK) Beach, Visakhapatnam',
      district: 'Visakhapatnam',
      coastSector: 'North AP Coastal Sector',
      location: { latitude: 17.7125, longitude: 83.3180 },
      boundary: { minLat: 17.700, maxLat: 17.725, minLng: 83.305, maxLng: 83.330 },
      configuration: {
        shorelineLengthMeters: 2500,
        safeSwimWidthMeters: 150,
        cameraIds: ['CAM-RK-01', 'CAM-RK-02'],
        droneIds: ['DRONE-RK-01'],
        gatewayIds: ['GW-RK-01'],
        wristbandPrefix: 'WB-RKB-',
        maxOffshoreDistanceMeters: 200,
        timeZone: 'Asia/Kolkata',
      },
      status: 'CAUTION',
      provenance: 'DEMONSTRATION',
      dataFreshness: 'STALE',
      lastUpdated: now - 3600 * 1000,
      connected: false,
      hasActiveSimulator: false,
      activeIncidentsCount: 1,
      activeHazardsCount: 2,
      availableResourcesCount: 3,
      totalResourcesCount: 5,
      sensorHealthPct: 88.0,
      notes: 'High bather density urban beach sector with strong longshore currents.',
    });

    // 3. Demonstration Site: Bheemili Beach
    this.beaches.set('BHEEMILI', {
      beachId: 'BHEEMILI',
      name: 'Bheemunipatnam (Bheemili) Beach',
      district: 'Visakhapatnam',
      coastSector: 'North AP Coastal Sector',
      location: { latitude: 17.8912, longitude: 83.4542 },
      boundary: { minLat: 17.880, maxLat: 17.905, minLng: 83.440, maxLng: 83.465 },
      configuration: {
        shorelineLengthMeters: 1800,
        safeSwimWidthMeters: 200,
        cameraIds: ['CAM-BHM-01'],
        droneIds: ['DRONE-BHM-01'],
        gatewayIds: ['GW-BHM-01'],
        wristbandPrefix: 'WB-BHM-',
        maxOffshoreDistanceMeters: 300,
        timeZone: 'Asia/Kolkata',
      },
      status: 'RESTRICTED',
      provenance: 'DEMONSTRATION',
      dataFreshness: 'FRESH',
      lastUpdated: now - 120 * 1000,
      connected: false,
      hasActiveSimulator: false,
      activeIncidentsCount: 2,
      activeHazardsCount: 3,
      availableResourcesCount: 1,
      totalResourcesCount: 3,
      sensorHealthPct: 76.0,
      notes: 'River mouth confluence and rocky breakwater sector; rough swell warning.',
    });

    // 4. Demonstration Site: Manginapudi Beach
    this.beaches.set('MANGINAPUDI', {
      beachId: 'MANGINAPUDI',
      name: 'Manginapudi Beach, Machilipatnam',
      district: 'Krishna',
      coastSector: 'Central AP Coastal Sector',
      location: { latitude: 16.2427, longitude: 81.2589 },
      boundary: { minLat: 16.230, maxLat: 16.255, minLng: 81.245, maxLng: 81.270 },
      configuration: {
        shorelineLengthMeters: 1200,
        safeSwimWidthMeters: 250,
        cameraIds: [],
        droneIds: [],
        gatewayIds: ['GW-MNG-01'],
        wristbandPrefix: 'WB-MNG-',
        maxOffshoreDistanceMeters: 250,
        timeZone: 'Asia/Kolkata',
      },
      status: 'OFFLINE',
      provenance: 'DEMONSTRATION',
      dataFreshness: 'OFFLINE',
      lastUpdated: now - 172800 * 1000, // 48h ago
      connected: false,
      hasActiveSimulator: false,
      activeIncidentsCount: 0,
      activeHazardsCount: 0,
      availableResourcesCount: 0,
      totalResourcesCount: 2,
      sensorHealthPct: null,
      notes: 'Remote black-soil beach station; telemetry link offline since 48h.',
    });

    // 5. Demonstration Site: Suryalanka Beach
    this.beaches.set('SURYALANKA', {
      beachId: 'SURYALANKA',
      name: 'Suryalanka Beach, Bapatla',
      district: 'Bapatla',
      coastSector: 'South-Central AP Coastal Sector',
      location: { latitude: 15.8458, longitude: 80.5217 },
      boundary: { minLat: 15.830, maxLat: 15.860, minLng: 80.510, maxLng: 80.535 },
      configuration: {
        shorelineLengthMeters: 3000,
        safeSwimWidthMeters: 400,
        cameraIds: ['CAM-SL-01'],
        droneIds: [],
        gatewayIds: ['GW-SL-01'],
        wristbandPrefix: 'WB-SL-',
        maxOffshoreDistanceMeters: 500,
        timeZone: 'Asia/Kolkata',
      },
      status: 'ACTIVE',
      provenance: 'DEMONSTRATION',
      dataFreshness: 'FRESH',
      lastUpdated: now - 300 * 1000,
      connected: false,
      hasActiveSimulator: false,
      activeIncidentsCount: 0,
      activeHazardsCount: 0,
      availableResourcesCount: 2,
      totalResourcesCount: 2,
      sensorHealthPct: 92.0,
      notes: 'Gradual slope tourist beach; standard weekend bather surveillance.',
    });

    // 6. Demonstration Site: Vodarevu Beach
    this.beaches.set('VODAREVU', {
      beachId: 'VODAREVU',
      name: 'Vodarevu Beach, Chirala',
      district: 'Bapatla',
      coastSector: 'South-Central AP Coastal Sector',
      location: { latitude: 15.7972, longitude: 80.3806 },
      boundary: { minLat: 15.785, maxLat: 15.810, minLng: 80.370, maxLng: 80.395 },
      configuration: {
        shorelineLengthMeters: 1800,
        safeSwimWidthMeters: 120,
        cameraIds: [],
        droneIds: [],
        gatewayIds: [],
        wristbandPrefix: 'WB-VOD-',
        maxOffshoreDistanceMeters: 200,
        timeZone: 'Asia/Kolkata',
      },
      status: 'UNKNOWN',
      provenance: 'DEMONSTRATION',
      dataFreshness: 'NO_DATA',
      lastUpdated: 0,
      connected: false,
      hasActiveSimulator: false,
      activeIncidentsCount: 0,
      activeHazardsCount: 0,
      availableResourcesCount: 0,
      totalResourcesCount: 0,
      sensorHealthPct: null,
      notes: 'Fishing port & coastal fringe; uninstrumented demonstration site.',
    });

    // 7. Demonstration Site: Mypadu Beach
    this.beaches.set('MYPADU', {
      beachId: 'MYPADU',
      name: 'Mypadu Beach, Nellore',
      district: 'SPSR Nellore',
      coastSector: 'South AP Coastal Sector',
      location: { latitude: 14.5083, longitude: 80.1792 },
      boundary: { minLat: 14.495, maxLat: 14.520, minLng: 80.165, maxLng: 80.190 },
      configuration: {
        shorelineLengthMeters: 2200,
        safeSwimWidthMeters: 150,
        cameraIds: [],
        droneIds: [],
        gatewayIds: [],
        wristbandPrefix: 'WB-MYP-',
        maxOffshoreDistanceMeters: 250,
        timeZone: 'Asia/Kolkata',
      },
      status: 'UNKNOWN',
      provenance: 'DEMONSTRATION',
      dataFreshness: 'NO_DATA',
      lastUpdated: 0,
      connected: false,
      hasActiveSimulator: false,
      activeIncidentsCount: 0,
      activeHazardsCount: 0,
      availableResourcesCount: 0,
      totalResourcesCount: 0,
      sensorHealthPct: null,
      notes: 'Southern littoral zone; no continuous sensor deployment.',
    });

    // 8. Demonstration Site: Kalingapatnam Beach
    this.beaches.set('KALINGAPATNAM', {
      beachId: 'KALINGAPATNAM',
      name: 'Kalingapatnam Beach, Srikakulam',
      district: 'Srikakulam',
      coastSector: 'North-East AP Coastal Sector',
      location: { latitude: 18.3375, longitude: 84.1278 },
      boundary: { minLat: 18.325, maxLat: 18.350, minLng: 84.115, maxLng: 84.140 },
      configuration: {
        shorelineLengthMeters: 1500,
        safeSwimWidthMeters: 100,
        cameraIds: [],
        droneIds: [],
        gatewayIds: [],
        wristbandPrefix: 'WB-KAL-',
        maxOffshoreDistanceMeters: 200,
        timeZone: 'Asia/Kolkata',
      },
      status: 'UNKNOWN',
      provenance: 'DEMONSTRATION',
      dataFreshness: 'NO_DATA',
      lastUpdated: 0,
      connected: false,
      hasActiveSimulator: false,
      activeIncidentsCount: 0,
      activeHazardsCount: 0,
      availableResourcesCount: 0,
      totalResourcesCount: 0,
      sensorHealthPct: null,
      notes: 'Historic lighthouse sector; northernmost AP coastal sentinel post.',
    });
  }

  /**
   * Site Registration Workflow: Validates and registers a new coastal site
   */
  public registerSite(site: RegionalBeachRecord): { success: boolean; error?: string } {
    if (!site.beachId || site.beachId.trim().length < 3) {
      return { success: false, error: 'Site ID must be at least 3 characters.' };
    }
    const normalized = site.beachId.toUpperCase();
    if (this.beaches.has(normalized)) {
      return { success: false, error: `Site ID '${normalized}' is already registered.` };
    }
    if (!site.name || site.name.trim().length < 3) {
      return { success: false, error: 'Site name must be at least 3 characters.' };
    }
    if (!site.district || site.district.trim().length < 2) {
      return { success: false, error: 'Valid AP district is required.' };
    }

    this.beaches.set(normalized, {
      ...site,
      beachId: normalized,
      lastUpdated: site.lastUpdated || Date.now(),
    });

    return { success: true };
  }

  /**
   * Site Update Workflow: Modifies an existing site's configuration or status
   */
  public updateSite(beachId: string, partial: Partial<RegionalBeachRecord>): { success: boolean; error?: string } {
    const normalized = beachId.toUpperCase();
    const existing = this.beaches.get(normalized);
    if (!existing) {
      return { success: false, error: `Site '${beachId}' not found in registry.` };
    }

    this.beaches.set(normalized, {
      ...existing,
      ...partial,
      beachId: normalized, // Preserve immutable ID
      lastUpdated: Date.now(),
    });

    return { success: true };
  }

  /**
   * Site Deactivation Workflow: Sets status to OFFLINE or INACTIVE
   */
  public deactivateSite(beachId: string): { success: boolean; error?: string } {
    const normalized = beachId.toUpperCase();
    const existing = this.beaches.get(normalized);
    if (!existing) {
      return { success: false, error: `Site '${beachId}' not found in registry.` };
    }

    existing.status = 'OFFLINE';
    existing.connected = false;
    existing.dataFreshness = 'OFFLINE';
    existing.lastUpdated = Date.now();

    return { success: true };
  }

  /**
   * Checks if geodetic coordinates fall within a site's boundary
   * Enforces spatial uncertainty detection near perimeter.
   */
  public isCoordinateWithinSite(
    lat: number,
    lng: number,
    siteId: string
  ): { inside: boolean; ambiguous: boolean } {
    const site = this.beaches.get(siteId.toUpperCase());
    if (!site || !site.boundary) {
      return { inside: false, ambiguous: false };
    }

    const b = site.boundary;
    const isInside = lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;

    // Check 0.005 deg (~500m) buffer near boundary for ambiguity
    const latEdgeDist = Math.min(Math.abs(lat - b.minLat), Math.abs(lat - b.maxLat));
    const lngEdgeDist = Math.min(Math.abs(lng - b.minLng), Math.abs(lng - b.maxLng));
    const isNearEdge = latEdgeDist < 0.005 || lngEdgeDist < 0.005;

    return {
      inside: isInside,
      ambiguous: isInside && isNearEdge,
    };
  }

  public syncRushikondaState(
    activeIncidentCount: number,
    availableResources: number,
    totalResources: number,
    isEvacuating: boolean = false
  ): void {
    const record = this.beaches.get('RUSHIKONDA');
    if (!record) return;

    record.lastUpdated = Date.now();
    record.dataFreshness = 'FRESH';
    record.connected = true;
    record.hasActiveSimulator = true;
    record.activeIncidentsCount = activeIncidentCount;
    record.availableResourcesCount = availableResources;
    record.totalResourcesCount = totalResources;

    if (isEvacuating) {
      record.status = 'EVACUATION';
    } else if (activeIncidentCount >= 2) {
      record.status = 'RESTRICTED';
    } else if (activeIncidentCount === 1) {
      record.status = 'CAUTION';
    } else {
      record.status = 'ACTIVE';
    }
  }

  public getBeaches(filters?: {
    status?: string;
    district?: string;
    provenance?: string;
    search?: string;
  }): RegionalBeachRecord[] {
    let results = Array.from(this.beaches.values());

    if (!filters) return results;

    if (filters.status && filters.status !== 'ALL') {
      results = results.filter((b) => b.status === filters.status);
    }
    if (filters.district && filters.district !== 'ALL') {
      results = results.filter((b) => b.district.toLowerCase() === filters.district!.toLowerCase());
    }
    if (filters.provenance && filters.provenance !== 'ALL') {
      results = results.filter((b) => b.provenance === filters.provenance);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (b) => b.name.toLowerCase().includes(q) || b.beachId.toLowerCase().includes(q) || b.district.toLowerCase().includes(q)
      );
    }

    return results;
  }

  public getBeach(beachId: string): RegionalBeachRecord | undefined {
    return this.beaches.get(beachId.toUpperCase());
  }

  public getSummaryKPIs(): RegionalSummaryKPIs {
    const all = Array.from(this.beaches.values());
    const now = Date.now();

    let freshCount = 0;
    let staleOrMissing = 0;
    let offlineCount = 0;
    let activeIncidents = 0;
    let totalFleet = 0;
    let availableFleet = 0;
    let assignedFleet = 0;

    for (const b of all) {
      if (b.status === 'OFFLINE' || b.dataFreshness === 'OFFLINE') {
        offlineCount++;
        staleOrMissing++;
      } else if (b.dataFreshness === 'NO_DATA') {
        staleOrMissing++;
      } else if (b.dataFreshness === 'STALE' || now - b.lastUpdated > 1800 * 1000) {
        staleOrMissing++;
      } else {
        freshCount++;
      }

      activeIncidents += b.activeIncidentsCount;
      totalFleet += b.totalResourcesCount;
      availableFleet += b.availableResourcesCount;
      assignedFleet += Math.max(0, b.totalResourcesCount - b.availableResourcesCount);
    }

    return {
      totalConfiguredSites: all.length,
      freshDataSitesCount: freshCount,
      staleOrMissingSitesCount: staleOrMissing,
      offlineSitesCount: offlineCount,
      activeIncidentsCount: activeIncidents,
      totalFleetResources: totalFleet,
      availableFleetResources: availableFleet,
      assignedFleetResources: assignedFleet,
      timestamp: now,
    };
  }
}
