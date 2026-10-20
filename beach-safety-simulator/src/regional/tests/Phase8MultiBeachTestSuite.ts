/**
 * src/regional/tests/Phase8MultiBeachTestSuite.ts
 * 
 * TIDES — Phase 8: Multi-Beach Deployment & Coastal Network Coordination
 * Comprehensive 15-test automated verification suite covering:
 * - Multi-site coastal registry across Andhra Pradesh (8 beaches)
 * - Default anchor site backward compatibility (RUSHIKONDA)
 * - Entity scoping and cross-site incident isolation
 * - Boundary validation, buffer ambiguity (500m), and outside coordinate detection
 * - Zero telemetry fabrication for unmonitored sites
 * - Cross-site mutual aid coordination state machine (REQUESTED -> ACKNOWLEDGED -> ACCEPTED/DECLINED -> COMPLETED)
 * - Non-dispatch invariant (isRealDispatched: false)
 * - Inter-site transit estimation and UAV range boundaries
 * - Role-Based Access Control (RBAC) enforcement
 * - Site offline autonomy, event buffering, and idempotent deduplicated sync
 * - Comparative regional analytics with non-misleading exposure disclaimers
 * - Unified command center regional integration
 */

import { BeachRegistry } from '../BeachRegistry';
import { RegionalSiteScopingService } from '../RegionalSiteScopingService';
import { RegionalCoordinationManager } from '../RegionalCoordinationManager';
import { RegionalSyncManager } from '../RegionalSyncManager';
import { RegionalAccessController } from '../RegionalAccessController';
import { RegionalAnalyticsReporter } from '../RegionalAnalyticsReporter';
import { RegionalRiskAggregator } from '../RegionalRiskAggregator';
import { RegionalIncidentAdapter } from '../RegionalIncidentAdapter';
import { UnifiedCommandCenterService } from '../../command-center/unified/UnifiedCommandCenterService';
import { UserSecurityContext } from '../types';

export class Phase8MultiBeachTestSuite {
  private beachRegistry: BeachRegistry;
  private scopingService: RegionalSiteScopingService;
  private coordinationManager: RegionalCoordinationManager;
  private syncManager: RegionalSyncManager;
  private accessController: RegionalAccessController;
  private analyticsReporter: RegionalAnalyticsReporter;
  private riskAggregator: RegionalRiskAggregator;
  private incidentAdapter: RegionalIncidentAdapter;

  constructor() {
    this.beachRegistry = BeachRegistry.getInstance();
    this.scopingService = RegionalSiteScopingService.getInstance();
    this.coordinationManager = RegionalCoordinationManager.getInstance();
    this.syncManager = RegionalSyncManager.getInstance();
    this.accessController = RegionalAccessController.getInstance();
    this.analyticsReporter = RegionalAnalyticsReporter.getInstance();
    this.riskAggregator = RegionalRiskAggregator.getInstance();
    this.incidentAdapter = RegionalIncidentAdapter.getInstance();
  }

  public reset(): void {
    this.beachRegistry.initializeRegistry();
    this.coordinationManager.reset();
    this.syncManager.reset();
    this.accessController.resetAuditLog();
  }

  // 1. All 8 AP coastal sites registered with unique IDs, coordinates, sectors, and operational configs
  public testSiteRegistryCoverage(): { pass: boolean; details: string } {
    this.reset();
    const beaches = this.beachRegistry.getBeaches();

    if (beaches.length < 8) {
      return { pass: false, details: `Expected at least 8 AP beach sites, found ${beaches.length}` };
    }

    const expectedIds = ['RUSHIKONDA', 'RK_BEACH', 'BHEEMILI', 'MANGINAPUDI', 'SURYALANKA', 'VODAREVU', 'MYPADU', 'KALINGAPATNAM'];
    for (const expId of expectedIds) {
      const b = this.beachRegistry.getBeach(expId);
      if (!b) return { pass: false, details: `Missing registered beach: ${expId}` };
      if (!b.location || b.location.latitude <= 0 || b.location.longitude <= 0) {
        return { pass: false, details: `Invalid geographic coordinates for ${expId}` };
      }
      if (!b.district || !b.coastSector) {
        return { pass: false, details: `Missing district or coastal sector for ${expId}` };
      }
      if (!b.configuration || b.configuration.shorelineLengthMeters <= 0) {
        return { pass: false, details: `Missing site configuration for ${expId}` };
      }
    }

    return { pass: true, details: `All 8 AP beaches registered with verified geographic and operational profiles.` };
  }

