/**
 * src/regional/components/RegionalAnalyticsPanel.tsx
 * 
 * TIDES — Phase 8: Multi-Beach Deployment & Coastal Network Coordination
 * 
 * Regional analytics, comparative safety metrics, and site synchronization health panel.
 * 
 * Highlights:
 * 1. Comparative analysis across 8 AP coastal sites with honest exposure disclaimers.
 * 2. Cross-site assistance metrics (requested, accepted, declined, completed).
 * 3. Network synchronization health (latencies, offline status, buffered events, deduplication).
 */

import React from 'react';
import { RegionalAnalyticsReporter } from '../RegionalAnalyticsReporter';
import { RegionalSyncManager } from '../RegionalSyncManager';
import {
  BarChart3,
  ShieldAlert,
  Activity,
  Wifi,
  WifiOff,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  Send,
  LifeBuoy,
} from 'lucide-react';

export const RegionalAnalyticsPanel: React.FC = () => {
  const reporter = RegionalAnalyticsReporter.getInstance();
  const syncManager = RegionalSyncManager.getInstance();

  const report = reporter.generateRegionalReport();
  const syncStates = syncManager.getAllSiteSyncStates();

  return (
    <div className="space-y-4 font-mono text-xs select-none">
      {/* 1. Life Safety & Exposure Invariant Disclaimer */}
      <div className="bg-amber-950/40 border border-amber-800/80 rounded-2xl p-4 flex items-start gap-3 text-amber-200">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-white block font-bold text-xs uppercase tracking-wider">
            Comparative Coastal Analytics Disclaimer & Exposure Caveat
          </strong>
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            Variations in reported incident volume between coastal sites stem directly from differences in visitor density, bathymetry, and telemetry coverage (active IoT sensors vs unmonitored shorelines). Higher incident counts do <span className="underline font-bold">NOT</span> imply deficient safety management or higher danger; they reflect automated detection resolution.
          </p>
        </div>
      </div>

      {/* 2. State-Level High-Level KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl space-y-1 shadow-lg">
          <span className="text-[10px] text-slate-400 font-bold block uppercase">Mutual Aid Requests</span>
          <span className="text-xl font-black text-cyan-300">
            {report.crossSiteAssistanceSummary.totalRequested}
          </span>
          <span className="text-[10px] text-slate-500 block">
            {report.crossSiteAssistanceSummary.accepted} Accepted • {report.crossSiteAssistanceSummary.declined} Declined
          </span>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl space-y-1 shadow-lg">
          <span className="text-[10px] text-slate-400 font-bold block uppercase">Digital Twin Response</span>
          <span className="text-xl font-black text-emerald-300">42 sec</span>
          <span className="text-[10px] text-slate-500 block">Rushikonda Automated Drone Patrol</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl space-y-1 shadow-lg">
          <span className="text-[10px] text-slate-400 font-bold block uppercase">LoRa Warning Delivery</span>
          <span className="text-xl font-black text-cyan-300">96.5%</span>
          <span className="text-[10px] text-slate-500 block">Active Connected Gateway Sectors</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl space-y-1 shadow-lg">
          <span className="text-[10px] text-slate-400 font-bold block uppercase">Online AP Nodes</span>
          <span className="text-xl font-black text-white">
            {syncStates.filter((s) => s.status === 'ONLINE').length} / {syncStates.length}
          </span>
          <span className="text-[10px] text-slate-500 block">
            {syncStates.filter((s) => s.status === 'OFFLINE').length} Offline / Demonstration
          </span>
        </div>
      </div>

      {/* 3. Site-by-Site Comparative Analytics Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Cross-Beach Comparative Safety & Monitoring Performance
            </h4>
          </div>
          <span className="text-[10px] text-slate-400">Reporting Window: {report.reportingPeriod}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                <th className="pb-2 font-bold">Beach Location</th>
                <th className="pb-2 font-bold">Incidents</th>
                <th className="pb-2 font-bold">Resolved</th>
                <th className="pb-2 font-bold">Warning Delivery</th>
                <th className="pb-2 font-bold">Avg Response</th>
                <th className="pb-2 font-bold">Telemetry Coverage</th>
                <th className="pb-2 font-bold">Exposure Context & Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {report.siteSummaries.map((s) => (
                <tr key={s.siteId} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-2.5 font-bold text-white pr-2 whitespace-nowrap">
                    {s.siteId === 'RUSHIKONDA' ? '★ ' + s.siteName : s.siteName}
                  </td>
                  <td className="py-2.5 text-cyan-300 font-bold">{s.incidentCount}</td>
                  <td className="py-2.5 text-emerald-300 font-bold">{s.resolvedCount}</td>
                  <td className="py-2.5 text-slate-300">
                    {s.warningDeliveryRatePct > 0 ? `${s.warningDeliveryRatePct}%` : 'N/A'}
                  </td>
                  <td className="py-2.5 text-slate-300">
                    {s.averageResponseTimeSec > 0 ? `${s.averageResponseTimeSec}s` : 'N/A'}
                  </td>
                  <td className="py-2.5 text-slate-300">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      s.dataCoveragePct > 80
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : s.dataCoveragePct > 0
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}>
                      {s.dataCoveragePct > 0 ? `${s.dataCoveragePct}%` : 'NO_DATA'}
                    </span>
                  </td>
                  <td className="py-2.5 text-[10px] text-slate-400 max-w-xs truncate" title={s.reportingExposureNotes}>
                    {s.reportingExposureNotes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Connectivity & Synchronization Health Matrix */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Coastal Network Connectivity & Offline Synchronization State
            </h4>
          </div>
          <span className="text-[10px] text-slate-400">All local sites operate autonomously if uplink drops</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {syncStates.map((sync) => (
            <div
              key={sync.siteId}
              className={`p-3 rounded-xl border space-y-1.5 ${
                sync.status === 'ONLINE'
                  ? 'bg-slate-900/90 border-emerald-800/60'
                  : sync.status === 'DEGRADED'
                  ? 'bg-amber-950/30 border-amber-800/60'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px] truncate" title={sync.siteName}>
                  {sync.siteName.split(',')[0]}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  sync.status === 'ONLINE'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : sync.status === 'DEGRADED'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}>
                  {sync.status}
                </span>
              </div>

              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Latency: {sync.latencyMs > 0 ? `${sync.latencyMs} ms` : '—'}</span>
                <span>Buffer: {sync.pendingSyncEventsCount} evts</span>
              </div>

              <div className="text-[9px] text-slate-500 flex items-center justify-between border-t border-slate-800/60 pt-1">
                <span>Deduplicated: {sync.duplicateEventsFilteredCount}</span>
                <span>Last: {sync.lastSyncTimestamp > 0 ? new Date(sync.lastSyncTimestamp).toLocaleTimeString() : 'N/A'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

