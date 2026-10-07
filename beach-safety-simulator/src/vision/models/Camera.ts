export type CameraStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED';

export interface Camera {
  id: string;
  name: string;
  position: {
    x: number;
    y: number;
  };
  rotation: number; // degrees (0 - 360, 90 = facing seaward down)
  fieldOfView: number; // degrees (e.g. 80 - 110)
  range: number; // pixels / meters in view range (e.g. 180 - 300)
  resolution: {
    width: number;
    height: number;
  };
  fps: number;
  status: CameraStatus;
  zoneIds: string[];
  detectionEnabled: boolean;
  color?: string;
}
