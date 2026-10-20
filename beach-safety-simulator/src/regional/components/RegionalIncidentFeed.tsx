/**
 * src/regional/components/RegionalIncidentFeed.tsx
 * Regional incident feed across all configured Andhra Pradesh coastal sectors.
 * Strictly read-only: inspecting an incident does not mutate state or trigger dispatches.
 */

import React, { useState } from 'react';
import { RegionalIncidentRecord } from '../types';
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  Search,
  ExternalLink,
  Filter,
  CheckCircle2,
} from 'lucide-react';

interface RegionalIncidentFeedProps {
  incidents: RegionalIncidentRecord[];
  onSelectSite: (siteId: string) => void;
}

export const RegionalIncidentFeed: React.FC<RegionalIncidentFeedProps> = ({
  incidents,
  onSelectSite,
}) => {
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('ALL');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredIncidents = incidents.filter((inc) => {
    if (selectedSiteFilter !== 'ALL' && inc.siteId !== selectedSiteFilter) return false;
    if (selectedSeverityFilter !== 'ALL' && inc.severity !== selectedSeverityFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        inc.incidentId.toLowerCase().includes(q) ||
        inc.siteName.toLowerCase().includes(q) ||
        inc.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/50';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'MODERATE':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50';
      default:
        return 'bg-slate-700/30 text-slate-300 border-slate-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DISPATCHED':
        return 'bg-cyan-900/60 text-cyan-300 border-cyan-700';
      case 'ON_SCENE':
        return 'bg-amber-900/60 text-amber-300 border-amber-700';
      case 'RESOLVED':
        return 'bg-emerald-900/60 text-emerald-300 border-emerald-700';
      default:
        return 'bg-rose-900/60 text-rose-300 border-rose-700';
    }
  };

  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 font-mono text-xs space-y-4 shadow-xl">
      {/* Feed Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/40">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <span>Regional Incident Feed</span>
              <span className="px-2 py-0.2 rounded-full bg-rose-950 border border-rose-800 text-[9px] text-rose-400">
                {filteredIncidents.length} Events
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Normalized coastal distress queue across monitored AP beach sectors
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Site Filter */}
          <select
            value={selectedSiteFilter}
            onChange={(e) => setSelectedSiteFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Coastal Sites</option>
            <option value="RUSHIKONDA">Rushikonda (Connected)</option>
            <option value="RK_BEACH">RK Beach (Demo)</option>
            <option value="BHEEMILI">Bheemili (Demo)</option>
            <option value="SURYALANKA">Suryalanka (Demo)</option>
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverityFilter}
            onChange={(e) => setSelectedSeverityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MODERATE">Moderate</option>
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2" />
            <input
              type="text"
              placeholder="Search incidents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 pr-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[11px] text-white placeholder-slate-500 w-36 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Incidents List */}
      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {filteredIncidents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-1">
            <CheckCircle2 className="w-6 h-6 text-emerald-500/60 mx-auto" />
            <p className="text-white font-bold text-xs">No Active Incidents Found</p>
            <p className="text-[10px]">No distress reports match the active filter criteria.</p>
          </div>
        ) : (
          filteredIncidents.map((inc) => (
            <div
              key={inc.incidentId}
              className="p-3 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-[11px]">{inc.incidentId}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getSeverityBadge(
                      inc.severity
                    )}`}
                  >
                    {inc.severity}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getStatusBadge(
                      inc.status
                    )}`}
                  >
                    {inc.status}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={() => onSelectSite(inc.siteId)}
                    className="px-2 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 hover:text-white text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>View Site</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Site Name and Distress Bar */}
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-cyan-300 font-bold">{inc.siteName}</span>
                <span className="text-rose-400 font-bold">
                  Distress: {(inc.distressLevel * 100).toFixed(0)}%
                </span>
              </div>

              {/* Description */}
              <p className="text-slate-300 text-[11px] leading-relaxed">{inc.description}</p>

              {/* Assigned Resource Footer */}
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400">
                <div>
                  <span className="text-slate-500">Resource: </span>
                  <span className={inc.assignedResourceName ? 'text-emerald-300 font-bold' : 'text-slate-500'}>
                    {inc.assignedResourceName || 'Unassigned (Standby)'}
                  </span>
                </div>
                <div>
                  <span className="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-[9px]">
                    {inc.provenance === 'SIMULATED' ? 'DIGITAL TWIN' : 'DEMO EVENT'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="text-[9px] text-slate-500 pt-1 text-center">
        * Read-only presentation feed. Inspecting incidents does not trigger automatic dispatches.
      </div>
    </div>
  );
};

