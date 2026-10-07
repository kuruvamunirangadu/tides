export interface VisionMetrics {
  totalPeopleInBeach: number;
  peopleInCameraCoverage: number;
  peopleInBlindZones: number;
  coveragePercentage: number; // e.g. 78%
  activeCameraCount: number;
  offlineCameraCount: number;

  // Detection performance
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number; // 0 - 100%
  recall: number; // 0 - 100%
  f1Score: number; // 0 - 100%

  // Distress detection accuracy
  actualDistressedCount: number;
  detectedDistressedCount: number;
  distressDetectionRate: number; // %
  averageDetectionLatencySec: number;

  // Tracking metrics
  activeTrackCount: number;
  averageTrackDurationSec: number;
}