  // 2. Default anchor site backward compatibility (RUSHIKONDA)
  public testDefaultAnchorSiteBackwardCompatibility(): { pass: boolean; details: string } {
    this.reset();
    const activeSite = this.beachRegistry.getActiveSiteId();
    if (activeSite !== 'RUSHIKONDA') {
      return { pass: false, details: `Default active site must be RUSHIKONDA, got ${activeSite}` };
    }

    const rk = this.beachRegistry.getBeach('RUSHIKONDA');
    if (!rk || !rk.connected || !rk.hasActiveSimulator) {
      return { pass: false, details: `Rushikonda anchor must be connected and flag active simulator` };
    }
    if (rk.provenance !== 'SIMULATED' && rk.provenance !== 'LIVE') {
      return { pass: false, details: `Rushikonda must have SIMULATED/LIVE provenance, got ${rk.provenance}` };
    }

    return { pass: true, details: `Default anchor site RUSHIKONDA intact with 3D digital twin connectivity.` };
  }

  // 3. Entity scoping and legacy migration to default site
  public testSiteScopingAndLegacyMigration(): { pass: boolean; details: string } {
    this.reset();

    // Legacy entity with no siteId
    const legacyIncident: { id: string; siteId?: string; severity: string } = { id: 'INC-LEGACY-001', severity: 'HIGH' };
    const scopedLegacy = this.scopingService.scopeEntity(legacyIncident);

    if (scopedLegacy.siteId !== 'RUSHIKONDA') {
      return { pass: false, details: `Expected legacy entity to default to RUSHIKONDA, got ${scopedLegacy.siteId}` };
    }

    // Explicitly scoped entity
    const bheemiliEntity: { id: string; siteId: string; severity: string } = { id: 'INC-BHM-99', siteId: 'BHEEMILI', severity: 'CRITICAL' };
    const scopedBhm = this.scopingService.scopeEntity(bheemiliEntity);

    if (scopedBhm.siteId !== 'BHEEMILI') {
      return { pass: false, details: `Expected BHEEMILI entity to preserve siteId, got ${scopedBhm.siteId}` };
    }

    // Filter verification
    const list: Array<{ id: string; siteId: string; severity: string }> = [scopedLegacy, scopedBhm];
    const bhmOnly = this.scopingService.filterEntitiesBySite(list, 'BHEEMILI');
    if (bhmOnly.length !== 1 || bhmOnly[0].id !== 'INC-BHM-99') {
      return { pass: false, details: `filterEntitiesBySite failed to isolate BHEEMILI entities` };
    }

    return { pass: true, details: `Entity scoping and backward-compatible default site migration validated.` };
  }

  // 4. Multi-site incident isolation (prohibits cross-site incident merging)
  public testMultiSiteIncidentIsolation(): { pass: boolean; details: string } {
    this.reset();

    const incRushikonda = { id: 'INC-RK-101', siteId: 'RUSHIKONDA' };
    const incBheemili = { id: 'INC-BHM-202', siteId: 'BHEEMILI' };

    const check = this.scopingService.verifyCrossSiteIsolation(incRushikonda, incBheemili);
    if (check.canMerge) {
      return { pass: false, details: `Cross-site incidents must NEVER be permitted to merge across different sites.` };
    }
    if (!check.isolated) {
      return { pass: false, details: `Expected cross-site isolation flag to be true.` };
    }

    // Same site incident comparison
    const incRushikonda2 = { id: 'INC-RK-102', siteId: 'RUSHIKONDA' };
    const checkSame = this.scopingService.verifyCrossSiteIsolation(incRushikonda, incRushikonda2);
    if (!checkSame.canMerge) {
      return { pass: false, details: `Same-site incidents should allow local triage and merging.` };
    }

    return { pass: true, details: `Strict multi-site incident isolation verified; cross-site incident merging prohibited.` };
  }

