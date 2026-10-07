import React from 'react';
import { AlertCircle, AlertTriangle, Users, Compass, CheckCircle2 } from 'lucide-react';
import { Incident } from '../models/Incident';

interface IncidentPanelProps {
  incidents: Incident[];
  onSelectVisitor?: (visitorId: string) => void;
}

export const IncidentPanel: React.FC<IncidentPanelProps> = ({
  incidents,
  onSelectVisitor,
}) => {
  const activeIncidents = incidents.filter((i) => i.active);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">🔴 CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">🟠 HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">🟡 MODERATE</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-500/20 text-blue-400 border border-blue-500/40">🔵 LOW</span>;
    }
  };

  const getIncidentIcon = (type: string) => {
    switch (type) {
      case 'DISTRESS':
        return <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-bounce" />;
      case 'RESTRICTED_ENTRY':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />;
      case 'CROWD':
        return <Users className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />;
      case 'DRIFT':
        return <Compass className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 p-4 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-200">Active Incidents</h3>
            <p className="text-[11px] text-slate-400">Real-time concurrent safety events</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
            activeIncidents.length > 0
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          }`}>
            {activeIncidents.length} Active
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[280px]">
        {activeIncidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mb-2" />
            <p className="text-xs font-medium text-slate-400">All Sectors Clear</p>
            <p className="text-[11px] text-slate-500 mt-0.5">No active distress or boundary violations</p>
          </div>
        ) : (
          activeIncidents.map((incident) => (
            <div
              key={incident.id}
              className="p-3 rounded-lg bg-slate-800/70 border border-slate-700/60 hover:border-slate-600 transition-all text-left"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-start gap-2">
                  {getIncidentIcon(incident.type)}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">{incident.title}</h4>
                    <span className="text-[10px] text-slate-400">Sector: {incident.zoneId}</span>
                  </div>
                </div>
                {getSeverityBadge(incident.severity)}
              </div>

              <p className="text-[11px] text-slate-300 pl-7 leading-relaxed mb-2">
                {incident.description}
              </p>

              <div className="flex items-center justify-between pl-7 text-[10px] text-slate-400 border-t border-slate-700/40 pt-1.5">
                <span>Involved: {incident.visitorIds.length} person(s)</span>
                {incident.visitorIds.length > 0 && onSelectVisitor && (
                  <button
                    onClick={() => onSelectVisitor(incident.visitorIds[0])}
                    className="text-cyan-400 hover:text-cyan-300 underline font-medium"
                  >
                    Inspect Entity
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
