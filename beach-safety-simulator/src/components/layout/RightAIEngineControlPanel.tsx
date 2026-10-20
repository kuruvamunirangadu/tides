import React, { useState, useEffect } from 'react';
import {
  Cpu,
  ShieldAlert,
  Flame,
  Waves,
  Ship,
  Compass,
  Plane,
  LifeBuoy,
  Radio,
  Ambulance,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Zap,
  CheckCircle2,
  Activity,
  Layers,
  ChevronDown,
  BarChart2,
  Siren,
  Battery,
  Wifi,
  Bell,
  Heart,
} from 'lucide-react';
import { WristbandRegistry } from '../../wristbands/WristbandRegistry';
import { WristbandEventAdapter } from '../../wristbands/WristbandEventAdapter';
import { WristbandIncidentBridge } from '../../wristbands/WristbandIncidentBridge';
import { LocalizedWarningDistributionEngine } from '../../wristbands/LocalizedWarningDistributionEngine';
import { SwimmerWristband, WarningCategory } from '../../wristbands/wristband.types';
import { BeachRiskOverview } from '../../models/Risk';
import { EmergencyResource } from '../../emergency/models/EmergencyResource';
import { VirtualDrone } from '../../drones/simulation/VirtualDrone';
import { FailureEvent } from '../../failures/types/FailureTypes';
import { Decision } from '../../decision/models/Decision';
import { Hazard } from '../../models/Hazard';
import { Visitor } from '../../models/Visitor';
import { Environment } from '../../models/Environment';
import { RiskPanel } from '../RiskPanel';
import { FailureLab } from '../FailureLab';
import { HazardPanel } from '../HazardPanel';
import { VisitorPanel } from '../VisitorPanel';
import { EnvironmentPanel } from '../EnvironmentPanel';
import { EmergencyPanel } from '../EmergencyPanel';
import { DecisionPanel } from '../DecisionPanel';
import { EmergencyIncident } from '../../emergency/models/EmergencyIncident';
import { BoardDisplayState } from '../../emergency/communication/WarningBoardManager';
import { PerformanceAnalytics, ResponseMetrics } from '../../emergency/models/ResponseMetrics';
import { ResponseAction } from '../../decision/models/ResponseAction';
import { ResourceState } from '../../decision/models/Resource';
import { DecisionLogEntry } from '../../decision/history/DecisionHistory';

export interface RightAIEngineControlPanelProps {
  riskOverview?: BeachRiskOverview;
  predictionState?: any;
  activeDecisions?: Decision[];
  emergencyResources: EmergencyResource[];
  drones: VirtualDrone[];
  activeFailures?: FailureEvent[];
  resilience?: any;
  fallbackStrategy?: any;
  hazards?: Hazard[];
  visitors?: Visitor[];
  visitorStats?: any;
  environment?: Environment;
  onInjectHazardScenario: (type: any) => void;
  onResetManualEnvironment: () => void;
  isManualEnvironmentActive: boolean;
  onDispatchDronePatrol?: (droneId: string, missionType?: string) => void;
  onDispatchDroneDistressVerification?: (visitorId: string, location: any) => void;
  onInjectFailure: (type: any, name: string, desc: string, sev?: any, target?: string) => void;
  onRemoveFailure?: (id: string) => void;
  onClearAllFailures: () => void;
  onTriggerChaosMonkey?: () => void;
  onTriggerSOS?: () => void;
  // Emergency Response Engine & Decision Response Engine:
  emergencyIncidents?: EmergencyIncident[];
  boardStates?: BoardDisplayState[];
  analytics?: PerformanceAnalytics;
  recentMetrics?: ResponseMetrics[];
  actions?: ResponseAction[];
  resourceState?: ResourceState;
  decisionLogs?: DecisionLogEntry[];
}

