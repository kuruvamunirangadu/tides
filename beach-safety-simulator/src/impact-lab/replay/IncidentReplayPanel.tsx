import React, { useState, useEffect, useMemo } from 'react';
import { useTelemetry } from '../hooks/useTelemetry';
import { IncidentEventRecorder } from './IncidentEventRecorder';
import { ResponseMetricsCalculator } from './ResponseMetrics';
import { IncidentTimeline } from './IncidentTimeline';
import { ReplayController } from './ReplayController';
import { IncidentReplayTestSuite } from './tests/IncidentReplayTestSuite';
import {
  ReplayableIncidentDossier,
  ResponseMetricsReport,
  Stage3TestExecutionRecord,
} from './types';
import {
  LifeBuoy,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Activity,
  Layers,
  FileCheck2,
  Download,
  Info,
  Navigation,
  Check,
  Flame,
  UserCheck,
} from 'lucide-react';

interface IncidentReplayPanelProps {
  onTriggerRescueScenario?: () => void;
}

export const IncidentReplayPanel: React.FC<IncidentReplayPanelProps> = ({
  onTriggerRescueScenario,
}) => {
  const { latestSnapshot } = useTelemetry();
  const eventRecorder = IncidentEventRecorder.getInstance();
  const replayController = ReplayController.getInstance();
  const testSuite = IncidentReplayTestSuite.getInstance();

  const [incidents, setIncidents] = useState<ReplayableIncidentDossier[]>(eventRecorder.getIncidents());
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(incidents[0]?.incidentId || '');
  const [testResults, setTestResults] = useState<Stage3TestExecutionRecord[]>(testSuite.getTestResults());
  const [isRunningSuite, setIsRunningSuite] = useState<boolean>(false);

  // Subscribe to live incident updates
  useEffect(() => {
    const unsub = eventRecorder.subscribe(() => {
      const all = eventRecorder.getIncidents();
      setIncidents(all);
      if (!selectedIncidentId && all.length > 0) {
        setSelectedIncidentId(all[0].incidentId);
        replayController.selectIncident(all[0].incidentId);
      }
    });
    return () => unsub();
  }, [eventRecorder, selectedIncidentId, replayController]);

  // Record simulation ticks into the event recorder
  useEffect(() => {
    if (latestSnapshot) {
      // In the real app, state is provided through useSimulation/recorder
    }
  }, [latestSnapshot]);

  const activeIncident = useMemo(() => {
    return incidents.find((inc) => inc.incidentId === selectedIncidentId) || incidents[0];
  }, [incidents, selectedIncidentId]);

  const metrics: ResponseMetricsReport | null = useMemo(() => {
    if (!activeIncident) return null;
    return ResponseMetricsCalculator.calculate(activeIncident);
  }, [activeIncident]);

  const handleRunFullTestSuite = async () => {
    setIsRunningSuite(true);
    const results = await testSuite.runFullSuite();
    setTestResults(results);
    setIsRunningSuite(false);
  };

  const handleExportIncidentDossier = () => {
    if (!activeIncident) return;
    const dossierData = {
      incident: activeIncident,
      metrics,
      exportedAt: new Date().toISOString(),
    };
    const jsonStr = JSON.stringify(dossierData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TIDES-INCIDENT-DOSSIER-${activeIncident.incidentId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 font-mono text-slate-200 text-xs">
      {/* 1. Header & Incident Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-bold">
                STAGE 3 — DEMO C
              </span>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-rose-400" />
                Distressed-Swimmer Incident Replay & Response Analytics
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Reconstructs reproducible incident timelines, audits responder kinematics, evaluates Golden Window compliance, and exposes response bottlenecks.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunFullTestSuite}
              disabled={isRunningSuite}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              {isRunningSuite ? 'Running 8-Test Suite...' : 'Run Automated 8-Test Suite'}
            </button>
            <button
              onClick={handleExportIncidentDossier}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export Dossier JSON
            </button>
            {onTriggerRescueScenario && (
              <button
                onClick={onTriggerRescueScenario}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold transition-all shadow-md shadow-rose-500/20 active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                Trigger Live Rescue Loop
              </button>
            )}
          </div>
        </div>

        {/* Incident Dossier Selector Tabs */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider shrink-0 font-bold">
            SELECT INCIDENT DOSSIER:
          </span>
          {incidents.map((inc) => (
            <button
              key={inc.incidentId}
              onClick={() => {
                setSelectedIncidentId(inc.incidentId);
                replayController.selectIncident(inc.incidentId);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedIncidentId === inc.incidentId
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{inc.title.substring(0, 32)}</span>
              <span className="ml-1.5 text-[9px] opacity-80">({inc.status})</span>
            </button>
          ))}
        </div>

        {/* 2. Response Performance KPI Scorecard */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            {/* KPI 1: Golden Window / Time to Assistance */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                ⏱ TIME TO ASSISTANCE
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-100">
                  {metrics.timeToAssistanceSeconds !== null ? `${metrics.timeToAssistanceSeconds.toFixed(0)}s` : 'UNAVAILABLE'}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    metrics.isWithinGoldenWindow ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {metrics.isWithinGoldenWindow ? '✓ GOLDEN WINDOW' : '⚠️ DELAYED'}
                </span>
              </div>
              {metrics.timeToAssistanceSeconds !== null && (
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                  <div
                    className={`h-1.5 rounded-full ${
                      metrics.isWithinGoldenWindow ? 'bg-emerald-400' : 'bg-rose-500'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.round((metrics.timeToAssistanceSeconds / 180) * 100))}%`,
                    }}
                  />
                </div>
              )}
              <div className="text-[9px] text-slate-500 mt-1 flex justify-between">
                <span>0s onset</span>
                <span>Threshold: 180s</span>
              </div>
            </div>

            {/* KPI 2: Detection Latency */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">
                👁 DETECTION LATENCY
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-indigo-300">
                  {metrics.detectionLatencySeconds !== null ? `${metrics.detectionLatencySeconds.toFixed(1)}s` : 'UNAVAILABLE'}
                </span>
                <span className="text-xs text-slate-400">
                  {metrics.detectionLatencySeconds !== null ? 'optical lock' : 'missing event'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Time from distress struggle to AI alarm
              </div>
            </div>

            {/* KPI 3: Kinematic Travel Time */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                ⚡ KINEMATIC TRAVEL TIME
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-amber-300">
                  {metrics.travelTimeSeconds !== null ? `${metrics.travelTimeSeconds.toFixed(1)}s` : 'UNAVAILABLE'}
                </span>
                <span className="text-xs text-slate-400">
                  {metrics.travelTimeSeconds !== null ? 'watercraft transit' : 'unrecorded'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Recorded departure to on-scene arrival
              </div>
            </div>

            {/* KPI 4: Full Resolution Duration */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                🏥 FULL RESOLUTION TIME
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-300">
                  {metrics.incidentDurationSeconds !== null ? `${metrics.incidentDurationSeconds.toFixed(0)}s` : 'ACTIVE / UNRESOLVED'}
                </span>
                <span className="text-xs text-slate-400">to shore triage</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                From water onset to beach clearance
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Task 4: Timing Classification & Missing-Stage Audit Banner */}
      {metrics && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="space-y-0.5">
              <span className="font-bold text-slate-200 text-xs">
                TRUTHFULNESS AUDIT: MEASURED FACTS VS ESTIMATES
              </span>
              <p className="text-[10px] text-slate-400">
                Directly Recorded Events: <strong className="text-emerald-400">{metrics.timingBreakdown.measuredCount}</strong> |{' '}
                Estimated Values: <strong className="text-amber-400">{metrics.timingBreakdown.estimatedCount}</strong> |{' '}
                Unrecorded Stages: <strong className="text-rose-400">{metrics.timingBreakdown.missingCount}</strong>
              </p>
            </div>
          </div>

          {/* Validation Flags if missing events exist */}
          {metrics.validationFlags.length > 0 && (
            <div className="text-[10px] text-amber-300 bg-amber-950/30 border border-amber-800/40 px-2.5 py-1 rounded-lg">
              ⚠️ {metrics.validationFlags[0]}
            </div>
          )}
        </div>
      )}

      {/* 4. Bottleneck Diagnostics Summary */}
      {metrics && metrics.bottlenecks.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-xs text-slate-200 uppercase tracking-wider">
              OPERATIONAL BOTTLENECK DIAGNOSTIC
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {metrics.bottlenecks.map((bn, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border text-[11px] ${
                  bn.severity === 'HIGH'
                    ? 'bg-rose-950/20 border-rose-800/60 text-rose-200'
                    : bn.severity === 'MEDIUM'
                    ? 'bg-amber-950/20 border-amber-800/60 text-amber-200'
                    : 'bg-emerald-950/20 border-emerald-800/60 text-emerald-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                  <span className="text-[9px] px-1 rounded bg-slate-900 font-mono">
                    {bn.stage}
                  </span>
                  <span>[{bn.severity} SEVERITY]</span>
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed">{bn.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Assigned Responder Kinematics Fleet */}
      {activeIncident && activeIncident.assignedResponders.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-xs text-slate-200 uppercase tracking-wider">
                ASSIGNED RESPONDER ASSETS & KINEMATICS ({activeIncident.assignedResponders.length} UNITS)
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Zero synthetic arrival fabrication</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {activeIncident.assignedResponders.map((res) => (
              <div
                key={res.id}
                className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-slate-100">{res.name}</strong>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300">
                    {res.status}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Type: {res.type}</span>
                  <span>Speed: {res.currentSpeed.toFixed(1)} px/s</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Location: ({Math.round(res.position.x)}, {Math.round(res.position.y)})
                  {res.distanceToTargetMeters !== undefined && (
                    <span className="text-amber-400 ml-2">
                      Distance to victim: {res.distanceToTargetMeters}m
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Embedded Interactive Synchronized Timeline Scrubber */}
      {activeIncident && <IncidentTimeline incident={activeIncident} />}

      {/* 7. Automated 8-Scenario Replay Test Suite Audit Report */}
      {testResults.length > 0 && (
        <div className="bg-slate-900/90 border border-indigo-500/40 rounded-2xl p-4 shadow-xl space-y-2">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                STAGE 3 AUTOMATED REPEATABLE TEST SUITE AUDIT ({testResults.filter((t) => t.passed).length}/{testResults.length} PASSED)
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              Verifies missing-stage handling, deduplication, monotonic sorting, and multi-incident isolation
            </span>
          </div>

          <div className="space-y-2">
            {testResults.map((t) => (
              <div
                key={t.testId}
                className={`p-3 rounded-xl border text-[11px] flex flex-wrap items-center justify-between gap-3 ${
                  t.passed ? 'bg-slate-950/80 border-slate-800' : 'bg-rose-950/30 border-rose-800'
                }`}
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        t.passed ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                      }`}
                    >
                      {t.passed ? 'PASS' : 'FAIL'}
                    </span>
                    <strong className="text-slate-100">{t.name}</strong>
                  </div>
                  <p className="text-[10px] text-slate-400">{t.description}</p>
                  <p className="text-[10px] text-cyan-300">{t.actualOutcome}</p>
                </div>

                <div className="text-right space-y-0.5 shrink-0 text-[10px] text-slate-400">
                  <div>
                    Detection: <strong className="text-white">{t.metricsComputed.detectionLatency !== null ? `${t.metricsComputed.detectionLatency}s` : 'NULL'}</strong> |{' '}
                    Dispatch: <strong className="text-white">{t.metricsComputed.dispatchLatency !== null ? `${t.metricsComputed.dispatchLatency}s` : 'NULL'}</strong>
                  </div>
                  <div>
                    Travel: <strong className="text-white">{t.metricsComputed.travelTime !== null ? `${t.metricsComputed.travelTime}s` : 'NULL'}</strong> |{' '}
                    Assist: <strong className="text-emerald-300">{t.metricsComputed.timeToAssistance !== null ? `${t.metricsComputed.timeToAssistance}s` : 'NULL'}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
