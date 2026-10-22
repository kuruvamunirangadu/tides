import { BeachRegistry } from '../BeachRegistry';
import { RegionalIncidentAdapter } from '../RegionalIncidentAdapter';
import { RegionalResourceRegistry } from '../RegionalResourceRegistry';
import { Phase5CoordinationService } from '../Phase5CoordinationService';

export class Phase5CoordinationTestSuite {
  private passed = 0;
  private failed = 0;

  private assert(condition: boolean, name: string): void {
    if (condition) {
      this.passed++;
      console.log(`  [PASS] ${name}`);
    } else {
      this.failed++;
      console.error(`  [FAIL] ${name}`);
    }
  }

  public run(): { passed: number; failed: number } {
    const registry = new BeachRegistry();
    const incidents = new RegionalIncidentAdapter();
    const resources = new RegionalResourceRegistry();
    const service = new Phase5CoordinationService(registry, incidents, resources);
    const now = Date.now();
    const snapshot = service.getSnapshot(now);
    const queue = service.prioritizeIncidents(now);
    const critical = queue.find((entry) => entry.incident.incidentId === 'INC-BHM-01');
    const recommendations = service.recommendResources(incidents.getIncident('INC-BHM-02')!, now);

    this.assert(snapshot.regions.length >= 8, 'Cross-region overview preserves all registered site identities');
    this.assert(queue[0]?.incident.severity === 'CRITICAL', 'Critical incidents lead deterministic priority ordering');
    this.assert(Boolean(critical?.rationale.includes('forecast context does not replace')), 'Priority rationale separates forecasts from individual distress');
    this.assert(recommendations.some((recommendation) => recommendation.eligible), 'Unassigned incident receives an eligible resource recommendation');
    this.assert(recommendations.every((recommendation) => recommendation.resource.operationalStatus === 'AVAILABLE' || !recommendation.eligible), 'Unavailable resources are never recommended as eligible');
    this.assert(snapshot.regions.some((region) => region.staleTelemetry), 'Disconnected or stale regions remain explicitly marked');

    const firstEligible = recommendations.find((recommendation) => recommendation.eligible);
    const secondRecommendations = service.recommendResources(incidents.getIncident('INC-BHM-02')!, now);
    this.assert(firstEligible?.resource.resourceId === secondRecommendations.find((recommendation) => recommendation.eligible)?.resource.resourceId, 'Repeated recommendations are deterministic and do not claim resources');
    this.assert(incidents.getIncident('INC-BHM-02')?.assignedResourceId === null, 'Recommendation does not mutate or dispatch an incident');

    console.log(`Results: ${this.passed} passed, ${this.failed} failed.`);
    return { passed: this.passed, failed: this.failed };
  }
}