export const RightAIEngineControlPanel: React.FC<RightAIEngineControlPanelProps> = ({
  riskOverview,
  predictionState,
  activeDecisions = [],
  emergencyResources = [],
  drones = [],
  activeFailures = [],
  resilience,
  fallbackStrategy,
  hazards = [],
  visitors = [],
  visitorStats,
  environment,
  onInjectHazardScenario,
  onResetManualEnvironment,
  isManualEnvironmentActive,
  onDispatchDronePatrol,
  onDispatchDroneDistressVerification,
  onInjectFailure,
  onRemoveFailure,
  onClearAllFailures,
  onTriggerChaosMonkey,
  onTriggerSOS,
  emergencyIncidents = [],
  boardStates = [],
  analytics,
  recentMetrics = [],
  actions = [],
  resourceState,
  decisionLogs = [],
}) => {
  const [activeTab, setActiveTab] = useState<'emergency_both' | 'emergency' | 'decisions' | 'ai_risk' | 'fleet' | 'hazards' | 'failures' | 'wristbands' | 'telemetry'>('emergency_both');

  const wristbandRegistry = WristbandRegistry.getInstance();
  const warningEngine = LocalizedWarningDistributionEngine.getInstance();
  const eventAdapter = WristbandEventAdapter.getInstance();
  const incidentBridge = WristbandIncidentBridge.getInstance();

  const [wristbands, setWristbands] = useState<SwimmerWristband[]>(wristbandRegistry.getWristbands());
  const [selectedWristbandId, setSelectedWristbandId] = useState<string>('WB-105');
  const [wbNotice, setWbNotice] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setWristbands([...wristbandRegistry.getWristbands()]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const selectedWristband = wristbands.find((w) => w.id === selectedWristbandId) || wristbands[0];
  const activeWristbandSosCount = wristbands.filter((w) => w.isSosActive).length;

  const handleTriggerWristbandSOS = (wbId: string) => {
    const rawEvent = wristbandRegistry.triggerSOS(wbId, true);
    if (rawEvent) {
      const validation = eventAdapter.ingestSOSEvent(rawEvent);
      if (validation.isValid && validation.validatedEvent) {
        incidentBridge.handleSOSEvent(validation.validatedEvent);
      }
    }
    setWristbands([...wristbandRegistry.getWristbands()]);
    setWbNotice(`🚨 SOS triggered on ${wbId}! Authoritative incident created.`);
    setTimeout(() => setWbNotice(null), 5000);
  };

  const handleCancelWristbandSOS = (wbId: string) => {
    wristbandRegistry.cancelSOS(wbId);
    setWristbands([...wristbandRegistry.getWristbands()]);
    setWbNotice(`✓ SOS cancelled on ${wbId}`);
    setTimeout(() => setWbNotice(null), 4000);
  };

  const handleBroadcastWarning = (category: WarningCategory = 'EMERGENCY') => {
    warningEngine.dispatchTargetedWarning({
      category: category,
      title: `${category}: Rip Current Alert`,
      message: 'HAZARD: STRONG SEAWARD JET CURRENT DETECTED — EXIT TO SHORE IMMEDIATELY',
      zoneIds: ['CENTRAL_SURF', 'RIP_CURRENT_CORRIDOR_SOUTH', 'SWIM_ZONE_NORTH'],
    });
    setWristbands([...wristbandRegistry.getWristbands()]);
    setWbNotice(`📢 Localized warning broadcasted to swimmers in water!`);
    setTimeout(() => setWbNotice(null), 5000);
  };

  const handleAcknowledgeWarning = (wbId: string) => {
    wristbandRegistry.acknowledgeWarning(wbId);
    setWristbands([...wristbandRegistry.getWristbands()]);
    setWbNotice(`✓ Swimmer double-tapped ${wbId}: Acknowledged`);
    setTimeout(() => setWbNotice(null), 4000);
  };

  const boat = emergencyResources.find((r) => r.type === 'RESCUE_BOAT');
  const lifeguards = emergencyResources.filter((r) => r.type === 'LIFEGUARD');
  const primaryDrone = drones[0];
  const activeIncidents = emergencyIncidents.filter((i) => i.status !== 'RESOLVED');
  const activeActions = actions.filter((a) => a.status === 'ACTIVE');

  const overallRiskScore = riskOverview?.overallBeachRiskScore ?? 24;
  const riskCategory = riskOverview?.overallCategory ?? 'LOW';

  const zoneList = Object.values(riskOverview?.zoneAssessments || {});
  const avgHazard = zoneList.length ? Math.round(zoneList.reduce((s, z) => s + z.hazardScore, 0) / zoneList.length) : 28;
  const avgExposure = zoneList.length ? Math.round(zoneList.reduce((s, z) => s + z.exposureScore, 0) / zoneList.length) : 32;
  const avgVulnerability = zoneList.length ? Math.round(zoneList.reduce((s, z) => s + z.vulnerabilityScore, 0) / zoneList.length) : 22;
  const avgResponse = zoneList.length ? Math.round(zoneList.reduce((s, z) => s + z.responseScore, 0) / zoneList.length) : 88;

  const getRiskColor = (cat: string) => {
    switch (cat) {
      case 'CRITICAL':
        return 'text-rose-400 border-rose-500/50 bg-rose-500/10';
      case 'HIGH':
        return 'text-amber-400 border-amber-500/50 bg-amber-500/10';
      case 'MODERATE':
        return 'text-yellow-300 border-yellow-500/40 bg-yellow-500/10';
      default:
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    }
  };

  const getResourceStatusColor = (status: string) => {
    switch (status) {
      case 'EN_ROUTE':
      case 'DISPATCHED':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse';
      case 'ON_SCENE':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse';
      case 'RETURNING':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'AVAILABLE':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <aside className="w-full bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 p-2.5 flex flex-col gap-2 text-left shadow-xl h-full min-h-[640px] max-h-[780px] overflow-hidden">
      {/* 1. Header with Tab Switcher */}
      <div className="shrink-0 space-y-1.5">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <span className="p-1 rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Cpu className="w-3.5 h-3.5" />
            </span>
            <span className="tracking-wide uppercase text-xs font-extrabold text-white">AI Engine & Ops Deck</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 font-bold">
            GRID 3
          </span>
        </div>

        {/* Tab Switcher */}
        <div className="space-y-1 mt-2">
          {/* Engines Row (Requested by User) */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-lg text-[10px] font-bold text-center">
            <button
              onClick={() => setActiveTab('emergency_both')}
              className={`py-1.5 px-1 rounded cursor-pointer transition flex items-center justify-center gap-1 ${
                activeTab === 'emergency_both'
                  ? 'bg-rose-600 text-white shadow-md font-black ring-1 ring-rose-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span>⚖️</span>
              <span>Both Engines</span>
            </button>
            <button
              onClick={() => setActiveTab('emergency')}
              className={`py-1.5 px-1 rounded cursor-pointer transition flex items-center justify-center gap-1 ${
                activeTab === 'emergency'
                  ? 'bg-rose-600 text-white shadow-md font-black ring-1 ring-rose-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span>🚨</span>
              <span>Rescues ({activeIncidents.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('decisions')}
              className={`py-1.5 px-1 rounded cursor-pointer transition flex items-center justify-center gap-1 ${
                activeTab === 'decisions'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black ring-1 ring-cyan-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span>🧠</span>
              <span>Directives ({activeActions.length})</span>
            </button>
          </div>

          {/* AI, Fleet, Hazards, Wristbands Row */}
          <div className="grid grid-cols-6 gap-0.5 p-0.5 bg-slate-950/80 rounded-lg text-[8px] font-bold text-center">
            <button
              onClick={() => setActiveTab('ai_risk')}
              className={`py-1 rounded cursor-pointer transition ${
                activeTab === 'ai_risk' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              AI Risk
            </button>
            <button
              onClick={() => setActiveTab('fleet')}
              className={`py-1 rounded cursor-pointer transition ${
                activeTab === 'fleet' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Fleet
            </button>
            <button
              onClick={() => setActiveTab('hazards')}
              className={`py-1 rounded cursor-pointer transition ${
                activeTab === 'hazards' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hazards
            </button>
            <button
              onClick={() => setActiveTab('failures')}
              className={`py-1 rounded cursor-pointer transition ${
                activeTab === 'failures' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Faults
            </button>
            <button
              onClick={() => setActiveTab('wristbands')}
              className={`py-1 rounded cursor-pointer transition flex items-center justify-center gap-0.5 ${
                activeTab === 'wristbands'
                  ? 'bg-teal-500 text-slate-950 font-black shadow-sm'
                  : activeWristbandSosCount > 0
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-2.5 h-2.5" />
              <span>Bands{activeWristbandSosCount > 0 ? ` 🚨` : ''}</span>
            </button>
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`py-1 rounded cursor-pointer transition ${
                activeTab === 'telemetry' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Panels
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tab Content Container */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5 text-xs scrollbar-thin">
        {/* TAB: BOTH ENGINES (STACKED) */}
        {activeTab === 'emergency_both' && (
          <div className="space-y-3">
            <EmergencyPanel
              incidents={emergencyIncidents}
              resources={emergencyResources}
              boardStates={boardStates}
              analytics={analytics || ({} as any)}
              recentMetrics={recentMetrics}
            />
            <DecisionPanel
              decisions={activeDecisions}
              actions={actions}
              resourceState={resourceState}
              historyLogs={decisionLogs}
            />
          </div>
        )}

        {/* TAB: EMERGENCY RESPONSE ENGINE */}
        {activeTab === 'emergency' && (
          <div className="space-y-2">
            <EmergencyPanel
              incidents={emergencyIncidents}
              resources={emergencyResources}
              boardStates={boardStates}
              analytics={analytics || ({} as any)}
              recentMetrics={recentMetrics}
            />
          </div>
        )}

        {/* TAB: DECISION & RESPONSE ENGINE */}
        {activeTab === 'decisions' && (
          <div className="space-y-2">
            <DecisionPanel
              decisions={activeDecisions}
              actions={actions}
              resourceState={resourceState}
              historyLogs={decisionLogs}
            />
          </div>
        )}
        {/* TAB 1: AI RISK ENGINE & PREDICTIONS */}
        {activeTab === 'ai_risk' && (
          <div className="space-y-2">
            {/* Overall Risk Score Badge */}
            <div className={`p-2.5 rounded-lg border flex items-center justify-between ${getRiskColor(riskCategory)}`}>
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider block opacity-80">Overall Beach Risk</span>
                <span className="text-base font-extrabold font-mono leading-none">{overallRiskScore}/100</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider font-mono border">
                {riskCategory}
              </span>
            </div>

            {/* 4-Pillars Risk Scores Breakdown */}
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
              <span className="text-[9px] font-mono uppercase text-slate-400 font-bold block">4-Pillar Evaluation</span>
              <div className="space-y-1 text-[10px] font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">🌊 Hazard (Waves/Current):</span>
                  <span className="font-bold text-cyan-300">
                    {avgHazard}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">👥 Exposure (Zone Density):</span>
                  <span className="font-bold text-amber-300">
                    {avgExposure}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">🩹 Vulnerability (Fatigue):</span>
                  <span className="font-bold text-rose-300">
                    {avgVulnerability}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">⏱️ Response Readiness:</span>
                  <span className="font-bold text-emerald-300">
                    {avgResponse}%
                  </span>
                </div>
              </div>
            </div>

            {/* AI Predictive Risk Horizons */}
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
              <span className="text-[9px] font-mono uppercase text-indigo-400 font-bold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Predictive AI Forecast
              </span>
              <div className="grid grid-cols-2 gap-1 text-[9px] font-mono text-center">
                <div className="p-1 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block">T+15m</span>
                  <span className="text-cyan-300 font-bold">Risk: {Math.min(99, overallRiskScore + 4)}</span>
                </div>
                <div className="p-1 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block">T+30m</span>
                  <span className="text-amber-300 font-bold">Risk: {Math.min(99, overallRiskScore + 9)}</span>
                </div>
                <div className="p-1 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block">T+60m</span>
                  <span className="text-rose-300 font-bold">Risk: {Math.min(99, overallRiskScore + 14)}</span>
                </div>
                <div className="p-1 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block">T+120m</span>
                  <span className="text-purple-300 font-bold">Risk: {Math.min(99, overallRiskScore + 18)}</span>
                </div>
              </div>
            </div>

            {/* AI Executing Directives */}
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-[9px] font-mono uppercase text-slate-400 font-bold block">Active Directives</span>
              {activeDecisions.length === 0 ? (
                <div className="text-[10px] text-slate-500 italic">No automated closures or evacuations active</div>
              ) : (
                activeDecisions.slice(0, 2).map((d) => (
                  <div key={d.id} className="p-1.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
                    <div className="font-bold text-amber-300 truncate">{d.reason}</div>
                    <div className="text-[9px] text-slate-400">{d.actions.length} automated responses executing</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: RESCUE FLEET & ASSET CONTROLLERS */}
        {activeTab === 'fleet' && (
          <div className="space-y-2">
            {/* 1. Rapid Rescue Boat Controller */}
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-200 flex items-center gap-1">
                  <Ship className="w-3.5 h-3.5 text-blue-400" />
                  <span>Rescue Boat (BOAT-01)</span>
                </span>
                <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded-full font-bold border ${getResourceStatusColor(boat?.status || 'AVAILABLE')}`}>
                  {boat?.status || 'AVAILABLE'}
                </span>
              </div>
              <div className="text-[9px] font-mono text-slate-400 space-y-0.5">
                <div>Speed: 80 px/s | Radius: 900m</div>
                <div>Position: ({boat?.position.x.toFixed(0) || 150}, {boat?.position.y.toFixed(0) || 340})</div>
                {boat?.targetPosition && (
                  <div className="text-cyan-300 font-bold">
                    Target: ({boat.targetPosition.x.toFixed(0)}, {boat.targetPosition.y.toFixed(0)})
                  </div>
                )}
              </div>
            </div>

            {/* 2. Autonomous SAR Drones Controller */}
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-200 flex items-center gap-1">
                  <Plane className="w-3.5 h-3.5 text-cyan-400" />
                  <span>SAR Drones (UAV-01/02)</span>
                </span>
                <span className="text-[8px] font-mono px-1.5 py-0.2 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {drones.some((d) => d.altitude > 2) ? 'AIRBORNE' : 'READY'}
                </span>
              </div>
              <div className="text-[9px] font-mono text-slate-400 space-y-0.5">
                <div>Speed: 135 px/s | Flotation Buoy: LOADED</div>
                <div>Fleet Status: {drones.length} Autonomous Units Online</div>
              </div>
              {onDispatchDronePatrol && (
                <button
                  onClick={() => onDispatchDronePatrol(primaryDrone?.id || 'DRONE-01', 'PATROL-ALPHA')}
                  className="w-full py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <Plane className="w-3 h-3" /> Launch Drone Patrol
                </button>
              )}
            </div>

            {/* 3. Lifeguard Squad Units */}
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-200">
                <span className="flex items-center gap-1">
                  <LifeBuoy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Lifeguard Squads</span>
                </span>
                <span className="text-[9px] font-mono text-amber-300">{lifeguards.length} Stations</span>
              </div>
              <div className="space-y-1">
                {lifeguards.map((lg) => (
                  <div key={lg.id} className="flex items-center justify-between text-[9px] font-mono bg-slate-900 p-1 rounded">
                    <span className="text-slate-300">{lg.id}</span>
                    <span className={`px-1 py-0.2 rounded ${getResourceStatusColor(lg.status)}`}>{lg.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Lifejackets & Wristband Safety Bands Controller */}
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-200 flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-teal-400" />
                  <span>Safety Wristbands (LoRa)</span>
                </span>
                <span className="text-[8px] font-mono px-1.5 py-0.2 rounded-full font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  IN865 ONLINE
                </span>
              </div>
              <div className="text-[9px] text-slate-400">
                IP68 Safety Bands with active RF gateway telemetry & haptic vibration warning downlinks.
              </div>
              {onTriggerSOS && (
                <button
                  onClick={onTriggerSOS}
                  className="w-full py-1 rounded bg-rose-600/30 hover:bg-rose-600/40 text-rose-300 border border-rose-500/50 text-[9px] font-bold transition cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                >
                  <AlertTriangle className="w-3 h-3 text-rose-400" /> 1-Tap SOS Emergency Broadcast
                </button>
              )}
            </div>

            {/* 5. Paramedic Ambulance Standby */}
            <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between text-[9px] font-mono">
              <span className="flex items-center gap-1 text-slate-300 font-bold">
                <Ambulance className="w-3.5 h-3.5 text-rose-400" /> Paramedic EMS
              </span>
              <span className="text-emerald-400">STANDBY (BASE)</span>
            </div>
          </div>
        )}

        {/* TAB 3: ALL-RISK CONTROLLERS (HAZARDS INJECTION) */}
        {activeTab === 'hazards' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono uppercase text-slate-400 font-bold">Risk Stress Injections</span>
              {isManualEnvironmentActive && (
                <button
                  onClick={onResetManualEnvironment}
                  className="text-[8px] font-bold text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" /> Reset
                </button>
              )}
            </div>

            <div className="space-y-1">
              <button
                onClick={() => onInjectHazardScenario('RIP_CURRENT')}
                className="w-full py-1.5 px-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/40 text-rose-300 text-[10px] font-bold text-left transition cursor-pointer flex items-center justify-between group shadow-sm active:scale-95"
              >
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  <span>Rip Outflow (1.9 m/s)</span>
                </span>
                <span className="text-[8px] font-mono text-rose-400">Inject</span>
              </button>

              <button
                onClick={() => onInjectHazardScenario('HIGH_WAVES')}
                className="w-full py-1.5 px-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold text-left transition cursor-pointer flex items-center justify-between group shadow-sm active:scale-95"
              >
                <span className="flex items-center gap-1">
                  <Waves className="w-3.5 h-3.5 text-cyan-400" />
                  <span>High Waves (2.8m)</span>
                </span>
                <span className="text-[8px] font-mono text-cyan-400">Inject</span>
              </button>

              <button
                onClick={() => onInjectHazardScenario('STRONG_CURRENT')}
                className="w-full py-1.5 px-2 rounded-lg bg-amber-950/60 hover:bg-amber-900/70 border border-amber-500/40 text-amber-300 text-[10px] font-bold text-left transition cursor-pointer flex items-center justify-between group shadow-sm active:scale-95"
              >
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Strong Current (1.5 m/s)</span>
                </span>
                <span className="text-[8px] font-mono text-amber-400">Inject</span>
              </button>

              <button
                onClick={() => onInjectHazardScenario('STORM_SQUALL')}
                className="w-full py-1.5 px-2 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/70 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold text-left transition cursor-pointer flex items-center justify-between group shadow-sm active:scale-95"
              >
                <span>🌪️ Storm Squall (58 km/h)</span>
                <span className="text-[8px] font-mono text-indigo-400">Inject</span>
              </button>

              <button
                onClick={() => onInjectHazardScenario('RAPID_TIDE')}
                className="w-full py-1.5 px-2 rounded-lg bg-teal-950/60 hover:bg-teal-900/70 border border-teal-500/40 text-teal-300 text-[10px] font-bold text-left transition cursor-pointer flex items-center justify-between group shadow-sm active:scale-95"
              >
                <span>📉 Rapid Low Tide (0.45m)</span>
                <span className="text-[8px] font-mono text-teal-400">Inject</span>
              </button>

              <button
                onClick={() => onInjectHazardScenario('CROWD_SURGE')}
                className="w-full py-1.5 px-2 rounded-lg bg-purple-950/60 hover:bg-purple-900/70 border border-purple-500/40 text-purple-300 text-[10px] font-bold text-left transition cursor-pointer flex items-center justify-between group shadow-sm active:scale-95"
              >
                <span>👥 Crowd Surge (180 Bathers)</span>
                <span className="text-[8px] font-mono text-purple-400">Inject</span>
              </button>

              <button
                onClick={() => onInjectHazardScenario('COMPOUND_CRISIS')}
                className="w-full py-1.5 px-2 rounded-lg bg-rose-950/80 hover:bg-rose-900/90 border border-rose-500 text-rose-200 text-[10px] font-black text-left transition cursor-pointer flex items-center justify-between group shadow-md active:scale-95 animate-pulse"
              >
                <span className="flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Compound Crisis</span>
                </span>
                <span className="text-[8px] font-mono text-rose-300">Max Risk</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: FAILURE LAB & SENSOR INTEGRITY */}
        {activeTab === 'failures' && (
          <div className="space-y-2">
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono uppercase text-slate-400 font-bold">System Resilience</span>
                <span className="text-[10px] font-mono font-bold text-emerald-400">
                  {resilience?.overallResilienceIndex || 100}%
                </span>
              </div>
              <div className="text-[9px] font-mono text-slate-400">
                Fallback: <strong className="text-cyan-300">{fallbackStrategy?.activeLevel || 'FULL_CAPABILITY'}</strong>
              </div>
              {activeFailures.length > 0 && (
                <button
                  onClick={onClearAllFailures}
                  className="w-full py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] font-bold border border-slate-700 cursor-pointer"
                >
                  Clear All Failures ({activeFailures.length})
                </button>
              )}
            </div>

            <div className="space-y-1">
              <button
                onClick={() =>
                  onInjectFailure(
                    'SENSOR_FAILURE',
                    'Wave Buoy Offline',
                    'Acoustic buoy telemetry link interrupted',
                    'HIGH',
                    'WAVE_SENSOR'
                  )
                }
                className="w-full p-1.5 rounded bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 text-[10px] text-slate-300 text-left transition cursor-pointer flex items-center justify-between"
              >
                <span>📡 Wave Sensor Fault</span>
                <span className="text-[8px] font-mono text-amber-400">+Inject</span>
              </button>

              <button
                onClick={() =>
                  onInjectFailure(
                    'CAMERA_FAILURE',
                    'CCTV Vision Degraded',
                    'Rain & fog occluding optical tracking feed',
                    'MEDIUM',
                    'CAM-01'
                  )
                }
                className="w-full p-1.5 rounded bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 text-[10px] text-slate-300 text-left transition cursor-pointer flex items-center justify-between"
              >
                <span>📷 CCTV Camera Fault</span>
                <span className="text-[8px] font-mono text-amber-400">+Inject</span>
              </button>

              <button
                onClick={() =>
                  onInjectFailure(
                    'GPS_ERROR',
                    'GPS Multipath Drift',
                    'Ephemeris atmospheric disturbance',
                    'MEDIUM',
                    'GPS-01'
                  )
                }
                className="w-full p-1.5 rounded bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 text-[10px] text-slate-300 text-left transition cursor-pointer flex items-center justify-between"
              >
                <span>🛰️ GPS Drift Error</span>
                <span className="text-[8px] font-mono text-amber-400">+Inject</span>
              </button>

              <button
                onClick={() =>
                  onInjectFailure(
                    'COMMUNICATION_BLACKOUT',
                    'RF Tower Outage',
                    'LoRaWAN base station gateway timeout',
                    'HIGH',
                    'GW-TOWER-01'
                  )
                }
                className="w-full p-1.5 rounded bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-rose-500/50 text-[10px] text-slate-300 text-left transition cursor-pointer flex items-center justify-between"
              >
                <span>📻 LoRa Comm Blackout</span>
                <span className="text-[8px] font-mono text-rose-400">+Inject</span>
              </button>

              {onTriggerChaosMonkey && (
                <button
                  onClick={onTriggerChaosMonkey}
                  className="w-full p-1 rounded bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 text-purple-300 text-[9px] font-bold text-center cursor-pointer"
                >
                  🐒 Trigger Chaos Monkey
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: WRISTBANDS (TRACK B: SAFETY NETWORK & VIRTUAL HARDWARE) */}
        {activeTab === 'wristbands' && (
          <div className="space-y-2.5 font-mono text-xs">
            {/* Live Action Notice */}
            {wbNotice && (
              <div className="p-2 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold text-[10px] animate-pulse">
                {wbNotice}
              </div>
            )}

            {/* Network KPI Cards */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[9px] text-slate-400 uppercase font-bold block">RF Gateways</span>
                <span className="text-sm font-black text-teal-400">3 Online</span>
                <span className="text-[8px] text-slate-500 block">IN865 (865.2 MHz)</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[9px] text-slate-400 uppercase font-bold block">Active SOS</span>
                <span className={`text-sm font-black ${activeWristbandSosCount > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                  {activeWristbandSosCount > 0 ? `🚨 ${activeWristbandSosCount} SOS ACTIVE` : '0 Active (Safe)'}
                </span>
                <span className="text-[8px] text-slate-500 block">Zero-Coord Integrity</span>
              </div>
            </div>

            {/* Simulated Wearable Device Card */}
            {selectedWristband && (
              <div className="p-2.5 rounded-2xl bg-slate-950 border border-teal-500/40 shadow-xl space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${selectedWristband.isSosActive ? 'bg-rose-500 animate-ping' : selectedWristband.ledState.includes('RED') ? 'bg-rose-500' : 'bg-emerald-400'}`} />
                    <strong className="text-white text-xs">{selectedWristband.id}</strong>
                    <span className="text-[10px] text-slate-400">({selectedWristband.pairedVisitorName || 'Standby'})</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${selectedWristband.batteryPercent <= 20 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                    🔋 {selectedWristband.batteryPercent}%
                  </span>
                </div>

                {/* Simulated 0.96" OLED Display */}
                <div className="bg-black border-2 border-slate-700 rounded-xl p-2.5 shadow-inner space-y-1">
                  <div className="flex items-center justify-between text-[8px] text-slate-500 uppercase border-b border-slate-850 pb-0.5">
                    <span>TIDES OS v2.4</span>
                    <span className={selectedWristband.isSosActive ? 'text-rose-400 font-bold' : 'text-teal-400 font-bold'}>
                      {selectedWristband.isSosActive ? 'EMERGENCY SOS' : 'NOMINAL'}
                    </span>
                  </div>
                  <div className={`text-center py-2 font-black tracking-wide leading-tight ${selectedWristband.isSosActive ? 'text-rose-400 animate-pulse text-xs' : selectedWristband.lastWarningReceived ? 'text-amber-300 text-[11px]' : 'text-cyan-300 text-[11px]'}`}>
                    {selectedWristband.isSosActive
                      ? '🚨 SOS DISPATCHED: RESCUE BOAT EN ROUTE'
                      : selectedWristband.oledMessage || 'SAFE - BEACH OPEN'}
                  </div>
                  <div className="flex items-center justify-between text-[8px] text-slate-500 pt-0.5 border-t border-slate-850">
                    <span className="truncate max-w-[140px]">ZONE: {selectedWristband.currentZone}</span>
                    <span>GW: -76dBm</span>
                  </div>
                </div>

                {/* Hardware Indicators Strip */}
                <div className="grid grid-cols-2 gap-1 text-[9px]">
                  <div className="p-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">LED:</span>
                    <span className={selectedWristband.isSosActive ? 'text-rose-400 font-bold animate-pulse' : 'text-emerald-400 font-bold'}>
                      {selectedWristband.ledState}
                    </span>
                  </div>
                  <div className="p-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Haptics:</span>
                    <span className={selectedWristband.vibrationPattern !== 'OFF' ? 'text-amber-300 font-bold animate-pulse' : 'text-slate-400 font-bold'}>
                      {selectedWristband.vibrationPattern}
                    </span>
                  </div>
                </div>

                {/* 1-Tap Operator Actions */}
                <div className="space-y-1 pt-1">
                  <div className="grid grid-cols-2 gap-1">
                    {selectedWristband.isSosActive ? (
                      <button
                        onClick={() => handleCancelWristbandSOS(selectedWristband.id)}
                        className="py-1 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition cursor-pointer text-center"
                      >
                        ✕ Cancel SOS
                      </button>
                    ) : (
                      <button
                        onClick={() => handleTriggerWristbandSOS(selectedWristband.id)}
                        className="py-1 px-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-[10px] font-black transition cursor-pointer shadow-lg shadow-rose-900/40 text-center flex items-center justify-center gap-1"
                      >
                        <span>🚨</span>
                        <span>Trigger SOS</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleAcknowledgeWarning(selectedWristband.id)}
                      className="py-1 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-[10px] font-bold transition cursor-pointer text-center flex items-center justify-center gap-1"
                      title="Swimmer double-taps button to acknowledge warning"
                    >
                      <span>✓</span>
                      <span>Acknowledge</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleBroadcastWarning('EMERGENCY')}
                    className="w-full py-1 px-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>📢</span>
                    <span>Broadcast Localized Warning Downlink</span>
                  </button>
                </div>
              </div>
            )}

            {/* Device Fleet Selector Table */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Swimmer Safety Fleet ({wristbands.length} Devices)
              </span>
              <div className="space-y-1 max-h-44 overflow-y-auto pr-0.5">
                {wristbands.map((wb) => (
                  <button
                    key={wb.id}
                    onClick={() => setSelectedWristbandId(wb.id)}
                    className={`w-full p-1.5 rounded-xl text-left transition cursor-pointer flex items-center justify-between border ${
                      selectedWristbandId === wb.id
                        ? 'bg-teal-500/20 text-teal-200 border-teal-500/50 shadow'
                        : 'bg-slate-950/70 hover:bg-slate-900 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${wb.isSosActive ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
                      <div>
                        <strong className="text-white text-[10px] block">{wb.id}</strong>
                        <span className="text-[9px] text-slate-400">{wb.pairedVisitorName || 'Reserve Unit'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[9px] font-bold ${wb.isSosActive ? 'text-rose-400' : 'text-slate-400'}`}>
                        {wb.isSosActive ? '🚨 SOS' : wb.currentZone.replace(/_/g, ' ').slice(0, 10)}
                      </span>
                      <span className="text-[8px] text-slate-500 block">🔋 {wb.batteryPercent}%</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: TELEMETRY PANELS (RISK, HAZARD, DEMOGRAPHICS, ENVIRONMENT) */}
        {activeTab === 'telemetry' && (
          <div className="space-y-2">
            <RiskPanel riskOverview={riskOverview} />
            <HazardPanel hazards={hazards} />
            <VisitorPanel stats={visitorStats} visitors={visitors} />
            {environment && <EnvironmentPanel environment={environment} />}
          </div>
        )}
      </div>
    </aside>
  );
};
