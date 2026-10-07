import { useEffect, useRef, useState } from 'react';
import { SimulationEngine } from '../simulation/SimulationEngine';
import { SimulationState, BeachPresetId } from '../models/Beach';

export function useSimulation() {
  const engineRef = useRef<SimulationEngine | null>(null);
  const [state, setState] = useState<SimulationState | null>(null);

  if (!engineRef.current) {
    engineRef.current = new SimulationEngine();
  }

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    // Throttle React state rendering to ~30 FPS (33ms) to prevent main thread starvation
    let lastUiUpdate = 0;
    const UI_INTERVAL_MS = 33;

    const unsubscribe = engine.subscribe((newState) => {
      const now = performance.now();
      if (now - lastUiUpdate >= UI_INTERVAL_MS) {
        lastUiUpdate = now;
        setState(newState);
      }
    });

    let lastTime = performance.now();
    let animId: number;

    const loop = (time: number) => {
      const deltaSeconds = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      engine.tick(deltaSeconds);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      unsubscribe();
      cancelAnimationFrame(animId);
    };
  }, []);

  const syncImmediate = () => {
    if (engineRef.current) {
      setState(engineRef.current.getState());
    }
  };

  const setBeachPreset = (presetId: BeachPresetId) => {
    engineRef.current?.setBeachPreset(presetId);
    syncImmediate();
  };

  const start = () => {
    engineRef.current?.start();
    syncImmediate();
  };
  const pause = () => {
    engineRef.current?.pause();
    syncImmediate();
  };
  const reset = () => {
    engineRef.current?.reset();
    syncImmediate();
  };
  const setSpeed = (speed: number) => {
    engineRef.current?.setSpeed(speed);
    syncImmediate();
  };
  const selectVisitor = (visitorId?: string) => {
    engineRef.current?.selectVisitor(visitorId);
    syncImmediate();
  };

  // Phase 6 Emergency Response Scenarios
  const scenarioPhase6SwimmerRescue = () => engineRef.current?.scenarioPhase6SwimmerRescue();
  const scenarioPhase6DeepWaterBoatRescue = () => engineRef.current?.scenarioPhase6DeepWaterBoatRescue();
  const scenarioPhase6SimultaneousEmergencies = () => engineRef.current?.scenarioPhase6SimultaneousEmergencies();
  const scenarioPhase6ResourceExhaustion = () => engineRef.current?.scenarioPhase6ResourceExhaustion();

  // Phase 5 Decision Scenarios
  const scenarioPhase5LowRisk = () => engineRef.current?.scenarioPhase5LowRisk();
  const scenarioPhase5ModerateRisk = () => engineRef.current?.scenarioPhase5ModerateRisk();
  const scenarioPhase5HighRisk = () => engineRef.current?.scenarioPhase5HighRisk();

  // The 3-Case Validation Tests
  const testCaseA = () => engineRef.current?.testCaseA();
  const testCaseB = () => engineRef.current?.testCaseB();
  const testCaseC = () => engineRef.current?.testCaseC();

  // Phase 7 Failure & Resilience Scenarios
  const scenarioPhase7CompoundCrisis = () => engineRef.current?.scenarioPhase7CompoundCrisis();
  const scenarioPhase7SensorConflict = () => engineRef.current?.scenarioPhase7SensorConflict();
  const scenarioPhase7GPSDrift = () => engineRef.current?.scenarioPhase7GPSDrift();
  const scenarioPhase7CommBlackout = () => engineRef.current?.scenarioPhase7CommBlackout();
  const triggerChaosMonkey = () => engineRef.current?.triggerChaosMonkey();
  const runAutomatedScenario = (key: 'COMPOUND' | 'CONFLICT' | 'GPS' | 'COMM') =>
    engineRef.current?.runAutomatedScenario(key);
  const injectFailure = (type: any, name: string, desc: string, sev?: any, target?: string, dur?: number, params?: any) =>
    engineRef.current?.injectFailure(type, name, desc, sev, target, dur, params);
  const removeFailure = (id: string) => engineRef.current?.removeFailure(id);
  const clearAllFailures = () => engineRef.current?.clearAllFailures();

  // Environmental Triggers
  const triggerWaveSpike = (heightM?: number) => engineRef.current?.triggerWaveSpike(heightM);
  const triggerCurrentSpike = (currentMps?: number) => engineRef.current?.triggerCurrentSpike(currentMps);
  const triggerWeatherSquall = () => engineRef.current?.triggerWeatherSquall();

  // Phase 9 CCTV Controls
  const updateCameraPTZ = (cameraId: string, rotation: number, fov: number) =>
    engineRef.current?.updateCameraPTZ(cameraId, rotation, fov);
  const toggleCameraPower = (cameraId: string) =>
    engineRef.current?.toggleCameraPower(cameraId);

  // Warnings
  const sendWarningToVisitor = (visitorId: string) =>
    engineRef.current?.getVisitorEngine().sendWarningToVisitor(visitorId, 'HAZARD', 'SZ-01');

  // Phase 12 IoT Controls
  const setIoTDataSourceMode = (mode: any) => engineRef.current?.setIoTDataSourceMode(mode);
  const toggleIoTSensorStatus = (sensorId: string) => engineRef.current?.toggleIoTSensorStatus(sensorId);

  // Phase 13 Drone Controls
  const dispatchDronePatrol = (droneId: string, routeId: string) => engineRef.current?.dispatchDronePatrol(droneId, routeId);
  const dispatchDroneDistressVerification = (visitorId: string, pos: { x: number; y: number }) =>
    engineRef.current?.dispatchDroneDistressVerification(visitorId, pos);
  const scenarioPhase13Flagship = () => engineRef.current?.scenarioPhase13Flagship();

  // Phase 14 Command Center Scenario
  const scenarioPhase14MultiBeachCrisis = () => engineRef.current?.scenarioPhase14MultiBeachCrisis();

  // Manual Risk Control & Experiment Lab
  const setManualEnvironment = (overrides: any) => {
    engineRef.current?.setManualEnvironment(overrides);
    syncImmediate();
  };
  const resetManualEnvironment = () => {
    engineRef.current?.resetManualEnvironment();
    syncImmediate();
  };
  const setVisitorPopulation = (count: number, swimmerRatio?: number, riskTakerRatio?: number) => {
    engineRef.current?.setVisitorPopulation(count, swimmerRatio, riskTakerRatio);
    syncImmediate();
  };
  const setSafetyInterventionsActive = (active: boolean) => {
    engineRef.current?.setSafetyInterventionsActive(active);
    syncImmediate();
  };
  const injectHazardScenario = (type: any) => {
    engineRef.current?.injectHazardScenario(type);
    syncImmediate();
  };
  const runRiskProgression = (presetKey: any) => {
    engineRef.current?.runRiskProgression(presetKey);
    syncImmediate();
  };
  const getRiskHistory = () => engineRef.current?.getRiskHistory() || [];
  const clearCache = () => {
    engineRef.current?.clearCache();
    syncImmediate();
  };
  const runPerformanceBenchmark = (targetPopulation: number) => {
    const res = engineRef.current?.runPerformanceBenchmark(targetPopulation);
    syncImmediate();
    return res;
  };

  return {
    state,
    engine: engineRef.current,
    analyticsEngine: engineRef.current?.getAnalyticsEngine(),
    replayEngine: engineRef.current?.getReplayEngine(),
    scenarioComparator: engineRef.current?.getScenarioComparator(),
    visionEngine: engineRef.current?.getVisionEngine(),
    predictionEngine: engineRef.current?.getPredictionEngine(),
    gisManager: engineRef.current?.getGISManager(),
    iotManager: engineRef.current?.getIoTManager(),
    droneManager: engineRef.current?.getDroneManager(),
    commandCenterManager: engineRef.current?.getCommandCenterManager(),
    dispatchDronePatrol,
    dispatchDroneDistressVerification,
    scenarioPhase13Flagship,
    scenarioPhase14MultiBeachCrisis,
    setIoTDataSourceMode,
    toggleIoTSensorStatus,
    setBeachPreset,
    setManualEnvironment,
    resetManualEnvironment,
    setVisitorPopulation,
    setSafetyInterventionsActive,
    injectHazardScenario,
    runRiskProgression,
    getRiskHistory,
    clearCache,
    runPerformanceBenchmark,
    start,
    pause,
    reset,
    setSpeed,
    selectVisitor,
    updateCameraPTZ,
    toggleCameraPower,
    scenarioPhase7CompoundCrisis,
    scenarioPhase7SensorConflict,
    scenarioPhase7GPSDrift,
    scenarioPhase7CommBlackout,
    triggerChaosMonkey,
    runAutomatedScenario,
    injectFailure,
    removeFailure,
    clearAllFailures,
    scenarioPhase6SwimmerRescue,
    scenarioPhase6DeepWaterBoatRescue,
    scenarioPhase6SimultaneousEmergencies,
    scenarioPhase6ResourceExhaustion,
    scenarioPhase5LowRisk,
    scenarioPhase5ModerateRisk,
    scenarioPhase5HighRisk,
    testCaseA,
    testCaseB,
    testCaseC,
    triggerWaveSpike,
    triggerCurrentSpike,
    triggerWeatherSquall,
    sendWarningToVisitor,
  };
}