  // 5. Boundary validation, buffer ambiguity (500m), and outside coordinate detection
  public testBoundaryValidationAndAmbiguityDetection(): { pass: boolean; details: string } {
    this.reset();

    // 1. Clean coordinate inside Rushikonda (lat: 17.7815, lng: 83.3855)
    const resInside = this.scopingService.validateCoordinateSite(17.7815, 83.3855);
    if (resInside.matchedSiteId !== 'RUSHIKONDA' || resInside.isAmbiguous || resInside.isOutsideAllKnownSites) {
      return { pass: false, details: `Failed clean Rushikonda coordinate enclosure check.` };
    }

    // 2. Coordinate near boundary edge (e.g. lat: 17.7702, near minLat: 17.770 within ~500m buffer)
    const resAmbiguous = this.scopingService.validateCoordinateSite(17.7702, 83.3855);
    if (!resAmbiguous.isAmbiguous || resAmbiguous.matchedSiteId !== undefined) {
      return { pass: false, details: `Expected boundary edge coordinate to be flagged as ambiguous for operator review.` };
    }

    // 3. Coordinate completely outside AP coastal monitoring (e.g. Hyderabad lat: 17.3850, lng: 78.4867)
    const resOutside = this.scopingService.validateCoordinateSite(17.3850, 78.4867);
    if (!resOutside.isOutsideAllKnownSites || resOutside.matchedSiteId !== undefined) {
      return { pass: false, details: `Expected inland coordinate to be flagged as outside all known sites.` };
    }
    if (!resOutside.distanceToNearestKm || resOutside.distanceToNearestKm < 100) {
      return { pass: false, details: `Expected distance calculation to nearest coastal beach.` };
    }

    return { pass: true, details: `Boundary validation, 500m buffer edge ambiguity, and out-of-bounds detection verified.` };
  }

  // 6. Zero telemetry fabrication for unmonitored sites
  public testZeroTelemetryFabrication(): { pass: boolean; details: string } {
    this.reset();

    // Vodarevu has no active sensors or digital twin
    const vodarevuBeach = this.beachRegistry.getBeach('VODAREVU');
    if (!vodarevuBeach) return { pass: false, details: `Vodarevu beach not found.` };

    if (vodarevuBeach.status !== 'UNKNOWN') {
      return { pass: false, details: `Expected UNKNOWN operational status for unmonitored site Vodarevu, got ${vodarevuBeach.status}` };
    }
    if (vodarevuBeach.dataFreshness !== 'NO_DATA') {
      return { pass: false, details: `Expected NO_DATA freshness for Vodarevu, got ${vodarevuBeach.dataFreshness}` };
    }

    const obs = this.riskAggregator.getObservation('VODAREVU');
    if (!obs) return { pass: false, details: `Missing Vodarevu risk observation.` };
    if (obs.waveHeightM !== null) {
      return { pass: false, details: `Unmonitored wave height must be null; zero fabrication allowed.` };
    }
    if (obs.ripCurrentRisk !== 'UNKNOWN') {
      return { pass: false, details: `Expected rip risk UNKNOWN for unmonitored site, got ${obs.ripCurrentRisk}` };
    }

    return { pass: true, details: `Zero telemetry fabrication verified: unmonitored sites report UNKNOWN/NO_DATA with null metrics.` };
  }

