/**
 * DroneDistressVerificationPanel.tsx
 * 
 * TIDES Drone Phase 7: Distress Verification & Incident Triage Panel
 * 
 * Interactive Operator Interface:
 * - Displays active candidate observation dossiers requiring human triage.
 * - Shows multi-source evidence: confidence, track ID, coordinates, hazard corridor, telemetry.
 * - Enforces uncertainty preservation: unverified observations are NOT presented as confirmed emergencies.
 * - Provides authorized operator actions: Verify Incident, Dismiss False Alarm, Mark Duplicate.
 * - Includes Explicit SOS simulator to demonstrate emergency bypass behavior.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Radio,
  Clock,
  Eye,
  MapPin,
  HelpCircle,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { DroneDistressVerificationEngine } from '../distress/DroneDistressVerificationEngine';
import { CandidateDistressDossier, DroneVerificationStatus } from '../distress/droneDistress.types';
import { IncidentManager } from '../../visitors/incidents/IncidentManager';

interface DroneDistressVerificationPanelProps {
  onClose?: () => void;
  className?: string;
}

export const DroneDistressVerificationPanel: React.FC<DroneDistressVerificationPanelProps> = ({
  onClose,
  className = '',
}) => {
  const engine = DroneDistressVerificationEngine.getInstance();
  const [dossiers, setDossiers] = useState<CandidateDistressDossier[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'DISMISSED'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Dialog states for operator actions
  const [activeActionDossier, setActiveActionDossier] = useState<CandidateDistressDossier | null>(null);
  const [actionType, setActionType] = useState<'VERIFY' | 'DISMISS' | 'DUPLICATE' | null>(null);
  const [operatorNotes, setOperatorNotes] = useState<string>('');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');

  // Subscribe to engine state changes
  useEffect(() => {
    const update = () => {
      setDossiers(engine.getAllDossiers());
    };
    update();
    const unsubscribe = engine.subscribe(update);
    return () => unsubscribe();
  }, [engine]);

  const filteredDossiers = dossiers.filter((d) => {
    if (filter === 'PENDING') {
      return d.verificationStatus === 'AWAITING_VERIFICATION' || d.verificationStatus === 'UNDER_REVIEW';
    }
    if (filter === 'VERIFIED') return d.verificationStatus === 'VERIFIED_INCIDENT';
    if (filter === 'DISMISSED') return d.verificationStatus === 'DISMISSED_CANDIDATE';
    return true;
  });

  const pendingCount = dossiers.filter(
    (d) => d.verificationStatus === 'AWAITING_VERIFICATION' || d.verificationStatus === 'UNDER_REVIEW'
  ).length;

  const handleExecuteAction = () => {
    if (!activeActionDossier || !actionType) return;

    if (actionType === 'VERIFY') {
      engine.verifyCandidate(
        activeActionDossier.dossierId,
        'OP-DUTY-COMMAND',
        operatorNotes || 'Visual confirmation of swimmer distress in coastal rip corridor.'
      );
    } else if (actionType === 'DISMISS') {
      engine.dismissCandidate(
        activeActionDossier.dossierId,
        'OP-DUTY-COMMAND',
        operatorNotes || 'Normal recreational swimming. False distress alert.'
      );
    } else if (actionType === 'DUPLICATE') {
      engine.markDuplicate(
        activeActionDossier.dossierId,
        selectedIncidentId || 'INC-EXISTING',
        'OP-DUTY-COMMAND',
        operatorNotes || 'Observation merged with existing active incident.'
      );
    }

    setActiveActionDossier(null);
    setActionType(null);
    setOperatorNotes('');
    setSelectedIncidentId('');
  };

  const handleTriggerMockSOS = () => {
    engine.handleExplicitSOS({
      sosId: `SOS-WRISTBAND-${Math.floor(1000 + Math.random() * 9000)}`,
      source: 'WRISTBAND',
      visitorId: 'VIS-SOS-DEMO',
      timestampMs: Date.now(),
      scenePosition: { x: 410, y: 0.5, z: -8 },
      emergencyType: 'DROWNING_SOS',
      severity: 'CRITICAL',
      bypassesCV: true,
    });
  };

  const getStatusBadge = (status: DroneVerificationStatus) => {
    switch (status) {
      case 'AWAITING_VERIFICATION':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
            ⏳ AWAITING VERIFICATION
          </span>
        );
      case 'VERIFIED_INCIDENT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            🔴 VERIFIED INCIDENT
          </span>
        );
      case 'DISMISSED_CANDIDATE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-700/50 text-slate-400 border border-slate-600">
            ⚪ DISMISSED
          </span>
        );
      case 'DUPLICATE_OBSERVATION':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            🔵 DUPLICATE
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className={`bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              Aerial Distress Verification Triage
              {pendingCount > 0 && (
                <span className="px-2 py-0.2 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {pendingCount} Pending
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Correlated aerial candidate observations requiring human verification prior to emergency dispatch.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick SOS Test Button */}
          <button
            onClick={handleTriggerMockSOS}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-colors flex items-center gap-1.5"
            title="Demonstrate explicit wristband SOS: Bypasses CV verification and immediately triggers emergency response."
          >
            <Radio className="w-3.5 h-3.5 animate-pulse text-rose-400" />
            Simulate Wristband SOS
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-xs">
        {(['ALL', 'PENDING', 'VERIFIED', 'DISMISSED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              filter === tab
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab === 'PENDING' ? `Pending (${pendingCount})` : tab}
          </button>
        ))}
      </div>

      {/* Dossiers List */}
      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
        {filteredDossiers.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs bg-slate-950/40 rounded-xl border border-slate-800">
            ● No candidate observation dossiers in queue. Coastal sector aerial feeds nominal.
          </div>
        ) : (
          filteredDossiers.map((dossier) => {
            const isExpanded = expandedId === dossier.dossierId;
            const isPending =
              dossier.verificationStatus === 'AWAITING_VERIFICATION' ||
              dossier.verificationStatus === 'UNDER_REVIEW';

            return (
              <div
                key={dossier.dossierId}
                className={`rounded-xl border transition-all ${
                  isPending
                    ? 'bg-amber-950/20 border-amber-500/40 shadow-lg'
                    : dossier.verificationStatus === 'VERIFIED_INCIDENT'
                    ? 'bg-rose-950/20 border-rose-500/30'
                    : 'bg-slate-950/50 border-slate-800'
                }`}
              >
                {/* Dossier Header Summary */}
                <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(dossier.verificationStatus)}
                    <span className="font-mono font-bold text-xs text-slate-200">{dossier.dossierId}</span>
                    <span className="text-xs text-slate-400">
                      • {dossier.droneId} ({dossier.cameraId})
                    </span>
                    {dossier.trackingId && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {dossier.trackingId}
                      </span>
                    )}
                    {dossier.inHazardCorridor && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        {dossier.hazardZoneName || 'Hazard Corridor'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" />
                      Conf: <strong className="text-cyan-300">{(dossier.detectionConfidence * 100).toFixed(0)}%</strong>
                    </span>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : dossier.dossierId)}
                      className="p-1 text-slate-400 hover:text-slate-200"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Dossier Details */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-slate-800/80 pt-2.5 space-y-3 text-xs">
                    {/* Uncertainty Notice */}
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                      <div className="text-[11px] space-y-0.5">
                        <p className="font-semibold">Candidate Observation — Preservation of Uncertainty</p>
                        <p className="text-slate-400">
                          Computer vision identifies candidate observations; it does not independently declare a confirmed
                          drowning. Rescue dispatch requires human operator verification.
                        </p>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <div>
                        <span className="text-slate-500 block">Observation ID</span>
                        <span className="text-slate-300">{dossier.candidateObservationId}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Ground Position</span>
                        <span className="text-slate-300">
                          {dossier.scenePosition
                            ? `(${dossier.scenePosition.x.toFixed(1)}m, ${dossier.scenePosition.z.toFixed(1)}m)`
                            : 'Unestimated'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Repeated Hits</span>
                        <span className="text-slate-300">{dossier.repeatedHitsCount} frames</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Existing Incident</span>
                        <span className="text-slate-300">
                          {dossier.existingIncidentId || 'None (Isolated)'}
                        </span>
                      </div>
                    </div>

                    {/* Correlated Evidence Summary */}
                    <div>
                      <h4 className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Correlated Supporting Evidence
                      </h4>
                      <ul className="space-y-1 pl-4 list-disc text-slate-400 text-[11px]">
                        {dossier.evidenceSummary.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Uncertainty Reasons */}
                    <div>
                      <h4 className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-400" /> Uncertainty & Limiting Factors
                      </h4>
                      <ul className="space-y-1 pl-4 list-disc text-slate-400 text-[11px]">
                        {dossier.uncertaintyReasons.map((un, i) => (
                          <li key={i}>{un}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Operator Decision History (if already decided) */}
                    {dossier.operatorDecision && (
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono">
                        <span className="text-cyan-400 font-bold">Operator Decision ({dossier.operatorDecision.decision})</span>
                        <p className="text-slate-300 mt-0.5">By: {dossier.operatorDecision.operatorId} • Reason: {dossier.operatorDecision.reason}</p>
                        {dossier.operatorDecision.resultingIncidentId && (
                          <p className="text-emerald-400 mt-0.5">Resulting Incident: {dossier.operatorDecision.resultingIncidentId}</p>
                        )}
                      </div>
                    )}

                    {/* Triage Action Buttons */}
                    {isPending && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => {
                            setActiveActionDossier(dossier);
                            setActionType('VERIFY');
                            setOperatorNotes('Visual inspection confirms bather struggling in rip current channel.');
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-900/30 flex items-center gap-1.5 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verify & Escalate Incident
                        </button>

                        <button
                          onClick={() => {
                            setActiveActionDossier(dossier);
                            setActionType('DISMISS');
                            setOperatorNotes('Swimmer appears in control. Benign recreational bathing.');
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5 text-slate-400" />
                          Dismiss False Alarm
                        </button>

                        <button
                          onClick={() => {
                            setActiveActionDossier(dossier);
                            setActionType('DUPLICATE');
                            setOperatorNotes('Duplicate observation of ongoing rescue.');
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 flex items-center gap-1.5 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Mark Duplicate
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Operator Action Confirmation Modal */}
      {activeActionDossier && actionType && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Confirm Operator Action: {actionType}
              </h4>
              <button
                onClick={() => {
                  setActiveActionDossier(null);
                  setActionType(null);
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Dossier <strong className="text-amber-400 font-mono">{activeActionDossier.dossierId}</strong> •
              Candidate: <span className="font-mono">{activeActionDossier.candidateObservationId}</span>
            </p>

            {actionType === 'DUPLICATE' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Existing Active Incident:
                </label>
                <select
                  value={selectedIncidentId}
                  onChange={(e) => setSelectedIncidentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- Choose Incident --</option>
                  {IncidentManager.getInstance()
                    .getActiveIncidents()
                    .map((inc) => (
                      <option key={inc.id} value={inc.id}>
                        {inc.id} - {inc.title} ({inc.severity})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Operator Rationale / Justification Notes:
              </label>
              <textarea
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                placeholder="Enter mandatory operator rationale for audit logging..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setActiveActionDossier(null);
                  setActionType(null);
                }}
                className="px-3 py-1.5 text-xs rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAction}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg shadow-lg transition-colors ${
                  actionType === 'VERIFY'
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-900/30'
                    : actionType === 'DISMISS'
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/30'
                }`}
              >
                Commit {actionType} Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

