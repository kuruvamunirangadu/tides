import { Decision } from '../models/Decision';

export interface DecisionLogEntry {
  id: string;
  timestampDisplay: string;
  timestamp: number;
  zoneId: string;
  riskLevel: string;
  reason: string;
  actionsTaken: string[];
  resourcesAssigned: string[];
  status: string;
}

export class DecisionHistory {
  private history: DecisionLogEntry[] = [];

  public logDecision(decision: Decision, timeDisplay: string): void {
    const entry: DecisionLogEntry = {
      id: decision.id,
      timestampDisplay: timeDisplay,
      timestamp: decision.createdAt,
      zoneId: decision.zoneId,
      riskLevel: decision.riskLevel,
      reason: decision.reason,
      actionsTaken: decision.actions.map((a) => a.type),
      resourcesAssigned: decision.resourcesAssigned,
      status: decision.status,
    };

    this.history.unshift(entry);
    if (this.history.length > 50) {
      this.history.pop();
    }
  }

  public getHistory(): DecisionLogEntry[] {
    return [...this.history];
  }

  public clear(): void {
    this.history = [];
  }
}
