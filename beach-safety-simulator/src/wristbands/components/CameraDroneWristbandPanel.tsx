/**
 * CameraDroneWristbandPanel.tsx
 * 
 * TIDES Phase 4: Camera & Drone Integration with the Wristband Safety System
 * 
 * Command-Center Triage & Dispatch HUD:
 * - Real-time observation intake feed (fixed cameras & aerial drones)
 * - Candidate distress queue with composite confidence and evidence preview
 * - Human-in-the-loop operator triage controls (Confirm, Dismiss, Dispatch Drone Closer Look)
 * - Complete fleet wristband eligibility & delivery lifecycle table with transparent rationale
 * - Non-volatile audit log of operator decisions and automated dispatches
 */

import React, { useState, useEffect } from 'react';
import { CameraObservationAdapter } from '../integration/CameraObservationAdapter';
import { DroneObservationAdapter } from '../integration/DroneObservationAdapter';
import { ObservationDistressCorrelator } from '../integration/ObservationDistressCorrelator';
import { WristbandWarningIntegrationService } from '../integration/WristbandWarningIntegrationService';
import { WristbandRegistry } from '../WristbandRegistry';
import {
  CandidateDistressIncident,
  CameraObservation,
  DroneObservationRecord,
  WristbandEligibilityRecord,
  IntegrationAuditRecord,
} from '../integration/integration.types';

interface CameraDroneWristbandPanelProps {
  onClose?: () => void;
}

