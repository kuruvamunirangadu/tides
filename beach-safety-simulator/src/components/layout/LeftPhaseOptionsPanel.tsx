import React, { useState } from 'react';
import {
  Layers,
  ChevronDown,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  ShieldAlert,
  Flame,
  Waves,
  Ship,
  Compass,
  AlertTriangle,
  MapPin,
  Activity,
  LifeBuoy,
  Sliders,
  Cpu,
  Shield,
  Globe,
  Camera,
  TrendingUp,
  Radio,
  Plane,
  BarChart3,
  CheckCircle2,
  Zap,
} from 'lucide-react';

export interface NavItemConfig {
  id: string;
  label: string;
  icon: any;
  color: string;
  badge?: string | null;
  badgeColor?: string;
  desc?: string;
}

export interface LeftPhaseOptionsPanelProps {
  activeMainView: string;
  onSelectView: (view: any) => void;
  navTabs?: readonly NavItemConfig[];
  selectedBeachPreset: string;
  onSelectBeachPreset: (preset: any) => void;
  running: boolean;
  speed: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSetSpeed: (s: number) => void;
  onScenarioCompoundCrisis: () => void;
  onScenarioRipCurrent: () => void;
  onScenarioHighWaves: () => void;
  onScenarioBoatRescue: () => void;
  onScenarioResourceExhaustion: () => void;
  onScenarioSwimmerRescue: () => void;
  onScenarioSensorConflict: () => void;
  onScenarioGPSDrift: () => void;
  onScenarioCommBlackout: () => void;
  onTriggerChaosMonkey: () => void;
  emergencyIncidentsCount: number;
  resilienceScore: number;
}

