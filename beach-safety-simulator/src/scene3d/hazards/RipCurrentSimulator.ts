import { Beach } from '../../models/Beach';
import { Environment } from '../../models/Environment';
import { Visitor } from '../../models/Visitor';
import { soundEngine } from '../../audio/BeachSoundEngine';
import { IncidentEventRecorder } from '../../impact-lab/replay/IncidentEventRecorder';
import { DistressIncidentEvent, RipMetrics, RipScenarioState } from './rip3d.types';

/**
 * RipCurrentSimulator.ts
 * 
 * Interactive physical & behavioral simulator for Milestones 3 & 12:
 * - Entrains multiple swimmers independently into rip current channels
 * - Transports each bather offshore toward deeper water with realistic spatial dispersion
 * - Progresses visitor physiology independently: fatigue -> struggling -> acute distress
 * - Issues deduplicated emergency alerts per swimmer without overwriting existing incidents
 * - Ingests authoritative incident records into IncidentEventRecorder for Incident Replay
 */
export class RipCurrentSimulator {
  private static instance: RipCurrentSimulator | null = null;

  public active: boolean = false;
  public scenarioState: RipScenarioState = 'INACTIVE';

  // Multi-swimmer and multi-incident registry (Milestone 12)
  public targetVisitorIds: Set<string> = new Set();
  private activeIncidents: Map<string, DistressIncidentEvent> = new Map();
  private swimmerChannelOffsets: Map<string, number> = new Map();

  private elapsedSeconds: number = 0;
  private isAlertIssued: boolean = false;
  private lastAlertAudioTime: number = 0;

  private listeners: Set<(incident: DistressIncidentEvent | null) => void> = new Set();

  public static getInstance(): RipCurrentSimulator {
    if (!RipCurrentSimulator.instance) {
      RipCurrentSimulator.instance = new RipCurrentSimulator();
    }
    return RipCurrentSimulator.instance;
  }

  /**
   * Backwards-compatible getter and setter for single target visitor ID.
   */
  public get targetVisitorId(): string | null {
    if (this.targetVisitorIds.size === 0) return null;
    return this.targetVisitorIds.values().next().value ?? null;
  }

  public set targetVisitorId(id: string | null) {
    if (id) {
      this.targetVisitorIds.add(id);
    } else {
      this.targetVisitorIds.clear();
    }
  }

  /**
   * Backwards-compatible getter for primary active incident.
   */
  public get activeIncident(): DistressIncidentEvent | null {
    return this.getActiveIncident();
  }

  public subscribe(cb: (incident: DistressIncidentEvent | null) => void): () => void {
    this.listeners.add(cb);
    cb(this.getActiveIncident());
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    const primary = this.getActiveIncident();
    this.listeners.forEach((cb) => cb(primary));
  }

  /**
   * Activates single-swimmer rip scenario (backward compatible with Milestone 3)
   */
  public triggerRipScenario(visitors: Visitor[], beach: Beach): void {
    this.triggerMultiSwimmerScenario(visitors, beach, 1);
  }

  /**
   * Activates multi-swimmer rip scenario entraining multiple bathers (Milestone 12)
   */
  public triggerMultiSwimmerScenario(visitors: Visitor[], beach: Beach, count: number = 3): void {
    this.active = true;
    this.scenarioState = 'ACTIVE';
    this.elapsedSeconds = 0;
    this.isAlertIssued = false;

    const shorelineY = beach.shorelineY || 280;

    // Filter available active bathers in or near water
    const candidates = visitors.filter(
      (v) => v.active && (v.state === 'SWIMMING' || v.state === 'DRIFTING' || v.state === 'WATER_ENTRY' || v.state === 'BEACH')
    );

    const eligible = candidates.slice(0, Math.min(count, candidates.length));
    if (eligible.length === 0 && visitors.length > 0) {
      eligible.push(...visitors.slice(0, Math.min(count, visitors.length)));
    }

    // Offset lanes along rip neck (530, 560, 590) to prevent 3D mesh overlap
    const baseOffsets = [0, -22, 22, -38, 38];

    eligible.forEach((swimmer, idx) => {
      this.targetVisitorIds.add(swimmer.id);
      const lateralOffset = baseOffsets[idx % baseOffsets.length];
      this.swimmerChannelOffsets.set(swimmer.id, lateralOffset);

      swimmer.position.x = 550 + lateralOffset;
      swimmer.position.y = shorelineY + 22 + (idx * 6);
      swimmer.state = 'SWIMMING';
      swimmer.speed = 1.2;
      swimmer.fatigue = 0.25;
      swimmer.distressLevel = 0.15;
      swimmer.awarenessState = 'UNAWARE';
    });

    this.notify();
  }

