/**
 * src/regional/types.ts
 * TypeScript contracts and types for TIDES Milestone 10:
 * Multi-Beach Command Center & Regional Coastal Monitoring.
 */

export type BeachProvenance = 'LIVE' | 'SIMULATED' | 'DEMONSTRATION';

export type BeachOperationalStatus =
  | 'ACTIVE'
  | 'CAUTION'
  | 'RESTRICTED'
  | 'EVACUATION'
  | 'OFFLINE'
  | 'UNKNOWN';

export type DataFreshness = 'FRESH' | 'STALE' | 'NO_DATA' | 'OFFLINE';

export interface GeographicCoordinate {
  latitude: number;
  longitude: number;
}

export interface SiteBoundary {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface SiteConfiguration {
  shorelineLengthMeters: number;
  safeSwimWidthMeters: number;
  cameraIds: string[];
  droneIds: string[];
  gatewayIds: string[];
  wristbandPrefix: string;
  maxOffshoreDistanceMeters: number;
  timeZone: string;
}

export interface RegionalBeachRecord {
  beachId: string;
  name: string;
  district: string;
  coastSector: string;
  location?: GeographicCoordinate;
  boundary?: SiteBoundary;
  configuration?: SiteConfiguration;
  status: BeachOperationalStatus;
  provenance: BeachProvenance;
  dataFreshness: DataFreshness;
  lastUpdated: number;
  connected: boolean;
  hasActiveSimulator: boolean;
  activeIncidentsCount: number;
  activeHazardsCount: number;
  availableResourcesCount: number;
  totalResourcesCount: number;
  sensorHealthPct?: number | null;
  notes?: string;
}

export interface RegionalRiskObservation {
  beachId: string;
  beachName: string;
  waveHeightM?: number | null;
  wavePeriodS?: number | null;
  ripCurrentRisk?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'UNKNOWN' | null;
  ripVelocityMps?: number | null;
  windSpeedMps?: number | null;
  windDirectionDeg?: number | null;
  visibilityKm?: number | null;
  tideLevelM?: number | null;
  sensorFreshness: DataFreshness;
  sensorAvailabilityPct?: number | null;
  forecastSummary?: string | null;
  activeIncidentCount: number;
  dataSource: string;
  timestamp: number;
  provenance: BeachProvenance;
}

export interface RegionalIncidentRecord {
  incidentId: string;
  siteId: string;
  siteName: string;
  createdAt: number;
  updatedAt: number;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  distressLevel: number; // 0.0 to 1.0
  status: 'REPORTED' | 'DISPATCHED' | 'ON_SCENE' | 'RESOLVED';
  acknowledgementStatus: 'ACKNOWLEDGED' | 'PENDING' | 'ESCALATED';
  assignedResourceId?: string | null;
  assignedResourceName?: string | null;
  description: string;
  provenance: BeachProvenance;
}

export interface RegionalResourceRecord {
  resourceId: string;
  resourceName: string;
  resourceType: 'RESCUE_BOAT' | 'LIFEGUARD' | 'DRONE';
  homeBeachId: string;
  assignedBeachId: string;
  operationalStatus: 'AVAILABLE' | 'DISPATCHED' | 'ON_SCENE' | 'MAINTENANCE' | 'OFFLINE';
  activeIncidentId?: string | null;
  lastUpdated: number;
  provenance: BeachProvenance;
  speedMps: number;
  isCrossBeachEligible: boolean;
  advisoryTransitNote?: string | null;
}

export interface RegionalSummaryKPIs {
  totalConfiguredSites: number;
  freshDataSitesCount: number;
  staleOrMissingSitesCount: number;
  offlineSitesCount: number;
  activeIncidentsCount: number;
  totalFleetResources: number;
  availableFleetResources: number;
  assignedFleetResources: number;
  timestamp: number;
}

export interface AdvisoryTransferEvaluation {
  allowed: boolean;
  reason?: string;
  resourceId?: string;
  homeBeachId?: string;
  targetBeachId?: string;
  transitFeasible?: boolean;
  distanceKm?: number;
  estimatedTransitTimeMinutes?: number;
  notice?: string;
  advisory?: string;
}

// ============================================================================
// Phase 8: Cross-Site Coordination & Assistance Contracts
// ============================================================================

export type AssistanceRequestStatus =
  | 'REQUESTED'
  | 'ACKNOWLEDGED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'COMPLETED'
  | 'CANCELLED';

export type AssistanceResourceType =
  | 'RESCUE_BOAT'
  | 'SURVEILLANCE_DRONE'
  | 'PARAMEDIC_TEAM'
  | 'LIFEGUARD';

export type AssistanceUrgency = 'URGENT' | 'HIGH' | 'ROUTINE';

export interface AssistanceAuditEntry {
  timestamp: number;
  operatorId: string;
  status: AssistanceRequestStatus;
  notes: string;
}

export interface CrossSiteAssistanceRequest {
  requestId: string;
  requestingSiteId: string;
  requestingSiteName: string;
  receivingSiteId: string;
  receivingSiteName: string;
  incidentId: string;
  resourceType: AssistanceResourceType;
  urgency: AssistanceUrgency;
  rationale: string;
  status: AssistanceRequestStatus;
  requestedAt: number;
  respondedAt?: number;
  respondingOperatorId?: string;
  responseNotes?: string;
  auditTrail: AssistanceAuditEntry[];
  isRealDispatched: false; // Strict: Assistance request records coordination, never auto-dispatches
}

// ============================================================================
// Phase 8: Role-Based Access Control (RBAC) Contracts
// ============================================================================

export type UserRole = 'LOCAL_OPERATOR' | 'REGIONAL_OPERATOR' | 'ADMINISTRATOR';

export interface UserSecurityContext {
  userId: string;
  name: string;
  role: UserRole;
  assignedSiteId?: string;
  permittedSiteIds: string[];
}

// ============================================================================
// Phase 8: Site Connectivity & Offline Synchronization Contracts
// ============================================================================

export interface SiteSyncState {
  siteId: string;
  siteName: string;
  lastHeartbeatMs: number;
  latencyMs: number;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  pendingSyncEventsCount: number;
  duplicateEventsFilteredCount: number;
  lastSyncTimestamp: number;
}

// ============================================================================
// Phase 8: Regional Analytics & Comparative Reporting Contracts
// ============================================================================

export interface SiteAnalyticsSummary {
  siteId: string;
  siteName: string;
  incidentCount: number;
  resolvedCount: number;
  warningDeliveryRatePct: number;
  averageResponseTimeSec: number;
  dataCoveragePct: number;
  reportingExposureNotes: string;
}

export interface RegionalAnalyticsReport {
  reportId: string;
  generatedAt: number;
  reportingPeriod: string;
  siteSummaries: SiteAnalyticsSummary[];
  crossSiteAssistanceSummary: {
    totalRequested: number;
    accepted: number;
    declined: number;
    completed: number;
  };
}