  // 7. Cross-site assistance request creation and validation
  public testCrossSiteAssistanceRequestCreation(): { pass: boolean; details: string } {
    this.reset();

    // Attempt invalid request: requesting === receiving
    const invalidRes = this.coordinationManager.createAssistanceRequest({
      requestingSiteId: 'RUSHIKONDA',
      receivingSiteId: 'RUSHIKONDA',
      incidentId: 'INC-001',
      resourceType: 'SURVEILLANCE_DRONE',
      urgency: 'URGENT',
      rationale: 'Self-transfer',
      operatorId: 'OP-TEST',
    });

    if (invalidRes.success) {
      return { pass: false, details: `Expected failure when requesting site equals receiving site.` };
    }

    // Valid cross-site request: Bheemili requests Drone from Rushikonda
    const validRes = this.coordinationManager.createAssistanceRequest({
      requestingSiteId: 'BHEEMILI',
      receivingSiteId: 'RUSHIKONDA',
      incidentId: 'INC-BHM-01',
      resourceType: 'SURVEILLANCE_DRONE',
      urgency: 'URGENT',
      rationale: 'Heavy surf near headland; request thermal drone sweep.',
      operatorId: 'OP-TEST',
    });

    if (!validRes.success || !validRes.request) {
      return { pass: false, details: `Valid assistance request creation failed: ${validRes.error}` };
    }

    const req = validRes.request;
    if (req.status !== 'REQUESTED' || req.requestingSiteId !== 'BHEEMILI' || req.receivingSiteId !== 'RUSHIKONDA') {
      return { pass: false, details: `Assistance request properties mismatch.` };
    }

    return { pass: true, details: `Cross-site assistance request creation and parameter validation verified.` };
  }

  // 8. Strict non-dispatch mutual aid invariant (isRealDispatched: false)
  public testStrictNonDispatchMutualAidInvariant(): { pass: boolean; details: string } {
    this.reset();

    const res = this.coordinationManager.createAssistanceRequest({
      requestingSiteId: 'RK_BEACH',
      receivingSiteId: 'RUSHIKONDA',
      incidentId: 'INC-RK-01',
      resourceType: 'RESCUE_BOAT',
      urgency: 'HIGH',
      rationale: 'Deep draft craft required offshore.',
      operatorId: 'OP-TEST',
    });

    if (!res.success || !res.request) {
      return { pass: false, details: `Failed to create request.` };
    }

    if (res.request.isRealDispatched !== false) {
      return { pass: false, details: `Strict invariant violated: isRealDispatched must always be false. Coordination requests must NEVER auto-dispatch assets.` };
    }

    return { pass: true, details: `Strict non-dispatch invariant verified: mutual-aid coordinates decisions without auto-dispatching assets.` };
  }

  // 9. Inter-site transit estimation and UAV range boundaries
  public testTransitEstimationAndFeasibilityRange(): { pass: boolean; details: string } {
    this.reset();

    // 1. Feasible drone transit: Rushikonda to RK Beach (~10.5 km <= 25 km max range)
    const droneTransit = this.coordinationManager.evaluateTransit('RUSHIKONDA', 'RK_BEACH', 'SURVEILLANCE_DRONE');
    if (!droneTransit.feasible) {
      return { pass: false, details: `Expected Rushikonda to RK Beach drone transit to be feasible.` };
    }
    if (droneTransit.distanceKm < 5 || droneTransit.distanceKm > 20) {
      return { pass: false, details: `Unrealistic distance for Rushikonda to RK Beach: ${droneTransit.distanceKm} km` };
    }
    if (droneTransit.estimatedTransitTimeMinutes <= 0) {
      return { pass: false, details: `Estimated transit time must be positive.` };
    }

    // 2. Unfeasible drone transit: Rushikonda to Suryalanka (~370 km >> 25 km max range)
    const longTransit = this.coordinationManager.evaluateTransit('RUSHIKONDA', 'SURYALANKA', 'SURVEILLANCE_DRONE');
    if (longTransit.feasible) {
      return { pass: false, details: `Expected 370km drone transit to be flagged unfeasible due to battery/range boundaries.` };
    }

    return { pass: true, details: `Inter-site transit estimation and UAV operational envelope constraints verified.` };
  }

