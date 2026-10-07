import { Camera, CameraStatus } from '../models/Camera';
import { DEFAULT_CAMERAS } from '../VisionConfig';

export class CameraManager {
  private cameras: Map<string, Camera> = new Map();
  private selectedCameraId: string = 'CAM-01';

  constructor(initialCameras: Camera[] = DEFAULT_CAMERAS) {
    initialCameras.forEach((cam) => {
      this.cameras.set(cam.id, { ...cam });
    });
  }

  public getAllCameras(): Camera[] {
    return Array.from(this.cameras.values());
  }

  public getCamera(id: string): Camera | undefined {
    return this.cameras.get(id);
  }

  public getSelectedCamera(): Camera {
    return this.cameras.get(this.selectedCameraId) || this.getAllCameras()[0] || DEFAULT_CAMERAS[0];
  }

  public selectCamera(id: string): void {
    if (this.cameras.has(id)) {
      this.selectedCameraId = id;
    }
  }

  public updateCameraStatus(id: string, status: CameraStatus): void {
    const cam = this.cameras.get(id);
    if (cam) {
      cam.status = status;
    }
  }

  public updateCameraControls(
    id: string,
    updates: Partial<Pick<Camera, 'rotation' | 'fieldOfView' | 'range' | 'detectionEnabled'>>
  ): void {
    const cam = this.cameras.get(id);
    if (cam) {
      Object.assign(cam, updates);
    }
  }

  public addCamera(camera: Camera): void {
    this.cameras.set(camera.id, camera);
  }

  public removeCamera(id: string): void {
    this.cameras.delete(id);
  }

  public reset(): void {
    this.cameras.clear();
    DEFAULT_CAMERAS.forEach((cam) => {
      this.cameras.set(cam.id, { ...cam });
    });
    this.selectedCameraId = 'CAM-01';
  }
}