export const LeftPhaseOptionsPanel: React.FC<LeftPhaseOptionsPanelProps> = ({
  activeMainView,
  onSelectView,
  navTabs,
  selectedBeachPreset,
  onSelectBeachPreset,
  running,
  speed,
  onStart,
  onPause,
  onReset,
  onSetSpeed,
  onScenarioCompoundCrisis,
  onScenarioRipCurrent,
  onScenarioHighWaves,
  onScenarioBoatRescue,
  onScenarioResourceExhaustion,
  onScenarioSwimmerRescue,
  onScenarioSensorConflict,
  onScenarioGPSDrift,
  onScenarioCommBlackout,
  onTriggerChaosMonkey,
  emergencyIncidentsCount,
  resilienceScore,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isBeachesOpen, setIsBeachesOpen] = useState(false);
  const [selectedPhaseCategory, setSelectedPhaseCategory] = useState<'bar_views' | 'core_phases' | 'tracks'>('bar_views');

  const defaultBarModules: NavItemConfig[] = [
    {
      id: 'simulation',
      label: 'LIVE SIMULATION',
      icon: MapPin,
      color: 'text-cyan-400',
      badge: '3D TWIN',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
      desc: '3D beach digital twin with ocean bathymetry & swimmer physics',
    },
    {
      id: 'performance',
      label: 'CACHE & PERFORMANCE',
      icon: Cpu,
      color: 'text-emerald-400',
      badge: '60 FPS',
      badgeColor: 'bg-emerald-500 text-slate-950 font-bold',
      desc: 'System memory, cache benchmark & render pipeline metrics',
    },
    {
      id: 'command',
      label: 'COMMAND CENTER',
      icon: Shield,
      color: 'text-blue-400',
      badge: 'REGIONAL',
      badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      desc: 'Multi-beach coastal operations & Andhra Pradesh mutual aid',
    },
    {
      id: 'gis',
      label: 'GIS GEOFENCE',
      icon: Globe,
      color: 'text-teal-400',
      badge: 'ZONES',
      badgeColor: 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
      desc: 'Coastal safety boundaries & danger geofence breach alarms',
    },
    {
      id: 'vision',
      label: 'CCTV VISION',
      icon: Camera,
      color: 'text-emerald-400',
      badge: 'YOLOv8',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
      desc: 'Edge CV cameras, swimmer bounding boxes & tracklet analysis',
    },
    {
      id: 'prediction',
      label: 'AI PREDICT',
      icon: TrendingUp,
      color: 'text-indigo-400',
      badge: 'T+15..120m',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
      desc: 'Spatial & temporal machine learning risk forecasting models',
    },
    {
      id: 'iot',
      label: 'IoT SENSORS',
      icon: Radio,
      color: 'text-amber-400',
      badge: 'HYBRID',
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      desc: 'Acoustic wave buoys, weather stations & sensor mesh streams',
    },
    {
      id: 'drones',
      label: 'DRONES',
      icon: Plane,
      color: 'text-orange-400',
      badge: 'AIRBORNE',
      badgeColor: 'bg-cyan-400 text-slate-950 font-bold',
      desc: 'Autonomous SAR drone swarm, buoy drop & AI distress verification',
    },
    {
      id: 'analytics',
      label: 'ANALYTICS',
      icon: BarChart3,
      color: 'text-purple-400',
      badge: 'REPLAY',
      badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
      desc: 'Response metrics, safety benchmarks & incident mission replay',
    },
    {
      id: 'lifeguard',
      label: 'LIFEGUARD TERMINAL',
      icon: LifeBuoy,
      color: 'text-amber-400',
      badge: 'PATROL HUD',
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
      desc: 'Handheld beach patrol terminal & tower squad coordination',
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
      badge: 'MANUAL',
      badgeColor: 'bg-rose-500 text-white font-bold',
      desc: 'Manual environmental stress lab & hazard consequence triggers',
    },
  ];

  const activeBarList = navTabs && navTabs.length > 0 ? (navTabs as NavItemConfig[]) : defaultBarModules;
  const activeItem = activeBarList.find((m) => m.id === activeMainView) || defaultBarModules[0];

  const corePhases = [
    { id: 'phase1', num: '1', title: '3D Beach Digital Twin', desc: 'Procedural sand dunes, curved shoreline & ocean dynamics', view: 'simulation' },
    { id: 'phase2', num: '2', title: 'Coastal Hazard & Rip Flow', desc: 'Rip currents, shoaling waves & eddy channels', view: 'simulation', action: onScenarioRipCurrent },
    { id: 'phase3', num: '3', title: 'Swimmer Distress & Panic', desc: 'Fatigue accumulation, struggle & critical distress', view: 'simulation', action: onScenarioSwimmerRescue },
    { id: 'phase4', num: '4', title: 'Camera & Drone Integration', desc: 'CV camera perception & UAV mission telemetry', view: 'vision' },
    { id: 'phase5', num: '5', title: 'Controlled Field Pilot', desc: 'Hardware bench testing, LoRa telemetry & drills', view: 'impact' },
    { id: 'phase6', num: '6', title: 'Command Center & Dispatch', desc: 'Rescue boats, UAV drones & lifeguard coordination', view: 'simulation', action: onScenarioBoatRescue },
    { id: 'phase7', num: '7', title: 'Predictive Coastal Risk AI', desc: 'Forecast horizons (T+15m to T+120m) & uncertainty', view: 'prediction' },
    { id: 'phase8', num: '8', title: 'Multi-Beach Coastal Network', desc: '8 Andhra Pradesh beaches with mutual aid telemetry', view: 'command' },
    { id: 'phase9', num: '9', title: 'Digital Twin Calibration & Sync', desc: 'Sensor calibration curves, clock drift & freshness', view: 'iot' },
    { id: 'phase10', num: '10', title: 'Resilience & Fault Tolerance', desc: 'Failure lab, fault isolation & state checkpoints', view: 'simulation', action: onScenarioSensorConflict },
  ];

  const specializedTracks = [
    { id: 'track_wristband', title: '🛟 Track B: Wristband Safety Band', desc: 'Physical SOS button, LoRa gateway & downlinks', view: 'wristband' },
    { id: 'track_drones', title: '🚁 Track A: Autonomous SAR Drones', desc: 'Vision tracking, flotation drop & mission replay', view: 'drones' },
    { id: 'track_lifeguard', title: '📱 Handheld Lifeguard Terminal', desc: 'Patrol telemetry HUD & rapid 1-tap callouts', view: 'lifeguard' },
    { id: 'track_gis', title: '🌐 GIS Geofencing & Beach Zones', desc: 'Restricted area breaches & boundary enforcement', view: 'gis' },
  ];

  const modulesList = [
    { id: 'simulation', label: '3D & 2D Beach Simulation', icon: MapPin, color: 'text-cyan-400' },
    { id: 'wristband', label: 'Wristband Safety Hub', icon: Radio, color: 'text-rose-400' },
    { id: 'impact', label: 'Impact Lab (3 Demos)', icon: Activity, color: 'text-violet-400' },
    { id: 'lifeguard', label: 'Lifeguard Terminal', icon: LifeBuoy, color: 'text-amber-400' },
    { id: 'experiment', label: 'Manual Risk Lab', icon: Sliders, color: 'text-amber-400' },
    { id: 'command', label: 'Regional Command Center', icon: Shield, color: 'text-blue-400' },
    { id: 'gis', label: 'GIS Geofencing Center', icon: Globe, color: 'text-teal-400' },
    { id: 'vision', label: 'CCTV Vision Safety', icon: Camera, color: 'text-emerald-400' },
    { id: 'prediction', label: 'AI Predictive Intelligence', icon: TrendingUp, color: 'text-indigo-400' },
    { id: 'iot', label: 'IoT Sensor Mesh', icon: Radio, color: 'text-amber-400' },
    { id: 'drones', label: 'SAR Drone Operations', icon: Plane, color: 'text-orange-400' },
    { id: 'analytics', label: 'Safety Analytics & Replay', icon: BarChart3, color: 'text-purple-400' },
    { id: 'performance', label: 'Cache & System Metrics', icon: Cpu, color: 'text-emerald-400' },
  ];

  const apBeaches = [
    { id: 'RUSHIKONDA_VIZAG', name: 'Rushikonda Beach', city: 'Visakhapatnam', status: 'ACTIVE' },
    { id: 'RK_BEACH_VIZAG', name: 'RK Beach', city: 'Visakhapatnam', status: 'ONLINE' },
    { id: 'BHEEMILI_VIZAG', name: 'Bheemili Beach', city: 'Visakhapatnam', status: 'ONLINE' },
    { id: 'MANGAMARIPETA', name: 'Mangamaripeta', city: 'Visakhapatnam', status: 'STANDBY' },
    { id: 'YARADA_VIZAG', name: 'Yarada Beach', city: 'Visakhapatnam', status: 'STANDBY' },
    { id: 'SURYALANKA_BAPATLA', name: 'Suryalanka Beach', city: 'Bapatla', status: 'STANDBY' },
    { id: 'VODAREVU_CHIRALA', name: 'Vodarevu Beach', city: 'Chirala', status: 'STANDBY' },
    { id: 'MYYPADU_NELLORE', name: 'Myypadu Beach', city: 'Nellore', status: 'STANDBY' },
  ];

  const currentBeachName = apBeaches.find((b) => b.id === selectedBeachPreset)?.name || 'Rushikonda Beach';

  return (
    <aside className="w-full bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 p-2.5 flex flex-col gap-2 text-left shadow-xl h-full min-h-[640px] max-h-[780px] overflow-hidden">
      {/* 1. Header with Dropdown Trigger & Beach Selector (Fixed at top) */}
      <div className="relative shrink-0 space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <span className="p-1 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Layers className="w-3.5 h-3.5" />
            </span>
            <span className="tracking-wide uppercase text-xs font-extrabold text-white">Options & Phases</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 font-bold">
            GRID 1
          </span>
        </div>

        {/* Master Simulation & Phases Dropdown Selector Button */}
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="mt-2 w-full p-2.5 rounded-lg bg-gradient-to-r from-cyan-950/90 to-blue-950/90 border border-cyan-500/40 hover:border-cyan-400 text-left flex items-center justify-between gap-2 transition-all cursor-pointer shadow-md group"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-black">
                ACTIVE SYSTEM VIEW
              </span>
              {activeItem?.badge && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0 ${activeItem.badgeColor || 'bg-cyan-500/20 text-cyan-300'}`}>
                  {activeItem.badge}
                </span>
              )}
            </div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5 mt-1 leading-snug break-words">
              {activeItem?.icon ? (
                <activeItem.icon className={`w-4 h-4 shrink-0 ${activeItem.color || 'text-cyan-400'}`} />
              ) : (
                <span>🌐</span>
              )}
              <span>{activeItem?.label || 'LIVE SIMULATION'}</span>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-cyan-400 shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu Modal / Drawer */}
        {isDropdownOpen && (
          <>
            {/* Click-outside backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />

            <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-slate-900/98 backdrop-blur-xl border border-cyan-500/50 rounded-xl p-2.5 shadow-2xl space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin text-left">
              {/* Category Filter Tabs */}
              <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-950 rounded-lg text-[10px] font-bold text-center">
                <button
                  onClick={() => setSelectedPhaseCategory('bar_views')}
                  className={`py-1.5 px-1 rounded cursor-pointer transition ${
                    selectedPhaseCategory === 'bar_views' ? 'bg-cyan-500 text-slate-950 shadow-sm font-black' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Bar Views (12)
                </button>
                <button
                  onClick={() => setSelectedPhaseCategory('core_phases')}
                  className={`py-1.5 px-1 rounded cursor-pointer transition ${
                    selectedPhaseCategory === 'core_phases' ? 'bg-cyan-500 text-slate-950 shadow-sm font-black' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Phases 1-10
                </button>
                <button
                  onClick={() => setSelectedPhaseCategory('tracks')}
                  className={`py-1.5 px-1 rounded cursor-pointer transition ${
                    selectedPhaseCategory === 'tracks' ? 'bg-cyan-500 text-slate-950 shadow-sm font-black' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tracks A & B
                </button>
              </div>

              {/* LIST 1: ALL BAR VIEWS & MODULES (CACHE, COMMAND, GEOFENCE, CCTV, AI PREDICT, EVERYTHING) */}
              {selectedPhaseCategory === 'bar_views' && (
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider px-1 font-bold">
                    Select Operational View:
                  </div>
                  {activeBarList.map((m) => {
                    const Icon = m.icon;
                    const isActive = activeMainView === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          onSelectView(m.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full p-2 rounded-lg text-left transition-all cursor-pointer flex items-start justify-between gap-2 border ${
                          isActive
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                            : 'hover:bg-slate-800 text-slate-300 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <span className="p-1 rounded bg-slate-950/80 border border-slate-800 shrink-0 mt-0.5">
                            <Icon className={`w-3.5 h-3.5 ${m.color}`} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className={`text-xs font-bold leading-snug break-words ${isActive ? 'text-cyan-300' : 'text-slate-100'}`}>
                              {m.label}
                            </div>
                            {m.desc && <div className="text-[10px] text-slate-400 leading-tight mt-0.5 break-words">{m.desc}</div>}
                          </div>
                        </div>
                        {m.badge && (
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full shrink-0 font-bold whitespace-nowrap ${m.badgeColor || 'bg-slate-800 text-slate-400'}`}>
                            {m.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* LIST 2: PHASES 1-10 */}
              {selectedPhaseCategory === 'core_phases' && (
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider px-1 font-bold">
                    10 Coastal System Phases:
                  </div>
                  {corePhases.map((phase) => (
                    <button
                      key={phase.id}
                      onClick={() => {
                        onSelectView(phase.view);
                        if (phase.action) phase.action();
                        setIsDropdownOpen(false);
                      }}
                      className="w-full p-2 rounded-lg text-left hover:bg-slate-800 border border-slate-800/80 hover:border-cyan-500/50 transition-all cursor-pointer group flex items-start gap-2"
                    >
                      <span className="w-5 h-5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-cyan-400/30">
                        {phase.num}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 leading-snug break-words">
                          {phase.title}
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5 break-words">{phase.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* LIST 3: SPECIALIZED TRACKS */}
              {selectedPhaseCategory === 'tracks' && (
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider px-1 font-bold">
                    Specialized Track Frameworks:
                  </div>
                  {specializedTracks.map((trk) => (
                    <button
                      key={trk.id}
                      onClick={() => {
                        onSelectView(trk.view);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full p-2 rounded-lg text-left hover:bg-slate-800 border border-slate-800/80 hover:border-cyan-500/50 transition-all cursor-pointer group"
                    >
                      <div className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 leading-snug break-words">{trk.title}</div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5 break-words">{trk.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 2. Scrollable Body containing Quick Launch, Coastal Beach Registry & Controls */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 text-xs scrollbar-thin">
        {/* Andhra Pradesh Coastal Site Selector */}
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-left">
          <button
            onClick={() => setIsBeachesOpen(!isBeachesOpen)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-200 hover:text-cyan-300 cursor-pointer"
          >
            <span className="flex items-center gap-1.5 break-words">
              <span>🏖️</span>
              <span>AP Coast: {currentBeachName}</span>
            </span>
            <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${isBeachesOpen ? 'rotate-180' : ''}`} />
          </button>

          {isBeachesOpen && (
            <div className="space-y-1 pt-1 border-t border-slate-800">
              {apBeaches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    onSelectBeachPreset(b.id);
                    setIsBeachesOpen(false);
                  }}
                  className={`w-full p-1.5 rounded text-left text-xs transition cursor-pointer flex items-center justify-between gap-1 ${
                    selectedBeachPreset === b.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <span className="font-medium text-slate-100">{b.name}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 shrink-0 font-bold">{b.city}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Scrollable Body: Simulations, Clock, Drills, and Implementation Phases (100% visible, no cutting!) */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 scrollbar-thin text-left">
        {/* All Coastal Simulations Twin Switcher */}
        <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1.5">
          <div className="text-[9px] font-mono uppercase text-cyan-400 font-bold flex items-center justify-between">
            <span>Coastal Simulations (6 Modes)</span>
            <span className="text-[8px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">SELECT</span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            <button
              onClick={() => onSelectView('simulation')}
              className={`p-1.5 rounded-lg border text-left font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeMainView === 'simulation'
                  ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500/60 shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">3D Beach Twin</span>
            </button>

            <button
              onClick={() => onSelectView('impact')}
              className={`p-1.5 rounded-lg border text-left font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeMainView === 'impact'
                  ? 'bg-violet-500/25 text-violet-300 border-violet-500/60 shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span className="truncate">Impact Lab</span>
            </button>

            <button
              onClick={() => onSelectView('experiment')}
              className={`p-1.5 rounded-lg border text-left font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeMainView === 'experiment'
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">Risk Stress Lab</span>
            </button>

            <button
              onClick={() => onSelectView('drones')}
              className={`p-1.5 rounded-lg border text-left font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeMainView === 'drones'
                  ? 'bg-orange-500/25 text-orange-300 border-orange-500/60 shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              <Plane className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span className="truncate">Drone Swarm</span>
            </button>

            <button
              onClick={() => onSelectView('wristband')}
              className={`p-1.5 rounded-lg border text-left font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeMainView === 'wristband'
                  ? 'bg-rose-500/25 text-rose-300 border-rose-500/60 shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="truncate">Wristband Hub</span>
            </button>

            <button
              onClick={() => onSelectView('command')}
              className={`p-1.5 rounded-lg border text-left font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeMainView === 'command'
                  ? 'bg-blue-500/25 text-blue-300 border-blue-500/60 shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate">Command Center</span>
            </button>
          </div>
        </div>

        {/* Simulation Clock & Velocity Controls */}
        <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1.5">
          <div className="text-[9px] font-mono uppercase text-slate-400 font-bold flex items-center justify-between">
            <span>Simulation Clock</span>
            <span className={`w-2 h-2 rounded-full ${running ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
          </div>

          <div className="flex items-center gap-1.5">
            {running ? (
              <button
                onClick={onPause}
                className="flex-1 py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
              >
                <Pause className="w-3 h-3" /> Pause
              </button>
            ) : (
              <button
                onClick={onStart}
                className="flex-1 py-1 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
              >
                <Play className="w-3 h-3 fill-current" /> Run
              </button>
            )}

            <button
              onClick={onReset}
              className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-bold cursor-pointer transition active:scale-95"
              title="Reset Simulation State"
            >
              <RotateCcw className="w-3 h-3 text-cyan-400" />
            </button>
          </div>

          {/* Speed Buttons */}
          <div className="grid grid-cols-3 gap-1 text-[9px] font-mono">
            {[1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => onSetSpeed(s)}
                className={`py-0.5 rounded text-center cursor-pointer transition ${
                  speed === s
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {s}x Speed
              </button>
            ))}
          </div>
        </div>

        {/* Rapid Scenario Drills */}
        <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1.5">
          <div className="text-[9px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Scenario Drills</span>
          </div>

          <div className="space-y-1">
            <button
              onClick={onScenarioRipCurrent}
              className="w-full py-1.5 px-2.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/40 text-rose-300 text-xs font-bold text-left transition cursor-pointer flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>1. Rip Current</span>
              </span>
              <span className="text-[10px] font-mono text-rose-400 font-bold">1.9 m/s</span>
            </button>

            <button
              onClick={onScenarioHighWaves}
              className="w-full py-1.5 px-2.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-500/40 text-cyan-300 text-xs font-bold text-left transition cursor-pointer flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Waves className="w-3.5 h-3.5 text-cyan-400" />
                <span>2. High Waves</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">2.8m</span>
            </button>

            <button
              onClick={onScenarioBoatRescue}
              className="w-full py-1.5 px-2.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/70 border border-blue-500/40 text-blue-300 text-xs font-bold text-left transition cursor-pointer flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Ship className="w-3.5 h-3.5 text-blue-400" />
                <span>3. Boat Intercept</span>
              </span>
              <span className="text-[10px] font-mono text-blue-400 font-bold">Rescue</span>
            </button>

            <button
              onClick={onScenarioCompoundCrisis}
              className="w-full py-1.5 px-2.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/70 border border-amber-500/40 text-amber-300 text-xs font-bold text-left transition cursor-pointer flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>4. Crisis Cascade</span>
              </span>
              <span className="text-[10px] font-mono text-amber-400 font-bold">Multi</span>
            </button>

            <button
              onClick={onTriggerChaosMonkey}
              className="w-full py-1 px-2.5 rounded bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/40 text-purple-300 text-xs font-bold text-left transition cursor-pointer flex items-center justify-between"
            >
              <span>🐒 Chaos Monkey</span>
              <span className="text-[10px] font-mono text-purple-400 font-bold">Faults</span>
            </button>
          </div>
        </div>

        {/* Phase Navigation List */}
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1 text-left">
          <div className="text-[10px] font-mono uppercase text-cyan-400 font-bold mb-1">
            Implementation Phases (1-10)
          </div>
          <div className="space-y-0.5">
            {corePhases.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onSelectView(p.view);
                  if (p.action) p.action();
                }}
                className="w-full py-1.5 px-2 rounded hover:bg-slate-800 text-left transition cursor-pointer flex items-start gap-2 group"
              >
                <span className="w-4 h-4 rounded bg-slate-800 group-hover:bg-cyan-500/30 text-slate-300 group-hover:text-cyan-300 font-mono text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {p.num}
                </span>
                <span className="text-xs text-slate-200 group-hover:text-white leading-snug break-words">
                  {p.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

