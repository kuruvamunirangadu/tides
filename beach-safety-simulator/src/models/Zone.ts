export type ZoneType =
  | 'BEACH_ZONE'
  | 'SWIMMING'
  | 'RESTRICTED'
  | 'SHORELINE'
  | 'WATER_AREA'
  | 'LIFEGUARD_ZONE';

export type ZoneStatus = 'OPEN' | 'CAUTION' | 'CLOSED';

export interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  x: number;
  y: number;
  width: number;
  height: number;
  status: ZoneStatus;
  color?: string;
}
