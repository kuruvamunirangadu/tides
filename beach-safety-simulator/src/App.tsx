import React, { useState } from 'react';
import { useSimulation } from './hooks/useSimulation';
import { SimulationHeader } from './components/SimulationHeader';
import { BeachCanvas } from './components/BeachCanvas';
import { EnvironmentPanel } from './components/EnvironmentPanel';
import { VisitorPanel } from './components/VisitorPanel';
import { HazardPanel } from './components/HazardPanel';
import { RiskPanel } from './components/RiskPanel';
import { DecisionPanel } from './components/DecisionPanel';
import { EmergencyPanel } from './components/EmergencyPanel';
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
    'simulation' | 'lifeguard' | 'experiment' | 'performance' | 'command' | 'gis' | 'vision' | 'prediction' | 'iot' | 'drones' | 'analytics'
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
    { id: 'simulation', label: 'LIVE SIMULATION', icon: MapPin, color: 'text-cyan-400', badge: null },
    {
      id: 'lifeguard',
      label: '🛟 LIFEGUARD TERMINAL',
      icon: LifeBuoy,
      color: 'text-amber-400',
      badge: 'PATROL HUD',
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
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
        : null,
      badgeColor: state.safetyInterventionsActive === false ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-rose-500 text-white font-bold',
    },
    {
      id: 'performance',
      label: 'CACHE & PERFORMANCE',
      icon: Cpu,
      color: 'text-emerald-400',
      badge: state.performanceMetrics ? `${state.performanceMetrics.fps} FPS` : null,
      badgeColor: 'bg-emerald-500 text-slate-950 font-bold',
    },
    {
      id: 'command',
      label: 'PHASE 14 COMMAND CENTER',
      icon: Shield,
      color: 'text-blue-400',
      badge: state.multiBeachCommandState && state.multiBeachCommandState.criticalBeachesCount > 0
        ? `${state.multiBeachCommandState.criticalBeachesCount} CRITICAL`
        : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'gis',
      label: 'PHASE 11 GIS GEOFENCE',
      icon: Globe,
      color: 'text-teal-400',
      badge: state.gisBreachEvents && state.gisBreachEvents.length > 0 ? `${state.gisBreachEvents.length}` : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'vision',
      label: 'PHASE 9 CCTV VISION',
      icon: CameraIcon,
      color: 'text-emerald-400',
      badge: state.cctvSafetyEvents && state.cctvSafetyEvents.length > 0 ? `${state.cctvSafetyEvents.length}` : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'prediction',
      label: 'PHASE 10 AI PREDICT',
      icon: TrendingUp,
      color: 'text-indigo-400',
      badge: state.predictionState?.alerts && state.predictionState.alerts.length > 0 ? `${state.predictionState.alerts.length}` : null,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    {
      id: 'iot',
      label: 'PHASE 12 IoT SENSORS',
      icon: Radio,
      color: 'text-amber-400',
      badge: state.iotDataSourceMode || 'HYBRID',
      badgeColor: 'bg-slate-800 text-amber-300 border border-amber-500/30',
    },
    {
      id: 'drones',
      label: 'PHASE 13 DRONES',
      icon: Plane,
      color: 'text-orange-400',
      badge: state.drones && state.drones.some((d) => d.status !== 'AVAILABLE' && d.status !== 'CHARGING') ? 'AIRBORNE' : null,
      badgeColor: 'bg-cyan-400 text-slate-950 font-bold',
    },
    { id: 'analytics', label: 'PHASE 8 ANALYTICS', icon: BarChart3, color: 'text-purple-400', badge: null },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-2 sm:p-4 md:p-5 flex flex-col justify-between space-y-3 sm:space-y-4 max-w-[1600px] mx-auto pb-24 sm:pb-6">
      {/* 1. Header Bar */}
      <SimulationHeader
        timeDisplay={state.timeDisplay}
        isRunning={state.running}
        resilienceScore={state.resilience?.overallResilienceIndex || 100}
        activeLevel={state.fallbackStrategy?.activeLevel || 'FULL_CAPABILITY'}
      />

      {/* Main Navigation Tab Bar: Responsive Scrollable Pills + Mobile Quick View */}
      <div className="flex items-center justify-between gap-2 bg-slate-900/95 p-1.5 rounded-xl border border-slate-800 shadow-md backdrop-blur-md">
        {/* Horizontal Scrollable Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap py-0.5 px-0.5 w-full lg:w-auto">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeMainView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveMainView(tab.id as any)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 active:scale-[0.97] ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25 ring-1 ring-cyan-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-slate-950' : tab.color}`} />
                <span className="text-[11px] sm:text-xs tracking-wide">{tab.label}</span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono animate-pulse ${tab.badgeColor}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Desktop Quick Indicator */}
        <div className="hidden xl:flex items-center gap-2 text-xs font-mono text-slate-400 pr-2 shrink-0">
          <span>
            Resilience: <strong className="text-emerald-400">{state.resilience?.overallResilienceIndex || 100}%</strong>
          </span>
          <span>|</span>
          <span>
            Mode: <strong className="text-cyan-300">{state.fallbackStrategy?.activeLevel || 'FULL'}</strong>
          </span>
        </div>
      </div>

      {/* View Mode 1: Live Beach Simulation Stage */}
      {activeMainView === 'simulation' && (
        <main className="flex flex-col space-y-3 sm:space-y-4">
          {/* Mobile Sub-View Tab Switcher (Visible on < lg screens) */}
          <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
            <button
              onClick={() => setMobileSubTab('canvas')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                mobileSubTab === 'canvas'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400'
              }`}
            >
              🗺️ Beach Canvas
            </button>
            <button
              onClick={() => setMobileSubTab('emergency')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                mobileSubTab === 'emergency'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400'
              }`}
            >
              🚨 Emergency Ops ({state.emergencyIncidents.length})
            </button>
            <button
              onClick={() => setMobileSubTab('decisions')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                mobileSubTab === 'decisions'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400'
              }`}
            >
              🤖 Decisions ({state.decisions?.length || 0})
            </button>
            <button
              onClick={() => setMobileSubTab('failures')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                mobileSubTab === 'failures'
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400'
              }`}
            >
              🔥 Failure Lab ({state.activeFailures?.length || 0})
            </button>
            <button
              onClick={() => setMobileSubTab('analytics_all')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                mobileSubTab === 'analytics_all'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400'
              }`}
            >
              📑 All Telemetry Panels
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
            {/* Left Column (8 cols on desktop, responsive on mobile): Beach Canvas + Emergency Operations & Decision Panels */}
            <div className={`lg:col-span-8 flex flex-col space-y-3 sm:space-y-4 ${
              mobileSubTab === 'canvas' || mobileSubTab === 'analytics_all' || window.innerWidth >= 1024 ? 'block' : 'hidden lg:flex'
            }`}>
              <div className="relative">
                <div className="flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 px-1 mb-1.5 gap-2">
                  <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 text-[11px] sm:text-xs">
                    🗺️ Digital Beach Simulation ({state.beach.width}m × {state.beach.height}m)
                    {state.isNightMode && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] border border-indigo-500/40 font-mono">
                        🌙 NIGHT OPS
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-cyan-400 font-semibold">
                    Phases 1–8 Real-Time Operational Loop Active
                  </span>
                </div>

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
                  isNightMode={state.isNightMode}
                  selectedVisitorId={state.selectedVisitorId}
                  cameras={state.cameras}
                  drones={state.drones}
                  droneCoverages={state.droneCoverages}
                  onSelectVisitor={handleSelectVisitorFromCanvas}
                />

                {/* Selected Visitor Inspector Modal */}
                <VisitorDetails
                  visitor={selectedVisitor}
                  onClose={() => {
                    setSelectedVisitor(undefined);
                    selectVisitor(undefined);
                  }}
                  onSendWarning={sendWarningToVisitor}
                />
              </div>

              {/* Emergency Operations Tracker + Decision Directives */}
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 ${
                mobileSubTab === 'emergency' || mobileSubTab === 'decisions' || mobileSubTab === 'analytics_all' || window.innerWidth >= 1024 ? 'grid' : 'hidden lg:grid'
              }`}>
                <EmergencyPanel
                  incidents={state.emergencyIncidents}
                  resources={state.emergencyResources}
                  boardStates={state.boardStates}
                  analytics={state.analytics}
                  recentMetrics={state.recentMetrics}
                />
                <DecisionPanel
                  decisions={state.decisions}
                  actions={state.actions}
                  resourceState={state.resourceState}
                  historyLogs={state.decisionLogs}
                />
              </div>
            </div>

            {/* Right Column (4 cols on desktop, conditionally displayed on mobile): Failure Lab + Risk + Hazard + Demographics */}
            <div className={`lg:col-span-4 flex flex-col gap-3 ${
              mobileSubTab === 'failures' || mobileSubTab === 'analytics_all' || window.innerWidth >= 1024 ? 'flex' : 'hidden lg:flex'
            }`}>
              {/* Phase 7 Failure & Resilience Injection Lab */}
              <FailureLab
                activeFailures={state.activeFailures}
                fallbackStrategy={state.fallbackStrategy}
                resilience={state.resilience}
                onInjectFailure={injectFailure}
                onRemoveFailure={removeFailure}
                onClearAllFailures={clearAllFailures}
                onTriggerChaosMonkey={triggerChaosMonkey}
              />

              {/* Phase 3: Operational Risk Assessment Panel */}
              <RiskPanel riskOverview={state.riskOverview} />

              {/* Phase 2: Hazard Detection Engine Live Feed */}
              <HazardPanel hazards={state.hazards} />

              {/* Phase 4: Visitor Demographics & Crowd Dynamics */}
              <VisitorPanel stats={state.visitorStats} visitors={state.visitors} />

              {/* Environmental Telemetry */}
              <EnvironmentPanel environment={state.environment} />
            </div>
          </div>
        </main>
      )}

      {/* View Mode: Handheld Lifeguard Patrol Terminal */}
      {activeMainView === 'lifeguard' && (
        <main className="w-full">
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
        </main>
      )}

      {/* View Mode: Manual Risk & Scenario Control Lab */}
      {activeMainView === 'experiment' && (
        <main className="w-full">
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
        </main>
      )}

      {/* View Mode: Simulation Cache & Performance Monitor */}
      {activeMainView === 'performance' && (
        <main className="w-full">
          <PerformanceMonitor
            cacheStats={state.cacheStats}
            performanceMetrics={state.performanceMetrics}
            totalVisitors={state.visitors.length}
            onClearCache={clearCache}
            onRunBenchmark={runPerformanceBenchmark}
          />
        </main>
      )}

      {/* View Mode: Phase 14 Central Command & Control Center */}
      {activeMainView === 'command' && commandCenterManager && (
        <main className="w-full">
          <CommandCenter
            commandManager={commandCenterManager}
            emergencyIncidents={state.emergencyIncidents}
            emergencyResources={state.emergencyResources}
            drones={state.drones || []}
            onRunMultiBeachCrisis={scenarioPhase14MultiBeachCrisis}
          />
        </main>
      )}

      {/* View Mode 2: Phase 11 GIS & Geofencing Command Center */}
      {activeMainView === 'gis' && gisManager && (
        <main className="w-full">
          <GISCommandCenter
            gisManager={gisManager}
            simulationState={state}
          />
        </main>
      )}

      {/* View Mode 3: Phase 9 CCTV Vision Safety Layer */}
      {activeMainView === 'vision' && (
        <main className="w-full">
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
              actualDistressedCount: state.visitors.filter(v => v.state === 'DISTRESS').length,
              detectedDistressedCount: state.visitors.filter(v => v.state === 'DISTRESS').length,
              distressDetectionRate: 95.0,
              averageDetectionLatencySec: 1.2,
              activeTrackCount: state.visitors.length,
              averageTrackDurationSec: 45.0,
            }}
            beach={state.beach}
            onUpdatePTZ={updateCameraPTZ}
            onTogglePower={toggleCameraPower}
          />
        </main>
      )}

      {/* View Mode 3: Phase 10 AI / ML Predictive Safety Engine */}
      {activeMainView === 'prediction' && (
        <main className="w-full">
          <PredictionPanel
            predictionState={state.predictionState || null}
            beach={state.beach}
          />
        </main>
      )}

      {/* View Mode 4: Phase 12 IoT & Physical Sensor Ingestion */}
      {activeMainView === 'iot' && iotManager && (
        <main className="w-full">
          <IoTCommandCenter
            iotManager={iotManager}
            onModeChange={setIoTDataSourceMode}
            onToggleSensor={toggleIoTSensorStatus}
          />
        </main>
      )}

      {/* View Mode 5: Phase 13 Drone Aerial Perception & Response */}
      {activeMainView === 'drones' && droneManager && (
        <main className="w-full">
          <DroneCommandCenter
            droneManager={droneManager}
            onRunFlagshipScenario={scenarioPhase13Flagship}
            onVerifyDistress={dispatchDroneDistressVerification}
          />
        </main>
      )}

      {/* View Mode 6: Phase 8 Safety Performance Dashboard */}
      {activeMainView === 'analytics' && analyticsEngine && replayEngine && scenarioComparator && (
        <main className="w-full">
          <SafetyDashboard
            metrics={state.metrics}
            eventStore={analyticsEngine.getEventStore()}
            replayEngine={replayEngine}
            scenarioComparator={scenarioComparator}
          />
        </main>
      )}

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

