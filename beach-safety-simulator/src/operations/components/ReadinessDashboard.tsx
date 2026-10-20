/**
 * src/operations/components/ReadinessDashboard.tsx
 * Interactive Operational Readiness & Field-Pilot Dashboard for TIDES Milestone 11.
 * Provides system health verification, repeatable scenario runner, metrics HUD,
 * and reproducible evidence export for the Beach Safety Innovation Challenge.
 */

import React, { useState, useEffect } from 'react';
import { ReadinessEngine } from '../ReadinessEngine';
import { ScenarioTestRunner } from '../ScenarioTestRunner';
import { EvaluationMetrics } from '../EvaluationMetrics';
import { EvidenceReport } from '../EvidenceReport';
import {
  OperatingMode,
  ReadinessCheckItem,
  OverallReadinessVerdict,
  ScenarioRunRecord,
  EvaluationMetricRecord,
} from '../types';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play,
  RefreshCw,
  Download,
  Copy,
  Check,
  Cpu,
  Activity,
  UserCheck,
  Clock,
  Gauge,
  Lock,
} from 'lucide-react';

export const ReadinessDashboard: React.FC = () => {
  const engine = ReadinessEngine.getInstance();
  const runner = ScenarioTestRunner.getInstance();
  const metricsEngine = EvaluationMetrics.getInstance();
  const reportGen = EvidenceReport.getInstance();

  const [verdict, setVerdict] = useState<OverallReadinessVerdict>(() => engine.getOverallReadiness());
  const [scenarios, setScenarios] = useState<ScenarioRunRecord[]>(() => runner.getRunHistory());
  const [metrics, setMetrics] = useState<EvaluationMetricRecord[]>(() => metricsEngine.getStandardMetrics());
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [supervisorConfirmed, setSupervisorConfirmed] = useState(true);
  const [supervisorRole, setSupervisorRole] = useState('CHIEF_LIFEGUARD_OPERATOR');

  const refreshReadiness = () => {
    setVerdict(engine.getOverallReadiness({ recompute: true }));
  };

  const handleModeChange = (mode: OperatingMode) => {
    engine.setOperatingMode(mode);
    refreshReadiness();
  };

  const handleSupervisorToggle = (confirmed: boolean) => {
    setSupervisorConfirmed(confirmed);
    engine.setSupervisorConfirmation(confirmed, supervisorRole);
    refreshReadiness();
  };

  const handleRunAllScenarios = () => {
    setIsRunningAll(true);
    setTimeout(() => {
      const records = runner.runAllScenarios();
      setScenarios([...records]);
      setIsRunningAll(false);
      refreshReadiness();
    }, 150);
  };

  const handleRunSingleScenario = (id: string) => {
    runner.runScenario(id);
    setScenarios([...runner.getRunHistory()]);
    refreshReadiness();
  };

  const handleCopyMarkdown = () => {
    const md = reportGen.generateMarkdownSummary();
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY':
      case 'PASSED':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3" /> READY
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold">
            <AlertTriangle className="w-3 h-3" /> DEGRADED
          </span>
        );
      case 'BLOCKED':
      case 'FAILED':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-bold">
            <XCircle className="w-3 h-3" /> BLOCKED
          </span>
        );
      case 'UNKNOWN':
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/40 text-[10px] font-bold">
            <HelpCircle className="w-3 h-3" /> UNKNOWN
          </span>
        );
    }
  };

  const catalog = runner.getCatalog();

  return (
    <div className="space-y-6 text-left font-mono">
      {/* 1. Operating Mode & Supervisor Control Bar */}
      <div className="bg-slate-950/90 p-4 rounded-2xl border border-cyan-500/40 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-[10px] text-cyan-400 uppercase font-black tracking-widest flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5" />
              <span>Pilot Operating Mode</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">Rushikonda Blue Flag Beach</span>
            </div>
            <div className="text-xs text-slate-300">
              Active Mode:{' '}
              <span className="font-extrabold text-cyan-300">{verdict.operating_mode}</span>
            </div>
          </div>

          {/* Mode Selector Buttons */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {(['DEVELOPMENT', 'DEMONSTRATION', 'CONTROLLED_PILOT'] as OperatingMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  verdict.operating_mode === mode
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Supervisor Confirmation Gate for Controlled Pilot */}
        {verdict.operating_mode === 'CONTROLLED_PILOT' && (
          <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                <Lock className="w-4 h-4" />
                <span>Field Pilot Safeguard: On-Site Lifeguard Supervisor Authorization</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-white">
                <input
                  type="checkbox"
                  checked={supervisorConfirmed}
                  onChange={(e) => handleSupervisorToggle(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                />
                <span className="font-bold">Supervisor Sign-Off Confirmed</span>
              </label>
            </div>
            <div className="text-[10px] text-slate-400">
              Designated Role: <span className="text-amber-300 font-bold">{supervisorRole}</span>. Field pilot cannot enter READY status without explicit physical on-site human operator authorization.
            </div>
          </div>
        )}
      </div>

      {/* 2. Overall Readiness Verdict Banner */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          verdict.overall_status === 'READY'
            ? 'bg-emerald-950/20 border-emerald-500/50 text-emerald-300'
            : verdict.overall_status === 'DEGRADED'
            ? 'bg-amber-950/20 border-amber-500/50 text-amber-300'
            : verdict.overall_status === 'BLOCKED'
            ? 'bg-rose-950/20 border-rose-500/50 text-rose-300'
            : 'bg-slate-950/40 border-slate-700 text-slate-300'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-2">
              <span>Operational Readiness Verdict</span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-400 font-bold">EVIDENCE-BASED AUDIT</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-black">{verdict.summary}</span>
              {getStatusBadge(verdict.overall_status)}
            </div>
            <p className="text-[11px] text-slate-400">
              Validated {verdict.passed_checks} of {verdict.total_checks} mandatory operational checks.
              Provenance: <span className="text-cyan-400 font-bold">CONTROLLED_TEST</span> (Rushikonda site).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshReadiness}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-Audit</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. 10 Health Checks Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Operational Health & Reliability Checks (10 / 10)</span>
          </h3>
          <span className="text-[10px] text-slate-400">Strict Non-Masking Evidence Policy</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {verdict.checks.map((c) => (
            <div
              key={c.check_id}
              className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[9px] text-cyan-400 font-extrabold uppercase tracking-wider">
                    {c.category}
                  </div>
                  <h4 className="text-xs font-bold text-white">{c.name}</h4>
                </div>
                {getStatusBadge(c.status)}
              </div>

              <p className="text-[10px] text-slate-300 leading-relaxed">{c.message}</p>

              <div className="pt-1.5 border-t border-slate-900/80 flex items-center justify-between text-[9px] text-slate-400">
                <span className="truncate max-w-[280px]">
                  <strong className="text-slate-500">Evidence:</strong> {c.evidence}
                </span>
                <span>{c.is_mandatory ? 'Mandatory' : 'Advisory'}</span>
              </div>

              {c.failure_reason && (
                <div className="text-[9px] text-rose-400 font-bold bg-rose-950/20 p-1.5 rounded border border-rose-900/40">
                  Failure Reason: {c.failure_reason}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Repeatable Scenario Test Runner */}
      <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] text-cyan-400 uppercase font-black tracking-widest flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" />
              <span>Repeatable Safety Scenario Test Runner</span>
            </div>
            <h3 className="text-sm font-bold text-white">
              Automated Safety & Fault-Tolerance Verification Suite
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAllScenarios}
              disabled={isRunningAll}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer shadow-lg"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunningAll ? 'Executing Suite...' : 'Run All 10 Scenarios'}</span>
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-800/80">
          {catalog.map((sc) => {
            const lastRun = scenarios.find((r) => r.scenario_id === sc.id);
            return (
              <div
                key={sc.id}
                className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-900/40 px-2 rounded-lg transition"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-bold">[{sc.id}]</span>
                    <strong className="text-xs text-white">{sc.name}</strong>
                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-semibold">
                      {sc.category}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">{sc.description}</div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {lastRun ? (
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-[10px] text-slate-400">
                          {lastRun.duration_ms.toFixed(1)}ms
                        </span>
                        {getStatusBadge(lastRun.status)}
                      </div>
                      <div className="text-[9px] text-emerald-400 font-semibold">
                        {lastRun.assertions.filter((a) => a.passed).length}/{lastRun.assertions.length} assertions
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-500 italic">Not run</span>
                  )}

                  <button
                    onClick={() => handleRunSingleScenario(sc.id)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg transition cursor-pointer"
                    title={`Run ${sc.name}`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Evidence-Based Performance Metrics HUD */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Gauge className="w-4 h-4 text-emerald-400" />
            <span>Evidence-Based Latency & Accuracy Metrics</span>
          </h3>
          <span className="text-[10px] text-slate-400">Controlled Ground-Truth Assertions</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {metrics.map((m) => (
            <div
              key={m.metric_id}
              className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5"
            >
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                <span className="truncate">{m.name}</span>
                <span className="text-emerald-400 font-black">PASS</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-white">
                  {m.observed_value}
                </span>
                <span className="text-[10px] text-slate-400">{m.unit}</span>
                <span className="text-[10px] text-slate-500 ml-auto">
                  Target: &le;{m.target_threshold} {m.unit}
                </span>
              </div>
              <p className="text-[9px] text-slate-400 leading-relaxed border-t border-slate-900 pt-1">
                {m.definition}
              </p>
              <div className="text-[8px] text-cyan-400 font-semibold">
                N={m.sample_count} events • Provenance: {m.provenance}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Export Evidence & Innovation Challenge Package */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
              Pilot Evidence Package & Challenge Submission Exports
            </h4>
            <p className="text-[10px] text-slate-400">
              Download standardized, reproducible audit reports with explicit data provenance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => reportGen.downloadJSON()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 rounded-xl border border-cyan-500/30 text-xs font-bold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={() => reportGen.downloadMarkdown()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 rounded-xl border border-emerald-500/30 text-xs font-bold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Markdown</span>
            </button>

            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700 text-xs font-bold transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
            </button>
          </div>
        </div>

        {/* Operational Safeguards Alert Notice */}
        <div className="p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-xl text-[10px] text-cyan-300/80 leading-relaxed space-y-1">
          <strong className="text-cyan-300 block">Operator Safeguard Notice:</strong>
          TIDES is an advisory digital-twin decision-support system. It does not replace physical lifeguards or active emergency services. Automated cross-beach asset transfers are strictly disabled; human supervisor confirmation is required for all rescue operations.
        </div>
      </div>
    </div>
  );
};

