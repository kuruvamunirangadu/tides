export interface DroneCamera {
  id: string;
  droneId: string;
  resolution: {
    width: number;
    height: number;
  };
  fps: number;
  fieldOfView: number; // degrees horizontal FOV (e.g. 60° to 85°)
  zoomLevel: number; // 1.0x to 10.0x
  orientation: {
    pitch: number; // gimbal pitch (-90° is nadir/straight down)
    yaw: number; // heading relative to drone or north
    roll: number;
  };
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  streamUrl?: string;
  irThermalMode?: boolean;
}
