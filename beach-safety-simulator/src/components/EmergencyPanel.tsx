import React, { useState, useEffect } from 'react';
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
  Wifi,
  Battery,
  Bell,
  Zap,
} from 'lucide-react';
import { EmergencyIncident } from '../emergency/models/EmergencyIncident';
import { EmergencyResource } from '../emergency/models/EmergencyResource';
import { PerformanceAnalytics, ResponseMetrics } from '../emergency/models/ResponseMetrics';
import { BoardDisplayState } from '../emergency/communication/WarningBoardManager';
import { WristbandRegistry } from '../wristbands/WristbandRegistry';
import { WristbandIncidentBridge } from '../wristbands/WristbandIncidentBridge';
import { SwimmerWristband } from '../wristbands/wristband.types';
import { SwimmerFeelingFlowPanel } from '../wristbands/components/SwimmerFeelingFlowPanel';

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
  const [activeTab, setActiveTab] = useState<'operations' | 'fleet' | 'wristbands' | 'analytics'>('operations');
  const [wristbands, setWristbands] = useState<SwimmerWristband[]>(WristbandRegistry.getInstance().getWristbands());
  const [wbFilter, setWbFilter] = useState<'all' | 'sos' | 'water' | 'battery'>('all');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      setWristbands([...WristbandRegistry.getInstance().getWristbands()]);
    };
    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, []);

  const activeSosCount = wristbands.filter((w) => w.isSosActive).length;

  const handleTriggerSOS = (wbId: string) => {
    const event = WristbandRegistry.getInstance().triggerSOS(wbId as any, true);
    if (event) {
      WristbandIncidentBridge.getInstance().handleSOSEvent(event);
    }
    setWristbands([...WristbandRegistry.getInstance().getWristbands()]);
    setActionMessage(`🚨 Emergency SOS Sent from ${wbId} via IN865 Gateway`);
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleCancelSOS = (wbId: string) => {
    WristbandRegistry.getInstance().cancelSOS(wbId as any);
    setWristbands([...WristbandRegistry.getInstance().getWristbands()]);
    setActionMessage(`✓ SOS Cleared on ${wbId}`);
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleSendHapticBuzz = (wbId: string) => {
    const wb = WristbandRegistry.getInstance().getWristband(wbId as any);
    WristbandRegistry.getInstance().updateWristband(wbId as any, {
      vibrationPattern: 'CADENCE_BURST',
      ledState: 'STROBE_AMBER',
      oledMessage: 'CAUTION - RIP DETECTED',
      lastWarningReceived: {
        warningId: `WARN-${Date.now()}`,
        originIncidentId: `INC-${Date.now()}`,
        targetWristbandId: wbId as any,
        targetVisitorId: wb ? wb.pairedVisitorId : null,
        category: 'CAUTION',
        title: 'Rip Hazard Proximity',
        message: 'Rip current hazard in sector. Move toward shore.',
        timestampMs: Date.now(),
        expiresAtMs: Date.now() + 45000,
        status: 'DELIVERED',
        dispatchedByGatewayId: 'GW-TOWER-01',
        deliveredAtMs: Date.now(),
        retryCount: 0,
      },
    });
    setWristbands([...WristbandRegistry.getInstance().getWristbands()]);
    setActionMessage(`⚡ Downlink Haptic Buzz Sent to ${wbId}`);
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleAcknowledge = (wbId: string) => {
    WristbandRegistry.getInstance().acknowledgeWarning(wbId as any);
    setWristbands([...WristbandRegistry.getInstance().getWristbands()]);
    setActionMessage(`✓ Swimmer Double-Tap Ack on ${wbId}`);
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleBroadcastToAll = () => {
    wristbands.forEach((wb) => {
      handleSendHapticBuzz(wb.id);
    });
    setActionMessage(`📢 Localized Downlink Broadcast Delivered to all ${wristbands.length} Wristbands`);
    setTimeout(() => setActionMessage(null), 3500);
  };

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
        <div className="flex flex-col gap-1.5 border-b border-slate-800 pb-2 mb-2">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="p-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                <Siren className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <h3 className="font-bold text-xs text-slate-100 truncate">Emergency Response Engine</h3>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {activeSosCount > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse font-mono">
                  🚨 {activeSosCount} Band SOS
                </span>
              )}
              <span
                className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full font-mono ${
                  activeIncidents.length > 0
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {activeIncidents.length} Active Ops
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">Multi-agency dispatch, rescue progression & connected wristbands</p>
        </div>

        {/* Tab Navigation (4 Dedicated Views: Rescues, Fleet, Wristbands, Analytics) */}
        <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-950 rounded-lg text-[9px] font-bold text-center mb-2">
          <button
            onClick={() => setActiveTab('operations')}
            className={`py-1 px-1 rounded cursor-pointer transition truncate ${
              activeTab === 'operations'
                ? 'bg-rose-500 text-white shadow-sm font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Rescues ({activeIncidents.length})
          </button>
          <button
            onClick={() => setActiveTab('fleet')}
            className={`py-1 px-1 rounded cursor-pointer transition truncate ${
              activeTab === 'fleet'
                ? 'bg-cyan-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Fleet ({resources.length})
          </button>
          <button
            onClick={() => setActiveTab('wristbands')}
            className={`py-1 px-0.5 rounded cursor-pointer transition truncate flex items-center justify-center gap-0.5 ${
              activeTab === 'wristbands'
                ? 'bg-teal-500 text-slate-950 shadow-sm font-black'
                : activeSosCount > 0
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse font-extrabold'
                : 'text-teal-400 hover:text-teal-200'
            }`}
            title="Track B Connected Wristband Operations & Localized Downlink Hub"
          >
            <Radio className="w-2.5 h-2.5" />
            <span>Bands ({wristbands.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-1 px-1 rounded cursor-pointer transition truncate ${
              activeTab === 'analytics'
                ? 'bg-purple-500 text-white shadow-sm font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Analytics
          </button>
        </div>

        {/* Tab 1: Live Rescues & Emergency Operations */}
        {activeTab === 'operations' && (
          <div className="space-y-2">
            {/* Dynamic LED Warning Board Banners */}
            {boardStates.some((b) => b.isFlashing) && (
              <div className="p-1.5 rounded-lg bg-slate-800/90 border border-amber-500/40 flex flex-col gap-0.5 text-left">
                <span className="font-mono text-amber-300 font-bold flex items-center gap-1 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  LED MATRIX BOARD (ZONE A):
                </span>
                <span className="text-[10px] text-amber-200 font-semibold break-words leading-tight">
                  {boardStates.find((b) => b.isFlashing)?.message}
                </span>
              </div>
            )}

            <div className="space-y-1.5 max-h-[260px] overflow-y-auto overflow-x-hidden [scrollbar-width:thin] scrollbar-thin pr-1 text-left">
              {activeIncidents.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500/50 mx-auto mb-1.5" />
                  <p className="font-medium text-slate-400">No Active Emergency Rescues</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">All beach sectors operational & clear</p>
                </div>
              ) : (
                activeIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-left space-y-1.5 w-full"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[11px] font-bold text-slate-100 break-words leading-tight">{inc.title}</h4>
                        <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
                          Target Lock: {Math.round(inc.targetConfidence * 100)}% Confidence
                        </span>
                      </div>
                      <div className="shrink-0">{getStatusBadge(inc.status)}</div>
                    </div>

                    {/* Operational Lifecycle Timeline */}
                    <div className="grid grid-cols-4 gap-0.5 text-center text-[8px] font-mono font-bold">
                      <div className={`p-0.5 rounded ${inc.detectedAt ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
                        1. LOCATE ✓
                      </div>
                      <div className={`p-0.5 rounded ${inc.dispatchedAt ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'}`}>
                        2. DISPATCH ✓
                      </div>
                      <div className={`p-0.5 rounded ${inc.arrivedAt ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'}`}>
                        3. INTERVENE
                      </div>
                      <div className={`p-0.5 rounded ${inc.personSecuredAt ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-500'}`}>
                        4. SECURED
                      </div>
                    </div>

                    {/* Assigned Assets */}
                    {inc.assignedResourceIds.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1 text-[9px] text-slate-300 border-t border-slate-700/50">
                        <span className="text-slate-400">Assigned:</span>
                        {inc.assignedResourceIds.map((resId) => (
                          <span
                            key={resId}
                            className="px-1 py-0.2 rounded bg-slate-700/70 border border-slate-600 font-mono font-semibold"
                          >
                            {resId}
                          </span>
                        ))}
                      </div>
                    )}
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

        {/* Tab 3: Connected Wristbands, Swimmer Feeling State & Closed-Loop Control Flow */}
        {activeTab === 'wristbands' && (
          <div className="space-y-2 text-left">
            <SwimmerFeelingFlowPanel
              selectedWristbandId="WB-105"
            />
          </div>
        )}

        {/* Tab 4: Performance Analytics & Response Timers */}
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
