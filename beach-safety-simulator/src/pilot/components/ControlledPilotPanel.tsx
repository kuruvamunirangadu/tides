/**
 * ControlledPilotPanel.tsx
 * 
 * TIDES Phase 5: Controlled Field Pilot & Real-World Validation Framework
 * 
 * Command-Center Triage & Validation HUD:
 * - 6 Tabbed Workflow: Sessions, Preflight, Scenarios, Traceability, Metrics, Environmental & Fail-Safe
 * - Preflight safety gating integration
 * - Interactive scenario runner for all 20 library scenarios
 * - Real-time metrics dashboard with sample sizes, numerators/denominators, and sim/hardware separation
 * - Documented environmental records and 10 emergency fail-safe procedures
 * - Report export modal with Markdown and JSON output
 */

import React, { useState, useEffect } from 'react';
import { PilotSessionManager } from '../session/PilotSessionManager';
import { DeviceReadinessManager } from '../session/DeviceReadinessManager';
import { ScenarioExecutionEngine } from '../scenarios/ScenarioExecutionEngine';
import { EventTraceabilityEngine } from '../tracing/EventTraceabilityEngine';
import { PilotMetricsCalculator } from '../metrics/PilotMetricsCalculator';
import { EnvironmentalValidationManager } from '../metrics/EnvironmentalValidationManager';
import { FailSafeChecklistManager } from '../failsafe/FailSafeChecklistManager';
import { TEST_SCENARIOS } from '../scenarios/TestScenarioLibrary';
import {
  PilotSession,
  DeviceReadinessDossier,
  ScenarioExecutionRecord,
  TraceableEventChain,
  MetricEvaluation,
  EnvironmentalValidationRecord,
  FailSafeProcedure,
  ProvenanceMode,
} from '../pilot.types';
import { PilotReportModal } from './PilotReportModal';

interface ControlledPilotPanelProps {
  onClose?: () => void;
}

