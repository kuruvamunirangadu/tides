import React, { useEffect, useState } from 'react';
import { RescueCoordinator } from './RescueCoordinator';
import { RescueMetrics } from './RescueMetrics';
import { RescueMissionDossier, RescueResourceState3D } from './rescue.types';
import { RipCurrentSimulator } from '../hazards/RipCurrentSimulator';
import { DistressIncidentEvent } from '../hazards/rip3d.types';
import { Visitor } from '../../models/Visitor';
import { Beach } from '../../models/Beach';
import {
  ShieldAlert,
  Ship,
  LifeBuoy,
  CheckCircle2,
  Clock,
  Compass,
  Crosshair,
  RotateCcw,
  Zap,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Activity,
  Flame,
} from 'lucide-react';

interface RescueTimelineHUDProps {
  visitors: Visitor[];
  beach: Beach;
  onTrackBoat?: () => void;
  onTrackSwimmer?: (visitorId: string) => void;
  onTrackLifeguard?: (lgId: string) => void;
}

export const RescueTimelineHUD: React.FC<RescueTimelineHUDProps> = ({
  visitors,
  beach,
  onTrackBoat,
  onTrackSwimmer,
  onTrackLifeguard,
}) => {
  const coordinator = RescueCoordinator.getInstance();
  const ripSim = RipCurrentSimulator.getInstance();

  const [activeMissions, setActiveMissions] = useState<RescueMissionDossier[]>(
    coordinator.getActiveMissions()
  );
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [resources, setResources] = useState<RescueResourceState3D[]>(
    coordinator.registry.getResources()
  );
  const [queuedIncidents, setQueuedIncidents] = useState<DistressIncidentEvent[]>(
    coordinator.getQueuedIncidents()
  );
  const [autoDispatch, setAutoDispatch] = useState<boolean>(coordinator.autoDispatchEnabled);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [historyCount, setHistoryCount] = useState<number>(coordinator.missionHistory.length);
  const [nowSec, setNowSec] = useState<number>(performance.now() / 1000);

  useEffect(() => {
    const unsub = coordinator.subscribe(() => {
      const missions = coordinator.getActiveMissions();
      setActiveMissions([...missions]);
      setResources([...coordinator.registry.getResources()]);
      setQueuedIncidents([...coordinator.getQueuedIncidents()]);
      setAutoDispatch(coordinator.autoDispatchEnabled);
      setHistoryCount(coordinator.missionHistory.length);
    });

    const timer = setInterval(() => {
      setNowSec(performance.now() / 1000);
      setResources([...coordinator.registry.getResources()]);
      setActiveMissions([...coordinator.getActiveMissions()]);
      setQueuedIncidents([...coordinator.getQueuedIncidents()]);
    }, 250);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  const activeMission = (selectedIncidentId ? activeMissions.find(m => m.incidentId === selectedIncidentId) : null) || activeMissions[0] || null;

  // Compute live Golden Window SLA progress
  const calculatedMetrics = RescueMetrics.compute(activeMission);
  const goldenWindowRemaining = activeMission?.distressSimTime
    ? Math.max(0, 180 - (nowSec - activeMission.distressSimTime))
    : 180;
  const goldenWindowPercent = Math.max(0, Math.min(100, (goldenWindowRemaining / 180) * 100));

  const handleToggleAutoDispatch = () => {
    coordinator.autoDispatchEnabled = !coordinator.autoDispatchEnabled;
    setAutoDispatch(coordinator.autoDispatchEnabled);
  };

  const handleManualDispatch = () => {
    const incident = ripSim.getActiveIncident();
    if (incident) {
      coordinator.handleDistressIncident(incident, visitors, beach);
    } else {
      // Trigger rip scenario if not yet started, then dispatch
      ripSim.triggerRipScenario(visitors, beach);
    }
  };

  const handleResetOperations = () => {
    coordinator.resetOperations();
  };

  // Helper for Stepper stages
  const STAGES = [
    { key: 'DISPATCHED', label: 'Dispatched', icon: Zap },
    { key: 'EN_ROUTE', label: 'En Route', icon: Compass },
    { key: 'ARRIVED', label: 'On Scene', icon: Crosshair },
    { key: 'ASSISTING', label: 'Assisting', icon: LifeBuoy },
    { key: 'RESOLVED', label: 'Resolved', icon: CheckCircle2 },
  ];

  const getStageIndex = (stageKey?: string): number => {
    switch (stageKey) {
      case 'ASSIGNED':
        return 0;
      case 'EN_ROUTE':
        return 1;
      case 'ARRIVED':
        return 2;
      case 'ASSISTING':
        return 3;
      case 'COMPLETED':
      case 'RETURNING':
      case 'RESOLVED':
        return 4;
      default:
        return -1;
    }
  };

  const currentStageIndex = getStageIndex(activeMission?.stage);

  return (
    <div className="absolute top-16 right-3 z-30 w-72 sm:w-80 pointer-events-auto max-h-[85vh] overflow-y-auto font-mono text-xs select-none">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl space-y-3 text-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/30">
              <Ship className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                <span>Milestone 4</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300">Rescue Ops</span>
              </div>
              <h3 className="text-white font-bold text-xs">Intelligent Lifesaver Fleet</h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToggleAutoDispatch}
              title={`Toggle Automated Emergency Dispatch (Currently ${autoDispatch ? 'ON' : 'OFF'})`}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                autoDispatch
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${autoDispatch ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}
              />
              <span>Auto: {autoDispatch ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <>
            {/* Multi-Mission Switcher Bar (Milestone 12) */}
            {activeMissions.length > 1 && (
              <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold shrink-0">Active:</span>
                {activeMissions.map((m) => (
                  <button
                    key={m.missionId}
                    onClick={() => setSelectedIncidentId(m.incidentId)}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 transition cursor-pointer ${
                      activeMission?.missionId === m.missionId
                        ? 'bg-cyan-500 text-slate-950 font-black'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    #{m.incidentId.slice(-6)} ({m.assignedResourceId})
                  </button>
                ))}
              </div>
            )}

            {/* Queued Warning Notice */}
            {queuedIncidents.length > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-rose-950/40 border border-rose-500/40 text-[9px] text-rose-300">
                <span className="font-bold">⚠️ {queuedIncidents.length} Incident(s) Queued</span>
                <span className="text-rose-400">Fleet Engaged</span>
              </div>
            )}

            {/* Active Mission View or Fleet Readiness Standby */}
            {activeMission ? (
              <div className="space-y-3 bg-slate-950/70 p-3 rounded-xl border border-cyan-500/30">
                {/* Mission Header */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[9px] font-extrabold">
                        {activeMission.stage}
                      </span>
                      <span className="text-white font-bold text-xs">{activeMission.missionId}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Bather: <strong className="text-cyan-300">#{activeMission.visitorId}</strong>
                    </p>
                  </div>

                  {/* Camera Tracking Shortcuts */}
                  <div className="flex items-center gap-1">
                    {onTrackBoat && activeMission.resourceType === 'RESCUE_BOAT' && (
                      <button
                        onClick={onTrackBoat}
                        title="Cinematic Camera Focus on Rescue Boat"
                        className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] shadow transition-all cursor-pointer"
                      >
                        <Ship className="w-3 h-3" />
                        <span>Track Boat</span>
                      </button>
                    )}

                    {onTrackSwimmer && (
                      <button
                        onClick={() => onTrackSwimmer(activeMission.visitorId)}
                        title="Focus Camera on Distressed Bather"
                        className="flex items-center gap-1 px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] shadow transition-all cursor-pointer"
                      >
                        <Crosshair className="w-3 h-3" />
                        <span>Swimmer</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 5-Stage Mission Stepper */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Operation Progression:</span>
                    <span className="text-cyan-400 font-bold">{activeMission.stage}</span>
                  </div>

                  <div className="grid grid-cols-5 gap-1">
                    {STAGES.map((s, idx) => {
                      const isPast = currentStageIndex > idx;
                      const isCurrent = currentStageIndex === idx;
                      const IconComp = s.icon;

                      return (
                        <div
                          key={s.key}
                          className={`flex flex-col items-center p-1 rounded-lg border text-center transition-all ${
                            isCurrent
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-lg scale-102 ring-1 ring-cyan-400/50'
                              : isPast
                              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-900/60 border-slate-800 text-slate-600'
                          }`}
                        >
                          <IconComp
                            className={`w-3.5 h-3.5 mb-0.5 ${
                              isCurrent ? 'animate-bounce text-cyan-300' : isPast ? 'text-emerald-400' : ''
                            }`}
                          />
                          <span className="text-[8px] font-bold truncate max-w-full leading-tight">
                            {s.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SLA Golden Window Benchmark (180s Countdown) */}
                <div className="space-y-1 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-300 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <strong>Golden Window SLA:</strong>
                    </span>
                    <span
                      className={`font-bold ${
                        goldenWindowRemaining > 60
                          ? 'text-emerald-400'
                          : goldenWindowRemaining > 20
                          ? 'text-amber-400'
                          : 'text-rose-400 animate-pulse'
                      }`}
                    >
                      {goldenWindowRemaining.toFixed(0)}s / 180s
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        goldenWindowRemaining > 60
                          ? 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                          : goldenWindowRemaining > 20
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${goldenWindowPercent}%` }}
                    />
                  </div>
                </div>

                {/* Chronological Metric Breakdown Cards */}
                <div className="grid grid-cols-3 gap-1.5 pt-0.5 text-center">
                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                    <div className="text-[9px] text-slate-400">DISPATCH</div>
                    <div className="text-xs font-bold text-cyan-300">
                      {calculatedMetrics.dispatchLatencySec != null
                        ? `${calculatedMetrics.dispatchLatencySec}s`
                        : '0.8s'}
                    </div>
                  </div>

                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                    <div className="text-[9px] text-slate-400">TRAVEL</div>
                    <div className="text-xs font-bold text-amber-300">
                      {calculatedMetrics.travelTimeSec != null
                        ? `${calculatedMetrics.travelTimeSec}s`
                        : `${(nowSec - (activeMission.departSimTime || nowSec)).toFixed(1)}s`}
                    </div>
                  </div>

                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                    <div className="text-[9px] text-slate-400">TIME TO ASSIST</div>
                    <div className="text-xs font-bold text-emerald-400">
                      {calculatedMetrics.timeToAssistanceSec != null
                        ? `${calculatedMetrics.timeToAssistanceSec}s`
                        : `${(nowSec - activeMission.distressSimTime).toFixed(1)}s`}
                    </div>
                  </div>
                </div>

                {/* Assignment Rationale Banner */}
                <div className="bg-slate-900/90 p-2 rounded border border-slate-800/80 text-[10px] text-slate-300 flex items-start gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{activeMission.assignmentRationale}</span>
                </div>
              </div>
            ) : (
              /* Idle Standby Fleet Overview */
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Fleet Readiness & Deployment:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    STANDBY
                  </span>
                </div>

                {/* Resource List */}
                <div className="space-y-1.5">
                  {resources.map((res) => (
                    <div
                      key={res.id}
                      className="bg-slate-950/60 p-2 rounded-xl border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {res.type === 'RESCUE_BOAT' ? (
                          <div className="p-1 bg-cyan-500/20 text-cyan-400 rounded">
                            <Ship className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="p-1 bg-amber-500/20 text-amber-400 rounded">
                            <Activity className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div>
                          <div className="text-white font-bold text-[11px]">{res.id}</div>
                          <div className="text-[9px] text-slate-400">{res.name}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            res.status === 'AVAILABLE'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {res.status}
                        </span>

                        {res.type === 'RESCUE_BOAT' && onTrackBoat && (
                          <button
                            onClick={onTrackBoat}
                            title="Focus Camera on Boat"
                            className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          >
                            <Crosshair className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Dispatch Button */}
                <button
                  onClick={handleManualDispatch}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
                >
                  <Flame className="w-4 h-4 animate-pulse" />
                  <span>Dispatch Rescue Response</span>
                </button>
              </div>
            )}

            {/* Bottom Actions & History */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
              <span className="text-slate-400">
                Completed Missions: <strong className="text-white">{historyCount}</strong>
              </span>

              <button
                onClick={handleResetOperations}
                title="Reset Rescue Operations Fleet"
                className="flex items-center gap-1 text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Fleet</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

