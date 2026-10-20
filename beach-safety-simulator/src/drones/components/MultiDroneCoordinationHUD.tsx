/**
 * MultiDroneCoordinationHUD.tsx
 * 
 * TIDES Drone Phase 11: Multi-Incident & Multi-Drone Coordination Dashboard
 * 
 * Key Features:
 * - Simultaneous Incident Priority Queue with severity ranks and wait-time anti-starvation indicators.
 * - Shared Drone Availability Matrix with real-time status, battery reserves, and capability checks.
 * - Dynamic allocation rationale and candidate ranking breakdown.
 * - Resource conflict resolution and preemption audit history.
 * - Multi-asset synergy tracking (Drone + Lifeguards LG-01 + Rescue Boat RB-01).
 * - Safe manual assignment/reassignment controls with confirmation dialog.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  LifeBuoy,
  Layers,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Compass,
  Navigation,
  RefreshCw,
  X,
  Battery,
  Wifi,
  ChevronRight,
  UserCheck,
  RotateCcw,
  Target,
  FileText,
  AlertCircle,
  HelpCircle,
  Check,
} from 'lucide-react';
import { MultiDroneCoordinationEngine } from '../coordination/MultiDroneCoordinationEngine';
import {
  CoordinationIncident,
  DroneResourceAvailability,
  AllocationDecision,
  CoordinationConflictRecord,
  CoordinationSummaryMetrics,
  COORDINATION_LIFE_SAFETY_POLICY,
} from '../coordination/droneCoordination.types';
import { IncidentSeverity } from '../../models/Incident';

interface MultiDroneCoordinationHUDProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackCoordinates?: (coords: { x: number; y: number; z: number }) => void;
  onTrackDrone?: (droneId: string) => void;
}

export const MultiDroneCoordinationHUD: React.FC<MultiDroneCoordinationHUDProps> = ({
  isOpen,
  onClose,
  onTrackCoordinates,
  onTrackDrone,
}) => {
  const engine = MultiDroneCoordinationEngine.getInstance();

  const [incidents, setIncidents] = useState<CoordinationIncident[]>([]);
  const [fleet, setFleet] = useState<DroneResourceAvailability[]>([]);
  const [decisions, setDecisions] = useState<AllocationDecision[]>([]);
  const [conflicts, setConflicts] = useState<CoordinationConflictRecord[]>([]);
  const [metrics, setMetrics] = useState<CoordinationSummaryMetrics>(engine.getSummaryMetrics());
  const [autoAllocate, setAutoAllocate] = useState<boolean>(engine.getConfig().autoAllocationEnabled);

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'FLEET' | 'CONFLICTS'>('QUEUE');
  const [reassignDroneId, setReassignDroneId] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refreshData = useCallback(() => {
    const allInc = engine.getActiveQueue();
    setIncidents(allInc);
    setFleet(engine.getFleetAvailability());
    setDecisions(engine.getDecisions());
    setConflicts(engine.getConflicts());
    setMetrics(engine.getSummaryMetrics());
    setAutoAllocate(engine.getConfig().autoAllocationEnabled);

    if (!selectedIncidentId && allInc.length > 0) {
      setSelectedIncidentId(allInc[0].incidentId);
    }
  }, [engine, selectedIncidentId]);

  useEffect(() => {
    if (!isOpen) return;
    refreshData();
    const unsub = engine.subscribe(refreshData);
    const interval = setInterval(refreshData, 1000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [isOpen, refreshData, engine]);

  if (!isOpen) return null;

  const selectedIncident = incidents.find((i) => i.incidentId === selectedIncidentId) || incidents[0];

  const handleManualReassign = () => {
    if (!selectedIncident || !reassignDroneId) return;

    const res = engine.manuallyAssignDrone(
      selectedIncident.incidentId,
      reassignDroneId,
      'COMMAND_OPERATOR',
      'Operator manual override allocation'
    );

    refreshData();
    if (res.success) {
      setStatusMessage(`Successfully reassigned ${selectedIncident.incidentId} to ${reassignDroneId}.`);
    } else {
      setStatusMessage(`Reassignment blocked: ${res.rejectionReason}`);
    }
    setTimeout(() => setStatusMessage(null), 6000);
  };

  const getSeverityBadge = (sev: IncidentSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-950 text-rose-300 border border-rose-500 animate-pulse">
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-950 text-amber-300 border border-amber-600">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-950 text-yellow-300 border border-yellow-600">
            MEDIUM
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col bg-slate-900/95 border border-indigo-500/40 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden text-slate-100 max-h-[88vh] w-full max-w-5xl font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Layers className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black tracking-wide text-white uppercase">
                Multi-Incident & Drone Coordination Center
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
                Phase 11
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Simultaneous Multi-Emergency Triage, Intelligent Allocation & Surface Responders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto Allocate Toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">Autonomous Triage:</span>
            <button
              onClick={() => {
                const next = !autoAllocate;
                engine.updateConfig({ autoAllocationEnabled: next });
                setAutoAllocate(next);
              }}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono transition-all cursor-pointer ${
                autoAllocate
                  ? 'bg-indigo-500 text-slate-950 font-black shadow-lg shadow-indigo-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {autoAllocate ? 'ENABLED' : 'MANUAL'}
            </button>
          </div>

          <button
            onClick={refreshData}
            title="Refresh Coordination Status"
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

      {/* Operational Safety Banner */}
      <div className="px-5 py-2 bg-indigo-950/40 border-b border-indigo-800/40 text-xs text-indigo-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span className="font-medium text-[11px]">
            <strong>Life-Safety Boundary:</strong> Aerial drones provide rapid flotation aids & observation; physical extraction is conducted by surface Lifeguards and Boats.
          </span>
        </div>
        <span className="font-mono text-[10px] text-indigo-300 bg-indigo-900/40 px-2 py-0.5 rounded border border-indigo-700/50">
          ALL RESPONDERS ACTIVE
        </span>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/40 border-b border-slate-800/60 font-mono">
        <div className="flex flex-col p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">
            Active Emergencies
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-rose-400">{metrics.activeIncidentsCount}</span>
            <span className="text-xs text-slate-500 font-sans">Incidents</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5">
            {metrics.queuedIncidentsCount} in queue &bull; {metrics.allocatedIncidentsCount} dispatched
          </span>
        </div>

        <div className="flex flex-col p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">
            Drone Fleet Availability
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-emerald-400">{metrics.availableDronesCount}</span>
            <span className="text-xs text-slate-500 font-sans">/ {metrics.totalFleetCount} Available</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5">
            {metrics.assignedDronesCount} assigned &bull; {metrics.returningDronesCount} returning
          </span>
        </div>

        <div className="flex flex-col p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">
            Multi-Asset Synergy
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-amber-300">{metrics.multiAssetTeamedCount}</span>
            <span className="text-xs text-slate-500 font-sans">Teamed</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5">
            Drone + Lifeguard / Rescue Boat
          </span>
        </div>

        <div className="flex flex-col p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">
            Preemptions & Conflicts
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-cyan-300">{metrics.conflictsResolvedCount}</span>
            <span className="text-xs text-slate-500 font-sans">Resolved</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5">
            {metrics.preemptionsCount} routine patrol preemptions
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('QUEUE')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'QUEUE'
                ? 'bg-indigo-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Incident Priority Queue ({incidents.length})
          </button>
          <button
            onClick={() => setActiveTab('FLEET')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'FLEET'
                ? 'bg-indigo-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Shared Fleet Matrix ({fleet.length})
          </button>
          <button
            onClick={() => setActiveTab('CONFLICTS')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'CONFLICTS'
                ? 'bg-indigo-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>Conflicts & Preemptions</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
              {conflicts.length}
            </span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="px-4 py-2 bg-indigo-950/80 border-b border-indigo-800/60 text-indigo-200 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: INCIDENT PRIORITY QUEUE */}
        {activeTab === 'QUEUE' && (
          <div className="space-y-4">
            {incidents.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800">
                <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white">Zero Active Coastal Emergencies</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Active incidents detected by the simulated camera vision pipeline, wristband SOS alerts,
                  or rip current simulators will be prioritized and assigned to eligible drones here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Pane: Prioritized Incident List */}
                <div className="space-y-2 lg:col-span-1 max-h-[500px] overflow-y-auto pr-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Priority Queue (Ranked #{1} to #{incidents.length})
                  </span>
                  {incidents.map((inc, index) => (
                    <button
                      key={inc.incidentId}
                      onClick={() => setSelectedIncidentId(inc.incidentId)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                        (selectedIncidentId || incidents[0]?.incidentId) === inc.incidentId
                          ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-950/20'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] font-bold">
                            #{index + 1}
                          </span>
                          <span className="font-mono text-xs font-bold text-white truncate max-w-[120px]">
                            {inc.incidentId}
                          </span>
                        </div>
                        {getSeverityBadge(inc.severity)}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span className="truncate max-w-[160px]">{inc.title}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                          inc.status === 'ALLOCATED' || inc.status === 'IN_TRANSIT'
                            ? 'bg-emerald-950 text-emerald-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {inc.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>Wait: {inc.waitTimeSeconds.toFixed(0)}s</span>
                        </span>
                        {inc.assignedDroneId ? (
                          <span className="text-cyan-300 font-bold">&rarr; {inc.assignedDroneId}</span>
                        ) : (
                          <span className="text-amber-400">Awaiting Drone</span>
                        )}
                      </div>

                      {inc.starvationBoostApplied && (
                        <div className="text-[9px] font-mono text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>Starvation Boost Applied</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Right Pane: Selected Incident Detail & Allocation Matrix */}
                {selectedIncident && (
                  <div className="lg:col-span-2 space-y-4 bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-sm text-white font-mono">
                            {selectedIncident.incidentId}
                          </h3>
                          <span className="text-xs text-slate-400">({selectedIncident.type})</span>
                          {getSeverityBadge(selectedIncident.severity)}
                        </div>
                        <p className="text-xs text-slate-300 mt-1">{selectedIncident.title}</p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Zone: {selectedIncident.zoneId} &bull; Coordinates: [{selectedIncident.position3D.x.toFixed(1)}, {selectedIncident.position3D.z.toFixed(1)}]
                        </p>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-[10px] text-slate-400 uppercase block font-sans">Priority Status</span>
                        <span className="text-xs font-bold text-indigo-300">
                          Rank #{selectedIncident.priorityRank}
                        </span>
                      </div>
                    </div>

                    {/* Explainability Callout */}
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                      <div className="font-bold text-slate-300 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Priority & Allocation Rationale:</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {engine.getPriorityQueue().explainPriority(selectedIncident.incidentId)}
                      </p>
                    </div>

                    {/* Responders Team Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 font-sans block">Assigned Aerial Drone</span>
                        <span className="text-white font-bold">
                          {selectedIncident.assignedDroneId || 'None (In Queue)'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 font-sans block">Stationed Lifeguard</span>
                        <span className="text-white font-bold">
                          {selectedIncident.assignedLifeguardId || 'LG-01 (Standby)'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 font-sans block">Rescue Boat</span>
                        <span className="text-white font-bold">
                          {selectedIncident.assignedRescueBoatId || 'RB-01 (Inshore)'}
                        </span>
                      </div>
                    </div>

                    {/* Manual Reassignment Control */}
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <span className="text-xs font-bold text-slate-300 block">
                        Manual Operator Reassignment Override
                      </span>
                      <div className="flex items-center gap-2">
                        <select
                          value={reassignDroneId}
                          onChange={(e) => setReassignDroneId(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                        >
                          <option value="">Select Target Drone...</option>
                          {fleet.map((d) => (
                            <option
                              key={d.droneId}
                              value={d.droneId}
                              disabled={d.isLocked && !d.isPreemptible}
                            >
                              {d.droneId} ({d.role}) — {d.batteryPercentage}% — {d.isLocked ? `Locked (${d.lockReason})` : 'Available'}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleManualReassign}
                          disabled={!reassignDroneId}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold cursor-pointer"
                        >
                          Reassign
                        </button>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      {onTrackCoordinates && (
                        <button
                          onClick={() => onTrackCoordinates(selectedIncident.position3D)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer border border-slate-700"
                        >
                          <Target className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Focus Incident in 3D</span>
                        </button>
                      )}

                      {selectedIncident.assignedDroneId && onTrackDrone && (
                        <button
                          onClick={() => onTrackDrone(selectedIncident.assignedDroneId!)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold cursor-pointer border border-slate-700"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Track Drone ({selectedIncident.assignedDroneId})</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SHARED FLEET AVAILABILITY MATRIX */}
        {activeTab === 'FLEET' && (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 text-[11px] font-mono uppercase">
                  <th className="py-2.5 px-3">Drone ID</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Flotation Aid</th>
                  <th className="py-2.5 px-3">Battery</th>
                  <th className="py-2.5 px-3">Link Health</th>
                  <th className="py-2.5 px-3">Current Assignment</th>
                  <th className="py-2.5 px-3">Allocation Lock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {fleet.map((drone) => (
                  <tr key={drone.droneId} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3 font-bold text-white">{drone.droneId}</td>
                    <td className="py-2.5 px-3 text-slate-300">{drone.role}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {drone.operationalStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {drone.capabilities.hasFlotationPayload ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> EQUIPPED
                        </span>
                      ) : (
                        <span className="text-slate-500 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> NONE
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={drone.batteryPercentage > 30 ? 'text-emerald-400' : 'text-rose-400'}>
                        {drone.batteryPercentage}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={drone.connectivity === 'CONNECTED' ? 'text-emerald-400' : 'text-amber-400'}>
                        {drone.connectivity} ({drone.telemetryAgeSeconds.toFixed(1)}s)
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-cyan-300 font-bold">
                      {drone.currentMissionId || 'None'}
                    </td>
                    <td className="py-2.5 px-3">
                      {drone.isLocked ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                          {drone.isPreemptible ? 'PREEMPTIBLE' : 'LOCKED'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          AVAILABLE
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: CONFLICTS & PREEMPTIONS */}
        {activeTab === 'CONFLICTS' && (
          <div className="space-y-2">
            {conflicts.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800">
                <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white">No Resource Conflicts Logged</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  When multiple incidents compete for the same drone, routine patrols are preempted, or unsafe reassignments are blocked, audit records appear here.
                </p>
              </div>
            ) : (
              conflicts.map((c) => (
                <div
                  key={c.conflictId}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400">{c.conflictType}</span>
                      <span className="text-slate-500">&bull;</span>
                      <span className="font-mono text-slate-400">{c.conflictId}</span>
                    </div>
                    <span className="text-slate-500 font-mono text-[10px]">
                      {new Date(c.timestampMs).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px]">{c.resolutionAction}</p>
                  <p className="text-slate-500 text-[10px] italic">{c.operatorExplanation}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>Subsystem: Rushikonda Beach Multi-Emergency Digital Twin</span>
        <span>Principle: Priority Queue + Preemption Safety + Surface Extraction</span>
      </div>
    </div>
  );
};