export const ControlledPilotPanel: React.FC<ControlledPilotPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<
    'sessions' | 'preflight' | 'scenarios' | 'trace' | 'metrics' | 'environmental'
  >('sessions');

  // Managers
  const sessionManager = PilotSessionManager.getInstance();
  const readinessManager = DeviceReadinessManager.getInstance();
  const scenarioEngine = ScenarioExecutionEngine.getInstance();
  const traceEngine = EventTraceabilityEngine.getInstance();
  const metricsCalc = PilotMetricsCalculator.getInstance();
  const envManager = EnvironmentalValidationManager.getInstance();
  const failSafeManager = FailSafeChecklistManager.getInstance();

  // State
  const [sessions, setSessions] = useState<PilotSession[]>([]);
  const [activeSession, setActiveSession] = useState<PilotSession | undefined>(undefined);
  const [dossiers, setDossiers] = useState<DeviceReadinessDossier[]>([]);
  const [executions, setExecutions] = useState<ScenarioExecutionRecord[]>([]);
  const [traceChains, setTraceChains] = useState<TraceableEventChain[]>([]);
  const [metrics, setMetrics] = useState<MetricEvaluation[]>([]);
  const [envRecords, setEnvRecords] = useState<EnvironmentalValidationRecord[]>([]);
  const [failSafeProcedures, setFailSafeProcedures] = useState<FailSafeProcedure[]>([]);
  const [selectedProvenance, setSelectedProvenance] = useState<ProvenanceMode | 'COMBINED'>('COMBINED');
  const [runningScenarioCode, setRunningScenarioCode] = useState<string | null>(null);
  const [safetyGatingError, setSafetyGatingError] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  // Refresh hook
  const refreshAll = () => {
    const allSes = sessionManager.getAllSessions();
    const curr = sessionManager.getActiveSession();
    setSessions(allSes);
    setActiveSession(curr);
    setDossiers(readinessManager.getAllDossiers());
    setExecutions(curr ? scenarioEngine.getRecordsForSession(curr.sessionId) : scenarioEngine.getAllRecords());
    setTraceChains(curr ? traceEngine.getChainsForSession(curr.sessionId) : traceEngine.getAllChains());
    setMetrics(metricsCalc.computeAllMetrics(curr?.sessionId, selectedProvenance === 'COMBINED' ? undefined : selectedProvenance));
    setEnvRecords(envManager.getAllRecords());
    setFailSafeProcedures(failSafeManager.getAllProcedures());
  };

  useEffect(() => {
    refreshAll();

    const unsub1 = sessionManager.subscribeChange(refreshAll);
    const unsub2 = readinessManager.subscribeChange(refreshAll);
    const unsub3 = scenarioEngine.subscribeChange(refreshAll);
    const unsub4 = traceEngine.subscribeChange(refreshAll);
    const unsub5 = envManager.subscribeChange(refreshAll);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, [selectedProvenance]);

  // Session Handlers
  const handleStartSession = (sessionId: string) => {
    setSafetyGatingError(null);
    const res = sessionManager.startSession(sessionId, 'WATCH-COMMANDER-01');
    if (!res.success) {
      setSafetyGatingError(res.errors.join(' '));
    }
    refreshAll();
  };

  const handlePauseSession = (sessionId: string) => {
    sessionManager.pauseSession(sessionId, 'WATCH-COMMANDER-01', 'Operator manual pause');
    refreshAll();
  };

  const handleCompleteSession = (sessionId: string) => {
    sessionManager.completeSession(sessionId, 'WATCH-COMMANDER-01', 'Scheduled test matrix successfully completed.');
    refreshAll();
  };

  // Scenario Run Handler
  const handleRunScenario = async (code: string) => {
    if (!activeSession) return;
    setRunningScenarioCode(code);
    try {
      await scenarioEngine.executeScenario(code, activeSession.sessionId, 'OP-VALIDATOR');
    } catch (err) {
      console.error('Error running scenario:', err);
    } finally {
      setRunningScenarioCode(null);
      refreshAll();
    }
  };

  // Check update handler
  const handleToggleCheck = (deviceId: string, checkId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'PASSED' ? 'FAILED' : 'PASSED';
    readinessManager.updateCheckStatus(deviceId, checkId, nextStatus as any, 'QA-SUPERVISOR', 'Operator toggle');
    refreshAll();
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        right: 16,
        width: 720,
        maxHeight: 'calc(100vh - 80px)',
        backgroundColor: 'rgba(15, 23, 42, 0.97)',
        color: '#f8fafc',
        borderRadius: 12,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
        border: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: 13,
      }}
    >
      {/* Top Banner: Test Mode Warning & Conventional Lifeguard Requirement */}
      <div
        style={{
          backgroundColor: '#991b1b',
          color: '#fef2f2',
          padding: '6px 16px',
          fontSize: 11,
          fontWeight: 700,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          letterSpacing: 0.3,
        }}
      >
        <span>⚠️ CONTROLLED PILOT VALIDATION MODE • CONVENTIONAL RESCUE SYSTEMS ACTIVE</span>
        <span style={{ fontSize: 10, opacity: 0.9 }}>NOT AN EMERGENCY ALARM BROADCAST</span>
      </div>

      {/* Main Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid #334155',
          backgroundColor: '#0f172a',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: activeSession?.status === 'RUNNING' ? '#10b981' : '#f59e0b',
              boxShadow: activeSession?.status === 'RUNNING' ? '0 0 8px #10b981' : 'none',
            }}
          />
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
              Field Pilot & Validation Framework (Phase 5)
            </h3>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              Active Session: <strong>{activeSession?.sessionId || 'None'}</strong> — {activeSession?.name || 'No active session'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setIsReportModalOpen(true)}
            style={{
              padding: '5px 10px',
              backgroundColor: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            📋 Export Audit Report
          </button>
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

      {/* Gating Error Notification */}
      {safetyGatingError && (
        <div
          style={{
            backgroundColor: '#7f1d1d',
            color: '#fecaca',
            padding: '8px 16px',
            fontSize: 11,
            borderBottom: '1px solid #b91c1c',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>🛑 {safetyGatingError}</span>
          <button
            onClick={() => setSafetyGatingError(null)}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #334155',
          backgroundColor: '#0f172a',
        }}
      >
        {[
          { id: 'sessions', label: `Sessions (${sessions.length})` },
          { id: 'preflight', label: `Preflight (${dossiers.length})` },
          { id: 'scenarios', label: `Scenarios (${TEST_SCENARIOS.length})` },
          { id: 'trace', label: `Live Trace (${traceChains.length})` },
          { id: 'metrics', label: `Metrics (${metrics.length})` },
          { id: 'environmental', label: `Environmental & Fail-Safe` },
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
              fontSize: 11,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {/* TAB 1: SESSIONS */}
        {activeTab === 'sessions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                Pilot sessions enforce data integrity and prevent accidental mixing of simulated and real-device records:
              </span>
            </div>

            {sessions.map((s) => {
              const isSelected = activeSession?.sessionId === s.sessionId;
              const isRunning = s.status === 'RUNNING';

              return (
                <div
                  key={s.sessionId}
                  style={{
                    backgroundColor: isSelected ? '#1e293b' : '#0f172a',
                    border: isSelected ? '1px solid #38bdf8' : '1px solid #334155',
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{s.sessionId}</span>
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 4,
                          backgroundColor: '#0284c7',
                          color: '#fff',
                          fontWeight: 700,
                        }}
                      >
                        {s.sessionType}
                      </span>
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 4,
                          backgroundColor: s.provenanceMode === 'HARDWARE' ? '#059669' : '#475569',
                          color: '#fff',
                        }}
                      >
                        {s.provenanceMode}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6,
                        backgroundColor: isRunning ? '#10b98120' : '#334155',
                        color: isRunning ? '#34d399' : '#94a3b8',
                      }}
                    >
                      {s.status}
                    </span>
                  </div>

                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{s.description}</div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 6,
                      fontSize: 11,
                      backgroundColor: '#090d16',
                      padding: 8,
                      borderRadius: 6,
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <span style={{ color: '#64748b' }}>Location: </span>
                      <span>{s.testLocation}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Supervisor: </span>
                      <span>{s.safetySupervisorId}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Executed Scenarios: </span>
                      <span>{s.executedScenarioIds.length}</span>
                    </div>
                  </div>

                  {/* Session Actions */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {!isSelected && (
                      <button
                        onClick={() => sessionManager.setActiveSession(s.sessionId)}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: '#334155',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                      >
                        Select Session
                      </button>
                    )}

                    {s.status === 'PLANNED' || s.status === 'PAUSED' || s.status === 'READY_FOR_TESTING' ? (
                      <button
                        onClick={() => handleStartSession(s.sessionId)}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: '#10b981',
                          color: '#064e3b',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ▶ Start (Safety-Gated)
                      </button>
                    ) : null}

                    {isRunning && (
                      <button
                        onClick={() => handlePauseSession(s.sessionId)}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: '#f59e0b',
                          color: '#78350f',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ⏸ Pause
                      </button>
                    )}

                    {isRunning && (
                      <button
                        onClick={() => handleCompleteSession(s.sessionId)}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: '#0284c7',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Complete Session
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: PREFLIGHT CHECKLIST */}
        {activeTab === 'preflight' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              Safety-critical checks block real-device tests if failed. Simulations can run independently.
            </div>

            {dossiers.map((d) => (
              <div
                key={d.deviceId}
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: 8,
                  padding: 12,
                  border: d.overallStatus === 'BLOCKED' ? '1px solid #ef4444' : '1px solid #334155',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{d.deviceId}</span>
                    <span style={{ marginLeft: 8, fontSize: 11, color: '#94a3b8' }}>({d.modelName})</span>
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 9,
                        padding: '1px 5px',
                        borderRadius: 3,
                        backgroundColor: '#0284c7',
                        color: '#fff',
                      }}
                    >
                      {d.deviceCategory}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 4,
                      backgroundColor:
                        d.overallStatus === 'READY'
                          ? '#059669'
                          : d.overallStatus === 'BLOCKED'
                          ? '#dc2626'
                          : '#d97706',
                      color: '#fff',
                    }}
                  >
                    OVERALL: {d.overallStatus}
                  </span>
                </div>

                {/* Checks Table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {d.checks.map((chk) => (
                    <div
                      key={chk.checkId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#0f172a',
                        padding: '6px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>
                          {chk.name}{' '}
                          {chk.isSafetyCritical && (
                            <span style={{ color: '#ef4444', fontSize: 10, fontWeight: 700 }}>[CRITICAL]</span>
                          )}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: 10 }}>{chk.description}</div>
                        {chk.notes && <div style={{ color: '#38bdf8', fontSize: 10 }}>Note: {chk.notes}</div>}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 3,
                            backgroundColor:
                              chk.status === 'PASSED'
                                ? '#059669'
                                : chk.status === 'FAILED'
                                ? '#dc2626'
                                : '#475569',
                            color: '#fff',
                          }}
                        >
                          {chk.status}
                        </span>
                        <button
                          onClick={() => handleToggleCheck(d.deviceId, chk.checkId, chk.status)}
                          style={{
                            padding: '2px 6px',
                            backgroundColor: '#334155',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 3,
                            fontSize: 10,
                            cursor: 'pointer',
                          }}
                        >
                          Toggle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: SCENARIOS */}
        {activeTab === 'scenarios' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              Library of 20 Reusable Test Scenarios. Select a scenario to execute against authoritative systems:
            </div>

            {TEST_SCENARIOS.map((s) => {
              const execution = executions.find((e) => e.code === s.code);
              const isRunning = runningScenarioCode === s.code;

              return (
                <div
                  key={s.code}
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: 6,
                    padding: 10,
                    border: '1px solid #334155',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#38bdf8' }}>{s.code}: </span>
                      <span style={{ fontWeight: 600 }}>{s.name}</span>
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 9,
                          padding: '1px 5px',
                          borderRadius: 3,
                          backgroundColor: '#334155',
                          color: '#94a3b8',
                        }}
                      >
                        {s.safetyClassification}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {execution && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 3,
                            backgroundColor: execution.status === 'PASSED' ? '#059669' : '#dc2626',
                            color: '#fff',
                          }}
                        >
                          {execution.status} ({execution.durationMs}ms)
                        </span>
                      )}

                      <button
                        onClick={() => handleRunScenario(s.code)}
                        disabled={isRunning || !activeSession}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: isRunning ? '#64748b' : '#0284c7',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: isRunning || !activeSession ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isRunning ? 'Running...' : '▶ Run'}
                      </button>
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{s.description}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>
                    <strong>Expected: </strong>{s.expectedResult}
                  </div>
                  {execution && (
                    <div style={{ fontSize: 10, color: execution.status === 'PASSED' ? '#6ee7b7' : '#f87171', marginTop: 3 }}>
                      <strong>Actual: </strong>{execution.actualResult}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 4: LIVE TRACEABILITY */}
        {activeTab === 'trace' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              End-to-end traceable event chains showing discrete stage transitions and latency:
            </div>

            {traceChains.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 16px', color: '#64748b' }}>
                No events recorded in current session. Run a scenario to inspect the execution trace.
              </div>
            ) : (
              traceChains.map((chain) => (
                <div
                  key={chain.correlationId}
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: 8,
                    padding: 10,
                    border: '1px solid #334155',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 12 }}>{chain.correlationId}</span>
                      <span style={{ marginLeft: 6, fontSize: 10, color: '#94a3b8' }}>
                        Source: {chain.sourceDeviceId} ({chain.provenance})
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 3,
                        backgroundColor: chain.outcome === 'SUCCESS' ? '#059669' : '#d97706',
                        color: '#fff',
                      }}
                    >
                      {chain.outcome} (Total: {chain.totalLatencyMs !== undefined ? `${chain.totalLatencyMs}ms` : 'In Progress'})
                    </span>
                  </div>

                  {/* Chain Steps */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {chain.steps.map((st, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 10,
                          backgroundColor: '#0f172a',
                          padding: '4px 6px',
                          borderRadius: 4,
                        }}
                      >
                        <span style={{ color: '#38bdf8', fontWeight: 600, width: 160 }}>
                          {idx + 1}. {st.stage}
                        </span>
                        <span
                          style={{
                            padding: '1px 4px',
                            borderRadius: 3,
                            fontSize: 9,
                            backgroundColor: st.status === 'OBSERVED' ? '#059669' : '#64748b',
                            color: '#fff',
                          }}
                        >
                          {st.status}
                        </span>
                        <span style={{ color: '#cbd5e1', flex: 1 }}>{st.details}</span>
                        {st.latencyFromPreviousMs !== undefined && (
                          <span style={{ color: '#f59e0b', fontWeight: 600 }}>+{st.latencyFromPreviousMs}ms</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 5: METRICS & EVALUATION */}
        {activeTab === 'metrics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                Every metric reports sample size, observation window, and measurement source:
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['COMBINED', 'SIMULATED', 'HARDWARE'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSelectedProvenance(mode)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 4,
                      border: 'none',
                      backgroundColor: selectedProvenance === mode ? '#0284c7' : '#334155',
                      color: '#fff',
                      fontSize: 10,
                      cursor: 'pointer',
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {metrics.map((m) => (
                <div
                  key={m.metricId}
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: 6,
                    padding: 10,
                    border: '1px solid #334155',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#f8fafc' }}>{m.name}</span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: 3,
                        backgroundColor: m.isAcceptable ? '#059669' : '#dc2626',
                        color: '#fff',
                      }}
                    >
                      {m.isAcceptable ? '✓ OK' : '✗ ALERT'}
                    </span>
                  </div>

                  <div style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8', marginBottom: 2 }}>
                    {m.measuredValue} <span style={{ fontSize: 12 }}>{m.unit}</span>
                  </div>

                  <div style={{ fontSize: 10, color: '#94a3b8' }}>
                    Sample: n={m.sampleSize} | Threshold: {m.thresholdAcceptable !== undefined ? `${m.thresholdAcceptable}${m.unit}` : 'N/A'}
                  </div>
                  <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>Source: {m.measurementSource}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: ENVIRONMENTAL & FAIL-SAFE */}
        {activeTab === 'environmental' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: 13, color: '#38bdf8' }}>
                Controlled Environmental Validation Records ({envRecords.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {envRecords.map((r) => (
                  <div
                    key={r.recordId}
                    style={{
                      backgroundColor: '#1e293b',
                      borderRadius: 6,
                      padding: 8,
                      fontSize: 11,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>{r.testCategory}</span>
                      <span style={{ color: '#34d399' }}>{r.measuredValue} {r.measurementUnit}</span>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>{r.procedureDocumented}</div>
                    <div style={{ color: '#e2e8f0', fontSize: 10, marginTop: 2 }}>
                      Limitations: {r.testLimitations}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: 13, color: '#ef4444' }}>
                Documented Fail-Safe Response Procedures ({failSafeProcedures.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {failSafeProcedures.map((f) => (
                  <div
                    key={f.failureCode}
                    style={{
                      backgroundColor: '#1e293b',
                      borderRadius: 6,
                      padding: 8,
                      fontSize: 11,
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#f87171' }}>
                      {f.failureCode}: {f.title}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 10 }}>Condition: {f.triggerCondition}</div>
                    <div style={{ color: '#fef08a', fontSize: 10, marginTop: 2 }}>Action: {f.immediateAction}</div>
                    <div style={{ color: '#6ee7b7', fontSize: 10, marginTop: 2 }}>Backup Channel: {f.backupRescueChannel}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Report Modal */}
      {isReportModalOpen && activeSession && (
        <PilotReportModal
          session={activeSession}
          metrics={metrics}
          executions={executions}
          environmentalRecords={envRecords}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}
    </div>
  );
};

