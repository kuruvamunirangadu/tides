/**
 * DroneFaultRecoveryHUD.tsx
 * 
 * TIDES Drone Phase 12: Command Center Fault & Resilience Dashboard
 * 
 * Comprehensive operator interface for live fault monitoring, diagnostics,
 * telemetry uncertainty auditing, and manual recovery overrides:
 * - Active Faults & Diagnostics Table
 * - Severity & Category Badges with Accessibility Icons
 * - Telemetry Age & Last-Known Position Uncertainty Tags
 * - Operator Controls: Acknowledge, Retry Recovery, Force RTB, Request Replacement
 * - Confirmation Modals preventing accidental or unvalidated actions
 * - Replacement Tracker showing collaborative Lifeguard & Jet Boat status
 * - Historical Audit Log of all resolved/terminal faults
 * - Life-Safety Boundary Banner
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DroneFaultRecoveryManager } from '../fault/DroneFaultRecoveryManager';
import {
  DroneFaultRecord,
  DroneFaultCategory,
  DroneFaultSeverity,
  FaultMetricsSummary,
  FAULT_LIFE_SAFETY_POLICY,
} from '../fault/droneFault.types';

interface DroneFaultRecoveryHUDProps {
  onClose?: () => void;
}

export const DroneFaultRecoveryHUD: React.FC<DroneFaultRecoveryHUDProps> = ({ onClose }) => {
  const manager = DroneFaultRecoveryManager.getInstance();

  const [activeFaults, setActiveFaults] = useState<DroneFaultRecord[]>([]);
  const [historyFaults, setHistoryFaults] = useState<DroneFaultRecord[]>([]);
  const [metrics, setMetrics] = useState<FaultMetricsSummary>(manager.getFaultMetrics());
  const [selectedDroneFilter, setSelectedDroneFilter] = useState<string>('ALL');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    faultId: string;
    action: 'ACKNOWLEDGE' | 'RETRY' | 'FORCE_RTB' | 'REPLACE';
    title: string;
    message: string;
  }>({
    isOpen: false,
    faultId: '',
    action: 'ACKNOWLEDGE',
    title: '',
    message: '',
  });

  useEffect(() => {
    const updateData = () => {
      setActiveFaults(manager.getDetector().getActiveFaults());
      setHistoryFaults(manager.getDetector().getFaultHistory());
      setMetrics(manager.getFaultMetrics());
    };

    updateData();
    const unsubscribe = manager.subscribe(updateData);
    const interval = setInterval(updateData, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [manager]);

  // Filter faults
  const filteredFaults = (activeTab === 'ACTIVE' ? activeFaults : historyFaults).filter((fault) => {
    if (selectedDroneFilter !== 'ALL' && fault.droneId !== selectedDroneFilter) return false;
    if (selectedSeverityFilter !== 'ALL' && fault.severity !== selectedSeverityFilter) return false;
    return true;
  });

  const getSeverityBadgeClass = (severity: DroneFaultSeverity) => {
    switch (severity) {
      case 'CRITICAL':
      case 'FATAL':
        return 'bg-red-500/20 text-red-300 border border-red-500/50';
      case 'WARNING':
        return 'bg-amber-500/20 text-amber-300 border border-amber-500/50';
      case 'INFO':
      default:
        return 'bg-blue-500/20 text-blue-300 border border-blue-500/50';
    }
  };

  const getCategoryIcon = (category: DroneFaultCategory) => {
    switch (category) {
      case 'LOW_BATTERY':
      case 'CRITICAL_BATTERY':
      case 'MISSING_BATTERY_DATA':
        return '⚡';
      case 'COMMUNICATION_LOST':
      case 'STALE_TELEMETRY':
        return '📡';
      case 'INVALID_COORDINATES':
        return '📍';
      case 'MISSION_EXECUTION_FAILURE':
      case 'MOVEMENT_NAVIGATION_ERROR':
        return '⚠️';
      case 'DRONE_OFFLINE':
        return '🛑';
      default:
        return '🔍';
    }
  };

  const handleExecuteConfirmedAction = () => {
    const { faultId, action } = confirmModal;
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

    switch (action) {
      case 'ACKNOWLEDGE':
        manager.acknowledgeFault(faultId, 'COMMAND_OPERATOR');
        break;
      case 'RETRY':
        manager.retryRecovery(faultId, 'COMMAND_OPERATOR');
        break;
      case 'FORCE_RTB':
        manager.forceReturnToBase(faultId, 'COMMAND_OPERATOR');
        break;
      case 'REPLACE':
        manager.requestReplacementDrone(faultId, 'COMMAND_OPERATOR');
        break;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100 font-sans">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <h2 className="text-lg font-bold tracking-wide text-white flex items-center gap-2">
                TIDES Fleet Resilience & Fault Management
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/60 text-cyan-300 border border-cyan-700/50">
                  Phase 12
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Centralized fault lifecycle, uncertainty auditing, autonomous RTB, and multi-asset escalation
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium transition"
            >
              ✕ Close
            </button>
          )}
        </div>

        {/* Life-Safety Policy Alert */}
        <div className="bg-cyan-950/40 border-b border-cyan-800/40 px-6 py-2.5 flex items-center justify-between text-xs text-cyan-200">
          <div className="flex items-center space-x-2">
            <span className="text-cyan-400 font-bold">ℹ️ SAFETY POLICY:</span>
            <span>
              Acknowledge logs operator awareness without clearing physical faults. Active distress incidents remain open and escalate to surface lifesavers (LG-01 / RB-01).
            </span>
          </div>
          <span className="text-cyan-400/80 font-mono text-[10px] hidden md:inline">
            ZERO-TELEPORTATION ACTIVE
          </span>
        </div>

        {/* Live KPI Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 p-4 bg-slate-900/80 border-b border-slate-800">
          <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Active Faults</div>
            <div className="text-xl font-bold text-amber-400 mt-0.5">{metrics.activeFaultsCount}</div>
          </div>
          <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Critical Alerts</div>
            <div className="text-xl font-bold text-red-400 mt-0.5">{metrics.criticalFaultsCount}</div>
          </div>
          <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Comms Lost</div>
            <div className="text-xl font-bold text-orange-400 mt-0.5">{metrics.communicationLostCount}</div>
          </div>
          <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Low Battery</div>
            <div className="text-xl font-bold text-yellow-400 mt-0.5">{metrics.lowBatteryCount}</div>
          </div>
          <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Replacements</div>
            <div className="text-xl font-bold text-cyan-400 mt-0.5">{metrics.replacementsDispatchedCount}</div>
          </div>
          <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Resolved Today</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">{metrics.resolvedFaultsCount}</div>
          </div>
        </div>

        {/* Filter Controls & Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-slate-950/60 border-b border-slate-800 text-xs">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'ACTIVE'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Active Faults ({activeFaults.length})
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'HISTORY'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Fault History ({historyFaults.length})
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Drone:</span>
              <select
                value={selectedDroneFilter}
                onChange={(e) => setSelectedDroneFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Drones</option>
                <option value="DRONE-01">DRONE-01 (Surveillance)</option>
                <option value="DRONE-02">DRONE-02 (Rescue)</option>
                <option value="DRONE-03">DRONE-03 (Multi-Role)</option>
                <option value="DRONE-04">DRONE-04 (Standby)</option>
              </select>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Severity:</span>
              <select
                value={selectedSeverityFilter}
                onChange={(e) => setSelectedSeverityFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="WARNING">Warning</option>
                <option value="INFO">Info</option>
              </select>
            </div>
          </div>
        </div>

        {/* Faults Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredFaults.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <span className="text-4xl block mb-2">✅</span>
              <div className="text-sm font-semibold text-slate-400">No operational faults recorded</div>
              <div className="text-xs text-slate-500 mt-1">
                All coastal drone telemetry links, batteries, and missions operating within safety envelopes.
              </div>
            </div>
          ) : (
            filteredFaults.map((fault) => (
              <div
                key={fault.faultId}
                className="bg-slate-800/60 border border-slate-700/80 rounded-lg p-4 transition hover:border-slate-600 space-y-3"
              >
                {/* Fault Summary Line */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-lg">{getCategoryIcon(fault.category)}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${getSeverityBadgeClass(fault.severity)}`}>
                      {fault.severity}
                    </span>
                    <span className="text-sm font-bold text-white tracking-wide">
                      {fault.category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                      {fault.droneId}
                    </span>
                    {fault.relatedIncidentId && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800/50 font-mono">
                        Incident: {fault.relatedIncidentId}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-slate-400">Status:</span>
                    <span className="font-semibold px-2 py-0.5 rounded bg-slate-700/80 text-slate-200">
                      {fault.status}
                    </span>
                    {fault.operatorAcknowledged && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
                        ✓ Acknowledged
                      </span>
                    )}
                  </div>
                </div>

                {/* Diagnostics & Position Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block mb-1">Diagnostic Log:</span>
                    <p className="text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-800">
                      {fault.diagnostics}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block mb-1">Spatial Uncertainty & Telemetry:</span>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Position Validity:</span>
                        {fault.isPositionUncertain ? (
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            ⚠️ UNCERTAIN (Last-Known Preserved)
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-semibold">✓ Verified Live</span>
                        )}
                      </div>
                      {fault.lastKnownValidPosition3D && (
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span>Last Known Coords:</span>
                          <span>
                            [{fault.lastKnownValidPosition3D.x.toFixed(1)}, {fault.lastKnownValidPosition3D.y.toFixed(1)}, {fault.lastKnownValidPosition3D.z.toFixed(1)}]
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Recovery Action:</span>
                        <span className="font-semibold text-cyan-300">
                          {fault.recoveryAction || 'Evaluating...'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Replacement & Escalation Tracker (if applicable) */}
                {fault.replacementRequested && (
                  <div className="bg-cyan-950/30 border border-cyan-800/40 p-2.5 rounded text-xs flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-cyan-400">🔄 REPLACEMENT STATUS:</span>
                      {fault.replacementDroneId ? (
                        <span className="text-emerald-300 font-semibold">
                          Dispatched Replacement Asset: {fault.replacementDroneId}
                        </span>
                      ) : (
                        <span className="text-amber-300 font-semibold">
                          No Aerial Drones Available — Escalated to Surface Lifesavers (LG-01 / RB-01)
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">
                      Incident {fault.relatedIncidentId} Protected
                    </span>
                  </div>
                )}

                {/* Operator Actions Bar */}
                {activeTab === 'ACTIVE' && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-700/60">
                    <span className="text-[11px] text-slate-400">
                      Detected: {new Date(fault.detectedTimestampMs).toLocaleTimeString()} | Retries: {fault.retryCount}/{fault.maxRetries}
                    </span>

                    <div className="flex items-center space-x-2">
                      {!fault.operatorAcknowledged && (
                        <button
                          onClick={() =>
                            setConfirmModal({
                              isOpen: true,
                              faultId: fault.faultId,
                              action: 'ACKNOWLEDGE',
                              title: 'Acknowledge Operational Fault',
                              message: `Log operator awareness for ${fault.category} on ${fault.droneId}. Physical fault remains active until verified recovery.`,
                            })
                          }
                          className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition"
                        >
                          Acknowledge
                        </button>
                      )}

                      {fault.recoveryAction === 'RETRY_OPERATION' && fault.retryCount < fault.maxRetries && (
                        <button
                          onClick={() =>
                            setConfirmModal({
                              isOpen: true,
                              faultId: fault.faultId,
                              action: 'RETRY',
                              title: 'Retry Recovery Operation',
                              message: `Attempt bounded waypoint or kinematic retry for ${fault.droneId} (Retry ${fault.retryCount + 1}/${fault.maxRetries}).`,
                            })
                          }
                          className="px-2.5 py-1 rounded bg-amber-600/80 hover:bg-amber-600 text-white text-xs font-semibold transition"
                        >
                          Retry Operation
                        </button>
                      )}

                      <button
                        onClick={() =>
                          setConfirmModal({
                            isOpen: true,
                            faultId: fault.faultId,
                            action: 'FORCE_RTB',
                            title: 'Command Return-to-Base (RTB)',
                            message: `Command ${fault.droneId} to abort current route and return immediately to its home launch pad.`,
                          })
                        }
                        className="px-2.5 py-1 rounded bg-cyan-600/80 hover:bg-cyan-600 text-white text-xs font-semibold transition"
                      >
                        Force RTB
                      </button>

                      {fault.relatedIncidentId && !fault.replacementDroneId && (
                        <button
                          onClick={() =>
                            setConfirmModal({
                              isOpen: true,
                              faultId: fault.faultId,
                              action: 'REPLACE',
                              title: 'Request Replacement Drone',
                              message: `Dispatch an alternate eligible drone to take over incident ${fault.relatedIncidentId}, or escalate to surface lifesavers if none available.`,
                            })
                          }
                          className="px-2.5 py-1 rounded bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold transition"
                        >
                          Request Replacement
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Confirmation Modal */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>⚠️</span> {confirmModal.title}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteConfirmedAction}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition shadow-md"
                >
                  Confirm & Execute
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

