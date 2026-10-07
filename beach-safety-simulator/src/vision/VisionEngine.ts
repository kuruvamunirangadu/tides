import { CameraManager } from './cameras/CameraManager';
import { PersonDetector } from './detection/PersonDetector';
import { ObjectTracker } from './tracking/ObjectTracker';
import { CrowdDetector } from './crowd/CrowdDetector';
import { ZoneDetector } from './zones/ZoneDetector';
import { BehaviorAnalyzer } from './behavior/BehaviorAnalyzer';
import { DistressDetector } from './distress/DistressDetector';
import { DetectionFusion, FusedSafetyDetection } from './fusion/DetectionFusion';
import { GroundTruthComparator } from './evaluation/GroundTruthComparator';
import { VisionMetrics } from './evaluation/VisionMetrics';
import { Camera } from './models/Camera';
import { DetectedPerson } from './models/Detection';
import { PersonTrack } from './models/PersonTrack';
import { CrowdDetection } from './models/CrowdDetection';
import { BehaviorDetection, DistressDetection } from './models/BehaviorDetection';
import { CVSafetyEvent } from './models/CVSafetyEvent';
import { Visitor } from '../models/Visitor';
import { Zone } from '../models/Zone';
import { Hazard } from '../models/Hazard';

export interface VisionState {
  cameras: Camera[];
  selectedCamera: Camera;
  detections: DetectedPerson[];
  tracks: PersonTrack[];
  crowdDetections: CrowdDetection[];
  behaviorDetections: BehaviorDetection[];
  distressDetections: DistressDetection[];
  safetyEvents: CVSafetyEvent[];
  fusedDetections: FusedSafetyDetection[];
  metrics: VisionMetrics;
}

export class VisionEngine {
  private cameraManager: CameraManager = new CameraManager();
  private personDetector: PersonDetector = new PersonDetector();
  private objectTracker: ObjectTracker = new ObjectTracker();
  private crowdDetector: CrowdDetector = new CrowdDetector();
  private zoneDetector: ZoneDetector = new ZoneDetector();
  private behaviorAnalyzer: BehaviorAnalyzer = new BehaviorAnalyzer();
  private distressDetector: DistressDetector = new DistressDetector();
  private detectionFusion: DetectionFusion = new DetectionFusion();
  private groundTruthComparator: GroundTruthComparator = new GroundTruthComparator();

  private activeSafetyEvents: CVSafetyEvent[] = [];
  private latestVisionState?: VisionState;

  public getCameraManager(): CameraManager {
    return this.cameraManager;
  }

  public getPersonDetector(): PersonDetector {
    return this.personDetector;
  }

  public getObjectTracker(): ObjectTracker {
    return this.objectTracker;
  }

  public tick(
    visitors: Visitor[],
    zones: Zone[],
    hazards: Hazard[],
    simTime: number,
    timeDisplay: string,
    deltaTime: number,
    isNightMode: boolean = false
  ): VisionState {
    const cameras = this.cameraManager.getAllCameras();
    const selectedCamera = this.cameraManager.getSelectedCamera();

    // 1. Layer 2: Person Detection across active cameras
    const cameraDetectionsMap = this.personDetector.detectPeopleInCameras(
      cameras,
      visitors,
      simTime,
      isNightMode
    );
    const allDetections: DetectedPerson[] = [];
    for (const dets of cameraDetectionsMap.values()) {
      allDetections.push(...dets);
    }

    // 2. Layer 3: Multi-Object Tracking
    const tracks = this.objectTracker.updateTracks(cameraDetectionsMap, simTime, deltaTime);

    // 3. Layer 4: Crowd Density & Safety Zones
    const crowdDetections = this.crowdDetector.analyzeCrowds(cameras, tracks, zones, simTime);
    const { safetyEvents: zoneEvents } = this.zoneDetector.evaluateZoneEntries(
      tracks,
      zones,
      simTime,
      timeDisplay
    );

    // 4. Layer 5: Behavior & Drift Analysis
    const { behaviors: behaviorDetections, safetyEvents: behaviorEvents } =
      this.behaviorAnalyzer.analyzeBehavior(tracks, simTime, timeDisplay);

    // 5. Layer 6: Distress & Anomaly Detection
    const { detections: distressDetections, safetyEvents: distressEvents } =
      this.distressDetector.evaluateDistress(tracks, visitors, simTime, timeDisplay);

    // Combine safety events
    const currentEvents = [...zoneEvents, ...behaviorEvents, ...distressEvents];
    this.activeSafetyEvents = [...this.activeSafetyEvents, ...currentEvents].slice(-50);

    // 6. Layer 7: Multi-Source Detection Fusion
    const fusedDetections = this.detectionFusion.fuseDetections(
      this.activeSafetyEvents,
      distressDetections,
      hazards,
      tracks,
      visitors,
      simTime
    );

    // 7. Ground Truth Evaluation
    const metrics = this.groundTruthComparator.evaluatePerformance(
      cameras,
      allDetections,
      tracks,
      distressDetections,
      visitors,
      simTime
    );

    this.latestVisionState = {
      cameras,
      selectedCamera,
      detections: allDetections,
      tracks,
      crowdDetections,
      behaviorDetections,
      distressDetections,
      safetyEvents: this.activeSafetyEvents,
      fusedDetections,
      metrics,
    };

    return this.latestVisionState;
  }

  public getLatestState(): VisionState | undefined {
    return this.latestVisionState;
  }

  public reset(): void {
    this.cameraManager.reset();
    this.objectTracker.reset();
    this.distressDetector.reset();
    this.activeSafetyEvents = [];
    this.latestVisionState = undefined;
  }
}
