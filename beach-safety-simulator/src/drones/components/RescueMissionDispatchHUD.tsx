/**
 * RescueMissionDispatchHUD.tsx
 * 
 * TIDES Drone Phase 9: Rescue Mission Allocation & Dispatch Dashboard
 * 
 * Key Features:
 * - Real-time incident-to-resource coordination view.
 * - Displays eligible incidents with severity, position, and status.
 * - Drone capability checklist verification (flotation payload, battery reserve, connectivity).
 * - Human operator authorization controls (Approve, Reject, Recall, and Auto-Dispatch toggle).
 * - Multi-asset lifesaver coordination awareness (Drone + Lifeguards + Rescue Boats).
 * - Immutable chronological dispatch audit trail.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LifeBuoy,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Battery,
  Wifi,
  Navigation,
  Compass,
  Layers,
  RefreshCw,
  X,
  Play,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  UserCheck,
  Send,
  Activity,
  Eye,
  Target,
  Package,
  MapPin,
  Check,
} from 'lucide-react';
import { DroneRescueDispatchManager } from '../rescue/DroneRescueDispatchManager';
import { DroneRescueAuditLogger } from '../rescue/DroneRescueAuditLogger';
import { DroneRegistry } from '../foundation/DroneRegistry';
import { IncidentManager } from '../../visitors/incidents/IncidentManager';
import {
  RescueDroneAssignment,
  RescueAssignmentStatus,
  RescueDispatchAuditEvent,
} from '../rescue/droneRescue.types';
import { DroneRescueExecutionManager } from '../rescue/execution/DroneRescueExecutionManager';
import {
  RescueExecutionDossier,
  RescueExecutionStage,
  ObservationOutcome,
  RESCUE_EXECUTION_SAFETY_NOTICE,
} from '../rescue/execution/droneRescueExecution.types';

interface RescueMissionDispatchHUDProps {
  onClose: () => void;
  onTrackDrone?: (droneId: string) => void;
}

export const RescueMissionDispatchHUD: React.FC<RescueMissionDispatchHUDProps> = ({
  onClose,
  onTrackDrone,
}) => {
  const dispatchManager = DroneRescueDispatchManager.getInstance();
  const executionManager = DroneRescueExecutionManager.getInstance();
  const auditLogger = DroneRescueAuditLogger.getInstance();
  const droneRegistry = DroneRegistry.getInstance();
  const incidentManager = IncidentManager.getInstance();

  const [assignments, setAssignments] = useState<RescueDroneAssignment[]>([]);
  const [dossiers, setDossiers] = useState<RescueExecutionDossier[]>([]);
  const [events, setEvents] = useState<RescueDispatchAuditEvent[]>([]);
  const [autoDispatch, setAutoDispatch] = useState<boolean>(dispatchManager.getAutoDispatch());
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'DISPATCH' | 'EXECUTION' | 'FLEET' | 'AUDIT'>('DISPATCH');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refreshData = useCallback(() => {
    const allAsgs = dispatchManager.getAllAssignments();
    setAssignments(allAsgs);
    setEvents(auditLogger.getAllEvents());
    setAutoDispatch(dispatchManager.getAutoDispatch());

    const allDossiers = executionManager.getAllExecutions();
    setDossiers(allDossiers);

    if (!selectedAssignmentId && allAsgs.length > 0) {
      setSelectedAssignmentId(allAsgs[0].assignmentId);
    }
    if (!selectedExecutionId && allDossiers.length > 0) {
      setSelectedExecutionId(allDossiers[0].executionId);
    }
  }, [dispatchManager, auditLogger, executionManager, selectedAssignmentId, selectedExecutionId]);

  useEffect(() => {
    refreshData();
    const unsubDispatch = dispatchManager.subscribe(refreshData);
    const unsubAudit = auditLogger.subscribe(refreshData);
    const unsubExec = executionManager.subscribe(refreshData);
    const interval = setInterval(refreshData, 1000);
    return () => {
      unsubDispatch();
      unsubAudit();
      unsubExec();
      clearInterval(interval);
    };
  }, [refreshData, dispatchManager, auditLogger, executionManager]);

  // Handle manual approval
  const handleApprove = (asgId: string) => {
    const res = dispatchManager.approveAndDispatch(asgId, 'OPERATOR-MANUAL', 'Authorized by Command Operator');
    refreshData();
    if (res.success) {
      setStatusMessage(`Assignment ${asgId} approved and rescue drone launched.`);
    } else {
      setStatusMessage(`Dispatch failed: ${res.errors.join('; ')}`);
    }
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Handle manual rejection
  const handleReject = (asgId: string) => {
    dispatchManager.rejectAssignment(asgId, 'OPERATOR-MANUAL', 'Declined by Command Operator');
    refreshData();
    setStatusMessage(`Assignment ${asgId} rejected.`);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Handle mission cancellation / recall
  const handleRecall = (asgId: string) => {
    dispatchManager.cancelAssignment(asgId, 'OPERATOR-MANUAL', 'Recalled by Command Operator');
    refreshData();
    setStatusMessage(`Rescue drone recalled for assignment ${asgId}.`);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const selectedAssignment = assignments.find((a) => a.assignmentId === selectedAssignmentId) || assignments[0];

  const getStatusBadge = (status: RescueAssignmentStatus) => {
    switch (status) {
      case 'EN_ROUTE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/80 text-amber-400 border border-amber-500/50 animate-pulse">
            <Navigation className="w-3 h-3" />
            EN ROUTE
          </span>
        );
      case 'ASSISTING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-950/80 text-rose-400 border border-rose-500/50 animate-bounce">
            <LifeBuoy className="w-3 h-3" />
            ASSISTING (DROP)
          </span>
        );
      case 'RETURNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-500/50">
            <RotateCcw className="w-3 h-3" />
            RETURNING
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/50">
            <CheckCircle2 className="w-3 h-3" />
            COMPLETED
          </span>
        );
      case 'PROPOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-950/80 text-purple-300 border border-purple-500/50">
            <UserCheck className="w-3 h-3" />
            AWAITING APPROVAL
          </span>
        );
      case 'REJECTED':
      case 'FAILED':
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-950/80 text-red-400 border border-red-500/50">
            <XCircle className="w-3 h-3" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-600">
            {status}
          </span>
        );
    }
  };

  const getStageBadge = (stage: RescueExecutionStage) => {
    switch (stage) {
      case 'APPROACHING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-500/50 animate-pulse">
            <Navigation className="w-3 h-3" /> APPROACHING
          </span>
        );
      case 'SEARCHING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-950/80 text-yellow-300 border border-yellow-500/50 animate-pulse">
            <Compass className="w-3 h-3" /> SEARCHING
          </span>
        );
      case 'OBSERVING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-950/80 text-sky-300 border border-sky-500/50">
            <Eye className="w-3 h-3" /> OBSERVING
          </span>
        );
      case 'ASSISTANCE_PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-500/50">
            <Package className="w-3 h-3" /> ARMED
          </span>
        );
      case 'ASSISTANCE_IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/50 animate-bounce">
            <LifeBuoy className="w-3 h-3" /> DROPPING AID
          </span>
        );
      case 'ASSISTANCE_REPORTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/50">
            <CheckCircle2 className="w-3 h-3" /> DELIVERED
          </span>
        );
      case 'RETURNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/50">
            <RotateCcw className="w-3 h-3" /> RETURNING
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-600">
            <CheckCircle2 className="w-3 h-3" /> COMPLETED
          </span>
        );
      case 'CANCELLED':
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950/80 text-red-400 border border-red-500/50">
            <XCircle className="w-3 h-3" /> {stage}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-600">
            {stage}
          </span>
        );
    }
  };

  const allDrones = droneRegistry.getAllDrones();

  return (
    <div className="flex flex-col bg-slate-900/95 border border-rose-500/40 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden text-slate-100 max-h-[85vh] w-full max-w-4xl font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <LifeBuoy className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black tracking-wide text-white uppercase">
                Rescue Drone Dispatch & Mission Execution
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                Phase 9 & 10
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Coordinated Aerial Flotation Payload Delivery & Lifesaver Support
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto Dispatch Toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">Auto-Dispatch:</span>
            <button
              onClick={() => {
                const next = !autoDispatch;
                dispatchManager.setAutoDispatch(next);
                setAutoDispatch(next);
              }}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono transition-all cursor-pointer ${
                autoDispatch
                  ? 'bg-rose-500 text-slate-950 font-black shadow-lg shadow-rose-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {autoDispatch ? 'ENABLED' : 'MANUAL'}
            </button>
          </div>

          <button
            onClick={refreshData}
            title="Refresh Fleet Status"
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

      {/* Safety Notice Ribbon */}
      <div className="px-5 py-2 bg-rose-950/50 border-b border-rose-800/40 text-xs text-rose-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span className="font-medium text-[11px]">
            <strong>Safety Constraint:</strong> Aerial rescue drones deliver buoyant flotation aids;
            physical swimmer recovery is completed by stationed lifeguards and rescue boats.
          </span>
        </div>
        <span className="font-mono text-[10px] text-rose-300 bg-rose-900/40 px-2 py-0.5 rounded border border-rose-700/50">
          DRONE-02 PRESERVED
        </span>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/40 border-b border-slate-800/60 font-mono">
        <div className="flex flex-col p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">
            Active Rescue Missions
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-rose-400">
              {assignments.filter((a) => a.status === 'EN_ROUTE' || a.status === 'ASSISTING').length}
            </span>
            <span className="text-xs text-slate-500 font-sans">In Flight</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5">
            {assignments.filter((a) => a.status === 'PROPOSED').length} pending approval
          </span>
        </div>

        <div className="flex flex-col p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">
            Flotation Drone Ready
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-emerald-400">
              {allDrones.filter((d) => d.capabilities?.hasFlotationPayload && d.status !== 'OFFLINE').length}
            </span>
            <span className="text-xs text-slate-500 font-sans">Asset(s)</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5">
            DRONE-02 (Hexacopter Pod)
          </span>
        </div>

        <div className="flex flex-col p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">
            Completed Rescues
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-cyan-300">
              {assignments.filter((a) => a.status === 'COMPLETED').length}
            </span>
            <span className="text-xs text-slate-500 font-sans">Deliveries</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5">
            Flotation aid deployed
          </span>
        </div>

        <div className="flex flex-col p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">
            Multi-Asset Synergy
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-amber-300">
              {assignments.filter((a) => a.collaborativeResponders.lifeguardId || a.collaborativeResponders.rescueBoatId).length}
            </span>
            <span className="text-xs text-slate-500 font-sans">Teamed</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5">
            Drone + Boat/Lifeguard
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('DISPATCH')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'DISPATCH'
                ? 'bg-rose-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Incident Allocations ({assignments.length})
          </button>
          <button
            onClick={() => setActiveTab('EXECUTION')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'EXECUTION'
                ? 'bg-rose-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Live Mission Execution</span>
            {dossiers.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'EXECUTION'
                  ? 'bg-slate-950 text-rose-300 font-bold'
                  : 'bg-rose-950 text-rose-300 border border-rose-500/40'
              }`}>
                {dossiers.filter((d) => d.stage !== 'COMPLETED' && d.stage !== 'CANCELLED' && d.stage !== 'FAILED').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('FLEET')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'FLEET'
                ? 'bg-rose-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Rescue Capability Matrix
          </button>
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'AUDIT'
                ? 'bg-rose-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>Dispatch Audit Log</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
              {events.length}
            </span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="px-4 py-2 bg-rose-950/80 border-b border-rose-800/60 text-rose-200 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: INCIDENT DISPATCH */}
        {activeTab === 'DISPATCH' && (
          <div className="space-y-4">
            {assignments.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800">
                <LifeBuoy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white">Zero Active Rescue Dispatches</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  When a verified bather distress incident occurs or an explicit SOS is triggered,
                  the rescue allocator will automatically evaluate eligible flotation drones.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: Assignment List */}
                <div className="lg:col-span-1 space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Distress Assignments
                  </h4>
                  {assignments.map((asg) => (
                    <div
                      key={asg.assignmentId}
                      onClick={() => setSelectedAssignmentId(asg.assignmentId)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        selectedAssignment?.assignmentId === asg.assignmentId
                          ? 'bg-slate-950 border-rose-500/80 shadow-lg'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono font-bold text-rose-300">{asg.assignmentId}</span>
                        {getStatusBadge(asg.status)}
                      </div>
                      <div className="text-slate-200 font-semibold">{asg.incidentId}</div>
                      <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400 font-mono">
                        <span>Drone: {asg.assignedResourceId}</span>
                        <span>ETA: {asg.estimatedArrivalSec.toFixed(0)}s</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right: Selected Assignment Dossier */}
                {selectedAssignment && (
                  <div className="lg:col-span-2 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-sm text-white">
                            {selectedAssignment.incidentId}
                          </h3>
                          <span className="font-mono text-xs text-rose-400 font-bold">
                            ({selectedAssignment.assignmentId})
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Target: [{selectedAssignment.targetPosition3D.x.toFixed(1)}, {selectedAssignment.targetPosition3D.z.toFixed(1)}] | Dist: {selectedAssignment.distanceMeters.toFixed(0)}m
                        </p>
                      </div>
                      <div>{getStatusBadge(selectedAssignment.status)}</div>
                    </div>

                    {/* Rationale & Plan */}
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
                      <div className="font-bold text-slate-300">Allocation Rationale:</div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {selectedAssignment.rationale}
                      </p>
                    </div>

                    {/* Collaborative Multi-Asset Response */}
                    <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-300 text-[11px]">
                        <Compass className="w-3.5 h-3.5" />
                        <span>Collaborative Response Team:</span>
                      </div>
                      <p className="text-amber-200/90 text-[11px]">
                        {selectedAssignment.collaborativeResponders.coordinationNotes}
                      </p>
                    </div>

                    {/* Patrol Preemption Notice if Applicable */}
                    {selectedAssignment.patrolPreemption && (
                      <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/40 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-purple-300 text-[11px]">
                          <Layers className="w-3.5 h-3.5" />
                          <span>Surveillance Patrol Preempted:</span>
                        </div>
                        <p className="text-purple-200/90 text-[11px]">
                          {selectedAssignment.patrolPreemption.coverageImpactDescription}
                        </p>
                      </div>
                    )}

                    {/* Human Oversight Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <div className="text-[11px] font-mono text-slate-400">
                        Auth: {selectedAssignment.authorization.authorizedBy}
                      </div>

                      <div className="flex items-center gap-2">
                        {selectedAssignment.status === 'PROPOSED' && (
                          <>
                            <button
                              onClick={() => handleReject(selectedAssignment.assignmentId)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/80 text-red-300 border border-slate-700 hover:border-red-600 text-xs font-semibold cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleApprove(selectedAssignment.assignmentId)}
                              className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Approve & Dispatch Drone</span>
                            </button>
                          </>
                        )}

                        {(selectedAssignment.status === 'EN_ROUTE' || selectedAssignment.status === 'ASSISTING') && (
                          <>
                            {onTrackDrone && (
                              <button
                                onClick={() => onTrackDrone(selectedAssignment.assignedResourceId)}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold cursor-pointer"
                              >
                                Track in 3D
                              </button>
                            )}
                            <button
                              onClick={() => handleRecall(selectedAssignment.assignmentId)}
                              className="px-3 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-700 text-xs font-bold cursor-pointer"
                            >
                              Recall Drone
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: LIVE MISSION EXECUTION (PHASE 10) */}
        {activeTab === 'EXECUTION' && (
          <div className="space-y-4">
            {dossiers.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800">
                <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-pulse" />
                <h4 className="text-sm font-bold text-white">No Rescue Missions Under Execution</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  When a rescue drone is dispatched from the Incident Allocations tab (or auto-dispatched),
                  its approach flight, vicinity search, downward optical verification, and simulated flotation
                  payload delivery will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Dossier List (Left Column) */}
                <div className="space-y-2 lg:col-span-1 max-h-[500px] overflow-y-auto pr-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Active Flight Dossiers ({dossiers.length})
                  </span>
                  {dossiers.map((d) => (
                    <button
                      key={d.executionId}
                      onClick={() => setSelectedExecutionId(d.executionId)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                        (selectedExecutionId || dossiers[0]?.executionId) === d.executionId
                          ? 'bg-rose-950/40 border-rose-500/60 shadow-lg shadow-rose-950/20'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-white">{d.droneId}</span>
                        {getStageBadge(d.stage)}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>Inc: {d.incidentId}</span>
                        <span>{d.transitDistanceMeters.toFixed(0)}m dist</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                        <MapPin className="w-2.5 h-2.5" />
                        <span>[{d.targetPosition3D.x.toFixed(0)}, {d.targetPosition3D.z.toFixed(0)}]</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Dossier Detail View (Right 2 Columns) */}
                {(() => {
                  const dossier = dossiers.find((d) => d.executionId === selectedExecutionId) || dossiers[0];
                  if (!dossier) return null;

                  const stages: { stage: RescueExecutionStage; label: string }[] = [
                    { stage: 'VALIDATING', label: '1. Dest Valid' },
                    { stage: 'APPROACHING', label: '2. Approach' },
                    { stage: 'SEARCHING', label: '3. Vicinity Search' },
                    { stage: 'OBSERVING', label: '4. Optical Assess' },
                    { stage: 'ASSISTANCE_IN_PROGRESS', label: '5. Flotation Drop' },
                    { stage: 'ASSISTANCE_REPORTED', label: '6. Aid Stabilized' },
                    { stage: 'RETURNING', label: '7. RTB / Land' },
                  ];

                  const getStageOrder = (st: RescueExecutionStage) => {
                    const orderMap: Record<RescueExecutionStage, number> = {
                      ASSIGNED: 0,
                      VALIDATING: 1,
                      APPROACHING: 2,
                      SEARCHING: 3,
                      OBSERVING: 4,
                      ASSISTANCE_PENDING: 4.5,
                      ASSISTANCE_IN_PROGRESS: 5,
                      ASSISTANCE_REPORTED: 6,
                      RETURNING: 7,
                      COMPLETED: 8,
                      CANCELLED: -1,
                      FAILED: -1,
                    };
                    return orderMap[st] ?? 0;
                  };

                  const currentOrder = getStageOrder(dossier.stage);

                  return (
                    <div className="lg:col-span-2 space-y-3.5 bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                      {/* Dossier Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white font-mono">{dossier.executionId}</h3>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              Mission: {dossier.missionId}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Responding to Incident <span className="font-mono text-rose-300">{dossier.incidentId}</span> with <span className="font-bold text-white">{dossier.droneId}</span>
                          </p>
                        </div>
                        {getStageBadge(dossier.stage)}
                      </div>

                      {/* Visual Stage Stepper */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                          Mission Execution Pipeline
                        </span>
                        <div className="grid grid-cols-7 gap-1 text-center font-mono text-[9px]">
                          {stages.map((st, idx) => {
                            const stepOrder = idx + 1;
                            const isPast = currentOrder > stepOrder || dossier.stage === 'COMPLETED';
                            const isCurrent = (stepOrder === Math.floor(currentOrder));
                            return (
                              <div
                                key={st.stage}
                                className={`p-1.5 rounded flex flex-col items-center justify-center transition-all ${
                                  isCurrent
                                    ? 'bg-rose-500 text-slate-950 font-black shadow-md shadow-rose-500/30 ring-1 ring-rose-400'
                                    : isPast
                                    ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                                    : 'bg-slate-900/60 text-slate-500 border border-slate-800'
                                }`}
                              >
                                {isPast && !isCurrent ? (
                                  <Check className="w-2.5 h-2.5 mb-0.5" />
                                ) : (
                                  <span className="text-[8px] opacity-70">#{idx + 1}</span>
                                )}
                                <span className="truncate w-full">{st.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Two Metric Cards: Optical Observation & Buoyant Flotation Payload */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 1. Observation Assessment */}
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <Eye className="w-3 h-3 text-sky-400" /> Optical Assessment
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              dossier.observationOutcome === 'TARGET_OBSERVED'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                                : dossier.observationOutcome === 'TARGET_NOT_OBSERVED'
                                ? 'bg-amber-950 text-amber-300 border border-amber-600'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {dossier.observationOutcome}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between text-slate-400">
                              <span>Visual Confidence:</span>
                              <span className="font-mono text-white">{(dossier.observationConfidence * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Camera Feed:</span>
                              <span className="font-mono text-slate-300">{dossier.cameraSnapshotId || 'ACTIVE_GIMBAL_CAM'}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Hold Timer:</span>
                              <span className="font-mono text-cyan-300">{dossier.searchHoldTimerSec.toFixed(1)}s</span>
                            </div>
                          </div>
                        </div>

                        {/* 2. Flotation Payload */}
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <Package className="w-3 h-3 text-rose-400" /> Flotation Payload
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              dossier.payload?.readinessState === 'DEPLOYED'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                                : dossier.payload?.readinessState === 'DROPPING'
                                ? 'bg-rose-950 text-rose-300 border border-rose-500 animate-pulse'
                                : dossier.payload?.readinessState === 'ARMED'
                                ? 'bg-purple-950 text-purple-300 border border-purple-600'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {dossier.payload?.readinessState || 'STANDBY'}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between text-slate-400">
                              <span>Type:</span>
                              <span className="font-mono text-white">{dossier.payload?.payloadType || 'BUOYANT_RING'}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Drop Altitude:</span>
                              <span className="font-mono text-slate-300">{dossier.payload?.dropAltitudeMeters ? `${dossier.payload.dropAltitudeMeters.toFixed(1)}m AGL` : '12.0m AGL'}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Confirmation:</span>
                              <span className="font-mono text-emerald-400">{dossier.payload?.deliveryConfirmationSource || 'NONE'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Flight Dynamics & Telemetry Row */}
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-sans">Target Position</span>
                          <span className="text-white font-bold">
                            [{dossier.targetPosition3D.x.toFixed(1)}, {dossier.targetPosition3D.z.toFixed(1)}]
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-sans">Distance to Target</span>
                          <span className="text-white font-bold">{dossier.transitDistanceMeters.toFixed(1)}m</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-sans">Ground Speed</span>
                          <span className="text-cyan-300 font-bold">{dossier.groundSpeedMps.toFixed(1)} m/s</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-sans">Telemetry Age</span>
                          <span className={`font-bold ${dossier.destinationValidation.isStale ? 'text-red-400' : 'text-emerald-400'}`}>
                            {dossier.destinationValidation.freshnessSeconds.toFixed(1)}s ({dossier.destinationValidation.valid ? 'VALID' : 'STALE'})
                          </span>
                        </div>
                      </div>

                      {/* Collaborative Surface Responders Banner */}
                      <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-800/40 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <span className="text-blue-200 text-[11px]">
                            Surface Responders: Lifeguard <span className="font-mono font-bold text-white">{dossier.collaborativeResponders?.lifeguardId || 'LG-01'}</span> & Boat <span className="font-mono font-bold text-white">{dossier.collaborativeResponders?.rescueBoatId || 'RB-01'}</span> dispatched for extraction.
                          </span>
                        </div>
                      </div>

                      {/* Mandatory Life-Safety Warning Banner */}
                      <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-xs text-rose-200 space-y-1">
                        <div className="flex items-center gap-2 font-bold text-rose-300 uppercase tracking-wide text-[10px] font-mono">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Strict Operational Safety Policy</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          {dossier.safetyNotice || RESCUE_EXECUTION_SAFETY_NOTICE}
                        </p>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between pt-2">
                        {onTrackDrone && (
                          <button
                            onClick={() => onTrackDrone(dossier.droneId)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer border border-slate-700"
                          >
                            <Target className="w-3.5 h-3.5 text-rose-400" />
                            <span>Track Drone in 3D</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleRecall(dossier.assignmentId)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 text-red-300 text-xs font-semibold cursor-pointer border border-red-800/80 ml-auto"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Recall / Abort Execution</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RESCUE CAPABILITY MATRIX */}
        {activeTab === 'FLEET' && (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 text-[11px] font-mono uppercase">
                  <th className="py-2.5 px-3">Drone</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Flotation Payload</th>
                  <th className="py-2.5 px-3">Battery</th>
                  <th className="py-2.5 px-3">Connectivity</th>
                  <th className="py-2.5 px-3">Telemetry Age</th>
                  <th className="py-2.5 px-3">Rescue Eligibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {allDrones.map((drone) => {
                  const hasFlotation = drone.capabilities?.hasFlotationPayload ?? false;
                  const isRoleEligible = drone.role === 'RESCUE_ASSISTANCE' || drone.role === 'MULTI_ROLE';
                  const isBatteryOk = drone.battery.percentage > 25.0;
                  const isLinkOk = drone.connectivity === 'CONNECTED';
                  const isFresh = (Date.now() - drone.lastReceivedTimeMs) / 1000 <= 15.0;
                  const isFullyEligible = hasFlotation && isRoleEligible && isBatteryOk && isLinkOk && isFresh;

                  return (
                    <tr key={drone.droneId} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-3 font-bold text-white">
                        {drone.droneId}
                        <div className="text-[10px] text-slate-500 font-sans">{drone.callsign}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            drone.role === 'RESCUE_ASSISTANCE'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : drone.role === 'MULTI_ROLE'
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {drone.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        {hasFlotation ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Equipped
                          </span>
                        ) : (
                          <span className="text-slate-500 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> None
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={drone.battery.percentage > 25 ? 'text-emerald-400' : 'text-red-400 font-bold'}>
                          {drone.battery.percentage.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={drone.connectivity === 'CONNECTED' ? 'text-emerald-400' : 'text-red-400'}>
                          {drone.connectivity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {((Date.now() - drone.lastReceivedTimeMs) / 1000).toFixed(1)}s
                      </td>
                      <td className="py-2.5 px-3">
                        {isFullyEligible ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                            ELIGIBLE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-300 border border-red-800">
                            INELIGIBLE
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: AUDIT TRAIL */}
        {activeTab === 'AUDIT' && (
          <div className="space-y-2">
            {events.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800">
                <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white">No Audit Events Logged</h4>
              </div>
            ) : (
              events.map((evt) => (
                <div
                  key={evt.eventId}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-rose-400">{evt.eventType}</span>
                      <span className="text-slate-400">&bull;</span>
                      <span className="font-mono text-slate-300">{evt.assignmentId}</span>
                      <span className="text-slate-400">&bull;</span>
                      <span className="text-slate-300">{evt.droneId}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Actor: {evt.actor} | {new Date(evt.timestampMs).toLocaleTimeString()}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">{evt.eventId}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>Coordinate System: Rushikonda Beach Scene Space [-250, 250]</span>
        <span>Principle: Drone Flotation Delivery + Human Lifesaver Extraction</span>
      </div>
    </div>
  );
};

