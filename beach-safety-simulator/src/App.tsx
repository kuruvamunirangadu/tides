import React, { useState } from 'react';
import { useSimulation } from './hooks/useSimulation';
import { SimulationHeader } from './components/SimulationHeader';
import { BeachCanvas } from './components/BeachCanvas';
import { EnvironmentPanel } from './components/EnvironmentPanel';
import { VisitorPanel } from './components/VisitorPanel';
import { HazardPanel } from './components/HazardPanel';
import { RiskPanel } from './components/RiskPanel';
import { FailureLab } from './components/FailureLab';
import { VisitorDetails } from './components/VisitorDetails';
import { SimulationControls } from './components/SimulationControls';
import { SafetyDashboard } from './analytics/components/SafetyDashboard';
import { VisionPanel } from './vision/components/VisionPanel';
import { PredictionPanel } from './prediction/components/PredictionPanel';
import { GISCommandCenter } from './gis/components/GISCommandCenter';
import { IoTCommandCenter } from './iot/components/IoTCommandCenter';
import { DroneCommandCenter } from './drones/components/DroneCommandCenter';
import { CommandCenter } from './command-center/components/CommandCenter';
import { ExperimentControlLab } from './components/ExperimentControlLab';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { LifeguardTerminal } from './components/LifeguardTerminal';
import { ImpactLabDashboard } from './impact-lab/ImpactLabDashboard';
import { ImpactLabHUD } from './impact-lab/components/ImpactLabHUD';
import { LiveIncidentStrip } from './components/LiveIncidentStrip';
import { LeftPhaseOptionsPanel } from './components/layout/LeftPhaseOptionsPanel';
import { RightAIEngineControlPanel } from './components/layout/RightAIEngineControlPanel';
import { WristbandOperationsHUD } from './wristbands/components/WristbandOperationsHUD';
import { Visitor } from './models/Visitor';
import {
  CheckCircle2,
  XCircle,
  FileText,
  X,
  MapPin,
  BarChart3,
  Layers,
  Camera as CameraIcon,
  TrendingUp,
  Globe,
  Radio,
  Plane,
  Shield,
  Menu,
  Play,
  Pause,
  FastForward,
  ChevronDown,
  LayoutGrid,
  Activity,
  Sliders,
  Flame,
  Cpu,
  LifeBuoy,
} from 'lucide-react';

