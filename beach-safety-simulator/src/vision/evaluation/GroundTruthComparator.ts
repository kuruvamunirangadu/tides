import { Camera } from '../models/Camera';
import { DetectedPerson } from '../models/Detection';
import { PersonTrack } from '../models/PersonTrack';
import { DistressDetection } from '../models/BehaviorDetection';
import { Visitor } from '../../models/Visitor';
import { VisionMetrics } from './VisionMetrics';
import { CameraSimulator } from '../cameras/CameraSimulator';

export class GroundTruthComparator {
  public evaluatePerformance(
    cameras: Camera[],
    allDetections: DetectedPerson[],
    tracks: PersonTrack[],
    distressDetections: DistressDetection[],
    groundTruthVisitors: Visitor[],
    simTime: number
  ): VisionMetrics {
    const totalPeople = groundTruthVisitors.length;
    const onlineCameras = cameras.filter((c) => c.status !== 'OFFLINE');

    // 1. Coverage & Blind-Zone computation
    const visibleVisitors = groundTruthVisitors.filter((v) =>
      onlineCameras.some((c) => CameraSimulator.isPointInView(c, v.position))
    );
    const peopleInCoverage = visibleVisitors.length;
    const peopleInBlindZones = totalPeople - peopleInCoverage;
    const coveragePercentage = totalPeople > 0 ? Math.round((peopleInCoverage / totalPeople) * 100) : 100;

    // 2. Person Detection Precision / Recall
    const detectedVisitorIds = new Set(allDetections.map((d) => d.groundTruthVisitorId));
    let tp = 0;
    let fn = 0;

    for (const v of visibleVisitors) {
      if (detectedVisitorIds.has(v.id)) {
        tp += 1;
      } else {
        fn += 1;
      }
    }

    // Simulated false positives (e.g. wave foam clutter / buoy artifacts)
    const fp = Math.max(0, allDetections.length - detectedVisitorIds.size);

    const precision = tp + fp > 0 ? Math.round((tp / (tp + fp)) * 100) : 100;
    const recall = tp + fn > 0 ? Math.round((tp / (tp + fn)) * 100) : 100;
    const f1Score = precision + recall > 0 ? Math.round((2 * precision * recall) / (precision + recall)) : 100;

    // 3. Distress Detection Precision / Recall
    const actualDistressed = groundTruthVisitors.filter(
      (v) => v.state === 'DISTRESS' || v.state === 'STRUGGLING'
    );
    const detectedDistressTrackIds = new Set(distressDetections.map((d) => d.groundTruthVisitorId));

    let distressTp = 0;
    for (const d of actualDistressed) {
      if (detectedDistressTrackIds.has(d.id)) {
        distressTp += 1;
      }
    }

    const distressRate = actualDistressed.length > 0
      ? Math.min(100, Math.round((distressTp / actualDistressed.length) * 100))
      : 100;

    // 4. Tracking Durations
    const activeTracks = tracks.filter((t) => t.active);
    const avgDuration = activeTracks.length > 0
      ? Math.round(
          activeTracks.reduce((acc, t) => acc + (simTime - t.firstSeen), 0) / activeTracks.length
        )
      : 0;

    return {
      totalPeopleInBeach: totalPeople,
      peopleInCameraCoverage: peopleInCoverage,
      peopleInBlindZones: peopleInBlindZones,
      coveragePercentage,
      activeCameraCount: onlineCameras.length,
      offlineCameraCount: cameras.length - onlineCameras.length,
      truePositives: tp,
      falsePositives: fp,
      falseNegatives: fn,
      precision,
      recall,
      f1Score,
      actualDistressedCount: actualDistressed.length,
      detectedDistressedCount: distressDetections.length,
      distressDetectionRate: distressRate,
      averageDetectionLatencySec: 2.5,
      activeTrackCount: activeTracks.length,
      averageTrackDurationSec: avgDuration,
    };
  }
}
