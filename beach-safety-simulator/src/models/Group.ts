export type GroupType = 'FAMILY' | 'FRIENDS' | 'TOUR_GROUP' | 'SOLO';

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  leaderId: string;
  memberIds: string[];
  targetZoneId: string;
  cohesionRadius: number; // Pixels / distance members aim to stay within
}
