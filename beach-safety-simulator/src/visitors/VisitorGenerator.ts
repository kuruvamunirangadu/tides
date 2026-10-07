import { Visitor, VisitorGenerationConfig, VisitorType } from '../models/Visitor';
import { BEHAVIOR_PROFILES } from './behavior/BehaviorProfiles';
import { GroupManager } from './crowd/GroupManager';
import { BehaviorProbability } from './behavior/BehaviorProbability';

export const DEFAULT_GENERATION_CONFIG: VisitorGenerationConfig = {
  arrivalRate: 30, // visitors per minute
  maxVisitors: 150,
  visitorDistribution: {
    tourist: 0.35,
    swimmer: 0.30,
    child: 0.12,
    experiencedSwimmer: 0.10,
    nonSwimmer: 0.08,
    riskTaker: 0.03,
    warningIgnorer: 0.02,
  },
};

export class VisitorGenerator {
  private static visitorCounter = 1;

  public static generateSingleVisitor(
    type: VisitorType,
    spawnX?: number,
    spawnY?: number
  ): Visitor {
    const id = `V-${this.visitorCounter++}`;
    const x = spawnX ?? Math.floor(100 + Math.random() * 1000);
    const y = spawnY ?? Math.floor(40 + Math.random() * 60);

    let profile = BEHAVIOR_PROFILES.NORMAL;
    let swimmingAbility = 0.5 + (Math.random() - 0.5) * 0.3;
    let riskTolerance = 0.4 + (Math.random() - 0.5) * 0.2;
    let warningResponse = 0.7 + (Math.random() - 0.5) * 0.2;
    let awareness = 0.6 + (Math.random() - 0.5) * 0.3;
    let speed = 1.0;
    let color = '#38bdf8'; // sky-400

    switch (type) {
      case 'CHILD':
        profile = BEHAVIOR_PROFILES.CAUTIOUS;
        swimmingAbility = 0.3;
        riskTolerance = 0.4;
        warningResponse = 0.6;
        awareness = 0.35;
        speed = 0.85;
        color = '#c084fc'; // purple-400
        break;

      case 'TOURIST':
        profile = BEHAVIOR_PROFILES.UNAWARE;
        swimmingAbility = 0.45;
        riskTolerance = 0.55;
        warningResponse = 0.65;
        awareness = 0.3;
        speed = 0.95;
        color = '#fb923c'; // orange-400
        break;

      case 'EXPERIENCED_SWIMMER':
        profile = BEHAVIOR_PROFILES.NORMAL;
        swimmingAbility = 0.95;
        riskTolerance = 0.65;
        warningResponse = 0.85;
        awareness = 0.9;
        speed = 1.25;
        color = '#34d399'; // emerald-400
        break;

      case 'NON_SWIMMER':
        profile = BEHAVIOR_PROFILES.CAUTIOUS;
        swimmingAbility = 0.1;
        riskTolerance = 0.2;
        warningResponse = 0.95;
        awareness = 0.7;
        speed = 0.9;
        color = '#fde047'; // yellow-300
        break;

      case 'RESTRICTED_ZONE_ENTRY':
        profile = BEHAVIOR_PROFILES.RISK_TAKING;
        swimmingAbility = 0.7;
        riskTolerance = 0.9;
        warningResponse = 0.2;
        awareness = 0.4;
        speed = 1.1;
        color = '#f43f5e'; // rose-500
        break;

      case 'WARNING_IGNORER':
        profile = BEHAVIOR_PROFILES.WARNING_IGNORER;
        swimmingAbility = 0.6;
        riskTolerance = 0.95;
        warningResponse = 0.1;
        awareness = 0.4;
        speed = 1.05;
        color = '#e11d48'; // red-600
        break;

      case 'DISTRESSED_SWIMMER':
        profile = BEHAVIOR_PROFILES.DISTRESSED;
        swimmingAbility = 0.2;
        riskTolerance = 0.3;
        warningResponse = 0.4;
        awareness = 0.2;
        speed = 0.4;
        color = '#dc2626'; // red-600
        break;

      case 'SWIMMER':
      default:
        profile = BEHAVIOR_PROFILES.NORMAL;
        swimmingAbility = 0.65;
        riskTolerance = 0.5;
        warningResponse = 0.75;
        awareness = 0.65;
        speed = 1.0;
        color = '#38bdf8'; // sky-400
        break;
    }

    return {
      id,
      type,
      position: { x, y },
      currentZone: 'ZONE_BEACH',
      state: type === 'DISTRESSED_SWIMMER' ? 'DISTRESS' : 'ENTERING',
      behavior: { ...profile },
      vulnerability: 1.0 - swimmingAbility,
      awareness: BehaviorProbability.clamp(awareness),
      swimmingAbility: BehaviorProbability.clamp(swimmingAbility),
      riskTolerance: BehaviorProbability.clamp(riskTolerance),
      warningResponse: BehaviorProbability.clamp(warningResponse),
      distressLevel: type === 'DISTRESSED_SWIMMER' ? 0.9 : 0.0,
      speed,
      awarenessState: type === 'DISTRESSED_SWIMMER' ? 'TRAPPED' : 'UNAWARE',
      reactionDelaySeconds: 1.0 + Math.random() * 1.2,
      localWaterDepth: 0.0,
      active: true,
      fatigue: 0.0,
      waterTime: 0,
      velocity: { vx: 0, vy: 0 },
      driftVector: { dx: 0, dy: 0 },
      color,
      warningCount: 0,
      distressState:
        type === 'DISTRESSED_SWIMMER'
          ? {
              level: 0.9,
              cause: 'STRONG_CURRENT',
              startedAt: 0,
              location: { x, y },
              assistanceRequired: true,
            }
          : undefined,
    };
  }

  public static generateFamilyGroup(
    groupManager: GroupManager,
    spawnX?: number,
    spawnY?: number
  ): Visitor[] {
    const startX = spawnX ?? Math.floor(200 + Math.random() * 800);
    const startY = spawnY ?? Math.floor(40 + Math.random() * 50);

    const parent1 = this.generateSingleVisitor('TOURIST', startX, startY);
    parent1.isLeader = true;

    const parent2 = this.generateSingleVisitor('NON_SWIMMER', startX + 15, startY + 5);
    const child1 = this.generateSingleVisitor('CHILD', startX - 10, startY + 12);
    const child2 = this.generateSingleVisitor('CHILD', startX + 8, startY + 15);

    const group = groupManager.createGroup('Family Group', 'FAMILY', parent1.id, 'ZONE_B');

    [parent1, parent2, child1, child2].forEach((v) => {
      v.groupId = group.id;
      v.leaderId = parent1.id;
      groupManager.addMember(group.id, v.id);
    });

    return [parent1, parent2, child1, child2];
  }

  public static selectRandomVisitorType(config: VisitorGenerationConfig): VisitorType {
    const rand = Math.random();
    const d = config.visitorDistribution;

    let cumulative = 0;
    cumulative += d.tourist;
    if (rand < cumulative) return 'TOURIST';

    cumulative += d.swimmer;
    if (rand < cumulative) return 'SWIMMER';

    cumulative += d.child;
    if (rand < cumulative) return 'CHILD';

    cumulative += d.experiencedSwimmer;
    if (rand < cumulative) return 'EXPERIENCED_SWIMMER';

    cumulative += d.nonSwimmer;
    if (rand < cumulative) return 'NON_SWIMMER';

    cumulative += d.riskTaker;
    if (rand < cumulative) return 'RESTRICTED_ZONE_ENTRY';

    return 'WARNING_IGNORER';
  }
}
