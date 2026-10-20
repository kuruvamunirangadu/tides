/**
 * src/regional/RegionalSiteScopingService.ts
 * 
 * TIDES — Phase 8: Multi-Beach Deployment & Coastal Network Coordination
 * 
 * Scoping service ensuring incidents, devices, cameras, drones, and rescue resources
 * remain strictly scoped to their respective coastal sites across Andhra Pradesh.
 * 
 * Guarantees:
 * 1. Default anchor site 'RUSHIKONDA' for all legacy/unscoped entities (backward compatibility).
 * 2. Strict multi-site isolation: incidents at Site A are NEVER merged with Site B incidents.
 * 3. Boundary validation: detects clean site matches, boundary ambiguity (500m buffer),
 *    and coordinates outside all registered AP coastal zones.
 * 4. Zero coordinate fabrication: unmeasured or out-of-boundary entities are never fabricated.
 */

import { BeachRegistry } from './BeachRegistry';
import { SiteBoundary } from './types';

export interface CoordinateScopingResult {
  matchedSiteId?: string;
  matchedSiteName?: string;
  isAmbiguous: boolean;
  candidateSiteIds: string[];
  isOutsideAllKnownSites: boolean;
  distanceToNearestKm?: number;
  nearestSiteId?: string;
}

export class RegionalSiteScopingService {
  private static instance: RegionalSiteScopingService | null = null;
  private defaultSiteId: string = 'RUSHIKONDA';
  private beachRegistry: BeachRegistry;

  constructor(beachRegistry?: BeachRegistry) {
    this.beachRegistry = beachRegistry || BeachRegistry.getInstance();
  }

  public static getInstance(): RegionalSiteScopingService {
    if (!RegionalSiteScopingService.instance) {
      RegionalSiteScopingService.instance = new RegionalSiteScopingService();
    }
    return RegionalSiteScopingService.instance;
  }

  /**
   * Retrieves the current default fallback site ID (RUSHIKONDA).
   */
  public getDefaultSiteId(): string {
    return this.defaultSiteId;
  }

  /**
   * Scopes an entity to a site. If no siteId is provided or is invalid,
   * falls back to the default anchor site (RUSHIKONDA).
   */
  public scopeEntity<T extends object>(entity: T & { siteId?: string }, fallbackSiteId?: string): T & { siteId: string } {
    const site = (entity.siteId && entity.siteId.trim().length > 0)
      ? entity.siteId.toUpperCase()
      : (fallbackSiteId ? fallbackSiteId.toUpperCase() : this.defaultSiteId);

    return {
      ...entity,
      siteId: site,
    };
  }

  /**
   * Filters a list of scoped entities by site ID.
   * If targetSiteId is 'ALL', returns all entities.
   */
  public filterEntitiesBySite<T extends { siteId?: string }>(entities: T[], targetSiteId: string): T[] {
    if (!targetSiteId || targetSiteId.toUpperCase() === 'ALL') {
      return [...entities];
    }
    const normalizedTarget = targetSiteId.toUpperCase();
    return entities.filter((e) => {
      const entitySite = (e.siteId ? e.siteId.toUpperCase() : this.defaultSiteId);
      return entitySite === normalizedTarget;
    });
  }

  /**
   * Validates geographic coordinates against registered AP coastal beach boundaries.
   * Checks for clean boundary enclosure, edge ambiguity (500m / ~0.0045 deg buffer),
   * or coordinates completely outside all registered sites.
   */
  public validateCoordinateSite(latitude: number, longitude: number): CoordinateScopingResult {
    const beaches = this.beachRegistry.getBeaches();
    const candidateSiteIds: string[] = [];
    const directMatches: string[] = [];

    let nearestSiteId: string | undefined;
    let minDistanceKm = Infinity;

    for (const beach of beaches) {
      if (beach.location) {
        const d = this.calculateHaversineDistance(
          latitude,
          longitude,
          beach.location.latitude,
          beach.location.longitude
        );
        if (d < minDistanceKm) {
          minDistanceKm = d;
          nearestSiteId = beach.beachId;
        }
      }

      if (beach.boundary) {
        const check = this.beachRegistry.isCoordinateWithinSite(latitude, longitude, beach.beachId);
        if (check.inside) {
          if (check.ambiguous) {
            candidateSiteIds.push(beach.beachId);
          } else {
            directMatches.push(beach.beachId);
          }
        }
      }
    }

    // Case 1: Multiple sites matched or ambiguity detected near border
    if (candidateSiteIds.length > 0 || directMatches.length > 1) {
      const allCandidates = Array.from(new Set([...directMatches, ...candidateSiteIds]));
      return {
        matchedSiteId: undefined,
        isAmbiguous: true,
        candidateSiteIds: allCandidates,
        isOutsideAllKnownSites: false,
        distanceToNearestKm: minDistanceKm < Infinity ? Number(minDistanceKm.toFixed(2)) : undefined,
        nearestSiteId,
      };
    }

    // Case 2: Clean single match
    if (directMatches.length === 1) {
      const matched = directMatches[0];
      const beach = this.beachRegistry.getBeach(matched);
      return {
        matchedSiteId: matched,
        matchedSiteName: beach?.name,
        isAmbiguous: false,
        candidateSiteIds: [matched],
        isOutsideAllKnownSites: false,
        distanceToNearestKm: minDistanceKm < Infinity ? Number(minDistanceKm.toFixed(2)) : undefined,
        nearestSiteId: matched,
      };
    }

    // Case 3: Outside all known sites
    return {
      matchedSiteId: undefined,
      isAmbiguous: false,
      candidateSiteIds: [],
      isOutsideAllKnownSites: true,
      distanceToNearestKm: minDistanceKm < Infinity ? Number(minDistanceKm.toFixed(2)) : undefined,
      nearestSiteId,
    };
  }

  /**
   * Asserts whether two incidents can be merged.
   * Under TIDES Phase 8 rules, incidents from different sites can NEVER be merged.
   * Returns true if isolated (different sites or distinctly separated),
   * throws or returns false if illegal cross-site merge is attempted.
   */
  public verifyCrossSiteIsolation(incidentA: { siteId?: string; id: string }, incidentB: { siteId?: string; id: string }): {
    canMerge: boolean;
    isolated: boolean;
    reason: string;
  } {
    const siteA = incidentA.siteId ? incidentA.siteId.toUpperCase() : this.defaultSiteId;
    const siteB = incidentB.siteId ? incidentB.siteId.toUpperCase() : this.defaultSiteId;

    if (siteA !== siteB) {
      return {
        canMerge: false,
        isolated: true,
        reason: `Cross-site isolation violated: Incident ${incidentA.id} belongs to ${siteA} while ${incidentB.id} belongs to ${siteB}. Automatic merging across sites is strictly prohibited.`,
      };
    }

    return {
      canMerge: true,
      isolated: false,
      reason: `Both incidents belong to the same local site (${siteA}). Local triage rules apply.`,
    };
  }

  /**
   * Haversine formula to compute great-circle distance in kilometers.
   */
  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
