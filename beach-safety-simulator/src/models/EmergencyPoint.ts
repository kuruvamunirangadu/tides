export type EmergencyPointType = 'FIRST_AID' | 'EMERGENCY_RESPONSE' | 'AMBULANCE_ACCESS' | 'RESCUE_EQUIPMENT';

export interface EmergencyPoint {
  id: string;
  name: string;
  type: EmergencyPointType;
  x: number;
  y: number;
}
