import React, { useState } from 'react';
import {
  ShieldAlert,
  Send,
  Radio,
  Navigation,
  Compass,
  Volume2,
  Clock,
  CheckCircle2,
  AlertOctagon,
  History,
  Activity,
  Cpu,
} from 'lucide-react';
import { Decision } from '../decision/models/Decision';
import { ResponseAction } from '../decision/models/ResponseAction';
import { ResourceState } from '../decision/models/Resource';
import { DecisionLogEntry } from '../decision/history/DecisionHistory';

interface DecisionPanelProps {
  decisions: Decision[];
  actions: ResponseAction[];
  resourceState?: ResourceState;
  historyLogs: DecisionLogEntry[];
}

export const DecisionPanel: React.FC<DecisionPanelProps> = ({
  decisions,
  actions,
  resourceState,
  historyLogs,
}) => {
  const [activeTab, setActiveTab] = useState<'decisions' | 'resources' | 'history'>('decisions');

  const criticalDecision = decisions.find((d) => d.riskLevel === 'CRITICAL');
  const activeActions = actions.filter((a) => a.status === 'ACTIVE');

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'DISPATCH_LIFEGUARD':
        return <Navigation className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'DISPATCH_DRONE':
        return <Compass className="w-4 h-4 text-cyan-400 shrink-0 animate-spin" />;
      case 'ACTIVATE_PA':
        return <Volume2 className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'EVACUATE_ZONE':
      case 'CLOSE_ZONE':
        return <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0 animate-pulse" />;
      case 'REQUEST_EXTERNAL_ASSISTANCE':
        return <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0 animate-bounce" />;
      default:
        return <Radio className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 p-4 shadow-xl flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-200">Decision & Response Engine</h3>
              <p className="text-[11px] text-slate-400">Automated resource dispatch & directives</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                criticalDecision
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {criticalDecision ? '🚨 EMERGENCY DIRECTIVE' : '🛡️ ACTIVE STANDBY'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setActiveTab('decisions')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'decisions'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Directives ({activeActions.length})
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'resources'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Fleet Resources
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Audit Log ({historyLogs.length})
          </button>
        </div>

        {/* Tab 1: Active Directives & Actions */}
        {activeTab === 'decisions' && (
          <div className="space-y-3">
            {/* Explainable Primary Decision Rationale */}
            {criticalDecision && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-left">
                <div className="flex items-center justify-between text-xs font-bold text-rose-300 mb-1">
                  <span>Sector {criticalDecision.zoneId} — CRITICAL DECISION</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/30">
                    PRIORITY {criticalDecision.priority}/100
                  </span>
                </div>
                <p className="text-[11px] text-rose-200/90 leading-relaxed font-sans">
                  {criticalDecision.reason}
                </p>
              </div>
            )}

            {/* Response Actions Feed */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {activeActions.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500/50 mx-auto mb-1.5" />
                  <p className="font-medium text-slate-400">All Sectors Routine</p>
                  <p className="text-[11px] text-slate-500">Normal surveillance policy active</p>
                </div>
              ) : (
                activeActions.map((action) => (
                  <div
                    key={action.id}
                    className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/60 flex items-start gap-2.5 text-left"
                  >
                    {getActionIcon(action.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-200 font-mono">
                          {action.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          {action.targetZone || 'BEACH'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                        {action.reason}
                      </p>
                      {action.resourceId && (
                        <div className="mt-1 text-[10px] text-amber-400 font-mono flex items-center gap-1">
                          <span>Asset:</span>
                          <span className="font-bold">{action.resourceId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Resource Fleet Status */}
        {activeTab === 'resources' && resourceState && (
          <div className="space-y-3 text-left">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block">Lifeguard Units</span>
                <div className="text-sm font-bold text-amber-300 mt-0.5">
                  {resourceState.availableLifeguards} / {resourceState.totalLifeguards} Available
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block">Autonomous UAVs</span>
                <div className="text-sm font-bold text-cyan-300 mt-0.5">
                  {resourceState.availableDrones} / {resourceState.totalDrones} Available
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {resourceState.resources.map((res) => (
                <div
                  key={res.id}
                  className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/40 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-200 text-[11px]">{res.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Type: {res.type} | Speed: {res.speed}px/s
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full font-mono ${
                      res.status === 'AVAILABLE'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : res.status === 'DISPATCHED'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {res.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Auditable Decision History Log */}
        {activeTab === 'history' && (
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 text-left">
            {historyLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No historic decisions logged yet
              </div>
            ) : (
              historyLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/40 text-xs"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span className="text-cyan-400">{log.timestampDisplay}</span>
                    <span
                      className={`font-bold px-1.5 py-0.2 rounded ${
                        log.riskLevel === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300'
                          : log.riskLevel === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {log.riskLevel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-200 mb-1">{log.reason}</p>
                  <div className="flex flex-wrap gap-1">
                    {log.actionsTaken.map((act, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-700 text-slate-300"
                      >
                        {act}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-cyan-400">
          <Activity className="w-3.5 h-3.5" />
          Autonomous Response Loop Active
        </span>
        <span className="font-mono text-[10px] text-slate-400">Closed Feedback Enabled</span>
      </div>
    </div>
  );
};
