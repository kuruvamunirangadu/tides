/**
 * CoastalCoverageHUD.tsx
 * 
 * TIDES Drone Phase 8: Coastal Coverage & Multi-Drone Patrol Coordination Dashboard
 * 
 * Key Features:
 * - Real-time surveillance zone monitoring across Rushikonda sectors.
 * - Explicit denominator metrics: (coveredZonesCount / totalConfiguredZones) * 100%.
 * - Observation-driven coverage evaluation (assigned drone != covered).
 * - Multi-drone patrol allocation engine integration with safety protection.
 * - Live blind-spot and coverage gap analysis with recommended mitigation actions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Radar,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  Layers,
  RefreshCw,
  X,
  Play,
  Eye,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { CoastalZoneRegistry } from '../coverage/CoastalZoneRegistry';
import { DroneCoverageAllocator } from '../coverage/DroneCoverageAllocator';
import { DroneCoverageTracker } from '../coverage/DroneCoverageTracker';
import {
  CoastalSurveillanceZone,
  CoastalCoverageStatus,
  CoverageSummaryReport,
  CoverageGap,
  PatrolAllocationPlan,
} from '../coverage/droneCoverage.types';

interface CoastalCoverageHUDProps {
  onClose: () => void;
  isVisual3DVisible?: boolean;
  onToggleVisual3D?: () => void;
}

export const CoastalCoverageHUD: React.FC<CoastalCoverageHUDProps> = ({
  onClose,
  isVisual3DVisible = true,
  onToggleVisual3D,
}) => {
  const zoneRegistry = CoastalZoneRegistry.getInstance();
  const allocator = DroneCoverageAllocator.getInstance();
  const tracker = DroneCoverageTracker.getInstance();

  const [zones, setZones] = useState<CoastalSurveillanceZone[]>([]);
  const [report, setReport] = useState<CoverageSummaryReport | null>(null);
  const [lastPlan, setLastPlan] = useState<PatrolAllocationPlan | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ZONES' | 'GAPS' | 'ALLOCATION'>('ZONES');

  // Refresh handler
  const refreshData = useCallback(() => {
    const now = Date.now();
    tracker.evaluateCoverageHealth(now);
    const summary = tracker.getCoverageSummaryReport(now);
    setZones(zoneRegistry.getAllZones());
    setReport(summary);
  }, [tracker, zoneRegistry]);

  useEffect(() => {
    refreshData();
    const unsubscribe = zoneRegistry.subscribe(refreshData);
    const interval = setInterval(refreshData, 1000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [refreshData, zoneRegistry]);

  // Execute Auto-Allocation
  const handleAutoAllocate = () => {
    const plan = allocator.generateAllocationPlan();
    allocator.commitAllocationPlan(plan);
    setLastPlan(plan);
    refreshData();

    const committedCount = plan.allocations.filter((a) => a.status === 'COMMITTED').length;
    const rejectedCount = plan.allocations.filter((a) => a.status === 'REJECTED').length;

    if (committedCount > 0) {
      setStatusMessage(
        `Successfully allocated ${committedCount} drone(s) to surveillance zones.`
      );
    } else if (plan.ineligibleDroneIds.length > 0 && plan.unassignedZoneIds.length > 0) {
      setStatusMessage(
        `Allocation constrained: Available drones preserved for emergency rescue or currently occupied.`
      );
    } else {
      setStatusMessage(`All zones evaluated. ${rejectedCount} assignments skipped.`);
    }

    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Status Badge Formatting
  const getStatusBadge = (status: CoastalCoverageStatus) => {
    switch (status) {
      case 'COVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/50">
            <CheckCircle2 className="w-3 h-3" />
            COVERED
          </span>
        );
      case 'OVERLAPPING_COVERAGE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-500/50">
            <Layers className="w-3 h-3" />
            OVERLAPPING
          </span>
        );
      case 'PARTIALLY_COVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-950/80 text-sky-400 border border-sky-500/50">
            <Eye className="w-3 h-3" />
            PARTIAL
          </span>
        );
      case 'STALE_COVERAGE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/80 text-amber-400 border border-amber-500/50">
            <Clock className="w-3 h-3" />
            STALE
          </span>
        );
      case 'UNCOVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-950/80 text-rose-400 border border-rose-500/50">
            <AlertCircle className="w-3 h-3" />
            UNCOVERED
          </span>
        );
      case 'COVERAGE_DEGRADED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-950/80 text-red-400 border border-red-500/50">
            <AlertTriangle className="w-3 h-3" />
            DEGRADED
          </span>
        );
      case 'UNASSIGNED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-600">
            <HelpCircle className="w-3 h-3" />
            UNASSIGNED
          </span>
        );
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'CRITICAL':
        return <span className="text-[10px] font-extrabold text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-500/40">CRITICAL</span>;
      case 'HIGH':
        return <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/40">HIGH</span>;
      case 'MEDIUM':
        return <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/40">MEDIUM</span>;
      default:
        return <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">LOW</span>;
    }
  };

  const formatAge = (timestampMs?: number) => {
    if (!timestampMs) return 'Never';
    const seconds = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s ago`;
  };

  return (
    <div className="flex flex-col bg-slate-900/95 border border-cyan-500/40 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden text-slate-100 max-h-[85vh] w-full max-w-4xl font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Radar className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black tracking-wide text-white uppercase">
                Coastal Coverage & Patrol Coordination
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Phase 8
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Observation-Driven Coastal Surveillance & Multi-Sector Patrol Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onToggleVisual3D && (
            <button
              onClick={onToggleVisual3D}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isVisual3DVisible
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>3D Zones</span>
            </button>
          )}

          <button
            onClick={refreshData}
            title="Refresh Coverage Audit"
            className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Metrics Ribbon with Explicit Denominator */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/40 border-b border-slate-800/60 font-mono">
        {/* Coverage Percentage */}
        <div className="flex flex-col p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">
            Observation Coverage
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-2xl font-black ${
                (report?.coveragePercentage ?? 0) >= 75
                  ? 'text-emerald-400'
                  : (report?.coveragePercentage ?? 0) > 0
                  ? 'text-cyan-400'
                  : 'text-rose-400'
              }`}
            >
              {(report?.coveragePercentage ?? 0).toFixed(1)}%
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5">
            ({report?.coveredZonesCount ?? 0} / {report?.totalConfiguredZones ?? 4} Sectors Covered)
          </span>
        </div>

        {/* Active Patrol Fleet */}
        <div className="flex flex-col p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">
            Surveillance Drones
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-cyan-300">
              {report?.activePatrolDronesCount ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-sans">Active</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5">
            DRONE-02 preserved for rescue
          </span>
        </div>

        {/* Stale / Degraded */}
        <div className="flex flex-col p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">
            Stale / Degraded
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-2xl font-black ${
                (report?.staleZonesCount ?? 0) > 0 ? 'text-amber-400' : 'text-slate-400'
              }`}
            >
              {(report?.staleZonesCount ?? 0) + (report?.degradedZonesCount ?? 0)}
            </span>
            <span className="text-xs text-slate-500 font-sans">Zones</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5">
            Exceeding freshness limit
          </span>
        </div>

        {/* Blind Spots / Gaps */}
        <div className="flex flex-col p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">
            Identified Blind Spots
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-2xl font-black ${
                (report?.blindSpots.length ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {report?.blindSpots.length ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-sans">Gaps</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5">
            {report?.blindSpots.length ? 'Attention required' : 'Full observation active'}
          </span>
        </div>
      </div>

      {/* Action Bar & Notification */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('ZONES')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'ZONES'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Sectors & Status ({zones.length})
          </button>
          <button
            onClick={() => setActiveTab('GAPS')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'GAPS'
                ? 'bg-rose-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>Blind Spots</span>
            {(report?.blindSpots.length ?? 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-950 text-rose-300 font-mono">
                {report?.blindSpots.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('ALLOCATION')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'ALLOCATION'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Patrol Plan Log
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoAllocate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Auto-Allocate Patrols</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="px-4 py-2 bg-cyan-950/80 border-b border-cyan-800/60 text-cyan-200 text-xs flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: SECTORS & STATUS */}
        {activeTab === 'ZONES' && (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 text-[11px] font-mono uppercase">
                  <th className="py-2.5 px-3">Sector</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Coverage Status</th>
                  <th className="py-2.5 px-3">Assigned Drone(s)</th>
                  <th className="py-2.5 px-3">Last Observation</th>
                  <th className="py-2.5 px-3">Total Obs</th>
                  <th className="py-2.5 px-3">Freshness Window</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {zones.map((zone) => (
                  <tr key={zone.zoneId} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-white text-xs">{zone.name}</div>
                      <div className="font-mono text-[10px] text-slate-500">{zone.zoneId}</div>
                    </td>
                    <td className="py-3 px-3">{getPriorityBadge(zone.priority)}</td>
                    <td className="py-3 px-3">{getStatusBadge(zone.coverageStatus)}</td>
                    <td className="py-3 px-3">
                      {zone.assignedDroneIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1 font-mono text-[11px]">
                          {zone.assignedDroneIds.map((d) => (
                            <span
                              key={d}
                              className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                      <div>{formatAge(zone.lastValidObservationTimestampMs)}</div>
                      {zone.lastObservationCameraId && (
                        <div className="text-[10px] text-slate-500">
                          via {zone.lastObservationCameraId}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-cyan-400 font-bold">
                      {zone.totalValidObservationsCount}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                      {zone.requiredObservationIntervalMs / 1000}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: BLIND SPOTS & GAPS */}
        {activeTab === 'GAPS' && (
          <div className="space-y-3">
            {(!report?.blindSpots || report.blindSpots.length === 0) ? (
              <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white">Zero Blind Spots Detected</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  All active surveillance sectors have verified, observation-backed camera coverage
                  within required operational intervals.
                </p>
              </div>
            ) : (
              report.blindSpots.map((gap: CoverageGap) => (
                <div
                  key={gap.gapId}
                  className={`p-3.5 rounded-xl border flex flex-col gap-2 ${
                    gap.severity === 'CRITICAL'
                      ? 'bg-red-950/30 border-red-500/50 text-red-200'
                      : gap.severity === 'WARNING'
                      ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span className="font-bold text-xs text-white">{gap.zoneName}</span>
                      <span className="font-mono text-[10px] text-slate-400">({gap.zoneId})</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      {getPriorityBadge(gap.priority)}
                      <span className="px-2 py-0.5 rounded uppercase font-bold bg-slate-950/60 border border-slate-700">
                        {gap.gapType.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300">{gap.description}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Compass className="w-3.5 h-3.5 text-cyan-400" />
                      <span>
                        Assigned: {gap.assignedDroneId || 'None'}
                        {gap.observationLagSeconds !== undefined &&
                          ` | Lag: ${gap.observationLagSeconds.toFixed(1)}s`}
                      </span>
                    </div>
                    <div className="font-medium text-cyan-300">
                      Action: {gap.recommendedAction}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: PATROL PLAN LOG */}
        {activeTab === 'ALLOCATION' && (
          <div className="space-y-4">
            {!lastPlan ? (
              <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800">
                <Compass className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white">No Allocation Plan Run Yet</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Click &ldquo;Auto-Allocate Patrols&rdquo; to evaluate available drone capabilities and assign
                  patrol routes matching zone priorities.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono">
                  <div>
                    <span className="text-slate-400">Plan ID: </span>
                    <span className="text-cyan-300 font-bold">{lastPlan.planId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Generated: </span>
                    <span className="text-white">{new Date(lastPlan.timestampMs).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Zone Drone Allocations ({lastPlan.allocations.length})
                  </h5>
                  {lastPlan.allocations.map((alloc) => (
                    <div
                      key={`${alloc.zoneId}-${alloc.droneId}`}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{alloc.droneId}</span>
                          <span className="text-slate-400">&rarr;</span>
                          <span className="font-bold text-cyan-300">{alloc.zoneId}</span>
                          <span className="font-mono text-[10px] text-slate-400">({alloc.routeId})</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{alloc.allocationReason}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                        {alloc.status}
                      </span>
                    </div>
                  ))}
                </div>

                {Object.keys(lastPlan.rejectionReasons).length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Safety Protection & Rejection Audits
                    </h5>
                    <div className="space-y-1.5">
                      {Object.entries(lastPlan.rejectionReasons).map(([droneId, reason]) => (
                        <div
                          key={droneId}
                          className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] flex items-center justify-between"
                        >
                          <span className="font-mono font-bold text-amber-400">{droneId}</span>
                          <span className="text-slate-400">{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="px-5 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>Coordinate System: Rushikonda Beach Scene Space [-250, 250]</span>
        <span>Principle: Observation-Driven Coverage Proof</span>
      </div>
    </div>
  );
};
