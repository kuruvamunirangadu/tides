import React, { useState } from 'react';
import { SimulationEvent } from '../metrics/Types';
import { IncidentEventChain } from '../EventStore';
import {
  Activity,
  AlertOctagon,
  Clock,
  Compass,
  FileText,
  LifeBuoy,
  Radio,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface IncidentTimelineProps {
  events: SimulationEvent[];
  incidentChains: IncidentEventChain[];
}

export const IncidentTimeline: React.FC<IncidentTimelineProps> = ({ events, incidentChains }) => {
  const [selectedChainId, setSelectedChainId] = useState<string | 'ALL'>('ALL');

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'HAZARD_DETECTED':
        return <Activity className="w-3.5 h-3.5 text-yellow-400" />;
      case 'RISK_CHANGED':
        return <Radio className="w-3.5 h-3.5 text-amber-400" />;
      case 'INCIDENT_CREATED':
        return <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />;
      case 'DECISION_CREATED':
        return <Zap className="w-3.5 h-3.5 text-cyan-400" />;
      case 'RESOURCE_DISPATCHED':
        return <Compass className="w-3.5 h-3.5 text-blue-400" />;
      case 'RESOURCE_ARRIVED':
        return <Clock className="w-3.5 h-3.5 text-indigo-400" />;
      case 'RESCUE_STARTED':
      case 'RESCUE_COMPLETED':
        return <LifeBuoy className="w-3.5 h-3.5 text-pink-400" />;
      case 'INCIDENT_RESOLVED':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'FAILURE_DETECTED':
      case 'FALLBACK_ACTIVATED':
        return <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getSeverityBadge = (sev?: string) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">MEDIUM</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-700/50 text-slate-300">LOW</span>;
    }
  };

  const displayedEvents =
    selectedChainId === 'ALL'
      ? events
      : events.filter((e) => e.entityId === selectedChainId || e.zoneId === selectedChainId);

  return (
    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 text-left">
      {/* Header & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Incident Timeline & Causal Trace ({events.length} Events)
          </h4>
        </div>

        <div className="flex items-center gap-1 text-[11px]">
          <Filter className="w-3 h-3 text-slate-400" />
          <select
            value={selectedChainId}
            onChange={(e) => setSelectedChainId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="ALL">All Recorded Events</option>
            {incidentChains.map((c) => (
              <option key={c.incidentId} value={c.incidentId}>
                Incident {c.incidentId} (Total: {c.latencies.totalResponseSec}s)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Causal Chain Summary Bar if selected */}
      {selectedChainId !== 'ALL' && (
        <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
          <div className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider mb-1.5">
            Causal Progression Latency Breakdown
          </div>
          {(() => {
            const chain = incidentChains.find((c) => c.incidentId === selectedChainId);
            if (!chain) return null;
            const l = chain.latencies;
            return (
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-300 border border-yellow-500/30">
                  Detect: {l.detectionSec}s
                </span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Decision: {l.decisionSec}s
                </span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">
                  Dispatch: {l.dispatchSec}s
                </span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  Travel: {l.arrivalSec}s
                </span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <span className="px-2 py-1 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30">
                  Rescue: {l.rescueSec}s
                </span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                  Total: {l.totalResponseSec}s
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Events List */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {displayedEvents.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            No events recorded yet. Run simulation to stream incident timeline.
          </p>
        ) : (
          displayedEvents.slice(-25).reverse().map((evt) => (
            <div
              key={evt.id}
              className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs transition-all hover:border-slate-600"
            >
              <div className="p-1.5 rounded-md bg-slate-800 border border-slate-700 shrink-0 mt-0.5">
                {getEventIcon(evt.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="font-semibold text-slate-200 truncate">{evt.title}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {getSeverityBadge(evt.severity)}
                    <span className="text-[10px] font-mono text-slate-400">{evt.timeDisplay}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 font-sans">{evt.description}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
