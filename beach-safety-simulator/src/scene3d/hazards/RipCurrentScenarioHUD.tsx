import React, { useEffect, useState } from 'react';
import { RipCurrentSimulator } from './RipCurrentSimulator';
import { DistressIncidentEvent } from './rip3d.types';
import { Visitor } from '../../models/Visitor';
import { Beach } from '../../models/Beach';
import {
  AlertTriangle,
  Play,
  RotateCcw,
  Crosshair,
  Waves,
  Activity,
  CheckCircle2,
  Radio,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface RipCurrentScenarioHUDProps {
  visitors: Visitor[];
  beach: Beach;
  onTrackSwimmer?: (visitorId: string) => void;
}

export const RipCurrentScenarioHUD: React.FC<RipCurrentScenarioHUDProps> = ({
  visitors,
  beach,
  onTrackSwimmer,
}) => {
  const sim = RipCurrentSimulator.getInstance();
  const [incidents, setIncidents] = useState<DistressIncidentEvent[]>(sim.getActiveIncidents());
  const [isActive, setIsActive] = useState<boolean>(sim.active);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [metrics, setMetrics] = useState(sim.getMetrics());

  useEffect(() => {
    const unsub = sim.subscribe(() => {
      setIncidents([...sim.getActiveIncidents()]);
      setIsActive(sim.active);
      setMetrics(sim.getMetrics());
    });

    const interval = setInterval(() => {
      setIncidents([...sim.getActiveIncidents()]);
      setMetrics(sim.getMetrics());
      setIsActive(sim.active);
    }, 500);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const handleToggleScenario = () => {
    if (isActive) {
      sim.resetScenario(visitors);
    } else {
      sim.triggerRipScenario(visitors, beach);
    }
    setIsActive(sim.active);
    setIncidents([...sim.getActiveIncidents()]);
  };

  const handleTriggerMultiSwimmer = () => {
    sim.triggerMultiSwimmerScenario(visitors, beach, 3);
    setIsActive(sim.active);
    setIncidents([...sim.getActiveIncidents()]);
  };

  return (
    <>
      {/* 1. Emergency Distress Alert Banners (High-Priority Real-Time Notifications) */}
      {incidents.length > 0 && (
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[92%] space-y-1.5 animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
          {incidents.map((incident) => {
            const swimmer = visitors.find((v) => v.id === incident.visitorId);
            return (
              <div
                key={incident.incidentId}
                className="bg-rose-950/90 border-2 border-rose-500 rounded-2xl p-3 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-600 rounded-xl text-white shadow-lg animate-pulse shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-rose-500/30 text-rose-300 border border-rose-500/50 rounded text-[9px] font-mono font-extrabold uppercase">
                        CRITICAL SAFETY ALERT
                      </span>
                      <span className="text-rose-200 text-xs font-mono font-bold">
                        #{incident.incidentId}
                      </span>
                      <span className="text-[10px] text-rose-400">
                        ⏱️ Latency: {incident.detectionLatencySec}s
                      </span>
                    </div>
                    <h4 className="text-white text-xs font-bold leading-tight">
                      Swimmer in Acute Distress in Rip Channel (#{incident.visitorId.slice(-4)})
                    </h4>
                    <p className="text-[10px] text-rose-300 line-clamp-1">
                      {incident.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {swimmer && onTrackSwimmer && (
                    <button
                      onClick={() => onTrackSwimmer(swimmer.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-md transition-all cursor-pointer"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>Track</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Interactive Scenario Controller Widget (Floating Left) */}
      <div className="absolute top-16 left-3 z-20 flex flex-col gap-2 pointer-events-auto max-w-xs font-mono text-xs">
        <div className="bg-slate-900/90 p-2.5 rounded-2xl border border-slate-700/80 shadow-2xl backdrop-blur-md space-y-2 text-left">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs uppercase">
              <Waves className="w-4 h-4 text-cyan-400" />
              <span>Rip Simulator</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  isActive
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isActive ? 'ACTIVE' : 'DORMANT'}
              </span>
              <button
                onClick={() => setIsCollapsed((prev) => !prev)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
                title={isCollapsed ? 'Expand Rip Simulator Controls' : 'Collapse'}
              >
                {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {!isCollapsed && (
            <>
              {/* Action Trigger Buttons */}
              <div className="space-y-1.5">
                <button
                  onClick={handleToggleScenario}
                  className={`w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl font-bold transition-all cursor-pointer shadow-lg ${
                    isActive
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/50'
                      : 'bg-gradient-to-r from-amber-500 to-rose-500 hover:brightness-110 text-slate-950 font-extrabold'
                  }`}
                >
                  {isActive ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Simulation</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Single Swimmer Rip Scenario</span>
                    </>
                  )}
                </button>

                {!isActive && (
                  <button
                    onClick={handleTriggerMultiSwimmer}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 text-[11px] font-bold transition cursor-pointer shadow"
                  >
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Multi-Swimmer Rip Crisis (3 Bathers)</span>
                  </button>
                )}
              </div>

              {/* Live Scenario Telemetry */}
              {isActive && (
                <div className="space-y-1.5 text-[11px] pt-1 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Current Velocity:</span>
                    <strong className="text-amber-300 font-bold">1.90 m/s Seaward</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Swimmers In Rip:</span>
                    <span className="text-white font-bold">{sim.targetVisitorIds.size}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Active Incidents:</span>
                    <span className="text-rose-400 font-bold">{metrics.activeDistressCount}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Incident Duration:</span>
                    <span className="text-white font-bold">{metrics.incidentDurationSeconds}s</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};
