/**
 * src/regional/components/RegionalFleetOverview.tsx
 * Fleet-wide emergency rescue resource inventory across Andhra Pradesh coastal stations.
 * Includes advisory cross-beach transfer evaluation (strictly advisory, automated cross-dispatch disabled).
 */

import React, { useState } from 'react';
import { RegionalResourceRecord, AdvisoryTransferEvaluation } from '../types';
import {
  Ship,
  LifeBuoy,
  Plane,
  Shield,
  Clock,
  Compass,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface RegionalFleetOverviewProps {
  resources: RegionalResourceRecord[];
  onEvaluateTransfer: (resourceId: string, targetBeachId: string) => AdvisoryTransferEvaluation;
}

export const RegionalFleetOverview: React.FC<RegionalFleetOverviewProps> = ({
  resources,
  onEvaluateTransfer,
}) => {
  const [selectedBeachFilter, setSelectedBeachFilter] = useState<string>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [testResourceId, setTestResourceId] = useState<string>('RB-01');
  const [testTargetBeach, setTestTargetBeach] = useState<string>('RK_BEACH');
  const [evalResult, setEvalResult] = useState<AdvisoryTransferEvaluation | null>(null);

  const filteredResources = resources.filter((r) => {
    if (selectedBeachFilter !== 'ALL' && r.assignedBeachId !== selectedBeachFilter) return false;
    if (selectedTypeFilter !== 'ALL' && r.resourceType !== selectedTypeFilter) return false;
    return true;
  });

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'RESCUE_BOAT':
        return Ship;
      case 'DRONE':
        return Plane;
      default:
        return LifeBuoy;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
      case 'DISPATCHED':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50';
      case 'ON_SCENE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'MAINTENANCE':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
      default:
        return 'bg-slate-700/30 text-slate-400 border-slate-600';
    }
  };

  const handleRunAdvisory = () => {
    const res = onEvaluateTransfer(testResourceId, testTargetBeach);
    setEvalResult(res);
  };

  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 font-mono text-xs space-y-4 shadow-xl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/40">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <span>Fleet-Wide Coastal Resource Inventory</span>
              <span className="px-2 py-0.2 rounded-full bg-cyan-950 border border-cyan-800 text-[9px] text-cyan-300">
                {filteredResources.length} Assets
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Track rescue boats, lifeguard squads, and drones across coastal stations
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={selectedBeachFilter}
            onChange={(e) => setSelectedBeachFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Stations</option>
            <option value="RUSHIKONDA">Rushikonda (Connected)</option>
            <option value="RK_BEACH">RK Beach (Demo)</option>
            <option value="BHEEMILI">Bheemili (Demo)</option>
            <option value="SURYALANKA">Suryalanka (Demo)</option>
          </select>

          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Asset Types</option>
            <option value="RESCUE_BOAT">Rescue Boats</option>
            <option value="LIFEGUARD">Lifeguard Squads</option>
            <option value="DRONE">UAV Drones</option>
          </select>
        </div>
      </div>

      {/* Grid of Resource Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
        {filteredResources.map((res) => {
          const Icon = getResourceIcon(res.resourceType);
          const isRushikonda = res.homeBeachId === 'RUSHIKONDA';

          return (
            <div
              key={res.resourceId}
              className="p-3 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-xl space-y-2 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-slate-800 rounded-lg text-cyan-400">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-[11px]">{res.resourceId}</span>
                    <div className="text-[10px] text-slate-400">{res.resourceType}</div>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getStatusBadge(
                    res.operationalStatus
                  )}`}
                >
                  {res.operationalStatus}
                </span>
              </div>

              <div className="text-[11px] text-slate-200 font-bold leading-tight">
                {res.resourceName}
              </div>

              {/* Station Info */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                <span>Station: <strong className="text-cyan-300">{res.assignedBeachId}</strong></span>
                <span>Speed: {res.speedMps.toFixed(1)} m/s</span>
              </div>

              {/* Cross-Beach Eligibility Note */}
              <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-800/80">
                <span className={res.isCrossBeachEligible ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {res.isCrossBeachEligible ? '✓ Cross-Beach Capable' : '✗ Station-Bound'}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800">
                  {isRushikonda ? 'LIVE TWIN' : 'DEMO ASSET'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Advisory Cross-Beach Transfer Simulator Tool */}
      <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-bold text-white uppercase flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Advisory Cross-Beach Transfer Assessment</span>
          </h4>
          <span className="text-[9px] text-slate-500">Zero Automated Cross-Dispatch</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 text-[11px]">Asset:</span>
          <select
            value={testResourceId}
            onChange={(e) => setTestResourceId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white"
          >
            {resources.map((r) => (
              <option key={r.resourceId} value={r.resourceId}>
                {r.resourceId} — {r.resourceName.slice(0, 24)}...
              </option>
            ))}
          </select>

          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />

          <span className="text-slate-400 text-[11px]">Target Beach:</span>
          <select
            value={testTargetBeach}
            onChange={(e) => setTestTargetBeach(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white"
          >
            <option value="RK_BEACH">RK Beach (Vizag)</option>
            <option value="BHEEMILI">Bheemili Beach</option>
            <option value="RUSHIKONDA">Rushikonda (Anchor)</option>
            <option value="SURYALANKA">Suryalanka (Bapatla)</option>
          </select>

          <button
            onClick={handleRunAdvisory}
            className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[11px] font-extrabold cursor-pointer transition-all shadow"
          >
            Evaluate Feasibility
          </button>
        </div>

        {evalResult && (
          <div
            className={`p-3 rounded-xl border text-[11px] space-y-1 ${
              evalResult.allowed
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                : 'bg-rose-950/40 border-rose-800 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {evalResult.allowed ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Feasibility Confirmed: Transit Eligible</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>Transfer Prohibited: {evalResult.reason}</span>
                </>
              )}
            </div>
            <p className="text-[10px] text-slate-300">
              {evalResult.notice || evalResult.advisory}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

