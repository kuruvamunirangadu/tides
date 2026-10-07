export type CommandActionType =
  | 'ACKNOWLEDGE_INCIDENT'
  | 'DISPATCH_LIFEGUARD'
  | 'DISPATCH_DRONE_VERIFICATION'
  | 'DISPATCH_RESCUE_BOAT'
  | 'DISPATCH_AMBULANCE'
  | 'DISPATCH_POLICE'
  | 'BROADCAST_PA_WARNING'
  | 'UPDATE_LED_BOARDS'
  | 'CLOSE_ZONE'
  | 'INITIATE_BEACH_EVACUATION'
  | 'ESCALATE_INCIDENT'
  | 'MARK_FALSE_ALARM'
  | 'RESOLVE_INCIDENT';

export interface CommandAction {
  id: string;
  operatorId: string;
  operatorRole: string;
  type: CommandActionType;
  beachId: string;
  targetId: string;
  timestamp: number;
  timeDisplay: string;
  reason?: string;
  status: 'REQUESTED' | 'APPROVED' | 'EXECUTED' | 'FAILED';
  executionDetails?: string;
}
