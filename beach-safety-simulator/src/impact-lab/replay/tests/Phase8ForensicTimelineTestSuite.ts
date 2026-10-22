import { IncidentEventRecorder } from '../IncidentEventRecorder';
import { ReplayLifecycleEvent } from '../types';

export class Phase8ForensicTimelineTestSuite {
  private passed = 0;
  private failed = 0;

  private assert(condition: boolean, name: string): void {
    if (condition) { this.passed++; console.log(`  [PASS] ${name}`); }
    else { this.failed++; console.error(`  [FAIL] ${name}`); }
  }

  public run(): { passed: number; failed: number } {
    const recorder = IncidentEventRecorder.getInstance();
    const dossier = recorder.getIncidents()[0];
    if (!dossier) {
      this.assert(false, 'Benchmark incident exists for forensic timeline checks');
      return { passed: this.passed, failed: this.failed };
    }
    const event = (id: string, simTime: number): ReplayLifecycleEvent => ({
      eventId: id,
      incidentId: dossier.incidentId,
      simTimeSeconds: simTime,
      timeDisplay: '08:03:00',
      wallClockTimestamp: 1000 + simTime,
      eventType: 'BEHAVIOR_ANOMALY',
      sourceComponent: 'BEHAVIOR_ANALYZER',
      severity: 'WARNING',
      title: 'Behavior anomaly',
      description: 'Simulated behavior evidence.',
      isRecordedFact: true,
      visitorId: dossier.victimId,
      zoneId: dossier.zoneId,
      metadata: { provenance: 'SIMULATED' },
    });
    const before = dossier.events.length;
    recorder.emitEvent(event('PHASE8-FORENSIC-2', 200));
    recorder.emitEvent(event('PHASE8-FORENSIC-1', 190));
    recorder.emitEvent(event('PHASE8-FORENSIC-1', 190));
    const updated = recorder.getIncident(dossier.incidentId)!;
    const matching = updated.events.filter((item) => item.eventId.startsWith('PHASE8-FORENSIC'));

    this.assert(matching.length === 2, 'Duplicate forensic event delivery is suppressed');
    this.assert(updated.events.length === before + 2, 'Forensic events remain linked to the correct incident');
    this.assert(matching[0].simTimeSeconds <= matching[1].simTimeSeconds, 'Out-of-order forensic events are chronologically sorted');
    this.assert(matching.every((item) => item.sourceComponent === 'BEHAVIOR_ANALYZER' && item.isRecordedFact), 'Forensic provenance remains explicit');

    console.log(`Results: ${this.passed} passed, ${this.failed} failed.`);
    return { passed: this.passed, failed: this.failed };
  }
}