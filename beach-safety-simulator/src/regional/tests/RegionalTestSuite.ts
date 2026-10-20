/**
 * src/regional/tests/RegionalTestSuite.ts
 * Frontend unit test suite for TIDES Milestone 10:
 * Multi-Beach Command Center & Regional Coastal Monitoring.
 */

import { BeachRegistry } from '../BeachRegistry';
import { RegionalRiskAggregator } from '../RegionalRiskAggregator';
import { RegionalIncidentAdapter } from '../RegionalIncidentAdapter';
import { RegionalResourceRegistry } from '../RegionalResourceRegistry';
import { RegionalIncidentRecord } from '../types';

export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export class RegionalTestSuite {
  public static runAll(): TestResult[] {
    const results: TestResult[] = [];

    const test = (name: string, fn: () => void) => {
      try {
        fn();
        results.push({ name, passed: true });
      } catch (err: any) {
        results.push({ name, passed: false, message: err?.message || String(err) });
      }
    };

    // 1. Unique and stable beach IDs across AP registry
    test('1. Unique and stable beach IDs across AP registry', () => {
      const registry = new BeachRegistry();
      const beaches = registry.getBeaches();
      if (beaches.length < 8) {
        throw new Error(`Expected at least 8 AP beach monitoring sites, got ${beaches.length}`);
      }
      const ids = beaches.map((b) => b.beachId);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        throw new Error('Beach IDs contain duplicates');
      }
      for (const b of beaches) {
        if (!b.name || b.name.length < 3) throw new Error(`Invalid name for beach ${b.beachId}`);
        if (!b.district) throw new Error(`Missing district for beach ${b.beachId}`);
      }
    });

    // 2. Rushikonda connected digital twin status
    test('2. Rushikonda connected digital twin status', () => {
      const registry = new BeachRegistry();
      const rk = registry.getBeach('RUSHIKONDA');
      if (!rk) throw new Error('Rushikonda not found in registry');
      if (!rk.connected) throw new Error('Rushikonda must be connected');
      if (!rk.hasActiveSimulator) throw new Error('Rushikonda must have an active simulator');
      if (rk.provenance !== 'SIMULATED' && rk.provenance !== 'LIVE') {
        throw new Error(`Expected SIMULATED/LIVE provenance, got ${rk.provenance}`);
      }
      if (!rk.location || Math.abs(rk.location.latitude - 17.7815) > 0.01) {
        throw new Error('Rushikonda latitude not calibrated');
      }
    });

    // 3. Demonstration sites explicitly labeled
    test('3. Demonstration sites explicitly labeled', () => {
      const registry = new BeachRegistry();
      const demoSites = ['RK_BEACH', 'BHEEMILI', 'MANGINAPUDI', 'SURYALANKA', 'VODAREVU', 'MYPADU', 'KALINGAPATNAM'];
      for (const id of demoSites) {
        const b = registry.getBeach(id);
        if (!b) throw new Error(`Demo site ${id} missing from registry`);
        if (b.provenance !== 'DEMONSTRATION') {
          throw new Error(`Site ${id} must have DEMONSTRATION provenance, got ${b.provenance}`);
        }
        if (b.connected) throw new Error(`Demo site ${id} must not be flagged as connected`);
        if (b.hasActiveSimulator) throw new Error(`Demo site ${id} must not claim active simulator`);
      }
    });

    // 4. Missing telemetry returns UNKNOWN / NO DATA
    test('4. Missing telemetry returns UNKNOWN / NO DATA', () => {
      const registry = new BeachRegistry();
      const risk = new RegionalRiskAggregator();

      const vodarevu = registry.getBeach('VODAREVU');
      if (!vodarevu) throw new Error('Vodarevu missing');
      if (vodarevu.status !== 'UNKNOWN') throw new Error(`Expected UNKNOWN status, got ${vodarevu.status}`);
      if (vodarevu.dataFreshness !== 'NO_DATA') throw new Error(`Expected NO_DATA, got ${vodarevu.dataFreshness}`);

      const obs = risk.getObservation('VODAREVU');
      if (!obs) throw new Error('Vodarevu observation missing');
      if (obs.waveHeightM !== null) throw new Error('Unmonitored wave height must be null');
      if (obs.ripCurrentRisk !== 'UNKNOWN') throw new Error(`Expected ripCurrentRisk UNKNOWN, got ${obs.ripCurrentRisk}`);
    });

    // 5. Stale and offline site detection
    test('5. Stale and offline site detection', () => {
      const registry = new BeachRegistry();
      const risk = new RegionalRiskAggregator();

      const manginapudi = registry.getBeach('MANGINAPUDI');
      if (!manginapudi) throw new Error('Manginapudi missing');
      if (manginapudi.status !== 'OFFLINE') throw new Error(`Expected OFFLINE status, got ${manginapudi.status}`);
      if (manginapudi.dataFreshness !== 'OFFLINE') throw new Error(`Expected OFFLINE freshness, got ${manginapudi.dataFreshness}`);

      const rkBeach = registry.getBeach('RK_BEACH');
      if (!rkBeach) throw new Error('RK Beach missing');
      if (rkBeach.dataFreshness !== 'STALE') throw new Error(`Expected STALE freshness for RK Beach, got ${rkBeach.dataFreshness}`);
    });

    // 6. Incident adapter deduplication
    test('6. Incident adapter deduplication', () => {
      const adapter = new RegionalIncidentAdapter();
      const now = Date.now();

      const inc1: RegionalIncidentRecord = {
        incidentId: 'INC-DEDUP-01',
        siteId: 'RUSHIKONDA',
        siteName: 'Rushikonda Beach',
        createdAt: now - 10000,
        updatedAt: now - 5000,
        severity: 'HIGH',
        distressLevel: 0.8,
        status: 'REPORTED',
        acknowledgementStatus: 'ACKNOWLEDGED',
        description: 'Swimmer in distress',
        provenance: 'SIMULATED',
      };
      adapter.ingestIncident(inc1);

      // Ingest updated duplicate with same ID
      const inc2: RegionalIncidentRecord = {
        incidentId: 'INC-DEDUP-01',
        siteId: 'RUSHIKONDA',
        siteName: 'Rushikonda Beach',
        createdAt: now - 2000, // Newer client timestamp
        updatedAt: now,
        severity: 'CRITICAL',
        distressLevel: 0.95,
        status: 'DISPATCHED',
        acknowledgementStatus: 'ACKNOWLEDGED',
        description: 'Swimmer in severe distress',
        provenance: 'SIMULATED',
      };
      adapter.ingestIncident(inc2);

      const all = adapter.getAllIncidents({ siteId: 'RUSHIKONDA' });
      const target = all.filter((i) => i.incidentId === 'INC-DEDUP-01');
      if (target.length !== 1) throw new Error(`Expected exactly 1 incident for ID, found ${target.length}`);
      if (target[0].status !== 'DISPATCHED') throw new Error('Failed to update status on deduplication');
      if (target[0].createdAt !== now - 10000) throw new Error('Earliest creation timestamp was not preserved');
    });

    // 7. Incident ordering handles out-of-order timestamps
    test('7. Incident ordering handles out-of-order timestamps', () => {
      const adapter = new RegionalIncidentAdapter();
      const incidents = adapter.getAllIncidents();
      for (let i = 0; i < incidents.length - 1; i++) {
        const curr = incidents[i].updatedAt || incidents[i].createdAt;
        const next = incidents[i + 1].updatedAt || incidents[i + 1].createdAt;
        if (curr < next) {
          throw new Error('Incidents are not sorted in descending order of freshness');
        }
      }
    });

    // 8. Incident selection does not trigger automatic dispatch
    test('8. Incident selection does not trigger automatic dispatch', () => {
      const resources = new RegionalResourceRegistry();
      const adapter = new RegionalIncidentAdapter();

      const rbBefore = resources.getResource('RB-01');
      if (!rbBefore) throw new Error('RB-01 not found');
      const statusBefore = rbBefore.operationalStatus;

      // Inspect/fetch incident
      const inc = adapter.getIncident('INC-BHM-01');
      if (!inc) throw new Error('Demo incident INC-BHM-01 missing');

      const rbAfter = resources.getResource('RB-01');
      if (rbAfter?.operationalStatus !== statusBefore) {
        throw new Error('Inspecting incident caused resource dispatch mutation!');
      }
    });

    // 9. Site isolation
    test('9. Site isolation', () => {
      const registry = new BeachRegistry();
      const rk = registry.getBeach('RK_BEACH')!;
      const rushikonda = registry.getBeach('RUSHIKONDA')!;

      rk.activeIncidentsCount = 88;
      if (rushikonda.activeIncidentsCount === 88) {
        throw new Error('State modification on RK Beach leaked to Rushikonda');
      }
    });

    // 10. Resource registry tracks fleet units
    test('10. Resource registry tracks fleet units', () => {
      const fleet = new RegionalResourceRegistry();
      const all = fleet.getAllResources();
      if (all.length < 10) throw new Error(`Expected at least 10 fleet resources, got ${all.length}`);

      const rushikondaAssets = fleet.getAllResources({ beachId: 'RUSHIKONDA' });
      if (rushikondaAssets.length < 4) {
        throw new Error(`Expected at least 4 Rushikonda assets, got ${rushikondaAssets.length}`);
      }
      for (const a of rushikondaAssets) {
        if (!['RESCUE_BOAT', 'LIFEGUARD', 'DRONE'].includes(a.resourceType)) {
          throw new Error(`Unsupported resource type: ${a.resourceType}`);
        }
      }
    });

    // 11. Cross-beach transfers remain advisory
    test('11. Cross-beach transfers remain advisory', () => {
      const fleet = new RegionalResourceRegistry();

      // Station-bound asset rejected
      const lgEval = fleet.evaluateCrossBeachTransfer('LG-01', 'RK_BEACH');
      if (lgEval.allowed) throw new Error('Lifeguard squad cannot be transferred overland');
      if (!lgEval.reason?.includes('station-bound')) throw new Error('Missing station-bound rejection reason');

      // Mobile boat allowed as advisory
      const boatEval = fleet.evaluateCrossBeachTransfer('RB-01', 'BHEEMILI');
      if (!boatEval.allowed) throw new Error('Rescue boat transfer should be advisory eligible');
      if (!boatEval.notice?.includes('ADVISORY ONLY')) throw new Error('Missing advisory warning');

      // Verify asset state was NOT changed
      const rb = fleet.getResource('RB-01');
      if (rb?.assignedBeachId !== 'RUSHIKONDA') {
        throw new Error('Advisory evaluation mutated asset assigned station!');
      }
    });

    // 12. Regional risk aggregator preserves units and fields
    test('12. Regional risk aggregator preserves units and fields', () => {
      const aggregator = new RegionalRiskAggregator();
      const obs = aggregator.getObservation('RUSHIKONDA');
      if (!obs) throw new Error('Rushikonda observation missing');

      if (obs.waveHeightM !== 1.2) throw new Error(`Expected waveHeight 1.2m, got ${obs.waveHeightM}`);
      if (obs.wavePeriodS !== 8.0) throw new Error(`Expected wavePeriod 8.0s, got ${obs.wavePeriodS}`);
      if (obs.windSpeedMps !== 14.2) throw new Error(`Expected windSpeed 14.2 m/s, got ${obs.windSpeedMps}`);
      if (obs.visibilityKm !== 10.0) throw new Error(`Expected visibility 10.0 km, got ${obs.visibilityKm}`);
      if (obs.ripCurrentRisk !== 'MODERATE') throw new Error(`Expected ripCurrentRisk MODERATE, got ${obs.ripCurrentRisk}`);
      if (obs.provenance !== 'SIMULATED') throw new Error(`Expected provenance SIMULATED, got ${obs.provenance}`);
    });

    // 13. Regional operational indicators derived accuracy
    test('13. Regional operational indicators derived accuracy', () => {
      const registry = new BeachRegistry();
      const summary = registry.getSummaryKPIs();
      const beaches = registry.getBeaches();

      if (summary.totalConfiguredSites !== beaches.length) {
        throw new Error('Summary count mismatch with registered beaches');
      }
      if (summary.totalFleetResources !== summary.availableFleetResources + summary.assignedFleetResources) {
        throw new Error('Fleet arithmetic mismatch');
      }
      if (summary.staleOrMissingSitesCount < 1) {
        throw new Error('Expected at least 1 stale or missing site');
      }
    });

    // 14. Simulator navigation preserves state without reset
    test('14. Simulator navigation preserves state without reset', () => {
      const registry = new BeachRegistry();
      registry.syncRushikondaState(1, 3, 4, false);

      const rk = registry.getBeach('RUSHIKONDA');
      if (rk?.activeIncidentsCount !== 1) {
        throw new Error('Rushikonda active incident count lost on sync');
      }
      if (rk.status !== 'CAUTION') {
        throw new Error(`Expected status CAUTION under 1 incident, got ${rk.status}`);
      }
    });

    // 15. Graceful fallback on empty queries or missing optional telemetry
    test('15. Graceful fallback on empty queries or missing optional telemetry', () => {
      const registry = new BeachRegistry();
      const risk = new RegionalRiskAggregator();
      const adapter = new RegionalIncidentAdapter();

      const invalidBeach = registry.getBeach('INVALID_ID');
      if (invalidBeach !== undefined) throw new Error('Expected undefined for non-existent beach');

      const invalidObs = risk.getObservation('NON_EXISTENT');
      if (invalidObs !== undefined) throw new Error('Expected undefined for non-existent observation');

      const filtered = registry.getBeaches({ search: 'NON_EXISTENT_QUERY_XYZ' });
      if (filtered.length !== 0) throw new Error('Expected empty array for search miss');

      const incFiltered = adapter.getAllIncidents({ siteId: 'UNKNOWN_SITE_XYZ' });
      if (incFiltered.length !== 0) throw new Error('Expected empty array for unknown site filter');
    });

    return results;
  }
}