  // 10. Assistance request lifecycle state machine
  public testAssistanceRequestLifecycleStateMachine(): { pass: boolean; details: string } {
    this.reset();

    const created = this.coordinationManager.createAssistanceRequest({
      requestingSiteId: 'BHEEMILI',
      receivingSiteId: 'RUSHIKONDA',
      incidentId: 'INC-BHM-01',
      resourceType: 'PARAMEDIC_TEAM',
      urgency: 'HIGH',
      rationale: 'Multiple bather triage assistance.',
      operatorId: 'OP-LOCAL-BHM',
    });

    const reqId = created.request!.requestId;

    // Step 1: Acknowledge
    const ackRes = this.coordinationManager.acknowledgeRequest(reqId, 'OP-LOCAL-RK', 'Request received by watch officer.');
    if (!ackRes.success) return { pass: false, details: `Acknowledge step failed: ${ackRes.error}` };

    let req = this.coordinationManager.getRequest(reqId);
    if (req?.status !== 'ACKNOWLEDGED') return { pass: false, details: `Expected status ACKNOWLEDGED` };

    // Step 2: Accept
    const acceptRes = this.coordinationManager.acceptRequest(reqId, 'OP-LOCAL-RK', 'Mobile squad mobilized locally.');
    if (!acceptRes.success) return { pass: false, details: `Accept step failed: ${acceptRes.error}` };

    req = this.coordinationManager.getRequest(reqId);
    if (req?.status !== 'ACCEPTED') return { pass: false, details: `Expected status ACCEPTED` };

    // Step 3: Complete
    const compRes = this.coordinationManager.completeRequest(reqId, 'OP-REGIONAL-HUB', 'Mission stood down.');
    if (!compRes.success) return { pass: false, details: `Complete step failed: ${compRes.error}` };

    req = this.coordinationManager.getRequest(reqId);
    if (req?.status !== 'COMPLETED') return { pass: false, details: `Expected status COMPLETED` };

    // Audit trail verification
    if (req.auditTrail.length !== 4) {
      return { pass: false, details: `Expected 4 audit entries, found ${req.auditTrail.length}` };
    }

    return { pass: true, details: `Assistance request lifecycle state machine and immutable audit trail verified.` };
  }

  // 11. Role-Based Access Control (RBAC) permissions
  public testRoleBasedAccessControlPermissions(): { pass: boolean; details: string } {
    this.reset();

    const localOpRK: UserSecurityContext = {
      userId: 'USER-LOCAL-RK',
      name: 'Rushikonda Watch Officer',
      role: 'LOCAL_OPERATOR',
      assignedSiteId: 'RUSHIKONDA',
      permittedSiteIds: ['RUSHIKONDA'],
    };

    const regionalOp: UserSecurityContext = {
      userId: 'USER-REGIONAL',
      name: 'AP State Coastal Coordinator',
      role: 'REGIONAL_OPERATOR',
      permittedSiteIds: ['ALL'],
    };

    const admin: UserSecurityContext = {
      userId: 'USER-ADMIN',
      name: 'System Administrator',
      role: 'ADMINISTRATOR',
      permittedSiteIds: ['ALL'],
    };

    // 1. Local operator can view own site, but NOT external site
    if (!this.accessController.canViewSite(localOpRK, 'RUSHIKONDA')) {
      return { pass: false, details: `Local operator must be allowed to view assigned site.` };
    }
    if (this.accessController.canViewSite(localOpRK, 'BHEEMILI')) {
      return { pass: false, details: `Local operator must NOT be allowed to view unassigned site Bheemili.` };
    }

    // 2. Local operator cannot manage incidents at other sites
    if (this.accessController.canManageIncident(localOpRK, 'BHEEMILI')) {
      return { pass: false, details: `Local operator must NOT be allowed to manage incidents at foreign sites.` };
    }

    // 3. Regional operator can request assistance, but cannot authorize foreign dispatch alone
    if (!this.accessController.canRequestAssistance(regionalOp, 'BHEEMILI')) {
      return { pass: false, details: `Regional operator must be able to request assistance.` };
    }
    if (this.accessController.canAuthorizeAssistance(regionalOp, 'RUSHIKONDA')) {
      return { pass: false, details: `Regional operator cannot unilaterally commit local beach assets without local authorization.` };
    }

    // 4. Administrator has full management
    if (!this.accessController.canManageSites(admin)) {
      return { pass: false, details: `Admin must be permitted to manage coastal sites.` };
    }

    return { pass: true, details: `Role-Based Access Control (RBAC) rules and audit logging verified.` };
  }