  /**
   * Resets active rip scenario and returns swimmers to safe beach sand.
   * If incidentId or visitorId is provided, resets only that specific bather.
   */
  public resetScenario(visitors?: Visitor[], targetId?: string): void {
    if (targetId && visitors) {
      const swimmer = visitors.find((v) => v.id === targetId);
      if (swimmer) {
        swimmer.state = 'BEACH';
        swimmer.distressLevel = 0;
        swimmer.fatigue = 0.1;
        swimmer.position.y = 180;
        swimmer.awarenessState = 'UNAWARE';
      }
      this.targetVisitorIds.delete(targetId);
      this.swimmerChannelOffsets.delete(targetId);

      // Remove matching incident
      for (const [incId, inc] of this.activeIncidents.entries()) {
        if (inc.visitorId === targetId || inc.incidentId === targetId) {
          this.activeIncidents.delete(incId);
        }
      }

      if (this.targetVisitorIds.size === 0) {
        this.active = false;
        this.scenarioState = 'INACTIVE';
      }
    } else {
      if (visitors) {
        for (const vid of this.targetVisitorIds) {
          const swimmer = visitors.find((v) => v.id === vid);
          if (swimmer) {
            swimmer.state = 'BEACH';
            swimmer.distressLevel = 0;
            swimmer.fatigue = 0.1;
            swimmer.position.y = 180;
            swimmer.awarenessState = 'UNAWARE';
          }
        }
      }

      this.active = false;
      this.scenarioState = 'INACTIVE';
      this.targetVisitorIds.clear();
      this.activeIncidents.clear();
      this.swimmerChannelOffsets.clear();
      this.elapsedSeconds = 0;
      this.isAlertIssued = false;
    }

    this.notify();
  }

  /**
   * Resolves a single incident without mutating other active incidents.
   */
  public resolveIncident(incidentId: string): void {
    const inc = this.activeIncidents.get(incidentId);
    if (inc) {
      inc.resolved = true;
      inc.stage = 'RESOLVED';
      this.targetVisitorIds.delete(inc.visitorId);
      this.swimmerChannelOffsets.delete(inc.visitorId);
      this.activeIncidents.delete(incidentId);

      if (this.activeIncidents.size === 0 && this.targetVisitorIds.size === 0) {
        this.scenarioState = 'RESOLVED';
        this.active = false;
      }

      this.notify();
    }
  }

