import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Scene3DProps, CameraPresetType } from './scene3d.types';
import { BeachTerrain } from './BeachTerrain';
import { OceanSurface } from './OceanSurface';
import { BeachLighting } from './BeachLighting';
import { BeachCamera, CAMERA_PRESETS } from './BeachCamera';
import { VisitorLayer3D } from './visitors/VisitorLayer3D';
import { VisitorCoordinateMapper } from './visitors/VisitorCoordinateMapper';
import { RipCurrentVisual3D } from './hazards/RipCurrentVisual3D';
import { RipCurrentSimulator } from './hazards/RipCurrentSimulator';
import { RipCurrentScenarioHUD } from './hazards/RipCurrentScenarioHUD';
import { RescueOperationLayer } from './rescue/RescueOperationLayer';
import { RescueCoordinator } from './rescue/RescueCoordinator';
import { RescueTimelineHUD } from './rescue/RescueTimelineHUD';
import { CameraDirector } from './camera/CameraDirector';
import { CameraModeSelector } from './camera/CameraModeSelector';
import { SpatialAudioEngine } from '../audio/SpatialAudioEngine';
import { SpatialAudioHUD } from './audio/SpatialAudioHUD';
import { IncidentReplay3DController } from './replay/IncidentReplay3DController';
import { IncidentReplayOverlay3D } from './replay/IncidentReplayOverlay3D';
import { UnifiedOperationsCenter } from './command/UnifiedOperationsCenter';
import { PredictiveHazardVisual3D } from './hazards/PredictiveHazardVisual3D';
import { ForecastEngine } from '../prediction/ForecastEngine';
import { CameraCoverageVisual3D } from './vision/CameraCoverageVisual3D';
import { DEFAULT_CAMERAS } from '../vision/VisionConfig';
import { MultiSwimmerRescueHUD } from './rescue/MultiSwimmerRescueHUD';
import { PerSwimmerRescueEvaluator } from './rescue/PerSwimmerRescueEvaluator';
import { SwimmerMotionAdapter } from './visitors/SwimmerMotionAdapter';
import { SwimmerPhysicsHUD } from './visitors/SwimmerPhysicsHUD';
import { GeoCalibrationVisual3D } from './vision/GeoCalibrationVisual3D';
import { GeoCalibrationHUD } from '../geospatial/GeoCalibrationHUD';
import { DepthContourVisual3D } from './terrain/DepthContourVisual3D';
import { TerrainInspectionHUD } from '../terrain/TerrainInspectionHUD';
import { AerialImageLayer3D } from './terrain/AerialImageLayer3D';
import { RescueActionFlowHUD } from './rescue/RescueActionFlowHUD';
import { VisitorCharacter3D } from './visitors/VisitorCharacter3D';
import { DroneLayer3D } from './drones/DroneLayer3D';
import { FlotationRingLayer3D } from './drones/FlotationRingLayer3D';
import { DroneCameraFrustumVisual3D } from './drones/DroneCameraFrustumVisual3D';
import { DroneVirtualFeedManager } from './drones/DroneVirtualFeedManager';
import { DroneCameraModal } from '../drones/components/DroneCameraModal';
import { DroneVisionManager } from '../drones/vision/DroneVisionManager';
import { DroneStatusHUD } from '../drones/components/DroneStatusHUD';
import { SelectedDroneCard } from '../drones/components/SelectedDroneCard';
import { DroneDistressVerificationPanel } from '../drones/components/DroneDistressVerificationPanel';
import { CoastalCoverageVisual3D } from './drones/CoastalCoverageVisual3D';
import { CoastalCoverageHUD } from '../drones/components/CoastalCoverageHUD';
import { DroneCoverageTracker } from '../drones/coverage/DroneCoverageTracker';
import { DroneCameraRegistry } from '../drones/camera/DroneCameraRegistry';
import { DroneRegistry } from '../drones/foundation/DroneRegistry';
import { DroneMovementEngine } from '../drones/movement/DroneMovementEngine';
import { DroneMissionManager } from '../drones/missions/DroneMissionManager';
import { DroneRescueDispatchManager } from '../drones/rescue/DroneRescueDispatchManager';
import { RescueMissionDispatchHUD } from '../drones/components/RescueMissionDispatchHUD';
import { MultiDroneCoordinationEngine } from '../drones/coordination/MultiDroneCoordinationEngine';
import { MultiIncidentVisual3D } from './drones/MultiIncidentVisual3D';
import { MultiDroneCoordinationHUD } from '../drones/components/MultiDroneCoordinationHUD';
import { DroneFaultRecoveryManager } from '../drones/fault/DroneFaultRecoveryManager';
import { DroneFaultVisual3D } from './drones/DroneFaultVisual3D';
import { DroneFaultRecoveryHUD } from '../drones/components/DroneFaultRecoveryHUD';
import { UnifiedCommandCenterHUD } from '../command-center/unified/UnifiedCommandCenterHUD';
import { UnifiedCommandCenterService } from '../command-center/unified/UnifiedCommandCenterService';
import { MissionReplayVisual3D } from './drones/MissionReplayVisual3D';
import { MissionReplayEngine } from '../command-center/unified/MissionReplayEngine';
import { WristbandVisual3D } from './wristbands/WristbandVisual3D';
import { WristbandOperationsHUD } from '../wristbands/components/WristbandOperationsHUD';
import { WristbandRegistry } from '../wristbands/WristbandRegistry';
import { CameraDroneWristbandVisual3D } from './integration/CameraDroneWristbandVisual3D';
import { CameraDroneWristbandPanel } from '../wristbands/components/CameraDroneWristbandPanel';
import { ControlledPilotPanel } from '../pilot/components/ControlledPilotPanel';
import {
  Shield,
  ShieldAlert,
  Globe,
  Mountain,
  Compass,
  RotateCcw,
  Wind,
  Waves,
  Eye,
  Camera as CameraIcon,
  Maximize2,
  Thermometer,
  Layers,
  Users,
  Activity,
  Image as ImageIcon,
  Plane,
  Video,
  Radar,
  LifeBuoy,
  Radio,
  ClipboardCheck,
  ChevronDown,
  Sliders,
  X,
} from 'lucide-react';

/**
 * BeachScene3D.tsx
 * 
 * Main React 3D viewport component for Milestone 1:
 * - Mounts Three.js canvas with hardware-accelerated WebGL rendering
 * - Hosts photorealistic procedural sand dunes, curved shoreline, headlands, and animated ocean waves
 * - OrbitControls camera with tactical presets (Overview, Shoreline, Offshore, Top-down)
 * - Synchronized in real-time with simulation environmental telemetry
 */
