export type ActionType =
  | 'MONITOR'
  | 'WARNING'
  | 'ALERT_LIFEGUARD'
  | 'ACTIVATE_PA'
  | 'ACTIVATE_WARNING_DISPLAY'
  | 'DISPATCH_LIFEGUARD'
  | 'DISPATCH_DRONE'
  | 'CLOSE_ZONE'
  | 'EVACUATE_ZONE'
  | 'NOTIFY_COMMAND_CENTER'
  | 'REQUEST_EXTERNAL_ASSISTANCE';

export type ActionStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'FAILED';

export interface ResponseAction {
  id: string;
  type: ActionType;
  targetZone?: string;
  targetVisitorId?: string;
  resourceId?: string;
  priority: number;
  status: ActionStatus;
  reason: string;
  startedAt: number; // timestamp in seconds
  completedAt?: number;
  targetLocation?: { x: number; y: number };
}
