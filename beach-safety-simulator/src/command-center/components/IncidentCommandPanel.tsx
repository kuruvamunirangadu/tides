import React, { useState } from 'react';
import { Incident } from '../../models/Incident';
import { EmergencyIncident } from '../../emergency/models/EmergencyIncident';
import { CommandActionType } from '../models/CommandAction';
import { AlertCircle, ShieldAlert, CheckCircle2, Plane, LifeBuoy, ChevronDown, ChevronUp, Clock, GitBranch } from 'lucide-react';

interface IncidentCommandPanelProps {
  emergencyIncidents: EmergencyIncident[];
  onExecuteAction: (type: CommandActionType, targetId: string, reason?: string) => void;
}

export const IncidentCommandPanel: React.FC<IncidentCommandPanelProps> = ({
  emergencyIncidents,
  onExecuteAction,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          Active Incident Triage & Coordination Queue ({emergencyIncidents.length})
        </h3>
        <span className="text-xs font-mono text-slate-400">Operator Actionable</span>
      </div>

      {emergencyIncidents.length === 0 ? (
        <div className="p-6 text-center text-slate-500 font-mono text-xs bg-slate-950/40 rounded-xl border border-slate-800">
          ● All coastal sectors currently nominal. No unresolved active incidents.
        </div>
      ) : (
        <div className="space-y-2.5">
          {emergencyIncidents.map((inc) => {
            const isExpanded = expandedId === inc.id;
            const isCritical = inc.severity === 'CRITICAL';
            return (
              <div
                key={inc.id}
                className={`p-3 rounded-xl border transition-all ${
                  isCritical
                    ? 'bg-rose-950/30 border-rose-500/50 shadow-lg'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                {/* Incident Summary Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      isCritical ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {inc.severity}
                    </span>
                    <span className="font-mono font-bold text-xs text-slate-200">{inc.id}</span>
                    <span className="text-xs font-semibold text-slate-300">• {inc.type}</span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      Status: <strong className="text-cyan-300">{inc.status}</strong>
                    </span>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : inc.id)}
                      className="p-1 text-slate-400 hover:text-slate-200"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Responding Units & ETA */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-800/60 font-mono text-[10px] text-slate-400">
                  <div>
                    Zone: <strong className="text-slate-200">{inc.zoneId}</strong>
                  </div>
                  <div>
                    Visitor(s): <strong className="text-slate-200">{inc.affectedVisitorIds.join(', ') || 'N/A'}</strong>
                  </div>
                  <div>
                    Assigned: <strong className="text-cyan-300">{inc.assignedResourceIds.join(', ') || 'Auto-Allocating'}</strong>
                  </div>
                  <div>
                    Reported: <strong className="text-slate-300">{new Date(inc.createdAt).toLocaleTimeString()}</strong>
                  </div>
                </div>

                {/* Operator Actions Bar */}
                <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2 border-t border-slate-800/80 font-mono text-[10px]">
                  <button
                    onClick={() => onExecuteAction('ACKNOWLEDGE_INCIDENT', inc.id, 'Operator confirmed incident priority')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
                  >
                    ✓ Acknowledge
                  </button>

                  <button
                    onClick={() => onExecuteAction('DISPATCH_DRONE_VERIFICATION', inc.id, 'Dispatch aerial UAV for distress tracking')}
                    className="px-2.5 py-1 rounded bg-amber-600/80 hover:bg-amber-500 text-white font-semibold transition-colors flex items-center gap-1"
                  >
                    <Plane className="w-3 h-3" />
                    Deploy Drone
                  </button>

                  <button
                    onClick={() => onExecuteAction('DISPATCH_LIFEGUARD', inc.id, 'Dispatched primary water rescue response')}
                    className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors flex items-center gap-1"
                  >
                    <LifeBuoy className="w-3 h-3" />
                    Dispatch Lifeguard
                  </button>

                  <button
                    onClick={() => onExecuteAction('RESOLVE_INCIDENT', inc.id, 'Swimmer recovered safely to shore')}
                    className="px-2.5 py-1 rounded bg-emerald-600/80 hover:bg-emerald-500 text-white font-semibold transition-colors ml-auto"
                  >
                    Mark Resolved
                  </button>
                </div>

                {/* Expanded Causal Trace Event Chain */}
                {isExpanded && (
                  <div className="mt-3 p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-2 font-mono text-[11px]">
                    <div className="font-bold text-cyan-300 flex items-center gap-1.5 uppercase text-[10px]">
                      <GitBranch className="w-3.5 h-3.5" />
                      Complete Causal Event Chain
                    </div>
                    <div className="space-y-1 pl-2 border-l-2 border-cyan-500/40 text-slate-300 text-[10px]">
                      <div>1. Environmental current spike observed in Zone A (1.4 m/s)</div>
                      <div>2. Swimmer entered water and drifted beyond outer safety buoy perimeter</div>
                      <div>3. Fixed CCTV optical AI detector flagged abnormal waving motion (Conf: 0.65)</div>
                      <div>4. Risk Engine elevated Zone A assessment from HIGH to CRITICAL</div>
                      <div>5. Decision Engine dispatched UAV-01 for rapid aerial verification</div>
                      <div>6. Drone arrived on station, confirmed distress with 0.94 fused confidence</div>
                      <div>7. Lifeguard rescue team mobilized and deployed into surf</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
