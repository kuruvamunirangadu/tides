import React, { useEffect, useState } from 'react';
import { RescueCoordinator } from './RescueCoordinator';
import { RipCurrentSimulator } from '../hazards/RipCurrentSimulator';
import { RescueMissionDossier, RescueResourceState3D } from './rescue.types';
import { DistressIncidentEvent } from '../hazards/rip3d.types';
import { Visitor } from '../../models/Visitor';
import { Beach } from '../../models/Beach';
import { VisitorCharacter3D } from '../visitors/VisitorCharacter3D';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Crosshair,
  Flame,
  Eye,
  LifeBuoy,
  Navigation,
  Play,
  RotateCcw,
  Shield,
  ShieldAlert,
  Ship,
  Sparkles,
  Users,
  X,
  MapPin,
  Image as ImageIcon,
} from 'lucide-react';

interface RescueActionFlowHUDProps {
  visitors: Visitor[];
  beach: Beach;
  isOpen: boolean;
  onClose: () => void;
  onFocusSwimmer?: (visitorId: string) => void;
  onFocusResource?: (resourceId: string) => void;
  onFocusIncidentAction?: (incidentId: string) => void;
  isAerialVisible?: boolean;
  onToggleAerial?: () => void;
  aerialOpacity?: number;
  onAerialOpacityChange?: (opacity: number) => void;
}

