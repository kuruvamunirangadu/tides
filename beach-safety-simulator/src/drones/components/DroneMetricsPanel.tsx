import React from 'react';
import { DronePerformanceMetrics } from '../analytics/DroneAnalytics';
import { TrendingUp, ShieldCheck, Zap, Crosshair } from 'lucide-react';

interface DroneMetricsPanelProps {
  metrics: DronePerformanceMetrics;
}

export const DroneMetricsPanel: React.FC<DroneMetricsPanelProps> = ({ metrics }) => {
  const comp = metrics.comparative;

  return (
    <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Empirical Safety Research: Drone vs Traditional Operations
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Measured response acceleration and blind-zone reduction metrics
          </p>
        </div>
        <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30">
          {comp.rescueDispatchSpeedupRatio}x Faster Response
        </span>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 font-mono">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Detection Latency</span>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-lg font-bold text-emerald-400">{comp.detectionLatencySec.withDrone}s</span>
              <span className="text-[10px] text-slate-400 ml-1">With UAV</span>
            </div>
            <div>
              <span className="text-xs text-rose-400 line-through">{comp.detectionLatencySec.withoutDrone}s</span>
              <span className="text-[10px] text-slate-500 ml-1">Fixed Only</span>
            </div>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-400 h-full rounded-full" style={{ width: '29%' }} />
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 font-mono">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Distress Verification</span>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-lg font-bold text-cyan-300">{comp.verificationLatencySec.withDrone}s</span>
              <span className="text-[10px] text-slate-400 ml-1">With UAV</span>
            </div>
            <div>
              <span className="text-xs text-rose-400 line-through">{comp.verificationLatencySec.withoutDrone}s</span>
              <span className="text-[10px] text-slate-500 ml-1">Manual</span>
            </div>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-cyan-400 h-full rounded-full" style={{ width: '19%' }} />
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 font-mono">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Tracking Continuity</span>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-lg font-bold text-purple-300">{comp.trackingContinuityPercent.withDrone}%</span>
              <span className="text-[10px] text-slate-400 ml-1">With UAV</span>
            </div>
            <div>
              <span className="text-xs text-slate-400">{comp.trackingContinuityPercent.withoutDrone}%</span>
              <span className="text-[10px] text-slate-500 ml-1">Fixed Only</span>
            </div>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-purple-400 h-full rounded-full" style={{ width: `${comp.trackingContinuityPercent.withDrone}%` }} />
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 font-mono">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Blind-Zone Coverage</span>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-lg font-bold text-amber-300">{comp.blindZoneCoveragePercent.withDrone}%</span>
              <span className="text-[10px] text-slate-400 ml-1">With UAV</span>
            </div>
            <div>
              <span className="text-xs text-slate-400">{comp.blindZoneCoveragePercent.withoutDrone}%</span>
              <span className="text-[10px] text-slate-500 ml-1">Fixed Only</span>
            </div>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-amber-400 h-full rounded-full" style={{ width: `${comp.blindZoneCoveragePercent.withDrone}%` }} />
          </div>
        </div>
      </div>

      {/* Flight Fleet Cumulative Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 font-mono text-[11px] text-slate-400">
        <div>
          Missions Completed: <strong className="text-slate-200">{metrics.completedMissions}</strong> ({metrics.completionRatePercent}%)
        </div>
        <div>
          Total Flight Distance: <strong className="text-slate-200">{metrics.totalFlightDistanceKm} km</strong>
        </div>
        <div>
          Aerial Tracks Logged: <strong className="text-cyan-300">{metrics.totalAerialDetections}</strong>
        </div>
        <div>
          Verified Distress Events: <strong className="text-emerald-400">{metrics.verifiedDistressEvents}</strong>
        </div>
      </div>
    </div>
  );
};
