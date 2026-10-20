/**
 * src/scene3d/rescue/MultiSwimmerRescueHUD.tsx
 * 
 * Interactive Multi-Swimmer & Multi-Incident Rescue Operations HUD for TIDES Milestone 12:
 * - Real-time monitoring of all concurrent swimmers, risk states, and rescue missions
 * - Visual status of all available and assigned rescue craft (RB-01, RB-02, LG-01, LG-02)
 * - Per-incident tracking controls with smooth 3D camera focus
 * - Stress testing triggers: Multi-Swimmer Rip Crisis, Resource Exhaustion, Reset
 */

import React, { useEffect, useState, useRef } from 'react';
import { RescueCoordinator } from './RescueCoordinator';
import { RipCurrentSimulator } from '../hazards/RipCurrentSimulator';
import { PerSwimmerRescueEvaluator, SwimmerEvaluationSummary } from './PerSwimmerRescueEvaluator';
import { RescueMissionDossier, RescueResourceState3D } from './rescue.types';
import { DistressIncidentEvent } from '../hazards/rip3d.types';
import { Visitor } from '../../models/Visitor';
import { Beach } from '../../models/Beach';
import {
  Users,
  Ship,
  LifeBuoy,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  Crosshair,
  RotateCcw,
  Zap,
  ChevronDown,
  ChevronUp,
  Activity,
  Flame,
  X,
  Play,
} from 'lucide-react';

interface MultiSwimmerRescueHUDProps {
  visitors: Visitor[];
  beach: Beach;
  isOpen: boolean;
  onClose: () => void;
  onTrackSwimmer?: (visitorId: string) => void;
  onTrackResource?: (resourceId: string) => void;
}

