import React, { useState } from 'react';
import {
  Siren,
  LifeBuoy,
  Ship,
  Compass,
  Ambulance,
  Shield,
  Clock,
  CheckCircle2,
  TrendingUp,
  Activity,
  AlertOctagon,
  Radio,
} from 'lucide-react';
import { EmergencyIncident } from '../emergency/models/EmergencyIncident';
import { EmergencyResource } from '../emergency/models/EmergencyResource';
import { PerformanceAnalytics, ResponseMetrics } from '../emergency/models/ResponseMetrics';
import { BoardDisplayState } from '../emergency/communication/WarningBoardManager';

interface EmergencyPanelProps {
  incidents: EmergencyIncident[];
  resources: EmergencyResource[];
  boardStates: BoardDisplayState[];
  analytics: PerformanceAnalytics;
  recentMetrics: ResponseMetrics[];
}

export const EmergencyPanel: React.FC<EmergencyPanelProps> = ({
  incidents,
  resources,
  boardStates,
  analytics,
  recentMetrics,
}) => {
  const [activeTab, setActiveTab] = useState<'operations' | 'fleet' | 'analytics'>('operations');

  const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESCUE_IN_PROGRESS':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">🆘 RESCUE IN PROGRESS</span>;
      case 'PERSON_SECURED':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">🛟 PERSON SECURED</span>;
      case 'MEDICAL_ASSESSMENT':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">🚑 MEDICAL CHECK</span>;
      case 'RESOURCES_EN_ROUTE':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse">⚡ EN ROUTE</span>;
      case 'ESCALATED':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-rose-700/40 text-rose-200 border border-rose-500 font-mono">🚨 ESCALATED (NO ASSETS)</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono">{status}</span>;
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'LIFEGUARD':
        return <LifeBuoy className="w-3.5 h-3.5 text-amber-400" />;
      case 'RESCUE_BOAT':
        return <Ship className="w-3.5 h-3.5 text-blue-400" />;
      case 'DRONE':
        return <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin" />;
      case 'AMBULANCE':
        return <Ambulance className="w-3.5 h-3.5 text-rose-400" />;
      case 'POLICE':
        return <Shield className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Radio className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 p-4 shadow-xl flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Siren className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-200">Emergency Response Engine</h3>
              <p className="text-[11px] text-slate-400">Phase 6: Multi-agency dispatch & rescue progression</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                activeIncidents.length > 0
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {activeIncidents.length} Active Ops
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setActiveTab('operations')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'operations'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Live Rescues ({activeIncidents.length})
          </button>
          <button
            onClick={() => setActiveTab('fleet')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'fleet'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Unified Fleet ({resources.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Analytics & Timers
          </button>
        </div>

        {/* Tab 1: Live Rescues & Emergency Operations */}
        {activeTab === 'operations' && (
          <div className="space-y-3">
            {/* Dynamic LED Warning Board Banners */}
            {boardStates.some((b) => b.isFlashing) && (
              <div className="p-2 rounded-lg bg-slate-800/90 border border-amber-500/40 flex items-center justify-between text-xs">
                <span className="font-mono text-amber-300 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  LED MATRIX BOARD (ZONE A):
                </span>
                <span className="text-[11px] text-amber-200 font-semibold truncate max-w-[280px]">
                  {boardStates.find((b) => b.isFlashing)?.message}
                </span>
              </div>
            )}

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {activeIncidents.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                  <p className="font-medium text-slate-400">No Active Emergency Rescues</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">All beach sectors operational & clear</p>
                </div>
              ) : (
                activeIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 text-left space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{inc.title}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Target Lock: {Math.round(inc.targetConfidence * 100)}% Confidence
                        </span>
                      </div>
                      {getStatusBadge(inc.status)}
                    </div>

                    {/* Operational Lifecycle Timeline */}
                    <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-mono pt-1">
                      <div className={`p-1 rounded ${inc.detectedAt ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
                        1. LOCATE ✓
                      </div>
                      <div className={`p-1 rounded ${inc.dispatchedAt ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'}`}>
                        2. DISPATCH ✓
                      </div>
                      <div className={`p-1 rounded ${inc.arrivedAt ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'}`}>
                        3. INTERVENE
                      </div>
                      <div className={`p-1 rounded ${inc.personSecuredAt ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-500'}`}>
                        4. SECURED
                      </div>
                    </div>

                    {/* Assigned Assets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-slate-300 border-t border-slate-700/50">
                      <span className="text-slate-400">Assigned Units:</span>
                      {inc.assignedResourceIds.map((resId) => (
                        <span
                          key={resId}
                          className="px-1.5 py-0.5 rounded bg-slate-700/70 border border-slate-600 font-mono font-semibold flex items-center gap-1"
                        >
                          {getResourceIcon(resources.find((r) => r.id === resId)?.type || '')}
                          {resId}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Unified Multi-Agency Fleet */}
        {activeTab === 'fleet' && (
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 text-left">
            {resources.map((res) => (
              <div
                key={res.id}
                className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-700/60 border border-slate-600">
                    {getResourceIcon(res.type)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-200 text-[11px]">{res.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Speed: {res.speed}px/s | Radius: {res.responseRadius}m
                    </div>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full font-mono ${
                    res.status === 'AVAILABLE'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : res.status === 'EN_ROUTE' || res.status === 'DISPATCHED'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                      : res.status === 'ON_SCENE'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {res.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Performance Analytics & Response Timers */}
        {activeTab === 'analytics' && (
          <div className="space-y-3 text-left">
            {/* Stopwatch Averages Grid */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-800/70 border border-slate-700">
                <span className="text-[10px] text-slate-400 block">Avg Detection</span>
                <span className="text-sm font-bold text-cyan-300 font-mono">
                  {analytics.averageDetectionTime}s
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-800/70 border border-slate-700">
                <span className="text-[10px] text-slate-400 block">Avg Arrival</span>
                <span className="text-sm font-bold text-amber-300 font-mono">
                  {analytics.averageArrivalTime}s
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-800/70 border border-slate-700">
                <span className="text-[10px] text-slate-400 block">Total Response</span>
                <span className="text-sm font-bold text-emerald-300 font-mono">
                  {analytics.averageTotalResponseTime}s
                </span>
              </div>
            </div>

            {/* Utilization Rates */}
            <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 space-y-1.5 text-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Asset Utilization
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-300">Lifeguard Units:</span>
                <span className="font-mono font-bold text-amber-400">{analytics.lifeguardUtilization}%</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-300">Autonomous UAVs:</span>
                <span className="font-mono font-bold text-cyan-400">{analytics.droneUtilization}%</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-300">Rescue Watercraft:</span>
                <span className="font-mono font-bold text-blue-400">{analytics.boatUtilization}%</span>
              </div>
            </div>

            {/* Recent Completed Rescues Log */}
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Recent Completed Rescues
            </div>
            <div className="space-y-1 max-h-[90px] overflow-y-auto pr-1">
              {recentMetrics.length === 0 ? (
                <p className="text-[11px] text-slate-500">No rescues completed yet</p>
              ) : (
                recentMetrics.slice(0, 3).map((m, idx) => (
                  <div key={idx} className="p-1.5 rounded bg-slate-800/40 border border-slate-700/50 text-[10px] font-mono flex justify-between">
                    <span className="text-emerald-400 font-bold">{m.incidentId}</span>
                    <span className="text-slate-300">Total: {m.totalResponseTime}s (Arrival: {m.arrivalTime}s, Rescue: {m.rescueTime}s)</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-rose-400">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          Multi-Agency Coordination Active
        </span>
        <span className="font-mono text-[10px] text-slate-400">
          Resolution: {analytics.incidentResolutionRate}%
        </span>
      </div>
    </div>
  );
};