  /**
   * Main per-frame simulation update: updates each swimmer independently.
   */
  public update(
    delta: number,
    visitors: Visitor[],
    beach: Beach,
    environment: Environment
  ): void {
    if (!this.active || this.targetVisitorIds.size === 0) return;

    this.elapsedSeconds += delta;
    const shorelineY = beach.shorelineY || 280;
    const currentSpeed = environment.waterCurrent ?? 1.9;
    const nowSimTime = performance.now() / 1000;

    for (const swimmerId of Array.from(this.targetVisitorIds)) {
      const swimmer = visitors.find((v) => v.id === swimmerId && v.active);
      if (!swimmer) continue;

      const offset = this.swimmerChannelOffsets.get(swimmerId) || 0;
      const targetCenterX = 560 + offset;

      // 1. Entrainment & Physical Seaward Transport (in 2D coordinates)
      const driftStep = delta * 14.5 * (currentSpeed / 1.5);
      swimmer.position.y += driftStep;
      // Slight channel convergence towards assigned lane
      swimmer.position.x += (targetCenterX - swimmer.position.x) * delta * 0.8;

      swimmer.velocity = {
        vx: (targetCenterX - swimmer.position.x) * 0.2,
        vy: driftStep / Math.max(0.01, delta),
      };

      const distOffshore = swimmer.position.y - shorelineY;

      // 2. Physiological Stress Progression
      swimmer.fatigue = Math.min(1.0, (swimmer.fatigue || 0.2) + delta * 0.05);
      swimmer.distressLevel = Math.min(1.0, (swimmer.distressLevel || 0.1) + delta * 0.07);

      // 3. Stage 1: Struggle (swimmer realizes they cannot make headway against rip jet)
      if (distOffshore > 55 && swimmer.state !== 'DISTRESS') {
        swimmer.state = 'STRUGGLING';
        swimmer.awarenessState = 'TRAPPED';
      }

      // 4. Stage 2: Acute Distress & Emergency Safety Alert
      if (distOffshore > 90) {
        // Check if an incident already exists for this specific swimmer
        let existingIncident = Array.from(this.activeIncidents.values()).find(
          (inc) => inc.visitorId === swimmer.id && !inc.resolved
        );

        if (!existingIncident) {
          swimmer.state = 'DISTRESS';
          this.scenarioState = 'DISTRESS_ALERTED';
          this.isAlertIssued = true;

          const nowTimeStr = new Date().toTimeString().split(' ')[0];
          const incidentId = `INC-RIP-${swimmer.id.slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;

          // Convert 2D position to approximate 3D world space coordinates
          const posX3D = (swimmer.position.x - 500) * 0.25;
          const posZ3D = -((swimmer.position.y - shorelineY) * 0.45);

          const newIncident: DistressIncidentEvent = {
            incidentId,
            visitorId: swimmer.id,
            visitorName: `Bather #${swimmer.id.slice(-4)}`,
            hazardId: 'HAZ-RIP-01',
            hazardType: 'RIP_CURRENT',
            onsetSimTime: nowSimTime,
            alertSimTime: nowSimTime + 1.1,
            detectionLatencySec: 1.1,
            timeDisplay: nowTimeStr,
            position3D: { x: posX3D, y: -0.22, z: posZ3D },
            position2D: { x: swimmer.position.x, y: swimmer.position.y },
            stage: 'ALERT_ISSUED',
            severity: 'CRITICAL',
            description: `Swimmer #${swimmer.id.slice(-4)} carried offshore by rip current neck channel into deep water. Active distress detected. Immediate rescue intervention required.`,
            resolved: false,
          };

          this.activeIncidents.set(incidentId, newIncident);

          // Play distress alarm sound (throttled to at most once every 3 seconds)
          if (nowSimTime - this.lastAlertAudioTime > 3.0) {
            soundEngine.playDistressAlarm();
            this.lastAlertAudioTime = nowSimTime;
          }

          // Ingest into IncidentEventRecorder for Incident Replay & Audit
          IncidentEventRecorder.getInstance().recordTick({
            time: Math.floor(nowSimTime),
            timeDisplay: nowTimeStr,
            visitors,
            hazards: [
              {
                id: 'HAZ-RIP-01',
                type: 'RIP_CURRENT',
                name: 'Rip Current Channel Formation',
                severity: 'CRITICAL',
                affectedZoneIds: ['SZ-02'],
                description: 'Offshore rip channel entraining swimmers.',
                reason: 'High seaward jet velocity.',
                detectedAt: nowTimeStr,
                confidence: 0.96,
                active: true,
              },
            ],
            incidents: [
              {
                id: incidentId,
                type: 'DISTRESS',
                visitorIds: [swimmer.id],
                zoneId: 'SZ-02',
                severity: 'CRITICAL',
                title: `Rip Current Swimmer Distress (#${swimmer.id.slice(-4)})`,
                description: `Swimmer #${swimmer.id} trapped in rip neck.`,
                startedAt: Math.floor(nowSimTime),
                location: { x: swimmer.position.x, y: swimmer.position.y },
                active: true,
              },
            ],
            emergencyIncidents: [],
            emergencyResources: [],
            metrics: {} as any,
          } as any);

          this.notify();
        }
      }
    }
  }

  public getTargetVisitorIds(): string[] {
    return Array.from(this.targetVisitorIds);
  }

  public getSwimmerOffset(visitorId: string): number {
    return this.swimmerChannelOffsets.get(visitorId) || 0;
  }

  public getActiveIncident(): DistressIncidentEvent | null {
    const list = this.getActiveIncidents();
    return list.length > 0 ? list[0] : null;
  }

  public getActiveIncidents(): DistressIncidentEvent[] {
    return Array.from(this.activeIncidents.values()).filter((inc) => !inc.resolved);
  }

  public getMetrics(): RipMetrics {
    const activeList = this.getActiveIncidents();
    return {
      activeHazardsCount: this.active ? 1 : 0,
      swimmersInRipCount: this.targetVisitorIds.size,
      activeDistressCount: activeList.length,
      timeToAlertSeconds: activeList.length > 0 ? 1.1 : null,
      incidentDurationSeconds: Math.floor(this.elapsedSeconds),
    };
  }
}