export const App: React.FC = () => {
  const {
    state,
    analyticsEngine,
    replayEngine,
    scenarioComparator,
    visionEngine,
    predictionEngine,
    gisManager,
    iotManager,
    droneManager,
    commandCenterManager,
    dispatchDronePatrol,
    dispatchDroneDistressVerification,
    scenarioPhase13Flagship,
    scenarioPhase14MultiBeachCrisis,
    setIoTDataSourceMode,
    toggleIoTSensorStatus,
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
  } = useSimulation();

  const [activeMainView, setActiveMainView] = useState<
    'simulation' | 'impact' | 'lifeguard' | 'experiment' | 'performance' | 'command' | 'gis' | 'vision' | 'prediction' | 'iot' | 'drones' | 'analytics' | 'wristband'
  >('simulation');
  const [mobileSubTab, setMobileSubTab] = useState<'canvas' | 'emergency' | 'decisions' | 'failures' | 'analytics_all'>('canvas');
  const [showMobileViewDrawer, setShowMobileViewDrawer] = useState<boolean>(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | undefined>(undefined);
  const [showReportModal, setShowReportModal] = useState<boolean>(true);

  if (!state) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono px-4 text-center">
        <div className="space-y-3">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Initializing Integrated Beach Safety & Emergency Simulation Platform...</p>
        </div>
      </div>
    );
  }

  const handleSelectVisitorFromCanvas = (visitor?: Visitor) => {
    setSelectedVisitor(visitor);
    selectVisitor(visitor?.id);
  };

  const handleRunSuiteAndShowModal = (key: 'COMPOUND' | 'CONFLICT' | 'GPS' | 'COMM') => {
    runAutomatedScenario(key);
    setShowReportModal(true);
  };

  const navTabs = [
    {
      id: 'simulation',
      label: 'LIVE SIMULATION',
      icon: MapPin,
      color: 'text-cyan-400',
      badge: '3D TWIN',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
      desc: '3D coastal digital twin with bathymetry & wave physics',
    },
    {
      id: 'performance',
      label: 'CACHE & PERFORMANCE',
      icon: Cpu,
      color: 'text-emerald-400',
      badge: state.performanceMetrics ? `${state.performanceMetrics.fps} FPS` : '60 FPS',
      badgeColor: 'bg-emerald-500 text-slate-950 font-bold',
      desc: 'System memory, cache benchmark & render pipeline stats',
    },
    {
      id: 'command',
      label: 'COMMAND CENTER',
      icon: Shield,
      color: 'text-blue-400',
      badge:
        state.multiBeachCommandState && state.multiBeachCommandState.criticalBeachesCount > 0
          ? `${state.multiBeachCommandState.criticalBeachesCount} CRITICAL`
          : 'ONLINE',
      badgeColor:
        state.multiBeachCommandState && state.multiBeachCommandState.criticalBeachesCount > 0
          ? 'bg-rose-500 text-white font-bold'
          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      desc: 'Multi-beach coastal operations & Andhra Pradesh mutual aid',
    },
    {
      id: 'gis',
      label: 'GIS GEOFENCE',
      icon: Globe,
      color: 'text-teal-400',
      badge: state.gisBreachEvents && state.gisBreachEvents.length > 0 ? `${state.gisBreachEvents.length} BREACH` : 'ZONES',
      badgeColor:
        state.gisBreachEvents && state.gisBreachEvents.length > 0
          ? 'bg-rose-500 text-white font-bold'
          : 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
      desc: 'Coastal safety boundaries & danger geofence breach alarms',
    },
    {
      id: 'vision',
      label: 'CCTV VISION',
      icon: CameraIcon,
      color: 'text-emerald-400',
      badge: state.cctvSafetyEvents && state.cctvSafetyEvents.length > 0 ? `${state.cctvSafetyEvents.length} EVENTS` : 'YOLOv8',
      badgeColor:
        state.cctvSafetyEvents && state.cctvSafetyEvents.length > 0
          ? 'bg-amber-500 text-slate-950 font-bold'
          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
      desc: 'Edge CV cameras, swimmer bounding boxes & tracking',
    },
    {
      id: 'prediction',
      label: 'AI PREDICT',
      icon: TrendingUp,
      color: 'text-indigo-400',
      badge:
        state.predictionState?.alerts && state.predictionState.alerts.length > 0
          ? `${state.predictionState.alerts.length} ALERTS`
          : 'T+15..120m',
      badgeColor:
        state.predictionState?.alerts && state.predictionState.alerts.length > 0
          ? 'bg-amber-500 text-slate-950 font-bold'
          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
      desc: 'Spatial & temporal machine learning risk forecasting',
    },
    {
      id: 'iot',
      label: 'IoT SENSORS',
      icon: Radio,
      color: 'text-amber-400',
      badge: state.iotDataSourceMode || 'HYBRID',
      badgeColor: 'bg-slate-800 text-amber-300 border border-amber-500/30',
      desc: 'Acoustic wave buoys, weather stations & telemetry',
    },
    {
      id: 'drones',
      label: 'DRONES',
      icon: Plane,
      color: 'text-orange-400',
      badge:
        state.drones && state.drones.some((d) => d.status !== 'AVAILABLE' && d.status !== 'CHARGING')
          ? 'AIRBORNE'
          : 'READY',
      badgeColor: 'bg-cyan-400 text-slate-950 font-bold',
      desc: 'Autonomous SAR drone swarm, buoy drop & AI verification',
    },
    {
      id: 'analytics',
      label: 'ANALYTICS',
      icon: BarChart3,
      color: 'text-purple-400',
      badge: 'REPLAY',
      badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
      desc: 'Response metrics, benchmarks & incident mission replay',
    },
    {
      id: 'lifeguard',
      label: 'LIFEGUARD TERMINAL',
      icon: LifeBuoy,
      color: 'text-amber-400',
      badge: 'PATROL HUD',
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
      desc: 'Handheld beach patrol terminal & station coordination',
    },
    {
      id: 'impact',
      label: 'IMPACT LAB (3 DEMOS)',
      icon: Activity,
      color: 'text-violet-400',
      badge: 'EVALUATION',
      badgeColor: 'bg-violet-600 text-white font-bold',
      desc: 'Controlled field pilot validation & hardware bench evaluation',
    },
    {
      id: 'experiment',
      label: 'MANUAL RISK LAB & CONTROLS',
      icon: Sliders,
      color: 'text-amber-400',
      badge: state.isManualEnvironmentActive
        ? 'MANUAL ACTIVE'
        : state.safetyInterventionsActive === false
        ? 'PASSIVE SYSTEM'
        : 'AUTOMATIC',
      badgeColor:
        state.safetyInterventionsActive === false
          ? 'bg-amber-500 text-slate-950 font-bold'
          : 'bg-rose-500 text-white font-bold',
      desc: 'Manual environmental stress lab & hazard consequence triggers',
    },
    {
      id: 'wristband',
      label: 'WRISTBAND SAFETY HUB',
      icon: Radio,
      color: 'text-rose-400',
      badge: 'LORA 865',
      badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
      desc: 'Hardware wearable simulator, SOS triggers, downlinks & 8-band fleet',
    },
  ];

  const currentActiveTab = navTabs.find((t) => t.id === activeMainView) || navTabs[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-2 sm:p-2.5 flex flex-col space-y-2.5 max-w-[1920px] w-full mx-auto pb-12">
      {/* 1. Header Bar */}
      <SimulationHeader
        timeDisplay={state.timeDisplay}
        isRunning={state.running}
        resilienceScore={state.resilience?.overallResilienceIndex || 100}
        activeLevel={state.fallbackStrategy?.activeLevel || 'FULL_CAPABILITY'}
      />

      {/* Sleek Operational Top Strip (Zero Horizontal Scrollbar) */}
      <div className="flex items-center justify-between gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 shadow-md backdrop-blur-md text-xs">
        {/* Active View Indicator & Quick Return */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-wider">
            Active View:
          </span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold font-mono text-[11px] shadow-sm">
            {React.createElement(currentActiveTab.icon, { className: `w-3.5 h-3.5 ${currentActiveTab.color}` })}
            <span>{currentActiveTab.label}</span>
            {currentActiveTab.badge && (
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono ${currentActiveTab.badgeColor}`}>
                {currentActiveTab.badge}
              </span>
            )}
          </div>
          {activeMainView !== 'simulation' && (
            <button
              onClick={() => setActiveMainView('simulation')}
              className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer ml-1.5 flex items-center gap-1 transition"
            >
              &larr; Return to 3D Simulation
            </button>
          )}
        </div>

        {/* Coastal Jurisdiction & Unified Layout Metrics */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span className="hidden sm:inline">
            Coast: <strong className="text-slate-200">{state.beach.name}</strong>
          </span>
          <span className="hidden md:inline text-slate-700">|</span>
          <span className="hidden md:inline">
            Resilience: <strong className="text-emerald-400">{state.resilience?.overallResilienceIndex || 100}%</strong>
          </span>
          <span className="hidden lg:inline text-slate-700">|</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-cyan-300 border border-slate-700 font-bold">
            Layout: <strong>Options | 3D Twin | Engines</strong>
          </span>
        </div>
      </div>

      {/* 3-GRID BALANCED LAYOUT: Guaranteed readable panels with expansive 3D center stage */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(280px,18%)_1fr_minmax(350px,25%)] gap-2.5 items-stretch">
        {/* GRID 1: 15% Options, Simulations Dropdown, Phases 1-10 & Presets */}
        <div className="w-full min-h-[640px]">
          <LeftPhaseOptionsPanel
            activeMainView={activeMainView}
            onSelectView={setActiveMainView}
            navTabs={navTabs as any}
            selectedBeachPreset={state.beach.presetId || 'RUSHIKONDA_VIZAG'}
            onSelectBeachPreset={setBeachPreset}
            running={state.running}
            speed={state.speed}
            onStart={start}
            onPause={pause}
            onReset={reset}
            onSetSpeed={setSpeed}
            onScenarioCompoundCrisis={scenarioPhase7CompoundCrisis}
            onScenarioRipCurrent={() => injectHazardScenario('RIP_CURRENT')}
            onScenarioHighWaves={() => injectHazardScenario('HIGH_WAVES')}
            onScenarioBoatRescue={scenarioPhase6DeepWaterBoatRescue}
            onScenarioResourceExhaustion={scenarioPhase6ResourceExhaustion}
            onScenarioSwimmerRescue={scenarioPhase6SwimmerRescue}
            onScenarioSensorConflict={scenarioPhase7SensorConflict}
            onScenarioGPSDrift={scenarioPhase7GPSDrift}
            onScenarioCommBlackout={scenarioPhase7CommBlackout}
            onTriggerChaosMonkey={triggerChaosMonkey}
            emergencyIncidentsCount={state.emergencyIncidents.length}
            resilienceScore={state.resilience?.overallResilienceIndex || 100}
          />
        </div>

        {/* GRID 2: 70% Main Presentation Simulation Stage (Mainly 3D Digital Twin) */}
        <div className="w-full flex flex-col space-y-2 min-h-[640px]">
          {/* Universal Simulation Flight Strip: Always visible at top of Grid 2 */}
          <div className="shrink-0 flex items-center justify-between gap-2 bg-slate-900/95 px-3 py-1.5 rounded-xl border border-slate-800 shadow-md backdrop-blur-md text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 min-w-0">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider mr-1 shrink-0">
                Simulations:
              </span>
              <button
                onClick={() => setActiveMainView('simulation')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  activeMainView === 'simulation'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                <span>🌴</span>
                <span>3D Beach Twin</span>
              </button>

              <button
                onClick={() => setActiveMainView('impact')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  activeMainView === 'impact'
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                <span>🧪</span>
                <span>Impact Lab</span>
              </button>

              <button
                onClick={() => setActiveMainView('experiment')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  activeMainView === 'experiment'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                <span>🔬</span>
                <span>Risk Lab</span>
              </button>

              <button
                onClick={() => setActiveMainView('wristband')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  activeMainView === 'wristband'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                <span>⌚</span>
                <span>Wristband Hub</span>
              </button>

              <button
                onClick={() => setActiveMainView('drones')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  activeMainView === 'drones'
                    ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                <span>🚁</span>
                <span>Drones</span>
              </button>

              <button
                onClick={() => setActiveMainView('command')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  activeMainView === 'command'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                <span>🏛️</span>
                <span>Command</span>
              </button>

              <button
                onClick={() => setActiveMainView('vision')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  activeMainView === 'vision'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                <span>👁️</span>
                <span>Vision</span>
              </button>
            </div>

            {activeMainView !== 'simulation' && (
              <button
                onClick={() => setActiveMainView('simulation')}
                className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
              >
                <span>🌴</span>
                <span>Return to 3D Simulation</span>
              </button>
            )}
          </div>

          {activeMainView === 'simulation' ? (
            <div className="flex flex-col space-y-2 w-full">
              {/* Operational Top Strip */}
              <LiveIncidentStrip
                incidents={state.emergencyIncidents}
                impactLab={state.impactLab}
                onOpenDemo={() => setActiveMainView('impact')}
                onOpenWristbands={() => setActiveMainView('wristband')}
              />

              {/* 3D Beach Digital Twin & Multi-Layer Coastal Simulation Stage */}
              <div className="relative w-full min-h-[620px] bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-hidden shadow-2xl">
                <BeachCanvas
                  beach={state.beach}
                  environment={state.environment}
                  visitors={state.visitors}
                  hazards={state.hazards}
                  incidents={state.incidents}
                  riskOverview={state.riskOverview}
                  emergencyResources={state.emergencyResources}
                  boardStates={state.boardStates}
                  activeFailures={state.activeFailures}
                  sensorConflict={state.sensorConflict}
                  isNightMode={state.isNightMode}
                  selectedVisitorId={state.selectedVisitorId}
                  cameras={state.cameras}
                  drones={state.drones}
                  droneCoverages={state.droneCoverages}
                  impactLab={state.impactLab}
                  defaultViewMode="beach3d"
                  onSelectVisitor={handleSelectVisitorFromCanvas}
                />

                <VisitorDetails
                  visitor={selectedVisitor}
                  onClose={() => {
                    setSelectedVisitor(undefined);
                    selectVisitor(undefined);
                  }}
                  onSendWarning={sendWarningToVisitor}
                />
              </div>
            </div>
          ) : activeMainView === 'impact' ? (
            <div className="flex flex-col space-y-2 h-full">
              <button
                onClick={() => setActiveMainView('simulation')}
                className="self-start px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                &larr; Return to 3D Beach Simulation
              </button>
              <ImpactLabDashboard
                onTriggerRipScenario={() => injectHazardScenario('RIP_CURRENT')}
                onTriggerRescueScenario={() => scenarioPhase6SwimmerRescue()}
              />
            </div>
          ) : activeMainView === 'lifeguard' ? (
            <div className="flex flex-col space-y-2 h-full">
              <button
                onClick={() => setActiveMainView('simulation')}
                className="self-start px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                &larr; Return to 3D Beach Simulation
              </button>
              <LifeguardTerminal
                beach={state.beach}
                environment={state.environment}
                visitors={state.visitors}
                drones={state.drones || []}
                selectedPreset={state.beach.presetId || 'RUSHIKONDA_VIZAG'}
                onTriggerSOS={() => {
                  const distressed = state.visitors.find((v) => v.state === 'DISTRESS' || v.state === 'STRUGGLING');
                  if (distressed) {
                    dispatchDroneDistressVerification(distressed.id, distressed.position);
                  } else if (state.drones && state.drones.length > 0) {
                    dispatchDronePatrol(state.drones[0].id, 'PATROL-ALPHA');
                  }
                }}
                onDeployDrone={() => {
                  if (state.drones && state.drones.length > 0) {
                    dispatchDronePatrol(state.drones[0].id, 'PATROL-ALPHA');
                  }
                }}
              />
            </div>
          ) : activeMainView === 'experiment' ? (
            <div className="flex flex-col space-y-2 h-full">
              <button
                onClick={() => setActiveMainView('simulation')}
                className="self-start px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                &larr; Return to 3D Beach Simulation
              </button>
              <ExperimentControlLab
                environment={state.environment}
                riskOverview={state.riskOverview}
                riskHistory={state.riskHistory || []}
                selectedBeachPreset={state.beach.presetId || 'RUSHIKONDA_VIZAG'}
                onSelectBeachPreset={setBeachPreset}
                safetyInterventionsActive={state.safetyInterventionsActive !== false}
                isManualEnvironmentActive={state.isManualEnvironmentActive || false}
                totalVisitors={state.visitors.length}
                activeSwimmersCount={
                  state.visitors.filter(
                    (v) => v.state === 'SWIMMING' || v.state === 'DISTRESS' || v.state === 'DRIFTING' || v.state === 'STRUGGLING'
                  ).length
                }
                running={state.running}
                onStart={start}
                onPause={pause}
                onReset={reset}
                onSetManualEnvironment={setManualEnvironment}
                onResetManualEnvironment={resetManualEnvironment}
                onSetVisitorPopulation={setVisitorPopulation}
                onSetSafetyInterventionsActive={setSafetyInterventionsActive}
                onInjectHazardScenario={injectHazardScenario}
                onRunRiskProgression={runRiskProgression}
              />
            </div>
          ) : activeMainView === 'performance' ? (
            <div className="flex flex-col space-y-2 h-full">
              <button
                onClick={() => setActiveMainView('simulation')}
                className="self-start px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                &larr; Return to 3D Beach Simulation
              </button>
              <PerformanceMonitor
                cacheStats={state.cacheStats}
                performanceMetrics={state.performanceMetrics}
                totalVisitors={state.visitors.length}
                onClearCache={clearCache}
                onRunBenchmark={runPerformanceBenchmark}
              />
            </div>
          ) : activeMainView === 'command' ? (
            <div className="flex flex-col space-y-2 h-full">
              <button
                onClick={() => setActiveMainView('simulation')}
                className="self-start px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                &larr; Return to 3D Beach Simulation
              </button>
              {commandCenterManager ? (
                <CommandCenter
                  commandManager={commandCenterManager}
                  emergencyIncidents={state.emergencyIncidents}
                  emergencyResources={state.emergencyResources}
                  drones={state.drones || []}
                  onRunMultiBeachCrisis={scenarioPhase14MultiBeachCrisis}
                />
              ) : (
                <div className="p-8 text-center text-slate-400 font-mono text-xs">
                  Initializing Coastal Multi-Beach Command Center...
                </div>
              )}
            </div>
          ) : activeMainView === 'gis' && gisManager ? (
            <div className="flex flex-col space-y-2 h-full">
              <button
                onClick={() => setActiveMainView('simulation')}
                className="self-start px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                &larr; Return to 3D Beach Simulation
              </button>
              <GISCommandCenter gisManager={gisManager} simulationState={state} />
            </div>
          ) : activeMainView === 'vision' ? (
            <div className="flex flex-col space-y-2 h-full">
              <button
                onClick={() => setActiveMainView('simulation')}
                className="self-start px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                &larr; Return to 3D Beach Simulation
              </button>
              <VisionPanel
                cameras={state.cameras || []}
                detections={state.visitors.map((v) => ({
                  id: `det-${v.id}`,
                  trackId: v.id,
                  bbox: { x: v.position.x - 10, y: v.position.y - 15, width: 20, height: 30 },
                  confidence: 0.92,
                  className: 'PERSON' as const,
                  cameraId: state.cameras?.[0]?.id || 'CAM-01',
                  timestamp: state.time,
                  groundTruthVisitorId: v.id,
                  worldPosition: v.position,
                  inWater: v.position.y >= state.beach.shorelineY,
                }))}
                safetyEvents={state.cctvSafetyEvents || []}
                metrics={state.visionMetrics || {
                  totalPeopleInBeach: state.visitors.length,
                  peopleInCameraCoverage: Math.round(state.visitors.length * 0.8),
                  peopleInBlindZones: Math.round(state.visitors.length * 0.2),
                  coveragePercentage: 80,
                  activeCameraCount: 4,
                  offlineCameraCount: 0,
                  truePositives: Math.round(state.visitors.length * 0.75),
                  falsePositives: 1,
                  falseNegatives: 2,
                  precision: 96.5,
                  recall: 91.2,
                  f1Score: 93.8,
                  actualDistressedCount: state.visitors.filter((v) => v.state === 'DISTRESS').length,
                  detectedDistressedCount: state.visitors.filter((v) => v.state === 'DISTRESS').length,
                  distressDetectionRate: 95.0,
                  averageDetectionLatencySec: 1.2,
                  activeTrackCount: state.visitors.length,
                  averageTrackDurationSec: 45.0,
                }}
                beach={state.beach}
                onUpdatePTZ={updateCameraPTZ}
                onTogglePower={toggleCameraPower}
              />
            </div>
          ) : activeMainView === 'prediction' ? (
            <div className="flex flex-col space-y-2 h-full">
              <button
                onClick={() => setActiveMainView('simulation')}
                className="self-start px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                &larr; Return to 3D Beach Simulation
              </button>
              <PredictionPanel predictionState={state.predictionState || null} beach={state.beach} />
            </div>
          ) : activeMainView === 'iot' && iotManager ? (
            <div className="flex flex-col space-y-2 h-full">
              <button
                onClick={() => setActiveMainView('simulation')}
                className="self-start px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                &larr; Return to 3D Beach Simulation
              </button>
              <IoTCommandCenter
                iotManager={iotManager}
                onModeChange={setIoTDataSourceMode}
                onToggleSensor={toggleIoTSensorStatus}
              />
            </div>
          ) : activeMainView === 'drones' && droneManager ? (
            <div className="flex flex-col space-y-2 h-full">
              <button
                onClick={() => setActiveMainView('simulation')}
                className="self-start px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                &larr; Return to 3D Beach Simulation
              </button>
              <DroneCommandCenter
                droneManager={droneManager}
                onRunFlagshipScenario={scenarioPhase13Flagship}
                onVerifyDistress={dispatchDroneDistressVerification}
              />
            </div>
          ) : activeMainView === 'analytics' && analyticsEngine && replayEngine && scenarioComparator ? (
            <div className="flex flex-col space-y-2 h-full">
              <button
                onClick={() => setActiveMainView('simulation')}
                className="self-start px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                &larr; Return to 3D Beach Simulation
              </button>
              <SafetyDashboard
                metrics={state.metrics}
                eventStore={analyticsEngine.getEventStore()}
                replayEngine={replayEngine}
                scenarioComparator={scenarioComparator}
              />
            </div>
          ) : activeMainView === 'wristband' ? (
            <div className="flex-1 min-h-0 bg-slate-900/60 rounded-xl border border-slate-800/80 p-2 overflow-hidden shadow-2xl flex flex-col">
              <WristbandOperationsHUD onClose={() => setActiveMainView('simulation')} isModal={false} />
            </div>
          ) : null}
        </div>

        {/* GRID 3: 15% AI Engine Dashboard, All-Risk Controllers, Fleet (Drones, Lifejackets, Boats) */}
        <div className="w-full min-h-[640px]">
          <RightAIEngineControlPanel
            riskOverview={state.riskOverview}
            predictionState={state.predictionState}
            activeDecisions={state.decisions}
            emergencyResources={state.emergencyResources}
            drones={state.drones || []}
            activeFailures={state.activeFailures}
            resilience={state.resilience}
            fallbackStrategy={state.fallbackStrategy}
            hazards={state.hazards}
            visitors={state.visitors}
            visitorStats={state.visitorStats}
            environment={state.environment}
            onInjectHazardScenario={injectHazardScenario}
            onResetManualEnvironment={resetManualEnvironment}
            isManualEnvironmentActive={state.isManualEnvironmentActive || false}
            onDispatchDronePatrol={(droneId, routeId) => dispatchDronePatrol(droneId, routeId || 'PATROL-ALPHA')}
            onDispatchDroneDistressVerification={dispatchDroneDistressVerification}
            onInjectFailure={injectFailure}
            onRemoveFailure={removeFailure}
            onClearAllFailures={clearAllFailures}
            onTriggerChaosMonkey={triggerChaosMonkey}
            onTriggerSOS={() => {
              const distressed = state.visitors.find((v) => v.state === 'DISTRESS' || v.state === 'STRUGGLING');
              if (distressed) {
                dispatchDroneDistressVerification(distressed.id, distressed.position);
              } else if (state.drones && state.drones.length > 0) {
                dispatchDronePatrol(state.drones[0].id, 'PATROL-ALPHA');
              }
            }}
            emergencyIncidents={state.emergencyIncidents}
            boardStates={state.boardStates}
            analytics={state.analytics}
            recentMetrics={state.recentMetrics}
            actions={state.actions}
            resourceState={state.resourceState}
            decisionLogs={state.decisionLogs}
            riskHistory={state.riskHistory || []}
          />
        </div>
      </div>

      {/* Automated Scenario Test Report Modal */}
      {state.scenarioReport && showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col p-4 sm:p-5 shadow-2xl space-y-3 sm:space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{state.scenarioReport.name}</h3>
                  <p className="text-[11px] text-slate-400">{state.scenarioReport.description}</p>
                </div>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Test Outcome</span>
                <span
                  className={`text-sm font-extrabold flex items-center gap-1.5 ${
                    state.scenarioReport.status === 'PASS' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {state.scenarioReport.status === 'PASS' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  {state.scenarioReport.status}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Degradation Level</span>
                <span className="font-mono text-cyan-300 font-bold">{state.scenarioReport.degradationLevel}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Resilience Score</span>
                <span className="font-mono text-emerald-300 font-bold">{state.scenarioReport.resilienceScore}%</span>
              </div>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Evaluation Steps</div>
              {state.scenarioReport.results.map((res, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                    res.passed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-200">{res.step}</span>
                    <span className={`text-[10px] font-bold ${res.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {res.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    <span className="text-slate-400">Actual: </span>
                    {res.actual}
                  </div>
                  {res.notes && <div className="text-[10px] text-cyan-400/80 italic">{res.notes}</div>}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 text-xs font-bold transition-all cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Bottom Controls & Scenario Matrix */}
      <footer>
        <SimulationControls
          running={state.running}
          speed={state.speed}
          onStart={start}
          onPause={pause}
          onReset={reset}
          onSetSpeed={setSpeed}
          onScenarioP7CompoundCrisis={scenarioPhase7CompoundCrisis}
          onScenarioP7SensorConflict={scenarioPhase7SensorConflict}
          onScenarioP7GPSDrift={scenarioPhase7GPSDrift}
          onScenarioP7CommBlackout={scenarioPhase7CommBlackout}
          onTriggerChaosMonkey={triggerChaosMonkey}
          onRunAutomatedSuite={handleRunSuiteAndShowModal}
          onScenarioP6SwimmerRescue={scenarioPhase6SwimmerRescue}
          onScenarioP6DeepWaterBoat={scenarioPhase6DeepWaterBoatRescue}
          onScenarioP6SimultaneousEmergencies={scenarioPhase6SimultaneousEmergencies}
          onScenarioP6ResourceExhaustion={scenarioPhase6ResourceExhaustion}
          onScenarioP5Low={scenarioPhase5LowRisk}
          onScenarioP5Mod={scenarioPhase5ModerateRisk}
          onScenarioP5High={scenarioPhase5HighRisk}
          onTestCaseA={testCaseA}
          onTestCaseB={testCaseB}
          onTestCaseC={testCaseC}
          onTriggerWaveSpike={() => triggerWaveSpike(2.3)}
          onTriggerCurrentSpike={() => triggerCurrentSpike(0.85)}
          onTriggerSquall={triggerWeatherSquall}
        />
      </footer>

      {/* Mobile Sticky Quick Action Control Bar (Visible only on mobile screens < sm) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 px-3 py-2 sm:hidden flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-2">
          {state.running ? (
            <button
              onClick={pause}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs shadow-md active:scale-95"
            >
              <Pause className="w-3.5 h-3.5" />
              PAUSE
            </button>
          ) : (
            <button
              onClick={start}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs shadow-md active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              RUN
            </button>
          )}

          {/* Speed Toggler */}
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
            {[1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                  state.speed === s ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* View Switcher Trigger */}
        <button
          onClick={() => setShowMobileViewDrawer(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 text-cyan-400 border border-slate-700 text-xs font-bold active:scale-95"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>VIEWS</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Mobile Views Modal / Drawer */}
      {showMobileViewDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center sm:hidden">
          <div className="bg-slate-900 border-t border-slate-700 rounded-t-2xl w-full p-4 space-y-3 max-h-[75vh] overflow-y-auto animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <LayoutGrid className="w-4 h-4 text-cyan-400" />
                Select Safety Intelligence View
              </span>
              <button
                onClick={() => setShowMobileViewDrawer(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeMainView === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveMainView(tab.id as any);
                      setShowMobileViewDrawer(false);
                    }}
                    className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all active:scale-95 ${
                      isActive
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-slate-800/80 border-slate-700/80 text-slate-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${tab.color}`} />
                    <span className="text-[11px] font-semibold">{tab.label}</span>
                    {tab.badge && (
                      <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded-full ${tab.badgeColor}`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

