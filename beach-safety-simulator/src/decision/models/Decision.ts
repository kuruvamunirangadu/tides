import { ResponseAction } from './ResponseAction';
import { RiskCategory } from '../../models/Risk';

export type DecisionStatus =
  | 'PENDING'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'ESCALATED';

export interface Decision {
  id: string;
  incidentId?: string;
  zoneId: string;
  riskLevel: RiskCategory;
  actions: ResponseAction[];
  priority: number; // 0 - 100
  reason: string;
  resourcesRequired: string[];
  resourcesAssigned: string[];
  createdAt: number; // timestamp
  updatedAt: number;
  status: DecisionStatus;
}
