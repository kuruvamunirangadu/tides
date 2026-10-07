export type StationStatus = 'ACTIVE' | 'STANDBY' | 'CLOSED';

export interface LifeguardStation {
  id: string;
  name: string;
  position: {
    x: number;
    y: number;
  };
  status: StationStatus;
  coverageRadius: number;
}
