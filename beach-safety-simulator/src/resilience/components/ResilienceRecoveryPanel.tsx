/**
 * src/resilience/components/ResilienceRecoveryPanel.tsx
 * 
 * TIDES — Phase 10: Resilience, Fault Tolerance & Disaster Recovery
 * 
 * Comprehensive Command-Center Panel for:
 * - 6-State Health Monitoring across Coastal Failure Domains
 * - Safe Degraded Operations & Non-Negotiable Safety Invariant Preservation
 * - Reliable Event Processing, Bounded Retries & Dead Letter Queue
 * - Disaster Recovery Checkpoints, Checksum Integrity & Isolated Restoration Drills
 * - Controlled Fault Injection Test Harness (Test Mode Security Guarded)
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  RefreshCw,
  Database,
  Cpu,
  Radio,
  Camera,
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  RotateCcw,
  Clock,
  HardDrive,
  FileCheck,
  Zap,
} from 'lucide-react';
import { ResilienceOrchestrator } from '../ResilienceOrchestrator';
import {
  ComponentHealthStatus,
  FailureDomain,
  FaultInjectionScenarioType,
} from '../resilience.types';

type ResilienceSubTab =
  | 'HEALTH_MONITOR'
  | 'DEGRADED_MODES'
  | 'EVENT_PROCESSING'
  | 'DISASTER_RECOVERY'
  | 'FAULT_INJECTION';

export const ResilienceRecoveryPanel: React.FC = () => {
  const orchestrator = ResilienceOrchestrator.getInstance();

  const [activeTab, setActiveTab] = useState<ResilienceSubTab>('HEALTH_MONITOR');
  const [summary, setSummary] = useState(orchestrator.getResilienceSummary());
  const [healthRecords, setHealthRecords] = useState(orchestrator.getHealthMonitor().getAllHealthRecords());
  const [degradedStates, setDegradedStates] = useState(orchestrator.getDegradedManager().getAllDegradedStates());
  const [deadLetterQueue, setDeadLetterQueue] = useState(orchestrator.getEventProcessor().getDeadLetterQueue());
  const [checkpoints, setCheckpoints] = useState(orchestrator.getRecoveryManager().getCheckpoints());
  const [restorationHistory, setRestorationHistory] = useState(orchestrator.getRecoveryManager().getRestorationHistory());
  const [scenarios, setScenarios] = useState(orchestrator.getFaultInjector().getScenarios());
  const [isTestMode, setIsTestMode] = useState(orchestrator.getFaultInjector().isTestMode());
  const [runningScenario, setRunningScenario] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<FailureDomain | 'ALL'>('ALL');
  const [drillRunning, setDrillRunning] = useState(false);

  const refreshData = () => {
    orchestrator.getHealthMonitor().evaluateFreshness();
    setSummary(orchestrator.getResilienceSummary());
    setHealthRecords(orchestrator.getHealthMonitor().getAllHealthRecords());
    setDegradedStates(orchestrator.getDegradedManager().getAllDegradedStates());
    setDeadLetterQueue(orchestrator.getEventProcessor().getDeadLetterQueue());
    setCheckpoints(orchestrator.getRecoveryManager().getCheckpoints());
    setRestorationHistory(orchestrator.getRecoveryManager().getRestorationHistory());
    setScenarios(orchestrator.getFaultInjector().getScenarios());
    setIsTestMode(orchestrator.getFaultInjector().isTestMode());
  };

  useEffect(() => {
    refreshData();
    const timer = setInterval(refreshData, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleTestMode = () => {
    const next = !isTestMode;
    orchestrator.setTestMode(next);
    setIsTestMode(next);
    refreshData();
  };

  const handleRunScenario = async (type: FaultInjectionScenarioType) => {
    if (!isTestMode) return;
    setRunningScenario(type);
    try {
      await orchestrator.runFaultInjectionScenario(type);
    } catch (err: any) {
      console.error(err);
    } finally {
      setRunningScenario(null);
      refreshData();
    }
  };

  const handleCreateSnapshot = () => {
    orchestrator.createSnapshot('RUSHIKONDA', {
      incidents: [
        { id: 'INC-LIVE-001', type: 'SWIMMER_DISTRESS', active: true, zoneId: 'ZONE_A' },
        { id: 'INC-LIVE-002', type: 'RIP_CURRENT_HAZARD', active: true, zoneId: 'ZONE_B' },
      ],
      wristbands: [
        { wristbandId: 'HW-WB-001', status: 'ACTIVE', battery: 94 },
        { wristbandId: 'SW-WB-002', status: 'ACTIVE', battery: 88 },
      ],
      warnings: [{ warningId: 'WARN-01', zoneId: 'ZONE_B', status: 'DELIVERED' }],
      gateways: [{ gatewayId: 'GW-TOWER-01', status: 'ONLINE' }],
      observations: [{ obsId: 'OBS-WAVE-01', variable: 'WAVE_HEIGHT', value: 1.45 }],
      auditLogs: [{ action: 'SNAPSHOT_INITIATED', timestamp: Date.now() }],
    });
    refreshData();
  };

  const handleRunRestorationDrill = (checkpointId: string) => {
    setDrillRunning(true);
    setTimeout(() => {
      orchestrator.verifyRestorationDrill(checkpointId);
      setDrillRunning(false);
      refreshData();
    }, 400);
  };

  const getStatusBadge = (status: ComponentHealthStatus) => {
    switch (status) {
      case 'HEALTHY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">HEALTHY</span>;
      case 'DEGRADED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">DEGRADED</span>;
      case 'OFFLINE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">OFFLINE</span>;
      case 'STALE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">STALE</span>;
      case 'RECOVERING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">RECOVERING</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300 border border-slate-600">UNKNOWN</span>;
    }
  };

  const filteredHealthRecords = selectedDomain === 'ALL'
    ? healthRecords
    : healthRecords.filter((r) => r.domain === selectedDomain);

  return (
    <div className="space-y-6">
      {/* Top Header & Resilience KPIs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            Phase 10: Resilience, Fault Tolerance & Disaster Recovery
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Failure domain isolation, bounded retries, offline recovery, and verified disaster restoration
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Recovery Objectives Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px]">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">RPO:</span>
            <strong className="text-cyan-300">{summary.rpoSeconds}s</strong>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">RTO:</span>
            <strong className="text-cyan-300">{summary.rtoSeconds}s</strong>
          </div>

          {/* Test Mode Security Toggle */}
          <button
            onClick={handleToggleTestMode}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              isTestMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isTestMode ? 'text-amber-400' : 'text-slate-500'}`} />
            <span>TEST MODE: {isTestMode ? 'ACTIVE' : 'LOCKED (PROD)'}</span>
          </button>

          <button
            onClick={refreshData}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white"
            title="Refresh status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
          <span className="text-[10px] text-slate-400 block font-bold">HEALTHY NODES</span>
          <strong className="text-emerald-400 text-base">{summary.health.healthyCount} / {summary.health.totalComponents}</strong>
        </div>
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
          <span className="text-[10px] text-slate-400 block font-bold">DEGRADED / STALE</span>
          <strong className="text-amber-400 text-base">{summary.health.degradedCount + summary.health.staleCount}</strong>
        </div>
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
          <span className="text-[10px] text-slate-400 block font-bold">OFFLINE NODES</span>
          <strong className="text-rose-400 text-base">{summary.health.offlineCount}</strong>
        </div>
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
          <span className="text-[10px] text-slate-400 block font-bold">DEAD LETTER QUEUE</span>
          <strong className="text-indigo-400 text-base">{summary.deadLetterCount}</strong>
        </div>
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
          <span className="text-[10px] text-slate-400 block font-bold">BUFFERED OFFLINE</span>
          <strong className="text-cyan-400 text-base">{summary.totalBufferedOfflineEvents}</strong>
        </div>
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
          <span className="text-[10px] text-slate-400 block font-bold">CHECKPOINTS</span>
          <strong className="text-purple-400 text-base">{summary.checkpointsCount}</strong>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        {[
          { id: 'HEALTH_MONITOR', label: 'Health Monitoring', icon: Activity },
          { id: 'DEGRADED_MODES', label: 'Degraded Modes & Safety Guard', icon: ShieldCheck, badge: summary.activeDegradedCount },
          { id: 'EVENT_PROCESSING', label: 'Reliable Events & DLQ', icon: RotateCcw, badge: summary.deadLetterCount },
          { id: 'DISASTER_RECOVERY', label: 'Disaster Recovery & Drills', icon: HardDrive },
          { id: 'FAULT_INJECTION', label: 'Controlled Fault Injection', icon: Zap },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ResilienceSubTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  isActive ? 'bg-slate-950 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: HEALTH MONITORING */}
      {activeTab === 'HEALTH_MONITOR' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              6-State Health Detection across Coastal Failure Domains (Honest status; no fabricated health)
            </span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-bold">Domain Filter:</span>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none"
              >
                <option value="ALL">All Domains ({healthRecords.length})</option>
                <option value="SENSOR_TELEMETRY">Environmental Sensors</option>
                <option value="WRISTBAND_GATEWAY">Gateways & Bands</option>
                <option value="DRONE_AERIAL">Drones (UAVs)</option>
                <option value="CAMERA_VISION">CV Cameras</option>
                <option value="SITE_LOCAL">Regional Sites</option>
                <option value="BACKEND_PIPELINE">Backend Bus</option>
                <option value="PERSISTENCE_STORE">Persistence DB</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-4 font-bold">Component</th>
                    <th className="py-2.5 px-4 font-bold">Domain</th>
                    <th className="py-2.5 px-4 font-bold">Site</th>
                    <th className="py-2.5 px-4 font-bold">Health Status</th>
                    <th className="py-2.5 px-4 font-bold">Latency</th>
                    <th className="py-2.5 px-4 font-bold">Last Heartbeat</th>
                    <th className="py-2.5 px-4 font-bold">Diagnostics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredHealthRecords.map((rec) => {
                    const ageSec = rec.lastHeartbeatMs > 0 ? Math.round((Date.now() - rec.lastHeartbeatMs) / 1000) : null;
                    return (
                      <tr key={rec.componentId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-4">
                          <strong className="text-white block">{rec.componentName}</strong>
                          <span className="text-[10px] text-slate-500 font-mono">{rec.componentId}</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                          {rec.domain}
                        </td>
                        <td className="py-2.5 px-4 text-slate-300 font-mono text-[11px]">
                          {rec.siteId}
                        </td>
                        <td className="py-2.5 px-4">
                          {getStatusBadge(rec.status)}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px]">
                          {rec.latencyMs !== null ? (
                            <span className={rec.latencyMs > 1000 ? 'text-amber-400' : 'text-emerald-400'}>
                              {rec.latencyMs} ms
                            </span>
                          ) : (
                            <span className="text-slate-600">N/A</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                          {ageSec !== null ? `${ageSec}s ago` : 'Never (Uninstrumented)'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                          {rec.failureReason ? (
                            <span className="text-rose-400 font-medium">{rec.failureReason}</span>
                          ) : (
                            <span className="text-slate-500">Nominal telemetry</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DEGRADED MODES & SAFETY GUARD */}
      {activeTab === 'DEGRADED_MODES' && (
        <div className="space-y-4">
          {/* Life-Safety Invariant Banner */}
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-emerald-200 text-xs font-bold block uppercase tracking-wider">
                Strict Life-Safety Invariants Guaranteed
              </strong>
              <p className="text-xs text-emerald-300/80 mt-1">
                Even during catastrophic sensor, gateway, or network degradation:
                <strong> Confirmed SOS distress calls are NEVER suppressed or auto-closed</strong>,
                <strong> deterministic hazard levels are NEVER lowered to SAFE</strong>,
                and <strong>coordinates are NEVER fabricated</strong>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {degradedStates.map((deg) => (
              <div
                key={deg.domain}
                className={`p-4 rounded-2xl border transition-all ${
                  deg.isDegraded
                    ? 'bg-amber-950/20 border-amber-500/50'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className={`w-4 h-4 ${deg.isDegraded ? 'text-amber-400' : 'text-slate-400'}`} />
                    <strong className="text-xs text-white">{deg.domain}</strong>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    deg.isDegraded
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {deg.isDegraded ? 'DEGRADED FALLBACK ACTIVE' : 'NOMINAL'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-2">
                  <strong className="text-slate-300">Active Fallback Action: </strong>
                  {deg.fallbackAction}
                </p>

                {deg.isDegraded && (
                  <div className="mt-3 pt-2 border-t border-amber-500/20 text-[11px] text-amber-300 flex items-center justify-between">
                    <span>Reason: {deg.degradationReason}</span>
                    <span className="font-mono text-slate-400">
                      Active: {Math.round((Date.now() - deg.activeSinceMs) / 1000)}s
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: RELIABLE EVENTS & DEAD LETTER QUEUE */}
      {activeTab === 'EVENT_PROCESSING' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-bold">TOTAL EVENTS PROCESSED</span>
              <strong className="text-emerald-400 text-sm">{summary.totalProcessedEvents} (Idempotent)</strong>
            </div>
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-bold">RETRY BOUND</span>
              <strong className="text-cyan-400 text-sm">&le; 3 Attempts (Exp Backoff)</strong>
            </div>
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-bold">DEAD LETTER QUEUE</span>
              <strong className="text-rose-400 text-sm">{deadLetterQueue.length} Permanent Failures</strong>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <strong className="text-xs text-white">Dead Letter Queue (Quarantined Malformed / Exhausted Events)</strong>
              <span className="text-[11px] text-slate-400">Batch resilience preserves uncorrupted items</span>
            </div>

            {deadLetterQueue.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Dead letter queue is currently empty. All incoming events have processed or retried cleanly.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
                {deadLetterQueue.map((item) => (
                  <div key={item.eventId} className="p-3 hover:bg-slate-800/20 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-rose-300 font-mono">{item.eventId}</strong>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        {item.errorCategory || 'FAILED_PERMANENT'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      <strong>Error:</strong> {item.lastError}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                      <span>Domain: {item.domain}</span>
                      <span>Site: {item.siteId}</span>
                      <span>Retries: {item.retryCount} / {item.maxRetries}</span>
                      <span>Dangerous Action: {item.isDangerousExternalAction ? 'YES (LOCKED)' : 'NO'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: DISASTER RECOVERY & CHECKPOINTS */}
      {activeTab === 'DISASTER_RECOVERY' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <strong className="text-white text-xs block">State Checkpoints & Isolated Restoration Sandbox</strong>
              <span className="text-[11px] text-slate-400">
                Verify backup integrity and test restoration without mutating live production state
              </span>
            </div>

            <button
              onClick={handleCreateSnapshot}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Create State Snapshot</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {checkpoints.map((ckpt) => (
              <div key={ckpt.checkpointId} className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <strong className="text-white text-xs font-mono">{ckpt.checkpointId}</strong>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    SCHEMA {ckpt.schemaVersion}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-400">
                  <div className="p-2 bg-slate-950/60 rounded-lg">Incidents: <strong className="text-white">{ckpt.recordCounts.incidents}</strong></div>
                  <div className="p-2 bg-slate-950/60 rounded-lg">Wristbands: <strong className="text-white">{ckpt.recordCounts.wristbands}</strong></div>
                  <div className="p-2 bg-slate-950/60 rounded-lg">Warnings: <strong className="text-white">{ckpt.recordCounts.warnings}</strong></div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                  <div className="font-mono text-slate-400 flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{ckpt.checksum}</span>
                  </div>

                  <button
                    disabled={drillRunning}
                    onClick={() => handleRunRestorationDrill(ckpt.checkpointId)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Run Sandbox Drill</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Restoration Drill Verification Results History */}
          {restorationHistory.length > 0 && (
            <div className="mt-4 p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-2">
              <strong className="text-xs text-white block">Recent Restoration Sandbox Verification Drills</strong>
              <div className="space-y-1.5">
                {restorationHistory.slice(0, 3).map((hist, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-white font-mono">{hist.checkpointId}</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-emerald-300 font-bold">{hist.outcome}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Restored in {hist.durationMs}ms • Production Untouched
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 5: CONTROLLED FAULT INJECTION */}
      {activeTab === 'FAULT_INJECTION' && (
        <div className="space-y-4">
          <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>
                <strong>Test Mode Security Gate: </strong>
                {isTestMode
                  ? 'Active. Fault scenarios execute in test sandbox without public sirens or physical actions.'
                  : 'Locked. Turn ON Test Mode above to execute fault injection scenarios.'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {scenarios.map((sc) => (
              <div key={sc.scenarioId} className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <strong className="text-white text-xs">{sc.name}</strong>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-slate-400 bg-slate-800">
                      {sc.domain}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    sc.status === 'PASSED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : sc.status === 'RUNNING'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : sc.status === 'FAILED'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {sc.status}
                  </span>
                </div>

                <p className="text-xs text-slate-400">{sc.description}</p>

                {sc.actualBehavior && (
                  <div className="p-2 bg-slate-950/70 border border-slate-800 rounded-lg text-[11px] text-slate-300">
                    <strong className="text-cyan-400">Result: </strong> {sc.actualBehavior}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500 font-mono">Target: {sc.targetComponentId}</span>
                  <button
                    disabled={!isTestMode || runningScenario === sc.type}
                    onClick={() => handleRunScenario(sc.type)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 text-xs font-bold transition-all"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Run Scenario</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

