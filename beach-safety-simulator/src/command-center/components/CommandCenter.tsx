import React from 'react';
import { CommandCenterManager } from '../CommandCenterManager';
import { CommandCenterHeader } from './CommandCenterHeader';
import { MultiBeachGrid } from './MultiBeachGrid';
import { IncidentCommandPanel } from './IncidentCommandPanel';
import { ResourceCommandPanel } from './ResourceCommandPanel';
import { AuditLogViewer } from './AuditLogViewer';
import { EmergencyIncident } from '../../emergency/models/EmergencyIncident';
import { EmergencyResource } from '../../emergency/models/EmergencyResource';
import { VirtualDrone } from '../../drones/simulation/VirtualDrone';
import { CommandRole } from '../models/CommandRole';
import { CommandActionType } from '../models/CommandAction';
import { Bell, Radio, TrendingUp, AlertTriangle } from 'lucide-react';

interface CommandCenterProps {
  commandManager: CommandCenterManager;
  emergencyIncidents: EmergencyIncident[];
  emergencyResources: EmergencyResource[];
  drones: VirtualDrone[];
  onRunMultiBeachCrisis?: () => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  commandManager,
  emergencyIncidents,
  emergencyResources,
  drones,
  onRunMultiBeachCrisis,
}) => {
  const commandState = commandManager.getCommandState();
  const selectedBeach = commandState.beaches.find((b) => b.beachId === commandState.selectedBeachId) || commandState.beaches[0];

  const handleExecuteAction = (type: CommandActionType, targetId: string, reason?: string) => {
    commandManager.executeAction(type, targetId, reason, selectedBeach.beachId);
  };

  return (
    <div className="space-y-6">
      {/* 1. Master Command Center Header Bar */}
      <CommandCenterHeader
        state={commandState}
        onRoleChange={(role) => commandManager.setActiveRole(role)}
        onRunMultiBeachCrisisScenario={onRunMultiBeachCrisis}
      />

      {/* 2. Multi-Beach Coastal Sector Grid */}
      <MultiBeachGrid
        beaches={commandState.beaches}
        selectedBeachId={commandState.selectedBeachId}
        onSelectBeach={(id) => commandManager.setSelectedBeachId(id)}
      />

      {/* 3. Operational Two-Column Split: Active Incident Triage & Multi-Agency Resource Control */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (7 cols): Incident Queue with Causal Traces */}
        <div className="lg:col-span-7 space-y-5">
          <IncidentCommandPanel
            emergencyIncidents={emergencyIncidents}
            onExecuteAction={handleExecuteAction}
          />

          {/* Active Warnings & Public Broadcasts Section */}
          <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                Active Public Safety Warnings & Broadcast Delivery
              </h3>
              <span className="text-[10px] text-slate-400">All Channels Synced</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950/70 border border-amber-500/40 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300">RK Beach • Zone A</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300">BROADCASTING</span>
                </div>
                <div className="text-slate-200 text-[11px]">
                  ⚠️ <strong>Strong Offshore Rip Current</strong>: Swimming restricted beyond yellow buoys.
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                  <span>PA: 100% • LED: Active</span>
                  <span className="text-cyan-300 font-bold">64/87 Acknowledged</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950/70 border border-rose-500/40 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-300">Bheemili • Rocky Shoal</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-500/20 text-rose-300">CRITICAL</span>
                </div>
                <div className="text-slate-200 text-[11px]">
                  🚫 <strong>Rocky Break Zone Closed</strong>: High wave swells exceeding 2.5m.
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                  <span>PA: 100% • App: Pushed</span>
                  <span className="text-cyan-300 font-bold">52/65 Acknowledged</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Resource Fleet & Immutable Audit Trail */}
        <div className="lg:col-span-5 space-y-5">
          <ResourceCommandPanel
            resources={emergencyResources}
            drones={drones}
          />

          <AuditLogViewer logs={commandState.auditLogs} />
        </div>
      </div>
    </div>
  );
};