export const CameraDroneWristbandPanel: React.FC<CameraDroneWristbandPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'triage' | 'wristbands' | 'observations' | 'audit'>('triage');

  // Subsystem instances
  const camAdapter = CameraObservationAdapter.getInstance();
  const droneAdapter = DroneObservationAdapter.getInstance();
  const correlator = ObservationDistressCorrelator.getInstance();
  const warningService = WristbandWarningIntegrationService.getInstance();
  const wristbandRegistry = WristbandRegistry.getInstance();

  // Local state
  const [candidates, setCandidates] = useState<CandidateDistressIncident[]>([]);
  const [camObservations, setCamObservations] = useState<CameraObservation[]>([]);
  const [droneObservations, setDroneObservations] = useState<DroneObservationRecord[]>([]);
  const [eligibilityRecords, setEligibilityRecords] = useState<WristbandEligibilityRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<IntegrationAuditRecord[]>([]);
  const [dismissReason, setDismissReason] = useState<string>('False positive: floating debris or sea weed');
  const [activeDismissCandidateId, setActiveDismissCandidateId] = useState<string | null>(null);

  // Subscribe to updates
  useEffect(() => {
    const refreshData = () => {
      setCandidates(correlator.getAllCandidates());
      setCamObservations(camAdapter.getRecentObservations(15));
      setDroneObservations(droneAdapter.getRecentObservations(15));
      setEligibilityRecords(warningService.getLatestEligibilityRecords());
      setAuditLogs(correlator.getAuditLogs().slice(0, 30));
    };

    refreshData();

    const unsub1 = correlator.subscribeChange(refreshData);
    const unsub2 = camAdapter.subscribeChange(refreshData);
    const unsub3 = droneAdapter.subscribeChange(refreshData);
    const unsub4 = warningService.subscribeChange(refreshData);

    const interval = setInterval(() => {
      camAdapter.updateFreshness();
      refreshData();
    }, 2000);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      clearInterval(interval);
    };
  }, []);

  // Quick Simulation Triggers
  const handleSimulateCameraDetection = () => {
    const now = Date.now();
    const obs = camAdapter.ingestObservation({
      cameraId: 'CAM-01',
      cameraSourceType: 'SURVEILLANCE_TOWER',
      eventTimestampMs: now,
      detectionClass: 'STRUGGLING_SWIMMER',
      confidenceScore: 0.82,
      observationPosition: { x: 195, y: 175 },
      coordinateReference: 'BEACH_CANVAS',
      trackingId: `TRK-CAM-${Math.floor(Math.random() * 900 + 100)}`,
      evidenceReference: `cctv_frame_cam01_${now}.jpg`,
    });

    if (obs.observation) {
      correlator.correlateCameraObservation(obs.observation, now);
    }
  };

  const handleSimulateDroneDetection = () => {
    const now = Date.now();
    const obs = droneAdapter.ingestDroneObservation({
      droneId: 'DRONE-01',
      confidenceScore: 0.88,
      estimatedObservationLocation: { x: 210, y: 180 },
      trackingId: `TRK-AERIAL-${Math.floor(Math.random() * 900 + 100)}`,
      notes: 'Aerial thermal IR sighting of erratic swimmer movement in rip neck',
    });

    if (obs.observation) {
      correlator.correlateDroneObservation(obs.observation, now);
    }
  };

  const handleSimulateCorroboration = () => {
    const now = Date.now();
    // 1. Camera sighting
    const camRes = camAdapter.ingestObservation({
      cameraId: 'CAM-02',
      cameraSourceType: 'CCTV_FIXED',
      eventTimestampMs: now,
      detectionClass: 'STRUGGLING_SWIMMER',
      confidenceScore: 0.80,
      observationPosition: { x: 380, y: 190 },
      trackingId: `TRK-CORR-${Math.floor(Math.random() * 900 + 100)}`,
    });

    if (camRes.observation) {
      correlator.correlateCameraObservation(camRes.observation, now);
    }

    // 2. Drone sighting near same coordinates (within 15m)
    const droneRes = droneAdapter.ingestDroneObservation({
      droneId: 'DRONE-02',
      confidenceScore: 0.89,
      estimatedObservationLocation: { x: 390, y: 195 },
      trackingId: `TRK-CORR-AERIAL`,
      notes: 'Corroborating swimmer submerged repeatedly in rip current',
    });

    if (droneRes.observation) {
      correlator.correlateDroneObservation(droneRes.observation, now + 100);
    }
  };

  const handleIndependentSOS = () => {
    correlator.handleIndependentSOS('WB-102', { x: 200, y: 170 }, 'SZ-01', 'OPERATOR_SOS_SIM');
  };

  // Operator Triage Handlers
  const handleConfirm = (candidateId: string) => {
    correlator.confirmDistress(
      candidateId,
      'WATCH_COMMANDER_01',
      'Confirmed distressed swimmer via dual sensor corroboration. Immediate dispatch.'
    );
  };

  const handleDismissSubmit = (candidateId: string) => {
    correlator.dismissObservation(candidateId, 'WATCH_COMMANDER_01', dismissReason);
    setActiveDismissCandidateId(null);
  };

  const handleDroneCloserLook = (candidateId: string) => {
    correlator.requestDroneCloserLook(candidateId, 'WATCH_COMMANDER_01', 'DRONE-01');
  };

  const pendingCount = candidates.filter((c) => c.verificationState === 'PENDING_REVIEW').length;
  const verifiedCount = candidates.filter((c) => c.verificationState === 'VERIFIED').length;

  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        right: 16,
        width: 640,
        maxHeight: 'calc(100vh - 80px)',
        backgroundColor: 'rgba(15, 23, 42, 0.96)',
        color: '#f8fafc',
        borderRadius: 12,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        border: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: 13,
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid #334155',
          backgroundColor: '#0f172a',
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 8px #10b981',
            }}
          />
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
              Coastal Safety Integrated Command
            </h3>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              Phase 4: Camera & Drone Swimmer Safety Integration
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              backgroundColor: pendingCount > 0 ? '#b45309' : '#1e293b',
              color: pendingCount > 0 ? '#fef3c7' : '#94a3b8',
            }}
          >
            {pendingCount} Pending Review
          </span>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: 18,
                cursor: 'pointer',
                padding: '0 4px',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Action / Simulation Bar */}
      <div
        style={{
          padding: '8px 16px',
          backgroundColor: '#1e293b',
          borderBottom: '1px solid #334155',
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginRight: 4 }}>
          Sim Feeds:
        </span>
        <button
          onClick={handleSimulateCameraDetection}
          style={{
            padding: '4px 8px',
            backgroundColor: '#0284c7',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Cam Detection
        </button>
        <button
          onClick={handleSimulateDroneDetection}
          style={{
            padding: '4px 8px',
            backgroundColor: '#0d9488',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Drone Aerial
        </button>
        <button
          onClick={handleSimulateCorroboration}
          style={{
            padding: '4px 8px',
            backgroundColor: '#7c3aed',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Fused Corroboration
        </button>
        <button
          onClick={handleIndependentSOS}
          style={{
            padding: '4px 8px',
            backgroundColor: '#dc2626',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🚨 Swimmer SOS
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #334155',
          backgroundColor: '#0f172a',
        }}
      >
        {[
          { id: 'triage', label: `Candidate Triage (${candidates.length})` },
          { id: 'wristbands', label: `Wristband Eligibility (${eligibilityRecords.length})` },
          { id: 'observations', label: 'Observation Feeds' },
          { id: 'audit', label: 'Audit Trail' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              padding: '10px 4px',
              backgroundColor: activeTab === tab.id ? '#1e293b' : 'transparent',
              color: activeTab === tab.id ? '#38bdf8' : '#94a3b8',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #38bdf8' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {/* TAB 1: CANDIDATE TRIAGE QUEUE */}
        {activeTab === 'triage' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                Pending Review Candidates require operator verification before triggering emergency rescue or warnings.
              </span>
            </div>

            {candidates.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 16px',
                  color: '#64748b',
                  backgroundColor: '#1e293b40',
                  borderRadius: 8,
                }}
              >
                No active candidate distress incidents. Click a "Sim Feeds" button above to ingest camera or drone sightings.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {candidates.map((cand) => {
                  const isPending = cand.verificationState === 'PENDING_REVIEW';
                  const isMonitoring = cand.verificationState === 'MONITORING';
                  const isVerified = cand.verificationState === 'VERIFIED';
                  const isDismissed = cand.verificationState === 'DISMISSED';

                  const badgeColor =
                    cand.primarySource === 'FUSED'
                      ? '#7c3aed'
                      : cand.primarySource === 'DRONE'
                      ? '#0d9488'
                      : '#0284c7';

                  return (
                    <div
                      key={cand.candidateId}
                      style={{
                        backgroundColor: '#1e293b',
                        borderRadius: 8,
                        padding: 12,
                        border: isPending
                          ? '1px solid #f59e0b'
                          : isVerified
                          ? '1px solid #10b981'
                          : isDismissed
                          ? '1px solid #475569'
                          : '1px solid #0284c7',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 8,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{cand.candidateId}</span>
                          <span
                            style={{
                              backgroundColor: badgeColor,
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                          >
                            {cand.primarySource} SOURCE
                          </span>
                          <span
                            style={{
                              backgroundColor: '#334155',
                              color: '#e2e8f0',
                              fontSize: 11,
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                          >
                            Zone {cand.targetZoneId}
                          </span>
                        </div>

                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                            backgroundColor: isPending
                              ? '#fef3c7'
                              : isVerified
                              ? '#d1fae5'
                              : isDismissed
                              ? '#334155'
                              : '#cffafe',
                            color: isPending
                              ? '#b45309'
                              : isVerified
                              ? '#065f46'
                              : isDismissed
                              ? '#94a3b8'
                              : '#0e7490',
                          }}
                        >
                          {cand.verificationState}
                        </span>
                      </div>

                      {/* Metrics bar */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: 8,
                          backgroundColor: '#0f172a',
                          padding: 8,
                          borderRadius: 6,
                          marginBottom: 10,
                          fontSize: 11,
                        }}
                      >
                        <div>
                          <div style={{ color: '#94a3b8' }}>Confidence</div>
                          <div
                            style={{
                              fontWeight: 700,
                              color: cand.compositeConfidence > 0.85 ? '#ef4444' : '#f59e0b',
                            }}
                          >
                            {Math.round(cand.compositeConfidence * 100)}%
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#94a3b8' }}>Location (x, y)</div>
                          <div style={{ fontWeight: 600 }}>
                            {Math.round(cand.estimatedLocation.x)}, {Math.round(cand.estimatedLocation.y)}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#94a3b8' }}>Uncertainty</div>
                          <div style={{ fontWeight: 600 }}>±{cand.spatialUncertaintyRadiusMeters}m</div>
                        </div>
                        <div>
                          <div style={{ color: '#94a3b8' }}>Evidence</div>
                          <div style={{ fontWeight: 600 }}>
                            {cand.cameraObservationIds.length} Cam / {cand.droneObservationIds.length} Drone
                          </div>
                        </div>
                      </div>

                      {/* Verified Banner */}
                      {isVerified && cand.createdIncidentId && (
                        <div
                          style={{
                            backgroundColor: '#064e3b50',
                            border: '1px solid #059669',
                            borderRadius: 6,
                            padding: '6px 10px',
                            marginBottom: 8,
                            fontSize: 11,
                            color: '#a7f3d0',
                          }}
                        >
                          ✓ Authoritative Incident Generated: <strong>{cand.createdIncidentId}</strong>. Localized wristband warnings dispatched.
                        </div>
                      )}

                      {/* Dismissed Banner */}
                      {isDismissed && (
                        <div
                          style={{
                            color: '#94a3b8',
                            fontSize: 11,
                            fontStyle: 'italic',
                            marginBottom: 4,
                          }}
                        >
                          Dismissed by operator. Rationale: {cand.operatorDecision?.rationale}
                        </div>
                      )}

                      {/* Operator Triage Controls */}
                      {(isPending || isMonitoring) && (
                        <div>
                          {activeDismissCandidateId === cand.candidateId ? (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                                marginTop: 8,
                                backgroundColor: '#0f172a',
                                padding: 8,
                                borderRadius: 6,
                              }}
                            >
                              <span style={{ fontSize: 11, color: '#e2e8f0' }}>Specify Dismissal Rationale:</span>
                              <input
                                type="text"
                                value={dismissReason}
                                onChange={(e) => setDismissReason(e.target.value)}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#1e293b',
                                  border: '1px solid #475569',
                                  color: '#fff',
                                  borderRadius: 4,
                                  fontSize: 11,
                                }}
                              />
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  onClick={() => handleDismissSubmit(cand.candidateId)}
                                  style={{
                                    padding: '4px 10px',
                                    backgroundColor: '#ef4444',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                  }}
                                >
                                  Confirm Dismiss
                                </button>
                                <button
                                  onClick={() => setActiveDismissCandidateId(null)}
                                  style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#334155',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                              <button
                                onClick={() => handleConfirm(cand.candidateId)}
                                style={{
                                  flex: 1,
                                  padding: '6px 12px',
                                  backgroundColor: '#10b981',
                                  color: '#064e3b',
                                  border: 'none',
                                  borderRadius: 6,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  fontSize: 12,
                                }}
                              >
                                ✓ Confirm Distress
                              </button>
                              <button
                                onClick={() => handleDroneCloserLook(cand.candidateId)}
                                style={{
                                  flex: 1,
                                  padding: '6px 12px',
                                  backgroundColor: '#0284c7',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 6,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  fontSize: 12,
                                }}
                              >
                                ✈ Drone Closer Look
                              </button>
                              <button
                                onClick={() => setActiveDismissCandidateId(cand.candidateId)}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#334155',
                                  color: '#e2e8f0',
                                  border: 'none',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  fontSize: 12,
                                }}
                              >
                                Dismiss
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: WRISTBAND ELIGIBILITY TABLE */}
        {activeTab === 'wristbands' && (
          <div>
            <div style={{ marginBottom: 12, fontSize: 12, color: '#94a3b8' }}>
              Transparent fleet targeting evaluation for localized warning distribution:
            </div>

            {eligibilityRecords.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 16px',
                  color: '#64748b',
                  backgroundColor: '#1e293b40',
                  borderRadius: 8,
                }}
              >
                No warning distribution currently active. Confirm a candidate or click "Swimmer SOS" to inspect target evaluations.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
                      <th style={{ padding: '6px 8px' }}>Device</th>
                      <th style={{ padding: '6px 8px' }}>Target Visitor</th>
                      <th style={{ padding: '6px 8px' }}>Zone</th>
                      <th style={{ padding: '6px 8px' }}>Distance</th>
                      <th style={{ padding: '6px 8px' }}>Eligibility & Rationale</th>
                      <th style={{ padding: '6px 8px' }}>Lifecycle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibilityRecords.map((r) => (
                      <tr
                        key={r.wristbandId}
                        style={{
                          borderBottom: '1px solid #1e293b',
                          backgroundColor: r.eligible ? '#10b98110' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '6px 8px', fontWeight: 700 }}>
                          {r.wristbandId}{' '}
                          {r.provenance === 'HARDWARE' && (
                            <span
                              style={{
                                fontSize: 9,
                                backgroundColor: '#0284c7',
                                padding: '1px 4px',
                                borderRadius: 3,
                              }}
                            >
                              HW
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '6px 8px', color: r.visitorId ? '#f8fafc' : '#64748b' }}>
                          {r.visitorName || 'Unassigned'}
                        </td>
                        <td style={{ padding: '6px 8px' }}>{r.zone}</td>
                        <td style={{ padding: '6px 8px' }}>
                          {r.distanceMeters !== undefined ? `${r.distanceMeters}m` : '—'}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              backgroundColor: r.eligible ? '#059669' : '#475569',
                              color: '#fff',
                              marginRight: 6,
                            }}
                          >
                            {r.eligible ? 'INCLUDED' : 'EXCLUDED'}
                          </span>
                          <span style={{ color: r.eligible ? '#6ee7b7' : '#94a3b8' }}>
                            {r.reason}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 600,
                              backgroundColor:
                                r.deliveryStatus === 'ACKNOWLEDGED'
                                  ? '#10b981'
                                  : r.deliveryStatus === 'DELIVERED'
                                  ? '#0284c7'
                                  : r.deliveryStatus === 'DISPATCHED'
                                  ? '#f59e0b'
                                  : '#334155',
                              color: '#fff',
                            }}
                          >
                            {r.deliveryStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: OBSERVATION FEEDS */}
        {activeTab === 'observations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: '#38bdf8' }}>
                Fixed Camera Detections ({camObservations.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {camObservations.map((obs) => (
                  <div
                    key={obs.observationId}
                    style={{
                      backgroundColor: '#1e293b',
                      borderRadius: 6,
                      padding: '8px 10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>
                        {obs.cameraId} — {obs.detectionClass}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        Track: {obs.trackingId || 'N/A'} | Pos: ({obs.observationPosition?.x ?? '?'}, {obs.observationPosition?.y ?? '?'})
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#38bdf8' }}>
                        {Math.round(obs.confidenceScore * 100)}%
                      </div>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 3,
                          backgroundColor: obs.freshnessStatus === 'FRESH' ? '#059669' : '#b45309',
                          color: '#fff',
                        }}
                      >
                        {obs.freshnessStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: '#0d9488' }}>
                Drone Aerial Sightings ({droneObservations.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {droneObservations.map((obs) => (
                  <div
                    key={obs.observationId}
                    style={{
                      backgroundColor: '#1e293b',
                      borderRadius: 6,
                      padding: '8px 10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>
                        {obs.droneId} — Ground Target ({obs.estimatedObservationLocation?.x ?? '?'}, {obs.estimatedObservationLocation?.y ?? '?'})
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        Flight Alt: {Math.round(obs.timestampedDronePosition.y)}m | Batt: {obs.batteryPercent}%
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#0d9488' }}>
                        {Math.round(obs.confidenceScore * 100)}%
                      </div>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 3,
                          backgroundColor: obs.telemetryFreshness === 'FRESH' ? '#059669' : '#b45309',
                          color: '#fff',
                        }}
                      >
                        {obs.telemetryFreshness}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div>
            <div style={{ marginBottom: 10, fontSize: 12, color: '#94a3b8' }}>
              Immutable audit log of all observation ingestions, operator verifications, and warning dispatches:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {auditLogs.map((log) => (
                <div
                  key={log.auditId}
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 11,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span style={{ fontWeight: 700, color: '#38bdf8' }}>{log.action}</span>
                    <span>{new Date(log.timestampMs).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ color: '#e2e8f0' }}>{log.details}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