export const MultiSwimmerRescueHUD: React.FC<MultiSwimmerRescueHUDProps> = ({
  visitors,
  beach,
  isOpen,
  onClose,
  onTrackSwimmer,
  onTrackResource,
}) => {
  const coordinator = RescueCoordinator.getInstance();
  const ripSim = RipCurrentSimulator.getInstance();
  const evaluator = PerSwimmerRescueEvaluator.getInstance();

  const [activeMissions, setActiveMissions] = useState<RescueMissionDossier[]>(() => coordinator.getActiveMissions());
  const [queuedIncidents, setQueuedIncidents] = useState<DistressIncidentEvent[]>(() => coordinator.getQueuedIncidents());
  const [resources, setResources] = useState<RescueResourceState3D[]>(() => coordinator.registry.getResources());
  const [autoDispatch, setAutoDispatch] = useState<boolean>(coordinator.autoDispatchEnabled);
  const [nowSec, setNowSec] = useState<number>(performance.now() / 1000);
  const [stats, setStats] = useState<SwimmerEvaluationSummary>({
    totalEvaluated: 0,
    normalCount: 0,
    cautionCount: 0,
    distressCount: 0,
    activeIncidentsCount: 0,
    queuedIncidentsCount: 0,
    lastEvaluationSimTime: 0,
  });

  const visitorsRef = useRef(visitors);
  visitorsRef.current = visitors;
  const beachRef = useRef(beach);
  beachRef.current = beach;

  useEffect(() => {
    if (!isOpen) return;

    const unsubCoordinator = coordinator.subscribe(() => {
      setActiveMissions([...coordinator.getActiveMissions()]);
      setQueuedIncidents([...coordinator.getQueuedIncidents()]);
      setResources([...coordinator.registry.getResources()]);
      setAutoDispatch(coordinator.autoDispatchEnabled);
    });

    const unsubRip = ripSim.subscribe(() => {
      setQueuedIncidents([...coordinator.getQueuedIncidents()]);
    });

    const interval = setInterval(() => {
      const cur = performance.now() / 1000;
      setNowSec(cur);
      setActiveMissions([...coordinator.getActiveMissions()]);
      setQueuedIncidents([...coordinator.getQueuedIncidents()]);
      setResources([...coordinator.registry.getResources()]);

      // Refresh evaluator metrics
      const evSummary = evaluator.update(cur, visitorsRef.current, beachRef.current, {} as any);
      setStats(evSummary);
    }, 250);

    return () => {
      unsubCoordinator();
      unsubRip();
      clearInterval(interval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTriggerMultiCrisis = (count: number) => {
    ripSim.triggerMultiSwimmerScenario(visitors, beach, count);
  };

  const handleResetAll = () => {
    coordinator.resetOperations();
    ripSim.resetScenario(visitors);
    evaluator.reset();
  };

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'EN_ROUTE':
        return <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold">EN ROUTE</span>;
      case 'ARRIVED':
      case 'ASSISTING':
        return <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold animate-pulse">ASSISTING</span>;
      case 'COMPLETED':
      case 'RETURNING':
        return <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[9px] font-bold">RETURNING</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold">RESOLVED</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-500/20 text-slate-300 text-[9px] font-bold">{stage}</span>;
    }
  };

  return (
    <div className="absolute top-14 right-3 z-30 w-full max-w-sm max-h-[85vh] overflow-hidden bg-slate-950/95 border border-cyan-500/50 rounded-2xl shadow-2xl backdrop-blur-xl font-mono text-xs flex flex-col pointer-events-auto animate-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/40">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[9px] text-cyan-400 font-extrabold uppercase tracking-wider">
              TIDES Milestone 12
            </div>
            <h3 className="text-white text-xs font-bold">Multi-Swimmer Rescue Command</h3>
          </div>
        </div>

        <button
          onClick={onClose}
          title="Close Panel"
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-3 overflow-y-auto">
        {/* Swimmer Status Metrics Row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800 space-y-0.5">
            <div className="text-[9px] text-slate-400 font-bold uppercase">Safe Swimmers</div>
            <div className="text-base font-black text-emerald-400">{stats.normalCount}</div>
            <div className="text-[8px] text-slate-500">Normal Water</div>
          </div>

          <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800 space-y-0.5">
            <div className="text-[9px] text-slate-400 font-bold uppercase">Caution Zone</div>
            <div className="text-base font-black text-amber-400">{stats.cautionCount}</div>
            <div className="text-[8px] text-slate-500">Struggling/Deep</div>
          </div>

          <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800 space-y-0.5">
            <div className="text-[9px] text-slate-400 font-bold uppercase">Acute Distress</div>
            <div className="text-base font-black text-rose-400">{stats.distressCount}</div>
            <div className="text-[8px] text-slate-500">Action Required</div>
          </div>
        </div>

        {/* Multi-Crisis Scenario Stress-Test Buttons */}
        <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2 text-left">
          <div className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Scenario Stress Injection</span>
            <span className="text-[9px] text-slate-500">Simulate Swimmers</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => handleTriggerMultiCrisis(3)}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/50 rounded-lg text-[10px] font-bold transition cursor-pointer"
            >
              <Users className="w-3 h-3 text-rose-400" />
              <span>3-Swimmer Crisis</span>
            </button>

            <button
              onClick={() => handleTriggerMultiCrisis(5)}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/50 rounded-lg text-[10px] font-bold transition cursor-pointer"
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>Fleet Exhaustion (5)</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
            <button
              onClick={() => {
                coordinator.autoDispatchEnabled = !autoDispatch;
                setAutoDispatch(!autoDispatch);
              }}
              className={`flex items-center gap-1 font-bold ${
                autoDispatch ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Auto-Dispatch: {autoDispatch ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={handleResetAll}
              className="flex items-center gap-1 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All</span>
            </button>
          </div>
        </div>

        {/* Concurrent Active Missions List */}
        <div className="space-y-1.5 text-left">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-300 uppercase">
            <span>Active Missions ({activeMissions.length})</span>
            <span className="text-cyan-400 font-semibold">Concurrent Rescues</span>
          </div>

          {activeMissions.length === 0 ? (
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 text-center text-slate-500 text-[10px]">
              No active rescue missions. Safe nominal operations.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {activeMissions.map((m) => {
                const remainingGW = m.distressSimTime
                  ? Math.max(0, 180 - (nowSec - m.distressSimTime))
                  : 180;
                return (
                  <div
                    key={m.missionId}
                    className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-cyan-400 font-bold">#{m.incidentId}</span>
                        <span className="text-slate-500">•</span>
                        <strong className="text-white text-[11px]">Bather #{m.visitorId.slice(-4)}</strong>
                      </div>
                      {getStageBadge(m.stage)}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Craft: <strong className="text-slate-200">{m.assignedResourceName}</strong></span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>GW: {Math.floor(remainingGW)}s</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-800/80">
                      {onTrackSwimmer && (
                        <button
                          onClick={() => onTrackSwimmer(m.visitorId)}
                          className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[9px] font-bold transition cursor-pointer"
                        >
                          <Crosshair className="w-2.5 h-2.5" />
                          <span>Track Bather</span>
                        </button>
                      )}
                      {onTrackResource && (
                        <button
                          onClick={() => onTrackResource(m.assignedResourceId)}
                          className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-[9px] font-bold transition cursor-pointer"
                        >
                          <Ship className="w-2.5 h-2.5" />
                          <span>Track Craft</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Queued Incidents (Awaiting Resource / Contention) */}
        {queuedIncidents.length > 0 && (
          <div className="p-2.5 bg-rose-950/30 rounded-xl border border-rose-500/40 space-y-1.5 text-left">
            <div className="flex items-center justify-between text-[10px] font-bold text-rose-300">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>Queued (Fleet Exhausted): {queuedIncidents.length}</span>
              </span>
              <span className="text-[9px] text-rose-400 uppercase font-black">Awaiting Craft</span>
            </div>

            <div className="space-y-1">
              {queuedIncidents.map((q) => (
                <div key={q.incidentId} className="flex items-center justify-between text-[9px] text-slate-300 bg-slate-900/70 p-1.5 rounded">
                  <span>#{q.incidentId} (Bather #{q.visitorId.slice(-4)})</span>
                  <span className="text-rose-400 font-bold">NEXT IN QUEUE</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fleet Deployment Overview */}
        <div className="space-y-1 text-left">
          <div className="text-[10px] font-bold text-slate-400 uppercase">
            Rescue Fleet Deployment ({resources.length} Assets)
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {resources.map((res) => {
              const isAssigned = res.status !== 'AVAILABLE';
              return (
                <div
                  key={res.id}
                  className={`p-2 rounded-lg border text-[9px] ${
                    isAssigned
                      ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>{res.id}</span>
                    <span className={isAssigned ? 'text-amber-400' : 'text-emerald-400'}>
                      {res.status}
                    </span>
                  </div>
                  <div className="truncate text-[8px] text-slate-400">{res.name}</div>
                  {res.assignedIncidentId && (
                    <div className="text-[8px] text-cyan-300 font-semibold truncate">
                      Mission: #{res.assignedIncidentId}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