export const BeachScene3D: React.FC<Scene3DProps> = ({
  beach,
  environment,
  isNightMode = false,
  hazards = [],
  visitors = [],
  riskOverview,
  className = '',
  onExit3D,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const cameraManagerRef = useRef<BeachCamera | null>(null);
  const [activePreset, setActivePreset] = useState<CameraPresetType>('overview');
  const [fps, setFps] = useState<number>(60);
  const [isOpsCenterOpen, setIsOpsCenterOpen] = useState<boolean>(false);
  const [is3DConesVisible, setIs3DConesVisible] = useState<boolean>(false);
  const [isMultiSwimmerHUDOpen, setIsMultiSwimmerHUDOpen] = useState<boolean>(false);
  const [isPhysicsHUDOpen, setIsPhysicsHUDOpen] = useState<boolean>(false);
  const [isGeoCalibrationHUDOpen, setIsGeoCalibrationHUDOpen] = useState<boolean>(false);
  const [is3DGeoPinsVisible, setIs3DGeoPinsVisible] = useState<boolean>(false);
  const cameraCoverageVisualRef = useRef<CameraCoverageVisual3D | null>(null);
  const geoVisualRef = useRef<GeoCalibrationVisual3D | null>(null);
  const [isTerrainHUDOpen, setIsTerrainHUDOpen] = useState<boolean>(false);
  const [isDepthContoursVisible, setIsDepthContoursVisible] = useState<boolean>(false);
  const [isTerrainWireframe, setIsTerrainWireframe] = useState<boolean>(false);
  const depthContourVisualRef = useRef<DepthContourVisual3D | null>(null);
  const terrainRef = useRef<BeachTerrain | null>(null);

  // Milestone 16 / Option 1: Action Flow HUD and Real Aerial Image Layer
  const [isActionFlowHUDOpen, setIsActionFlowHUDOpen] = useState<boolean>(false);
  const [isAerialImageVisible, setIsAerialImageVisible] = useState<boolean>(false);
  const [aerialOpacity, setAerialOpacity] = useState<number>(0.75);
  const aerialLayerRef = useRef<AerialImageLayer3D | null>(null);

  // Drone Fleet Phase 1 & 2: Status HUD, 3D Layer Ref, and Selection State
  const [isDroneHUDOpen, setIsDroneHUDOpen] = useState<boolean>(false);
  const droneLayerRef = useRef<DroneLayer3D | null>(null);
  const [selectedDroneId, setSelectedDroneId] = useState<string | null>(null);

  // Drone Camera & Simulated Live Feed (Phase 5)
  const [isDroneCameraModalOpen, setIsDroneCameraModalOpen] = useState<boolean>(false);
  const [droneCameraModalDroneId, setDroneCameraModalDroneId] = useState<string>('DRONE-01');
  const [isDroneFovConesVisible, setIsDroneFovConesVisible] = useState<boolean>(true);
  const droneCameraFrustumRef = useRef<DroneCameraFrustumVisual3D | null>(null);

  // Drone Distress Verification & Incident Triage (Phase 7)
  const [isDistressTriageOpen, setIsDistressTriageOpen] = useState<boolean>(false);

  // Drone Coastal Coverage & Multi-Drone Patrol Coordination (Phase 8)
  const [isCoverageHUDOpen, setIsCoverageHUDOpen] = useState<boolean>(false);
  const [is3DCoverageVisible, setIs3DCoverageVisible] = useState<boolean>(true);
  const coastalCoverageVisualRef = useRef<CoastalCoverageVisual3D | null>(null);

  // Drone Rescue Mission Allocation & Dispatch (Phase 9 & 10)
  const [isRescueDispatchHUDOpen, setIsRescueDispatchHUDOpen] = useState<boolean>(false);
  const flotationRingLayerRef = useRef<FlotationRingLayer3D | null>(null);

  // Multi-Incident & Multi-Drone Coordination Subsystem (Phase 11)
  const [isMultiCoordinationHUDOpen, setIsMultiCoordinationHUDOpen] = useState<boolean>(false);
  const multiIncidentVisualRef = useRef<MultiIncidentVisual3D | null>(null);

  // Drone Fault Handling, Resilience & Recovery Subsystem (Phase 12)
  const [isFaultRecoveryHUDOpen, setIsFaultRecoveryHUDOpen] = useState<boolean>(false);
  const droneFaultVisualRef = useRef<DroneFaultVisual3D | null>(null);

  // Unified Coastal Safety Command Center & Mission Replay (Phase 13)
  const [isUnifiedCommandOpen, setIsUnifiedCommandOpen] = useState<boolean>(false);
  const missionReplayVisualRef = useRef<MissionReplayVisual3D | null>(null);

  // Track B Phase 2: Connected Wristband Safety & Localized Warning Subsystem
  const [isWristbandHUDOpen, setIsWristbandHUDOpen] = useState<boolean>(false);
  const wristbandVisualRef = useRef<WristbandVisual3D | null>(null);

  // Phase 4: Camera & Drone Integration with Wristband Safety System
  const [isIntegratedSafetyOpen, setIsIntegratedSafetyOpen] = useState<boolean>(false);
  const integratedSafetyVisualRef = useRef<CameraDroneWristbandVisual3D | null>(null);

  // Phase 5: Controlled Field Pilot & Real-World Validation Framework
  const [isPilotPanelOpen, setIsPilotPanelOpen] = useState<boolean>(false);

  // 3D Viewport Presentation, Overlays & Master Tools State
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState<boolean>(false);
  const [isCleanView, setIsCleanView] = useState<boolean>(false);
  const [isRescueFleetHUDVisible, setIsRescueFleetHUDVisible] = useState<boolean>(false);
  const [isSpatialAudioHUDOpen, setIsSpatialAudioHUDOpen] = useState<boolean>(false);

  // Keep latest simulation references for smooth 60 FPS animation loop
  const visitorsRef = useRef(visitors);
  visitorsRef.current = visitors;
  const beachRef = useRef(beach);
  beachRef.current = beach;
  const environmentRef = useRef(environment);
  environmentRef.current = environment;

  // Environmental telemetry values
  const waveHeight = environment.waveHeight ?? 1.2;
  const currentSpeed = environment.currentSpeed ?? environment.waterCurrent ?? 0.35;
  const windSpeed = environment.windSpeed ?? 18;
  const windDirDeg = Math.round(environment.windDirection ?? 120);
  const tidePhase = environment.tideStatus ?? 'RISING';
  const waterTemp = environment.waterTemperature ?? 27.5;
  const isNight = isNightMode;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 1000;
    const height = container.clientHeight || 650;

    // 1. Scene setup
    const scene = new THREE.Scene();
    const skyColor = isNight ? 0x090e1a : 0xbae6fd;
    scene.background = new THREE.Color(skyColor);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 3. Camera & OrbitControls
    const beachCamera = new BeachCamera(renderer.domElement, width, height);
    cameraManagerRef.current = beachCamera;

    // 4. Lighting & Fog
    const lighting = new BeachLighting(scene, environment, isNight);
    scene.add(lighting.group);

    // 5. Beach Terrain
    const terrain = new BeachTerrain(beach);
    terrainRef.current = terrain;
    scene.add(terrain.mesh);
    scene.add(terrain.landmarksGroup);

    // 6. Dynamic Ocean Surface
    const ocean = new OceanSurface();
    scene.add(ocean.group);

    // 7. 3D Animated Beach Visitors Layer (Milestone 2)
    const visitorLayer = new VisitorLayer3D();
    scene.add(visitorLayer.group);

    // 8. 3D Rip Current Visual Plume & Streamlines (Milestone 3)
    const ripVisual = new RipCurrentVisual3D();
    scene.add(ripVisual.group);

    const ripSimulator = RipCurrentSimulator.getInstance();

    // 9. 3D Intelligent Rescue Operations Fleet Layer (Milestone 4)
    const rescueLayer = new RescueOperationLayer();
    scene.add(rescueLayer.group);

    const rescueCoordinator = RescueCoordinator.getInstance();

    // 10. Milestone 5: Multi-Camera Director, Spatial 3D Audio, and Incident Replay
    const cameraDirector = CameraDirector.getInstance();
    cameraDirector.attachCamera(beachCamera);

    const spatialAudio = SpatialAudioEngine.getInstance();
    const replayController = IncidentReplay3DController.getInstance();

    // 11. Milestone 6: 3D Predictive Hazard Expansion Plume
    const predictiveVisual = new PredictiveHazardVisual3D();
    scene.add(predictiveVisual.group);

    // 12. Milestone 7: 3D Camera Coverage Cones & Blind Spots
    const cameraCoverageVisual = new CameraCoverageVisual3D();
    cameraCoverageVisualRef.current = cameraCoverageVisual;
    cameraCoverageVisual.setVisible(is3DConesVisible);
    scene.add(cameraCoverageVisual.group);

    // 13. Geographic Calibration & 1 km Coastal Georeferencing
    const geoVisual = new GeoCalibrationVisual3D();
    geoVisualRef.current = geoVisual;
    geoVisual.setVisible(is3DGeoPinsVisible);
    scene.add(geoVisual.group);

    // 14. Milestone 15: Real-World Depth Contours (Isobaths) & Bathymetric Markers
    const depthContours = new DepthContourVisual3D();
    depthContourVisualRef.current = depthContours;
    depthContours.setVisible(isDepthContoursVisible);
    scene.add(depthContours.group);

    // 15. Real-World Aerial Image Reference Layer (Option 1)
    const aerialLayer = new AerialImageLayer3D('/rushikonda_aerial.png');
    aerialLayerRef.current = aerialLayer;
    aerialLayer.setVisible(isAerialImageVisible);
    aerialLayer.setOpacity(aerialOpacity);
    scene.add(aerialLayer.group);

    // 16. Drone Fleet Layer 3D (Phase 1 Foundation)
    const droneLayer = new DroneLayer3D();
    droneLayerRef.current = droneLayer;
    scene.add(droneLayer.getGroup());

    // 17. Drone Camera Coverage Frustums & Ground Footprints (Phase 5)
    const droneCameraFrustum = new DroneCameraFrustumVisual3D();
    droneCameraFrustumRef.current = droneCameraFrustum;
    droneCameraFrustum.setVisible(isDroneFovConesVisible);
    scene.add(droneCameraFrustum.getGroup());

    // 18. Coastal Surveillance Zones & Coverage Visualizer (Phase 8)
    const coastalCoverageVisual = new CoastalCoverageVisual3D();
    coastalCoverageVisualRef.current = coastalCoverageVisual;
    coastalCoverageVisual.setVisible(is3DCoverageVisible);
    scene.add(coastalCoverageVisual.getGroup());

    // 19. Deployed Buoyant Flotation Rings Layer (Phase 10)
    const flotationRingLayer = new FlotationRingLayer3D();
    flotationRingLayerRef.current = flotationRingLayer;
    scene.add(flotationRingLayer.group);

    // 20. Multi-Incident & Multi-Drone Coordination 3D Layer (Phase 11)
    const multiIncidentVisual = new MultiIncidentVisual3D();
    multiIncidentVisualRef.current = multiIncidentVisual;
    scene.add(multiIncidentVisual.group);

    // 21. Drone Fault Handling, Resilience & Recovery 3D Layer (Phase 12)
    const droneFaultVisual = new DroneFaultVisual3D();
    droneFaultVisualRef.current = droneFaultVisual;
    scene.add(droneFaultVisual);

    // 22. Mission Replay 3D Layer (Phase 13)
    const missionReplayVisual = new MissionReplayVisual3D(scene);
    missionReplayVisualRef.current = missionReplayVisual;

    // 23. Track B Phase 2: Wristband Safety & Localized Warning 3D Layer
    const wristbandVisual = new WristbandVisual3D();
    wristbandVisualRef.current = wristbandVisual;
    scene.add(wristbandVisual.group);

    // 24. Phase 4: Camera & Drone Integration with Wristband Safety System
    const integratedSafetyVisual = new CameraDroneWristbandVisual3D();
    integratedSafetyVisualRef.current = integratedSafetyVisual;
    scene.add(integratedSafetyVisual.group);

    // Milestone 12: Independent Per-Swimmer Rescue Check Evaluator
    const perSwimmerEvaluator = PerSwimmerRescueEvaluator.getInstance();

    // Milestone 13: Realistic Swimmer Physics & Hydrodynamic Drift Adapter
    const swimmerMotion = SwimmerMotionAdapter.getInstance();
    const visitorMapper = new VisitorCoordinateMapper();

    // 13. Render Loop with FPS calculation
    let animationFrameId: number;
    const clock = new THREE.Clock();
    let frameCount = 0;
    let lastFpsTime = performance.now();
    let lastCoverageAuditTime = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.1);

      // Update modules
      ocean.update(delta, environmentRef.current, isNight);
      beachCamera.update(delta);
      lighting.update(environmentRef.current, isNight);

      // Update Camera Director multi-camera tracking (Milestone 5)
      cameraDirector.update(
        delta,
        visitorsRef.current,
        beachRef.current,
        environmentRef.current
      );

      // Update Spatial 3D Audio Listener and Boat Engine acoustics (Milestone 5)
      spatialAudio.updateListener(beachCamera.camera.position);
      const boatRes = rescueCoordinator.registry.getResource('RB-01');
      if (boatRes) {
        const isMoving = boatRes.status === 'EN_ROUTE' || boatRes.status === 'RETURNING';
        spatialAudio.updateBoatEngine(
          boatRes.currentX,
          boatRes.currentY,
          boatRes.currentZ,
          isMoving ? boatRes.speedMps : 0
        );
      }

      // Update 3D Incident Replay Controller clock (Milestone 5)
      replayController.update(delta);

      // Update Rip Current hazard simulation and dynamic 3D visuals
      const isRipActive =
        ripSimulator.active ||
        (environmentRef.current.ripProbability ?? 0) > 0.6 ||
        hazards.some((h) => h.type === 'RIP_CURRENT');

      const ripSpeed = environmentRef.current.waterCurrent ?? 1.9;
      ripVisual.update(delta, isRipActive, ripSpeed);

      // Milestone 6: Update 3D Predictive Hazard Expansion Plume
      const predictions = ForecastEngine.getInstance().generateForecast('TREND_BASELINE');
      const pred3m = predictions.find((p) => p.horizonMinutes === 3) || predictions[0] || null;
      predictiveVisual.update(delta, pred3m);

      // Milestone 7: Update 3D Camera Coverage Cones
      cameraCoverageVisual.update(DEFAULT_CAMERAS);

      // Geographic Calibration 3D Visuals & Alongshore Geodesic Line
      geoVisual.update(delta);

      // Milestone 15: Real-World Depth Contours (Isobaths)
      depthContours.update(delta);

      // Milestone 13: Realistic Swimmer Physics, Bathymetry & Hydrodynamic Drift
      swimmerMotion.update(
        delta,
        visitorsRef.current,
        beachRef.current,
        environmentRef.current,
        ripSimulator,
        hazards
      );

      ripSimulator.update(
        delta,
        visitorsRef.current,
        beachRef.current,
        environmentRef.current
      );

      // Milestone 4 & 12: Auto-dispatch rescue for all concurrent active distress incidents
      if (rescueCoordinator.autoDispatchEnabled) {
        const activeDistressList = ripSimulator.getActiveIncidents();
        for (const inc of activeDistressList) {
          if (!inc.resolved) {
            rescueCoordinator.handleDistressIncident(
              inc,
              visitorsRef.current,
              beachRef.current
            );

            // Phase 9: Evaluate and coordinate aerial flotation rescue drone allocation & dispatch
            DroneRescueDispatchManager.getInstance().proposeAssignment(inc, performance.now());
          }
        }
      }

      // Milestone 12: Independent Per-Swimmer Rescue Check across entire beach
      perSwimmerEvaluator.update(
        performance.now() / 1000,
        visitorsRef.current,
        beachRef.current,
        environmentRef.current
      );

      // Update Rescue Coordinator navigation, assistance state machine & 3D fleet
      rescueCoordinator.update(
        delta,
        visitorsRef.current,
        beachRef.current,
        environmentRef.current
      );
      rescueLayer.update(delta);

      // Update 3D visitors with authoritative simulation state
      visitorLayer.update(
        delta,
        visitorsRef.current,
        beachRef.current,
        environmentRef.current
      );

      // Drone Movement & Flight Dynamics Engine update (Phase 3)
      DroneMovementEngine.getInstance().update(delta, performance.now());

      // Drone Mission & Patrol Manager lifecycle update (Phase 4)
      DroneMissionManager.getInstance().update(delta, performance.now());

      // Drone Rescue Mission Allocation & Dispatch lifecycle update (Phase 9)
      DroneRescueDispatchManager.getInstance().update(delta, performance.now());

      // Drone Fleet Layer update (Phase 2 & 3)
      droneLayer.update(delta);

      // Deployed Buoyant Flotation Rings Layer update (Phase 10)
      flotationRingLayer.update(delta, performance.now());

      // Multi-Incident & Multi-Drone Coordination Subsystem update (Phase 11)
      MultiDroneCoordinationEngine.getInstance().update(delta, performance.now());
      multiIncidentVisual.update(delta, performance.now());

      // Drone Fault Handling, Resilience & Recovery Subsystem update (Phase 12)
      DroneFaultRecoveryManager.getInstance().update(delta, performance.now());
      droneFaultVisual.update(delta);

      // Phase 13: Mission Replay Visualizer & Engine update (Read-Only Isolated)
      MissionReplayEngine.getInstance().update(delta);
      missionReplayVisual.update(delta);

      // Track B Phase 2: Wristband Fleet & Localized Warning Visualizer update
      WristbandRegistry.getInstance().syncWithVisitors(visitorsRef.current);
      wristbandVisual.update(delta, performance.now());

      // Phase 4: Integrated Camera, Drone & Wristband Safety Visualizer update
      integratedSafetyVisual.update(delta, performance.now());

      // Drone Camera Frustums & Ground Footprints update (Phase 5)
      droneCameraFrustum.update();

      // Drone Aerial Computer Vision & Swimmer Detection inference pipeline (Phase 6)
      const visitors3D = visitorsRef.current.map((v) => {
        const t = visitorMapper.map(v, beachRef.current, environmentRef.current);
        return { id: v.id, x: t.x, y: t.y, z: t.z };
      });
      DroneVisionManager.getInstance().update(performance.now(), visitors3D, isNight);

      // Drone Simulated Live Camera Virtual Feed render pass (Phase 5 & 6)
      DroneVirtualFeedManager.getInstance().renderFeed(renderer, scene, performance.now());

      // Coastal Coverage Surveillance Visualizer (Phase 8)
      coastalCoverageVisual.update(delta);

      // Periodically evaluate coverage health & log camera scan observations (Phase 8)
      lastCoverageAuditTime += delta;
      if (lastCoverageAuditTime >= 1.0) {
        lastCoverageAuditTime = 0;
        const nowMs = performance.now();
        DroneCoverageTracker.getInstance().evaluateCoverageHealth(nowMs);

        // For active surveillance drones on patrol routes, scan their camera footprint ground center
        const allDrones = DroneRegistry.getInstance().getAllDrones();
        for (const drone of allDrones) {
          if (
            drone.role === 'SURVEILLANCE' &&
            drone.connectivity === 'CONNECTED' &&
            (drone.status === 'SEARCHING' || drone.status === 'DISPATCHED')
          ) {
            const cam = DroneCameraRegistry.getInstance().getCameraForDrone(drone.droneId);
            if (cam && cam.status === 'ACTIVE') {
              DroneCoverageTracker.getInstance().recordObservation(
                {
                  observationId: `SCAN-${drone.droneId}-${Math.floor(nowMs)}`,
                  cameraId: cam.cameraId,
                  droneId: drone.droneId,
                  timestampMs: nowMs,
                  scenePosition: {
                    x: drone.position3D.x,
                    y: 0,
                    z: drone.position3D.z,
                  },
                  confidence: 0.95,
                },
                nowMs
              );
            }
          }
        }
      }

      // Render
      renderer.render(scene, beachCamera.camera);

      // FPS calculation (every 1 second)
      frameCount++;
      const now = performance.now();
      if (now - lastFpsTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsTime)));
        frameCount = 0;
        lastFpsTime = now;
      }
    };

    animate();

    // 12. Resize Observer for dynamic responsiveness
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          beachCamera.resize(newW, newH);
          renderer.setSize(newW, newH);
        }
      }
    });

    resizeObserver.observe(container);

    // Interactive 3D Viewport Click Raycaster: Click character or rescue craft to frame & inspect
    const handleCanvasClick = (e: MouseEvent) => {
      const canvasEl = renderer.domElement;
      const rect = canvasEl.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), beachCamera.camera);
      const hits = raycaster.intersectObjects(scene.children, true);

      for (const hit of hits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj && obj !== scene) {
          if (obj.userData?.visitorId) {
            handleTrackSwimmer(obj.userData.visitorId);
            setIsActionFlowHUDOpen(true);
            return;
          }
          if (obj.userData?.resourceId) {
            handleTrackResource(obj.userData.resourceId);
            setIsActionFlowHUDOpen(true);
            return;
          }
          if (obj.userData?.type === 'DRONE' || obj.userData?.droneId) {
            const droneId = obj.userData.droneId || obj.userData.id;
            droneLayerRef.current?.selectDrone(droneId);
            setSelectedDroneId(droneId);
            const drone = DroneRegistry.getInstance().getDrone(droneId);
            if (drone) {
              handleTrackDrone(droneId, drone.position3D);
            }
            return;
          }
          obj = obj.parent;
        }
      }
    };
    renderer.domElement.addEventListener('click', handleCanvasClick);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      beachCamera.dispose();
      cameraDirector.dispose();
      spatialAudio.dispose();
      lighting.dispose();
      terrain.dispose();
      ocean.dispose();
      visitorLayer.dispose();
      ripVisual.dispose();
      rescueLayer.dispose();
      predictiveVisual.dispose();
      cameraCoverageVisual.dispose();
      geoVisual.dispose();
      depthContours.dispose();
      aerialLayer.dispose();
      droneLayer.dispose();
      flotationRingLayer.dispose();
      multiIncidentVisual.dispose();
      droneFaultVisual.dispose();
      missionReplayVisual.destroy();
      wristbandVisual.dispose();
      integratedSafetyVisual.dispose();
      droneCameraFrustum.dispose();
      coastalCoverageVisual.dispose();
      DroneVisionManager.getInstance().reset();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [beach.id, isNight]); // Re-create on night toggle or beach swap

  // Sync 3D Coastal Surveillance Zones visibility (Phase 8)
  useEffect(() => {
    coastalCoverageVisualRef.current?.setVisible(is3DCoverageVisible);
  }, [is3DCoverageVisible]);

  // Sync Tactical Layer Visibility from Unified Command Center (Phase 6)
  useEffect(() => {
    const unsub = UnifiedCommandCenterService.getInstance().subscribe(() => {
      const layers = UnifiedCommandCenterService.getInstance().getLayerVisibility();
      cameraCoverageVisualRef.current?.setVisible(layers.cameras);
      droneCameraFrustumRef.current?.setVisible(layers.cameras);
      coastalCoverageVisualRef.current?.setVisible(layers.warningZones);
    });
    return unsub;
  }, []);

  // Sync 3D CCTV FOV frustum visibility
  useEffect(() => {
    cameraCoverageVisualRef.current?.setVisible(is3DConesVisible);
  }, [is3DConesVisible]);

  // Sync 3D Drone Camera FOV frustum visibility (Phase 5)
  useEffect(() => {
    droneCameraFrustumRef.current?.setVisible(isDroneFovConesVisible);
  }, [isDroneFovConesVisible]);

  // Sync 3D Geographic Calibration pins visibility
  useEffect(() => {
    geoVisualRef.current?.setVisible(is3DGeoPinsVisible);
  }, [is3DGeoPinsVisible]);

  // Sync 3D Depth Contours visibility
  useEffect(() => {
    depthContourVisualRef.current?.setVisible(isDepthContoursVisible);
  }, [isDepthContoursVisible]);

  // Sync Terrain Wireframe diagnostic mode
  useEffect(() => {
    if (terrainRef.current?.mesh?.material) {
      const mat = terrainRef.current.mesh.material as THREE.MeshStandardMaterial;
      mat.wireframe = isTerrainWireframe;
      mat.needsUpdate = true;
    }
  }, [isTerrainWireframe]);

  // Sync Aerial Photograph Overlay visibility & opacity (Option 1)
  useEffect(() => {
    aerialLayerRef.current?.setVisible(isAerialImageVisible);
  }, [isAerialImageVisible]);

  useEffect(() => {
    aerialLayerRef.current?.setOpacity(aerialOpacity);
  }, [aerialOpacity]);

  const handleSelectPreset = (preset: CameraPresetType) => {
    setActivePreset(preset);
    cameraManagerRef.current?.setPreset(preset);
  };

  const handleResetCamera = () => {
    setActivePreset('overview');
    cameraManagerRef.current?.reset();
  };

  const handleTrackSwimmer = (visitorId: string) => {
    const v = visitorsRef.current.find((vis) => vis.id === visitorId);
    if (!v) return;
    const mapper = new VisitorCoordinateMapper();
    const transform = mapper.map(v, beachRef.current, environmentRef.current);
    cameraManagerRef.current?.focusOn(new THREE.Vector3(transform.x, transform.y, transform.z), 18);
  };

  const handleTrackBoat = () => {
    const boat = RescueCoordinator.getInstance().registry.getResource('RB-01');
    if (!boat) return;
    cameraManagerRef.current?.focusOn(new THREE.Vector3(boat.currentX, boat.currentY + 1.2, boat.currentZ), 22);
  };

  const handleTrackLifeguard = (lgId: string) => {
    const lg = RescueCoordinator.getInstance().registry.getResource(lgId);
    if (!lg) return;
    cameraManagerRef.current?.focusOn(new THREE.Vector3(lg.currentX, lg.currentY + 1.2, lg.currentZ), 16);
  };

  const handleTrackResource = (resId: string) => {
    const res = RescueCoordinator.getInstance().registry.getResource(resId);
    if (!res) return;
    cameraManagerRef.current?.focusOn(new THREE.Vector3(res.currentX, res.currentY + 1.2, res.currentZ), 20);
  };

  const handleSelectControlPoint = (point: { local3DPosition: { x: number; y: number; z: number } }) => {
    cameraManagerRef.current?.focusOn(
      new THREE.Vector3(point.local3DPosition.x, point.local3DPosition.y + 2.0, point.local3DPosition.z),
      25
    );
  };

  const handleFocusTerrainPoint = (coords: { x: number; y: number; z: number }) => {
    cameraManagerRef.current?.focusOn(
      new THREE.Vector3(coords.x, coords.y + 2.0, coords.z),
      25
    );
  };

  const handleTrackDrone = (droneId: string, position3D: { x: number; y: number; z: number }) => {
    droneLayerRef.current?.selectDrone(droneId);
    setSelectedDroneId(droneId);
    cameraManagerRef.current?.focusOn(
      new THREE.Vector3(position3D.x, position3D.y + 1.5, position3D.z),
      22
    );
  };

  const activeOverlaysCount = [
    isOpsCenterOpen,
    isUnifiedCommandOpen,
    isDroneHUDOpen,
    isDroneCameraModalOpen,
    isDistressTriageOpen,
    isCoverageHUDOpen,
    isRescueDispatchHUDOpen,
    isMultiCoordinationHUDOpen,
    isFaultRecoveryHUDOpen,
    isWristbandHUDOpen,
    isIntegratedSafetyOpen,
    isPilotPanelOpen,
    is3DConesVisible,
    isMultiSwimmerHUDOpen,
    isPhysicsHUDOpen,
    isGeoCalibrationHUDOpen,
    isTerrainHUDOpen,
    isActionFlowHUDOpen,
    isAerialImageVisible,
    isRescueFleetHUDVisible,
    isSpatialAudioHUDOpen,
  ].filter(Boolean).length;

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-[620px] sm:h-[680px] lg:h-[720px] overflow-hidden bg-slate-950 rounded-2xl select-none ${className}`}
    >
      {/* Milestone 3: Interactive Rip Current & Swimmer Distress Controller & Alert Banner */}
      <RipCurrentScenarioHUD
        visitors={visitors}
        beach={beach}
        onTrackSwimmer={handleTrackSwimmer}
      />

      {/* Milestone 4: Intelligent Rescue Operations Fleet HUD & Real-time Operations Timeline */}
      {isRescueFleetHUDVisible && (
        <RescueTimelineHUD
          visitors={visitors}
          beach={beach}
          onTrackBoat={handleTrackBoat}
          onTrackSwimmer={handleTrackSwimmer}
          onTrackLifeguard={handleTrackLifeguard}
        />
      )}

      {/* Milestone 5: Spatial Audio Mixer HUD */}
      {isSpatialAudioHUDOpen && (
        <div className="absolute top-28 right-3 z-30 pointer-events-auto">
          <SpatialAudioHUD />
        </div>
      )}

      {/* 3D Viewport Tactical Header Bar (Row 2: Cleanly Below Simulation Modes Bar) */}
      {!isCleanView ? (
        <div className="absolute top-14 left-2.5 right-2.5 z-20 flex items-center justify-between gap-2 pointer-events-none">
          {/* Left: Camera Mode Selector */}
          <div className="pointer-events-auto flex items-center gap-2">
            <CameraModeSelector />
          </div>

          {/* Right: Telemetry + Primary Command + Tools Dropdown + Zen Mode */}
          <div className="pointer-events-auto flex items-center gap-2">
            {/* Real-time Telemetry Pill */}
            <div className="hidden xl:flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-cyan-500/40 shadow-2xl backdrop-blur-md text-xs font-mono">
              <div className="flex items-center gap-1 text-cyan-300 border-r border-slate-700/80 pr-2">
                <Waves className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="text-slate-400 text-[10px]">WAVES:</span>
                <strong className="text-white">{waveHeight.toFixed(1)}m</strong>
              </div>
              <div className="flex items-center gap-1 text-amber-300 border-r border-slate-700/80 pr-2">
                <Wind className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400 text-[10px]">WIND:</span>
                <strong className="text-white">{windSpeed}km/h</strong>
              </div>
              <div className="flex items-center gap-1 text-sky-300 border-r border-slate-700/80 pr-2">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <strong className="text-white">{visitors.length}</strong>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <span className={fps >= 55 ? 'text-emerald-400' : 'text-amber-400'}>{fps} FPS</span>
              </div>
            </div>

            {/* Coastal Command Center Quick Launcher */}
            <button
              onClick={() => setIsUnifiedCommandOpen(true)}
              title="Open Unified Coastal Command Center & Mission Replay (Phase 13)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-xl border border-cyan-400/50 transition cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Command Center</span>
            </button>

            {/* 3D Tools & Overlays Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsToolsMenuOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xl border transition cursor-pointer ${
                  isToolsMenuOpen || activeOverlaysCount > 0
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-extrabold shadow-cyan-500/20'
                    : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:bg-slate-800'
                }`}
                title="Toggle 3D Simulation Overlays, Inspection HUDs & Subsystems"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>3D Overlays</span>
                {activeOverlaysCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-slate-950 text-cyan-300 rounded-full text-[10px] font-bold">
                    {activeOverlaysCount}
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isToolsMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Master Dropdown Popover */}
              {isToolsMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[75vh] overflow-y-auto bg-slate-950/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-2xl p-3 space-y-3 z-50 text-xs font-mono animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-extrabold text-cyan-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" />
                      <span>3D Simulation Overlays & HUDs</span>
                    </span>
                    <button
                      onClick={() => setIsToolsMenuOpen(false)}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Section 1: Master Command & Safety */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">🛡️ Master Command & Safety</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => { setIsUnifiedCommandOpen(true); setIsToolsMenuOpen(false); }}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-bold text-white">Coastal Command</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">Phase 13</span>
                      </button>

                      <button
                        onClick={() => { setIsOpsCenterOpen(true); setIsToolsMenuOpen(false); }}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-bold text-white">Safety Ops</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">M5</span>
                      </button>

                      <button
                        onClick={() => { setIsWristbandHUDOpen((p) => !p); }}
                        className={`p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${isWristbandHUDOpen ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'}`}
                      >
                        <span className="font-bold">Wristband HUD</span>
                        <span className="text-[9px] font-bold">{isWristbandHUDOpen ? 'ACTIVE' : 'OPEN'}</span>
                      </button>

                      <button
                        onClick={() => { setIsPilotPanelOpen((p) => !p); }}
                        className={`p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${isPilotPanelOpen ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'}`}
                      >
                        <span className="font-bold">Field Pilot</span>
                        <span className="text-[9px] font-bold">{isPilotPanelOpen ? 'ACTIVE' : 'Phase 5'}</span>
                      </button>

                      <button
                        onClick={() => { setIsIntegratedSafetyOpen((p) => !p); }}
                        className={`col-span-2 p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${isIntegratedSafetyOpen ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'}`}
                      >
                        <span className="font-bold">Integrated Camera-Drone-Wristband</span>
                        <span className="text-[9px] font-bold">Phase 4</span>
                      </button>
                    </div>
                  </div>

                  {/* Section 2: Drones & Autonomous Fleet */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">🚁 Drones & Autonomous Fleet</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => { setIsDroneHUDOpen((p) => !p); }}
                        className={`p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${isDroneHUDOpen ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'}`}
                      >
                        <span className="font-bold">Drone Fleet</span>
                        <span className="text-[9px] font-bold">{isDroneHUDOpen ? 'OPEN' : 'Phase 1'}</span>
                      </button>

                      <button
                        onClick={() => { setIsDroneCameraModalOpen(true); }}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition flex items-center justify-between text-slate-300 cursor-pointer"
                      >
                        <span className="font-bold">Drone Cam Feed</span>
                        <span className="text-[9px] font-bold text-purple-400">Modal</span>
                      </button>

                      <button
                        onClick={() => { setIsDroneFovConesVisible((p) => !p); }}
                        className={`p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${isDroneFovConesVisible ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'}`}
                      >
                        <span className="font-bold">Drone FOV Cones</span>
                        <span className="text-[9px] font-bold">{isDroneFovConesVisible ? 'ON' : 'OFF'}</span>
                      </button>

                      <button
                        onClick={() => { setIsDistressTriageOpen((p) => !p); }}
                        className={`p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${isDistressTriageOpen ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'}`}
                      >
                        <span className="font-bold">Distress Triage</span>
                        <span className="text-[9px] font-bold">Phase 7</span>
                      </button>

                      <button
                        onClick={() => { setIsCoverageHUDOpen((p) => !p); }}
                        className={`p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${isCoverageHUDOpen ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'}`}
                      >
                        <span className="font-bold">Coverage Patrol</span>
                        <span className="text-[9px] font-bold">Phase 8</span>
                      </button>

                      <button
                        onClick={() => { setIsRescueDispatchHUDOpen((p) => !p); }}
                        className={`p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${isRescueDispatchHUDOpen ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'}`}
                      >
                        <span className="font-bold">Rescue Dispatch</span>
                        <span className="text-[9px] font-bold">Phase 9</span>
                      </button>

                      <button
                        onClick={() => { setIsMultiCoordinationHUDOpen((p) => !p); }}
                        className={`p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${isMultiCoordinationHUDOpen ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'}`}
                      >
                        <span className="font-bold">Multi-Coordination</span>
                        <span className="text-[9px] font-bold">Phase 11</span>
                      </button>

                      <button
                        onClick={() => { setIsFaultRecoveryHUDOpen((p) => !p); }}
                        className={`p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${isFaultRecoveryHUDOpen ? 'bg-amber-600/20 text-amber-300 border-amber-500/40' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'}`}
                      >
                        <span className="font-bold">Fault & Recovery</span>
                        <span className="text-[9px] font-bold">Phase 12</span>
                      </button>
                    </div>
                  </div>

                  {/* Section 3: Vision & Surveillance */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">📹 Surveillance & AI Vision</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => { setIs3DConesVisible((p) => !p); }}
                        className={`p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${is3DConesVisible ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'}`}
                      >
                        <span className="font-bold">3D CCTV Cones</span>
                        <span className="text-[9px] font-bold">{is3DConesVisible ? 'VISIBLE' : 'HIDDEN'}</span>
                      </button>

                      <button
                        onClick={() => { setIsAerialImageVisible((p) => !p); }}
                        className={`p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${isAerialImageVisible ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'}`}
                      >
                        <span className="font-bold">Aerial Photo</span>
                        <span className="text-[9px] font-bold">{isAerialImageVisible ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Section 4: Oceanography & Coastal Physics */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">🌊 Physics & Environment</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => { setIsPhysicsHUDOpen((p) => !p); }}
                        className={`p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${isPhysicsHUDOpen ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'}`}
                      >
                        <span className="font-bold">Swimmer Physics</span>
                        <span className="text-[9px] font-bold">M13</span>
                      </button>

                      <button
                        onClick={() => { setIsTerrainHUDOpen((p) => !p); }}
                        className={`p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${isTerrainHUDOpen ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'}`}
                      >
                        <span className="font-bold">Terrain & Bathy</span>
                        <span className="text-[9px] font-bold">M15</span>
                      </button>

                      <button
                        onClick={() => { setIsGeoCalibrationHUDOpen((p) => !p); }}
                        className={`p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${isGeoCalibrationHUDOpen ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'}`}
                      >
                        <span className="font-bold">Geo Calib (1km)</span>
                        <span className="text-[9px] font-bold">GPS</span>
                      </button>

                      <button
                        onClick={() => { setIsActionFlowHUDOpen((p) => !p); }}
                        className={`p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${isActionFlowHUDOpen ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'}`}
                      >
                        <span className="font-bold">Action Flow HUD</span>
                        <span className="text-[9px] font-bold">Vectors</span>
                      </button>

                      <button
                        onClick={() => { setIsMultiSwimmerHUDOpen((p) => !p); }}
                        className={`p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${isMultiSwimmerHUDOpen ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'}`}
                      >
                        <span className="font-bold">Multi-Swimmer Ops</span>
                        <span className="text-[9px] font-bold">M12</span>
                      </button>

                      <button
                        onClick={() => { setIsRescueFleetHUDVisible((p) => !p); }}
                        className={`p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${isRescueFleetHUDVisible ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'}`}
                      >
                        <span className="font-bold">Lifesaver Fleet HUD</span>
                        <span className="text-[9px] font-bold">{isRescueFleetHUDVisible ? 'ACTIVE' : 'M4'}</span>
                      </button>

                      <button
                        onClick={() => { setIsSpatialAudioHUDOpen((p) => !p); }}
                        className={`col-span-2 p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${isSpatialAudioHUDOpen ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'}`}
                      >
                        <span className="font-bold">3D Spatial Audio Mixer</span>
                        <span className="text-[9px] font-bold">{isSpatialAudioHUDOpen ? 'OPEN' : 'STANDBY'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Reset All Overlays */}
                  <div className="pt-2 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setIsOpsCenterOpen(false);
                        setIsUnifiedCommandOpen(false);
                        setIsDroneHUDOpen(false);
                        setIsDroneCameraModalOpen(false);
                        setIsDistressTriageOpen(false);
                        setIsCoverageHUDOpen(false);
                        setIsRescueDispatchHUDOpen(false);
                        setIsMultiCoordinationHUDOpen(false);
                        setIsFaultRecoveryHUDOpen(false);
                        setIsWristbandHUDOpen(false);
                        setIsIntegratedSafetyOpen(false);
                        setIsPilotPanelOpen(false);
                        setIs3DConesVisible(false);
                        setIsMultiSwimmerHUDOpen(false);
                        setIsPhysicsHUDOpen(false);
                        setIsGeoCalibrationHUDOpen(false);
                        setIsTerrainHUDOpen(false);
                        setIsActionFlowHUDOpen(false);
                        setIsAerialImageVisible(false);
                        setIsRescueFleetHUDVisible(false);
                        setIsSpatialAudioHUDOpen(false);
                        setIsToolsMenuOpen(false);
                      }}
                      className="w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset & Close All Overlays</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Zen Mode Button */}
            <button
              onClick={() => setIsCleanView(true)}
              title="Zen Mode: Hide all UI elements for pure cinematic view"
              className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-700 shadow-xl transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="absolute top-3 right-3 z-30 pointer-events-auto">
          <button
            onClick={() => setIsCleanView(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/95 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 font-mono text-xs shadow-2xl transition cursor-pointer backdrop-blur-md font-bold"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>Exit Zen Mode</span>
          </button>
        </div>
      )}

      {/* Floating Tactical Navigation Watermark / Help Badge */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-950/85 px-3 py-1.5 rounded-full border border-slate-700/60 shadow-xl backdrop-blur-md text-[11px] text-slate-300 font-medium">
          <span className="text-cyan-400 font-bold">🖱️ 3D Viewport Controls:</span>
          <span>Left-Drag: Rotate</span>
          <span className="text-slate-500">•</span>
          <span>Right-Drag: Pan</span>
          <span className="text-slate-500">•</span>
          <span>Scroll: Zoom</span>
        </div>
      </div>

      {/* Beach Info Badge (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-20 pointer-events-auto">
        <div className="bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-lg backdrop-blur-md text-[11px] text-slate-300 flex items-center gap-2 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold text-white uppercase">{beach.name}</span>
          <span className="text-slate-500">|</span>
          <span className="text-cyan-300">{beach.presetId ?? 'COASTAL DIGITAL TWIN'}</span>
        </div>
      </div>

      {/* Milestone 5: 3D Incident Replay Controller Console */}
      <IncidentReplayOverlay3D />

      {/* Milestone 5: Unified Safety Operations & Explainable Decisions Center Modal */}
      <UnifiedOperationsCenter
        beach={beach}
        environment={environment}
        visitors={visitors}
        hazards={hazards}
        isOpen={isOpsCenterOpen}
        onClose={() => setIsOpsCenterOpen(false)}
        onToggleCamera3DCones={() => setIs3DConesVisible((prev) => !prev)}
        is3DConesVisible={is3DConesVisible}
      />

      {/* Milestone 12: Multi-Swimmer & Multi-Incident Rescue Operations HUD */}
      <MultiSwimmerRescueHUD
        visitors={visitors}
        beach={beach}
        isOpen={isMultiSwimmerHUDOpen}
        onClose={() => setIsMultiSwimmerHUDOpen(false)}
        onTrackSwimmer={handleTrackSwimmer}
        onTrackResource={handleTrackResource}
      />

      {/* Milestone 13: Realistic Swimmer Physics & Bathymetry HUD */}
      {isPhysicsHUDOpen && (
        <SwimmerPhysicsHUD
          visitors={visitors}
          beach={beach}
          environment={environment}
          isNight={isNight}
        />
      )}

      {/* 1 km Coastal Geographic Calibration & Georeferencing HUD */}
      <GeoCalibrationHUD
        isOpen={isGeoCalibrationHUDOpen}
        onClose={() => setIsGeoCalibrationHUDOpen(false)}
        is3DPinsVisible={is3DGeoPinsVisible}
        onToggle3DPins={() => setIs3DGeoPinsVisible((prev) => !prev)}
        onSelectControlPoint={handleSelectControlPoint}
      />

      {/* Milestone 15: Real-World Terrain & Seabed Bathymetry Inspection HUD */}
      <TerrainInspectionHUD
        isOpen={isTerrainHUDOpen}
        onClose={() => setIsTerrainHUDOpen(false)}
        isContoursVisible={isDepthContoursVisible}
        onToggleContours={() => setIsDepthContoursVisible((prev) => !prev)}
        isWireframeVisible={isTerrainWireframe}
        onToggleWireframe={() => setIsTerrainWireframe((prev) => !prev)}
        onFocusCoordinates={handleFocusTerrainPoint}
      />

      {/* Coordinated Rescue Action Flow & Human Visibility HUD */}
      <RescueActionFlowHUD
        visitors={visitors}
        beach={beach}
        isOpen={isActionFlowHUDOpen}
        onClose={() => setIsActionFlowHUDOpen(false)}
        onFocusSwimmer={handleTrackSwimmer}
        onFocusResource={handleTrackResource}
        isAerialVisible={isAerialImageVisible}
        onToggleAerial={() => setIsAerialImageVisible((prev) => !prev)}
        aerialOpacity={aerialOpacity}
        onAerialOpacityChange={setAerialOpacity}
      />

      {/* Drone Fleet Operations & Telemetry Registry HUD (Phase 1) */}
      <DroneStatusHUD
        isOpen={isDroneHUDOpen}
        onClose={() => setIsDroneHUDOpen(false)}
        onFocusDrone={handleTrackDrone}
      />

      {/* Selected Drone Inspection Floating Card (Phase 2) */}
      <SelectedDroneCard
        drone={selectedDroneId ? DroneRegistry.getInstance().getDrone(selectedDroneId) ?? null : null}
        onClose={() => {
          setSelectedDroneId(null);
          droneLayerRef.current?.selectDrone(null);
        }}
        onFocus={handleTrackDrone}
        onOpenLiveCamera={(droneId) => {
          setDroneCameraModalDroneId(droneId);
          setIsDroneCameraModalOpen(true);
        }}
      />

      {/* Drone Live Camera & Gimbal Video Feed Modal (Phase 5) */}
      <DroneCameraModal
        isOpen={isDroneCameraModalOpen}
        onClose={() => setIsDroneCameraModalOpen(false)}
        initialDroneId={droneCameraModalDroneId}
        onFocusDrone={handleTrackDrone}
        isFovConesVisible={isDroneFovConesVisible}
        onToggleFovCones={(v) => setIsDroneFovConesVisible(v)}
      />

      {/* Aerial Distress Verification & Incident Triage Panel (Phase 7) */}
      {isDistressTriageOpen && (
        <div className="absolute top-16 right-4 z-40 max-w-lg w-full pointer-events-auto">
          <DroneDistressVerificationPanel onClose={() => setIsDistressTriageOpen(false)} />
        </div>
      )}

      {/* Coastal Coverage & Multi-Drone Patrol Coordination Dashboard (Phase 8) */}
      {isCoverageHUDOpen && (
        <div className="absolute top-16 right-4 z-40 max-w-4xl w-full pointer-events-auto">
          <CoastalCoverageHUD
            onClose={() => setIsCoverageHUDOpen(false)}
            isVisual3DVisible={is3DCoverageVisible}
            onToggleVisual3D={() => {
              setIs3DCoverageVisible((prev) => {
                const next = !prev;
                coastalCoverageVisualRef.current?.setVisible(next);
                return next;
              });
            }}
          />
        </div>
      )}

      {/* Aerial Drone Rescue Mission Allocation & Dispatch Dashboard (Phase 9 & 10) */}
      {isRescueDispatchHUDOpen && (
        <div className="absolute top-16 right-4 z-40 max-w-4xl w-full pointer-events-auto">
          <RescueMissionDispatchHUD
            onClose={() => setIsRescueDispatchHUDOpen(false)}
            onTrackDrone={(droneId) => {
              const drone = DroneRegistry.getInstance().getDrone(droneId);
              if (drone) {
                handleTrackDrone(droneId, drone.position3D);
              }
            }}
          />
        </div>
      )}

      {/* Multi-Incident & Multi-Drone Coordination Center (Phase 11) */}
      <div className="absolute top-16 right-4 z-40 max-w-5xl w-full pointer-events-auto">
        <MultiDroneCoordinationHUD
          isOpen={isMultiCoordinationHUDOpen}
          onClose={() => setIsMultiCoordinationHUDOpen(false)}
          onTrackCoordinates={(coords) => handleFocusTerrainPoint(coords)}
          onTrackDrone={(droneId) => {
            const drone = DroneRegistry.getInstance().getDrone(droneId);
            if (drone) {
              handleTrackDrone(droneId, drone.position3D);
            }
          }}
        />
      </div>

      {/* Drone Fault Handling, Resilience & Recovery Dashboard (Phase 12) */}
      {isFaultRecoveryHUDOpen && (
        <DroneFaultRecoveryHUD onClose={() => setIsFaultRecoveryHUDOpen(false)} />
      )}

      {/* Unified Coastal Safety Command Center & Mission Replay (Phase 13) */}
      <UnifiedCommandCenterHUD
        isOpen={isUnifiedCommandOpen}
        onClose={() => setIsUnifiedCommandOpen(false)}
        onFocus3DCoordinates={(coords) => handleFocusTerrainPoint(coords)}
        onOpenLiveCamera={(droneId) => {
          setDroneCameraModalDroneId(droneId);
          setIsDroneCameraModalOpen(true);
        }}
      />

      {/* Track B Phase 2: Connected Wristband Operations & Localized Warning HUD */}
      {isWristbandHUDOpen && (
        <WristbandOperationsHUD onClose={() => setIsWristbandHUDOpen(false)} isModal={true} />
      )}

      {/* Phase 4: Camera & Drone Integration with Wristband Safety System */}
      {isIntegratedSafetyOpen && (
        <CameraDroneWristbandPanel onClose={() => setIsIntegratedSafetyOpen(false)} />
      )}

      {/* Phase 5: Controlled Field Pilot & Real-World Validation Panel */}
      {isPilotPanelOpen && (
        <ControlledPilotPanel onClose={() => setIsPilotPanelOpen(false)} />
      )}
    </div>
  );
};