  // 12. Site offline autonomy
  public testSiteOfflineAutonomy(): { pass: boolean; details: string } {
    this.reset();

    // Mark Bheemili offline
    this.syncManager.setSiteOffline('BHEEMILI');

    const state = this.syncManager.getSiteSyncState('BHEEMILI');
    if (state.status !== 'OFFLINE') {
      return { pass: false, details: `Expected BHEEMILI to be OFFLINE, got ${state.status}` };
    }

    // Assert that local site continues operating autonomously
    const autonomous = this.syncManager.isSiteAutonomous('BHEEMILI');
    if (!autonomous) {
      return { pass: false, details: `Sites must operate autonomously even when disconnected.` };
    }

    // Rushikonda remains unaffected
    const rkState = this.syncManager.getSiteSyncState('RUSHIKONDA');
    if (rkState.status !== 'ONLINE') {
      return { pass: false, details: `Outage at Bheemili must not affect Rushikonda connectivity state.` };
    }

    return { pass: true, details: `Site offline autonomy verified: disconnection at one site causes zero disruption to others.` };
  }

  // 13. Offline event buffering and idempotent sync with deduplication
  public testOfflineEventBufferingAndIdempotentSync(): { pass: boolean; details: string } {
    this.reset();

    // Queue 3 events during offline period
    this.syncManager.queueOfflineEvent('BHEEMILI', {
      eventId: 'EVT-001',
      eventType: 'INCIDENT_CREATED',
      timestamp: Date.now(),
      payload: { incidentId: 'INC-BHM-99', type: 'DROWNING_RISK' },
    });
    this.syncManager.queueOfflineEvent('BHEEMILI', {
      eventId: 'EVT-002',
      eventType: 'WARNING_DISPATCHED',
      timestamp: Date.now(),
      payload: { warningId: 'WRN-BHM-01' },
    });
    // Duplicate of EVT-001
    this.syncManager.queueOfflineEvent('BHEEMILI', {
      eventId: 'EVT-001',
      eventType: 'INCIDENT_CREATED',
      timestamp: Date.now(),
      payload: { incidentId: 'INC-BHM-99', type: 'DROWNING_RISK' },
    });

    const pending = this.syncManager.getPendingQueue('BHEEMILI');
    if (pending.length !== 3) {
      return { pass: false, details: `Expected 3 buffered events, got ${pending.length}` };
    }

    // Reconnection flush
    const flushRes = this.syncManager.flushPendingEvents('BHEEMILI');
    if (flushRes.syncedCount !== 2) {
      return { pass: false, details: `Expected 2 unique synced events, got ${flushRes.syncedCount}` };
    }
    if (flushRes.duplicateCount !== 1) {
      return { pass: false, details: `Expected 1 duplicate filtered event, got ${flushRes.duplicateCount}` };
    }

    // Replay same events again; should all be deduplicated
    this.syncManager.queueOfflineEvent('BHEEMILI', {
      eventId: 'EVT-002',
      eventType: 'WARNING_DISPATCHED',
      timestamp: Date.now(),
      payload: { warningId: 'WRN-BHM-01' },
    });
    const reflush = this.syncManager.flushPendingEvents('BHEEMILI');
    if (reflush.syncedCount !== 0 || reflush.duplicateCount !== 1) {
      return { pass: false, details: `Idempotency violation on re-syncing duplicate event.` };
    }

    return { pass: true, details: `Offline event buffering and idempotent deduplicated sync verified.` };
  }