export const RescueActionFlowHUD: React.FC<RescueActionFlowHUDProps> = ({
  visitors,
  beach,
  isOpen,
  onClose,
  onFocusSwimmer,
  onFocusResource,
  onFocusIncidentAction,
  isAerialVisible = false,
  onToggleAerial,
  aerialOpacity = 0.75,
  onAerialOpacityChange,
}) => {
  const coordinator = RescueCoordinator.getInstance();
  const ripSim = RipCurrentSimulator.getInstance();

  const [activeMissions, setActiveMissions] = useState<RescueMissionDossier[]>(() => coordinator.getActiveMissions());
  const [queuedIncidents, setQueuedIncidents] = useState<DistressIncidentEvent[]>(() => coordinator.getQueuedIncidents());
  const [resources, setResources] = useState<RescueResourceState3D[]>(() => coordinator.registry.getResources());
  const [missionHistory, setMissionHistory] = useState<RescueMissionDossier[]>(() => [...coordinator.missionHistory]);
  const [nowSec, setNowSec] = useState<number>(performance.now() / 1000);
  const [badgesVisible, setBadgesVisible] = useState<boolean>(VisitorCharacter3D.showBadgesGlobally);

  useEffect(() => {
    const unsubCoordinator = coordinator.subscribe(() => {
      setActiveMissions([...coordinator.getActiveMissions()]);
      setQueuedIncidents([...coordinator.getQueuedIncidents()]);
      setResources([...coordinator.registry.getResources()]);
      setMissionHistory([...coordinator.missionHistory]);
    });

    const unsubRip = ripSim.subscribe(() => {
      setQueuedIncidents([...coordinator.getQueuedIncidents()]);
    });

    const timer = setInterval(() => {
      setNowSec(performance.now() / 1000);
      setActiveMissions([...coordinator.getActiveMissions()]);
      setQueuedIncidents([...coordinator.getQueuedIncidents()]);
      setResources([...coordinator.registry.getResources()]);
    }, 200);

    return () => {
      unsubCoordinator();
      unsubRip();
      clearInterval(timer);
    };
  }, []);

  if (!isOpen) return null;

  const handleToggleBadges = () => {
    const next = !badgesVisible;
    setBadgesVisible(next);
    VisitorCharacter3D.showBadgesGlobally = next;
  };

  const handleTriggerSingle = () => {
    ripSim.triggerMultiSwimmerScenario(visitors, beach, 1);
  };

  const handleTriggerMultiCrisis = (count: number = 3) => {
    ripSim.triggerMultiSwimmerScenario(visitors, beach, count);
  };

  const handleResetAll = () => {
    coordinator.resetOperations();
    ripSim.resetScenario(visitors);
  };

  const stagesList = [
    { num: '01', title: 'Normal Activity', desc: 'Bathers swimming & wading' },
    { num: '02', title: 'Hazard Exposure', desc: 'Rip drift & current entrainment' },
    { num: '03', title: 'Distress Detection', desc: 'SLA alert trigger & event record' },
    { num: '04', title: 'Resource Dispatch', desc: 'Optimal boat/lifeguard assigned' },
    { num: '05', title: 'Rescue Movement', desc: 'Visual waypoint approach & vector' },
    { num: '06', title: 'Assistance & Shore', desc: 'Casualty secured & transport' },
  ];

  return (
    <div className="absolute top-14 right-3 z-30 w-full max-w-md max-h-[88vh] overflow-hidden bg-slate-950/95 border border-cyan-500/50 rounded-2xl shadow-2xl backdrop-blur-2xl font-mono text-xs flex flex-col pointer-events-auto animate-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/40">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-sm">RESCUE ACTION FLOW</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                ACTIVE PIPELINE
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-sans">
              Observable 6-Stage Human Lifecycle & Rescue Coordination
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Visual Settings & Toggles */}
        <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>3D Character Visibility & Layers</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleToggleBadges}
              className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                badgesVisible
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <span>{badgesVisible ? '✓ 3D Overhead Badges' : 'Overhead Badges Off'}</span>
            </button>

            {onToggleAerial && (
              <button
                onClick={onToggleAerial}
                className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isAerialVisible
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-extrabold'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <ImageIcon className="w-3 h-3" />
                <span>{isAerialVisible ? 'Aerial Photo Layer ON' : 'Aerial Photo Layer'}</span>
              </button>
            )}
          </div>

          {isAerialVisible && onAerialOpacityChange && (
            <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-300">
              <span>Photo Layer Opacity:</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={aerialOpacity}
                  onChange={(e) => onAerialOpacityChange(parseFloat(e.target.value))}
                  className="w-24 accent-emerald-400 cursor-pointer"
                />
                <span className="font-bold text-emerald-400 font-mono w-8 text-right">
                  {Math.round(aerialOpacity * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 6-Stage Action Flow Reference Stepper */}
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Authoritative Rescue Sequence
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {stagesList.map((stg) => (
              <div
                key={stg.num}
                className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between"
              >
                <span className="text-[9px] font-extrabold text-cyan-400">{stg.num}</span>
                <span className="text-[10px] font-bold text-slate-200 leading-tight">{stg.title}</span>
                <span className="text-[8px] text-slate-500 truncate">{stg.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Incidents & Missions */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Active Rescue Operations ({activeMissions.length})</span>
            </span>
            {queuedIncidents.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold animate-pulse">
                {queuedIncidents.length} Queued
              </span>
            )}
          </div>

          {activeMissions.length === 0 && queuedIncidents.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center space-y-1">
              <div className="text-slate-400 text-xs font-medium">All Coastal Sectors Clear</div>
              <div className="text-[10px] text-slate-500">
                Trigger a scenario below to observe the complete multi-swimmer rescue action flow.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {activeMissions.map((m) => {
                const res = resources.find((r) => r.id === m.assignedResourceId);
                const bather = visitors.find((v) => v.id === m.visitorId);
                const elapsedSec = Math.max(0, nowSec - m.distressSimTime);

                return (
                  <div
                    key={m.missionId}
                    className="p-3 rounded-xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-cyan-500/40 space-y-2.5 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-extrabold text-[10px]">
                          {m.missionId}
                        </span>
                        <span className="text-white font-bold text-xs">
                          {(bather as any)?.name || `Swimmer #${m.visitorId.slice(-4)}`}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                        STAGE: {m.stage}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <div>
                        <span className="text-slate-500">Assigned Asset:</span>
                        <div className="font-bold text-cyan-300 flex items-center gap-1">
                          {m.resourceType === 'RESCUE_BOAT' ? <Ship className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                          <span>{m.assignedResourceName}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Elapsed Time:</span>
                        <div className="font-bold text-white flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{elapsedSec.toFixed(1)}s</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500">Trigger:</span>
                        <div className="text-slate-300 truncate">
                          {m.assignmentRationale || 'Rip Current Thalweg Entrainment'}
                        </div>
                      </div>
                    </div>

                    {/* Quick Camera Focus Actions */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {onFocusSwimmer && (
                        <button
                          onClick={() => onFocusSwimmer(m.visitorId)}
                          className="flex-1 px-2 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-200 text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <Crosshair className="w-3 h-3" />
                          <span>Focus Swimmer</span>
                        </button>
                      )}

                      {onFocusResource && (
                        <button
                          onClick={() => onFocusResource(m.assignedResourceId)}
                          className="flex-1 px-2 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>Focus Asset</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Queued incidents */}
              {queuedIncidents.map((q) => (
                <div
                  key={q.incidentId}
                  className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-amber-300 font-bold text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{q.incidentId}: Awaiting Rescue Asset</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                      IN QUEUE
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-300">
                    All coastal assets currently engaged. Auto-dispatch will deploy as soon as an asset resolves its mission.
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fleet Readiness Status */}
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Rescue Fleet Readiness</span>
            <span className="text-cyan-400 font-bold">{resources.length} Assets Registered</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {resources.map((res) => (
              <div
                key={res.id}
                className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-200 text-[11px]">{res.name}</div>
                  <div className="text-[9px] text-slate-400">{res.type}</div>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${
                    res.status === 'AVAILABLE'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                  }`}
                >
                  {res.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mission History */}
        {missionHistory.length > 0 && (
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 space-y-2">
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
              <span>Resolved Missions Log</span>
              <span>{missionHistory.length} Rescues Completed</span>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
              {missionHistory.slice(0, 5).map((m, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded bg-slate-950/60 border border-slate-800/60 text-[9px] text-slate-300 flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span className="font-bold text-white">{m.missionId}</span>
                    <span className="text-slate-400">({m.assignedResourceName})</span>
                  </div>
                  <span className="font-mono text-emerald-400">
                    {m.timeToAssistanceSec ? `${m.timeToAssistanceSec.toFixed(1)}s` : 'Resolved'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Simulation Controls */}
      <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        <button
          onClick={handleTriggerSingle}
          className="flex-1 px-2.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-[11px] shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Flame className="w-3.5 h-3.5 text-amber-200" />
          <span>1 Swimmer Crisis</span>
        </button>

        <button
          onClick={() => handleTriggerMultiCrisis(3)}
          className="flex-1 px-2.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-[11px] shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-red-200" />
          <span>3 Swimmer Rip Crisis</span>
        </button>

        <button
          onClick={handleResetAll}
          title="Reset Operations and return all bathers to safe beach"
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
