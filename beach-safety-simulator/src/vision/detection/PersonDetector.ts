import { Camera } from '../models/Camera';
import { DetectedPerson } from '../models/Detection';
import { Visitor } from '../../models/Visitor';
import { CameraSimulator } from '../cameras/CameraSimulator';

export class PersonDetector {
  private minConfidenceThreshold: number = 0.45;

  public setConfidenceThreshold(threshold: number): void {
    this.minConfidenceThreshold = Math.max(0.1, Math.min(0.95, threshold));
  }

  /**
   * Processes all active cameras against the visitor population to produce object detections.
   */
  public detectPeopleInCameras(
    cameras: Camera[],
    visitors: Visitor[],
    simTime: number,
    isNightMode: boolean = false
  ): Map<string, DetectedPerson[]> {
    const cameraDetectionsMap = new Map<string, DetectedPerson[]>();

    for (const camera of cameras) {
      if (camera.status === 'OFFLINE' || !camera.detectionEnabled) {
        cameraDetectionsMap.set(camera.id, []);
        continue;
      }

      const detections: DetectedPerson[] = [];

      for (const visitor of visitors) {
        // Check if visitor position is inside camera FOV cone
        if (CameraSimulator.isPointInView(camera, visitor.position)) {
          const { bbox, confidence } = CameraSimulator.generateBoundingBox(
            camera,
            visitor,
            isNightMode
          );

          if (confidence >= this.minConfidenceThreshold) {
            detections.push({
              id: `DET-${camera.id}-${visitor.id}`,
              bbox,
              confidence,
              className: 'PERSON',
              cameraId: camera.id,
              timestamp: simTime,
              groundTruthVisitorId: visitor.id,
              worldPosition: { ...visitor.position },
              inWater: visitor.position.y >= 260,
            });
          }
        }
      }

      cameraDetectionsMap.set(camera.id, detections);
    }

    return cameraDetectionsMap;
  }
}
