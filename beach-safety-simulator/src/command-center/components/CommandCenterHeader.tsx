import React from 'react';
import { CommandRole } from '../models/CommandRole';
import { MultiBeachCommandState } from '../CommandCenterManager';
import { Shield, ShieldAlert, UserCheck, Radio, AlertTriangle, LifeBuoy, Plane, Truck } from 'lucide-react';

interface CommandCenterHeaderProps {
  state: MultiBeachCommandState;
  onRoleChange: (role: CommandRole) => void;
  onRunMultiBeachCrisisScenario?: () => void;
}

export const CommandCenterHeader: React.FC<CommandCenterHeaderProps> = ({
  state,
  onRoleChange,
  onRunMultiBeachCrisisScenario,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                CENTRAL AUTHORITY PLATFORM
              </span>
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                SYSTEM ONLINE
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-100 tracking-tight mt-0.5">
              Coastal Safety Command & Control Center
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              AP Coastal Authority • Multi-Beach Real-Time Decision Support System
            </p>
          </div>
        </div>

        {/* Role Selector & Scenario Button */}
        <div className="flex flex-wrap items-center gap-3">
          {onRunMultiBeachCrisisScenario && (
            <button
              onClick={onRunMultiBeachCrisisScenario}
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-mono font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              SIMULATE MULTI-BEACH CRISIS
            </button>
          )}

          {/* RBAC Role Selector */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 font-mono text-xs">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">Role:</span>
            <select
              value={state.activeRole}
              onChange={(e) => onRoleChange(e.target.value as CommandRole)}
              className="bg-transparent text-cyan-300 font-bold outline-none cursor-pointer"
            >
              <option value="SYSTEM_ADMIN" className="bg-slate-900 text-slate-200">System Admin</option>
              <option value="COMMAND_OPERATOR" className="bg-slate-900 text-slate-200">Command Operator</option>
              <option value="BEACH_SUPERVISOR" className="bg-slate-900 text-slate-200">Beach Supervisor</option>
              <option value="LIFEGUARD_COORDINATOR" className="bg-slate-900 text-slate-200">Lifeguard Coordinator</option>
              <option value="EMERGENCY_COORDINATOR" className="bg-slate-900 text-slate-200">Emergency Coordinator</option>
              <option value="ANALYST" className="bg-slate-900 text-slate-200">Safety Analyst</option>
              <option value="VIEW_ONLY" className="bg-slate-900 text-slate-200">View-Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Global Regional Fleet KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Monitored Beaches</span>
          <div className="text-xl font-bold text-slate-100 mt-0.5">{state.beaches.length} Coastal Sectors</div>
          <span className="text-[10px] text-rose-400 font-semibold">{state.criticalBeachesCount} Critical</span>
        </div>

        <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Active Incidents</span>
          <div className="text-xl font-bold text-amber-300 mt-0.5">{state.totalIncidentsCount} Total</div>
          <span className="text-[10px] text-slate-500">Across all sectors</span>
        </div>

        <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Lifeguards</span>
          <div className="flex items-center gap-1 mt-0.5">
            <LifeBuoy className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xl font-bold text-cyan-300">{state.totalLifeguardsAvailable}</span>
            <span className="text-xs text-slate-500">/ {state.totalLifeguardsFleet}</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold">Available on Beach</span>
        </div>

        <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">UAV Drone Fleet</span>
          <div className="flex items-center gap-1 mt-0.5">
            <Plane className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xl font-bold text-orange-300">{state.totalDronesAvailable}</span>
            <span className="text-xs text-slate-500">/ {state.totalDronesFleet}</span>
          </div>
          <span className="text-[10px] text-cyan-400 font-semibold">Flight Ready</span>
        </div>

        <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Ambulances</span>
          <div className="flex items-center gap-1 mt-0.5">
            <Truck className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-xl font-bold text-rose-300">{state.totalAmbulancesAvailable}</span>
            <span className="text-xs text-slate-500">/ {state.totalAmbulancesFleet}</span>
          </div>
          <span className="text-[10px] text-slate-400">Standby at Bases</span>
        </div>

        <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Coastal Police</span>
          <div className="flex items-center gap-1 mt-0.5">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xl font-bold text-blue-300">{state.totalPoliceAvailable}</span>
            <span className="text-xs text-slate-500">/ {state.totalPoliceFleet}</span>
          </div>
          <span className="text-[10px] text-slate-400">Patrol Units</span>
        </div>
      </div>
    </div>
  );
};