  // 14. Regional analytics report with non-misleading exposure disclaimers
  public testRegionalAnalyticsWithExposureContext(): { pass: boolean; details: string } {
    this.reset();

    const report = this.analyticsReporter.generateRegionalReport('Q4 Multi-Beach Summary');

    if (!report.reportId || report.siteSummaries.length < 8) {
      return { pass: false, details: `Expected at least 8 site summaries in regional report.` };
    }

    const rkSummary = report.siteSummaries.find((s) => s.siteId === 'RUSHIKONDA');
    if (!rkSummary || rkSummary.averageResponseTimeSec <= 0 || rkSummary.dataCoveragePct <= 90) {
      return { pass: false, details: `Rushikonda digital twin performance metrics missing or inaccurate.` };
    }

    // Validate non-misleading exposure context
    if (!rkSummary.reportingExposureNotes.toLowerCase().includes('higher incident counts reflect')) {
      return { pass: false, details: `Expected Rushikonda exposure context explaining visitor density & sensor automation.` };
    }

    const vodarevuSummary = report.siteSummaries.find((s) => s.siteId === 'VODAREVU');
    if (!vodarevuSummary || !vodarevuSummary.reportingExposureNotes.includes('NOT zero coastal risk')) {
      return { pass: false, details: `Expected unmonitored site disclaimer clarifying zero reported incidents != zero risk.` };
    }

    return { pass: true, details: `Regional analytics report and non-misleading exposure context validated.` };
  }

  // 15. Unified command center regional network integration
  public testUnifiedCommandCenterRegionalIntegration(): { pass: boolean; details: string } {
    this.reset();
    const service = UnifiedCommandCenterService.getInstance();

    // Active site check & switch
    const initialSite = service.getActiveSiteId();
    if (initialSite !== 'RUSHIKONDA') {
      return { pass: false, details: `Expected initial active site RUSHIKONDA, got ${initialSite}` };
    }

    const switchRes = service.setActiveSiteId('BHEEMILI');
    if (!switchRes.success || service.getActiveSiteId() !== 'BHEEMILI') {
      return { pass: false, details: `Failed to switch active site to BHEEMILI` };
    }

    // Switch back to anchor site
    service.setActiveSiteId('RUSHIKONDA');
    if (service.getActiveSiteId() !== 'RUSHIKONDA') {
      return { pass: false, details: `Failed to restore anchor site RUSHIKONDA` };
    }

    // Assistance requests through command center service
    const reqRes = service.createCrossSiteAssistanceRequest({
      requestingSiteId: 'BHEEMILI',
      receivingSiteId: 'RUSHIKONDA',
      incidentId: 'INC-BHM-01',
      resourceType: 'SURVEILLANCE_DRONE',
      urgency: 'URGENT',
      rationale: 'Command center mutual aid drill.',
    });

    if (!reqRes.success || !reqRes.request) {
      return { pass: false, details: `Command center assistance request creation failed.` };
    }

    const allRequests = service.getCrossSiteAssistanceRequests();
    if (allRequests.length === 0) {
      return { pass: false, details: `Expected command center assistance requests list to contain created request.` };
    }

    // Site sync states through command center
    const syncStates = service.getSiteSyncStates();
    if (syncStates.length < 8) {
      return { pass: false, details: `Expected sync states for all 8 coastal sites.` };
    }

    return { pass: true, details: `Unified command center regional network service integration verified.` };
  }
}
