/**
 * src/emergency/coordination/components/EmergencyOperationsPanel.tsx
 * Comprehensive Emergency Operations, Multi-Incident Coordination,
 * Dynamic Evacuation Zones & Performance Analytics View.
 * Integrated into TIDES Unified Safety & Incident Command Center.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertOctagon,
  Users,
  Compass,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Activity,
  Layers,
  Clock,
  Sliders,
  AlertTriangle,
  Radio,
  Ship,
} from 'lucide-react';
import { Visitor } from '../../../models/Visitor';
import { Beach } from '../../../models/Beach';
import { Environment } from '../../../models/Environment';
import { EvacuationZoneManager } from '../EvacuationZoneManager';
import { EvacuationRoutePlanner } from '../EvacuationRoutePlanner';
import { EmergencyCoordinator } from '../EmergencyCoordinator';
import { EmergencyDecisionPolicy } from '../EmergencyDecisionPolicy';
import { EmergencyScenarioManager } from '../EmergencyScenarioManager';

interface EmergencyOperationsPanelProps {
  beach: Beach;
  environment: Environment;
  visitors: Visitor[];
}

export const EmergencyOperationsPanel: React.FC<EmergencyOperationsPanelProps> = ({
  beach,
  environment,
  visitors,
}) => {
  const zoneMgr = EvacuationZoneManager.getInstance();
  const routePlanner = EvacuationRoutePlanner.getInstance();
  const coordinator = EmergencyCoordinator.getInstance();
  const policy = EmergencyDecisionPolicy.getInstance();
  const scenarioMgr = EmergencyScenarioManager.getInstance();

  const [, setTick] = useState(0);

  useEffect(() => {
    // Re-render on emergency updates
    const unsubs = [
      zoneMgr.subscribe(() => setTick((t) => t + 1)),
      coordinator.subscribe(() => setTick((t) => t + 1)),
      policy.subscribe(() => setTick((t) => t + 1)),
      scenarioMgr.subscribe(() => setTick((t) => t + 1)),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  // Update zone crowd counts
  useEffect(() => {
    zoneMgr.updateCrowdCounts(visitors);
  }, [visitors]);

  const zones = zoneMgr.getZones();
  const exits = routePlanner.getExits();
  const routes = routePlanner.getRoutes();
  const incidents = coordinator.getIncidents();
  const recommendations = policy.getRecommendations();
  const metrics = scenarioMgr.getMetrics();
  const scenarioState = scenarioMgr.scenarioState;

  const handleStartScenario = () => {
    scenarioMgr.startScenario(visitors, environment);
  };

  const handleResetScenario = () => {
    scenarioMgr.reset();
  };

  const handleApproveRecommendation = (recId: string) => {
    const res = policy.reviewRecommendation(recId, true);
    if (res.success) {
      scenarioMgr.onEvacuationApproved(visitors);
    }
  };

  const handleRejectRecommendation = (recId: string) => {
    policy.reviewRecommendation(recId, false);
  };

  const handleToggleRouteBlocked = (routeId: string, currentBlocked: boolean) => {
    routePlanner.setRouteBlocked(routeId, !currentBlocked, 'Operator corridor blockage test');
    setTick((t) => t + 1);
  };

  return (
    <div className="space-y-4">
      {/* Scenario Control Header */}
      <div className="bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-950 p-4 rounded-2xl border border-red-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-500/20 text-red-400 rounded-xl border border-red-500/40">
            <AlertOctagon className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] text-red-400 font-extrabold uppercase tracking-widest flex items-center gap-2">
              <span>Emergency Scenario Demo</span>
              <span className="text-slate-500">•</span>
              <span className="text-white font-mono">RUSHIKONDA RIP ESCALATION & DUAL DISTRESS</span>
            </div>
            <h3 className="text-white text-base font-bold">
              Beach-Wide Multi-Incident Coordination & Evacuation Simulation
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono">
            <span className="text-slate-500">Status: </span>
            <span className={`font-bold ${
              scenarioState === 'EVACUATION_ORDERED'
                ? 'text-red-400 animate-pulse'
                : scenarioState === 'INCIDENTS_ACTIVE'
                ? 'text-amber-400'
                : scenarioState === 'COMPLETED'
                ? 'text-emerald-400'
                : 'text-slate-400'
            }`}>
              {scenarioState}
            </span>
          </div>

          <button
            onClick={handleStartScenario}
            disabled={scenarioState === 'EVACUATION_ORDERED' || scenarioState === 'INCIDENTS_ACTIVE'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Trigger Emergency Scenario
          </button>

          <button
            onClick={handleResetScenario}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset State
          </button>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-5 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Evacuation Completion</div>
          <div className="text-xl font-bold text-white mt-1">
            {metrics.evacuationCompletionPct !== null ? `${metrics.evacuationCompletionPct}%` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {metrics.visitorsRemainingInHazardZones} remaining in hazard
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Warning-to-Movement Delay</div>
          <div className="text-xl font-bold text-cyan-400 mt-1">
            {metrics.warningToMovementDelaySec !== null ? `${metrics.warningToMovementDelaySec} s` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Recorded reaction latency</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Incidents</div>
          <div className="text-xl font-bold text-amber-400 mt-1">{incidents.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Simultaneous distress</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Resource Allocation</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {metrics.resourceUtilizationPct !== null ? `${metrics.resourceUtilizationPct}%` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Zero conflict locking</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Unresolved Incidents</div>
          <div className="text-xl font-bold text-rose-400 mt-1">{metrics.unresolvedIncidentsCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Craft exhaustion count</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* LEFT COLUMN: Multi-Incident Queue & Decision Recommendations */}
        <div className="space-y-4">
          {/* Multi-Incident Queue */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                Multi-Incident Coordination Queue ({incidents.length})
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Priority Ranked (Distress + Depth + Delay)</span>
            </div>

            <div className="p-3 space-y-2">
              {incidents.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No simultaneous incidents reported. All sectors secure.
                </div>
              ) : (
                incidents.map((inc) => (
                  <div
                    key={inc.incidentId}
                    className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-300">{inc.incidentId}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/40">
                          Priority {inc.priorityScore}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Visitor: {inc.visitorId}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                        <span>Loc: ({inc.location.x.toFixed(0)}m, {inc.location.y.toFixed(0)}m)</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-medium">{inc.notes}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inc.status === 'DISPATCHED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : inc.status === 'UNRESOLVED_RESOURCE_EXHAUSTION'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {inc.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Decision Support Recommendations */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                Emergency Decision Support Recommendations
              </h4>
              <span className="text-[10px] text-amber-400 font-bold">Operator Authorization Gate</span>
            </div>

            <div className="p-3 space-y-3">
              {recommendations.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No active recommendations. Automatic monitoring active.
                </div>
              ) : (
                recommendations.map((rec) => (
                  <div
                    key={rec.recommendationId}
                    className="bg-slate-950 p-3.5 rounded-xl border border-amber-500/30 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-300 font-mono">{rec.actionType}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({rec.ruleTriggered})</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rec.status === 'OPERATOR_APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : rec.status === 'OPERATOR_REJECTED'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {rec.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded-lg font-mono">
                      Target: {rec.targetZoneId} | Inputs: {JSON.stringify(rec.supportingInputs)}
                    </div>

                    {rec.uncertaintyNotes && (
                      <div className="text-[10px] text-slate-400 italic">
                        * {rec.uncertaintyNotes}
                      </div>
                    )}

                    {rec.status === 'RECOMMENDED' && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleApproveRecommendation(rec.recommendationId)}
                          className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve Action (Order Evacuation)
                        </button>
                        <button
                          onClick={() => handleRejectRecommendation(rec.recommendationId)}
                          className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Evacuation Zones & Designated Routes */}
        <div className="space-y-4">
          {/* Dynamic Evacuation Zones */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Configurable Evacuation Zones ({zones.length})
              </h4>
              <span className="text-[10px] text-slate-400">Rushikonda Safety Boundary</span>
            </div>

            <div className="p-3 grid grid-cols-2 gap-2.5">
              {zones.map((z) => (
                <div
                  key={z.zoneId}
                  className={`p-3 rounded-xl border ${
                    z.state === 'EVACUATION'
                      ? 'bg-red-950/30 border-red-500/60'
                      : z.state === 'RESTRICTED'
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white truncate">{z.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      z.state === 'EVACUATION'
                        ? 'bg-red-500/30 text-red-300'
                        : z.state === 'RESTRICTED'
                        ? 'bg-amber-500/30 text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {z.state}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    Visitors: <strong className="text-cyan-300">{z.activeVisitorCount}</strong>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 truncate">
                    {z.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Designated Exits & Walkable Routes */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                Designated Exits & Dynamic Routes
              </h4>
              <span className="text-[10px] text-slate-400">Bottleneck & Blockage Controls</span>
            </div>

            <div className="p-3 space-y-2.5">
              {/* Exits */}
              <div className="grid grid-cols-3 gap-2">
                {exits.map((e) => (
                  <div key={e.exitId} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400 font-bold truncate">{e.name}</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">
                      {e.flowCapacityPerSec} / sec
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                      Queue: {e.currentQueueCount}
                    </div>
                  </div>
                ))}
              </div>

              {/* Routes with Blockage Toggles */}
              <div className="space-y-1.5 pt-1">
                {routes.map((r) => (
                  <div
                    key={r.routeId}
                    className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-200">{r.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Target Exit: {r.exitId} | Waypoints: {r.waypoints.length}
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleRouteBlocked(r.routeId, r.isBlocked)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        r.isBlocked
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                      }`}
                    >
                      {r.isBlocked ? 'BLOCKED (Click to Open)' : 'CLEAR (Click to Block)'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

