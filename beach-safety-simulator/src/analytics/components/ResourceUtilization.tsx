import React from 'react';
import { ResourceMetrics } from '../metrics/Types';
import { Shield, Cpu, Ship, Activity, Car } from 'lucide-react';

interface ResourceUtilizationProps {
  resources: ResourceMetrics;
}

export const ResourceUtilization: React.FC<ResourceUtilizationProps> = ({ resources }) => {
  const { fleetBreakdown, overallUtilizationRate, availableCount, busyCount, failedCount } = resources;

  const getBarColor = (rate: number) => {
    if (rate >= 80) return 'bg-rose-500 text-rose-300';
    if (rate >= 50) return 'bg-amber-500 text-amber-300';
    return 'bg-emerald-500 text-emerald-300';
  };

  return (
    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 text-left">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Fleet Resource Utilization ({overallUtilizationRate}%)
          </h4>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="text-emerald-400 font-bold">{availableCount} Available</span>
          <span className="text-amber-400 font-bold">{busyCount} Dispatched</span>
          {failedCount > 0 && <span className="text-rose-400 font-bold">{failedCount} Failed</span>}
        </div>
      </div>

      {/* Fleet Breakdown Bars */}
      <div className="space-y-2 text-xs">
        {/* Lifeguards */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Lifeguard Patrol Units
            </span>
            <span className="font-mono font-bold text-slate-200">{fleetBreakdown.lifeguardUtilization}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getBarColor(fleetBreakdown.lifeguardUtilization).split(' ')[0]}`}
              style={{ width: `${fleetBreakdown.lifeguardUtilization}%` }}
            />
          </div>
        </div>

        {/* Drones */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Autonomous UAV Drones
            </span>
            <span className="font-mono font-bold text-slate-200">{fleetBreakdown.droneUtilization}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getBarColor(fleetBreakdown.droneUtilization).split(' ')[0]}`}
              style={{ width: `${fleetBreakdown.droneUtilization}%` }}
            />
          </div>
        </div>

        {/* Rescue Boats */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Ship className="w-3.5 h-3.5 text-blue-400" />
              Rescue Jet Boats
            </span>
            <span className="font-mono font-bold text-slate-200">{fleetBreakdown.boatUtilization}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getBarColor(fleetBreakdown.boatUtilization).split(' ')[0]}`}
              style={{ width: `${fleetBreakdown.boatUtilization}%` }}
            />
          </div>
        </div>

        {/* Ambulance & Police */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
          <div>
            <div className="flex items-center justify-between text-[10px] mb-0.5">
              <span className="flex items-center gap-1 text-slate-400">
                <Activity className="w-3 h-3 text-rose-400" />
                Ambulance
              </span>
              <span className="font-mono">{fleetBreakdown.ambulanceUtilization}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-400 rounded-full"
                style={{ width: `${fleetBreakdown.ambulanceUtilization}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[10px] mb-0.5">
              <span className="flex items-center gap-1 text-slate-400">
                <Car className="w-3 h-3 text-indigo-400" />
                Patrol / Police
              </span>
              <span className="font-mono">{fleetBreakdown.policeUtilization}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-400 rounded-full"
                style={{ width: `${fleetBreakdown.policeUtilization}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
