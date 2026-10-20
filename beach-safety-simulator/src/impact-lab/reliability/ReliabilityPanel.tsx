import React, { useState, useEffect, useMemo } from 'react';
import { useTelemetry } from '../hooks/useTelemetry';
import { SensorHealthMonitor } from './SensorHealthMonitor';
import { FailureScenarioRunner } from './FailureScenarioRunner';
import { DegradedOutputDetector } from './DegradedOutputDetector';
import { ReliabilityTestSuite } from './tests/ReliabilityTestSuite';
import {
  SensorHealthRecord,
  DependentSafetyOutput,
  TestExecutionRecord,
} from '../types';
import {
  Radio,
  Camera,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  RotateCcw,
  Zap,
  Info,
  Clock,
  Layers,
  ShieldAlert,
  Play,
  FileCheck2,
  HelpCircle,
  EyeOff,
  Flame,
} from 'lucide-react';

export const ReliabilityPanel: React.FC = () => {
  const { latestSnapshot } = useTelemetry();
  const healthMonitor = SensorHealthMonitor.getInstance();
  const failureRunner = FailureScenarioRunner.getInstance();
  const outputDetector = DegradedOutputDetector.getInstance();
  const testSuite = ReliabilityTestSuite.getInstance();

  const [activeFaults, setActiveFaults] = useState(failureRunner.getActiveFaults());
  const [sensors, setSensors] = useState<SensorHealthRecord[]>(healthMonitor.getAllSensors());
  const [dependentOutputs, setDependentOutputs] = useState<DependentSafetyOutput[]>(
    outputDetector.evaluateDependentOutputs()
  );

  const [testResults, setTestResults] = useState<TestExecutionRecord[]>(testSuite.getTestResults());
  const [isRunningSuite, setIsRunningSuite] = useState<boolean>(false);
  const [selectedSensorFilter, setSelectedSensorFilter] = useState<'ALL' | 'CAMERAS' | 'IOT' | 'DEGRADED'>('ALL');

  useEffect(() => {
    const unsub = failureRunner.subscribe(() => {
      setActiveFaults(failureRunner.getActiveFaults());
      setSensors([...healthMonitor.getAllSensors()]);
      setDependentOutputs(outputDetector.evaluateDependentOutputs());
    });
    return () => unsub();
  }, [failureRunner, healthMonitor, outputDetector]);

  useEffect(() => {
    if (latestSnapshot) {
      failureRunner.tick(latestSnapshot.simTimeSeconds, latestSnapshot.timeDisplay);
      setSensors([...healthMonitor.getAllSensors()]);
      setDependentOutputs(outputDetector.evaluateDependentOutputs());
    }
  }, [latestSnapshot, failureRunner, healthMonitor, outputDetector]);

  const latencyMetrics = healthMonitor.getLatencyMetrics();

  const filteredSensors = sensors.filter((s) => {
    if (selectedSensorFilter === 'CAMERAS') return s.category === 'CCTV_CAMERA';
    if (selectedSensorFilter === 'IOT') return s.category !== 'CCTV_CAMERA';
    if (selectedSensorFilter === 'DEGRADED') return s.status !== 'HEALTHY';
    return true;
  });

  const handleRunTestSuite = async () => {
    setIsRunningSuite(true);
    const results = await testSuite.runFullSuite();
    setTestResults(results);
    setIsRunningSuite(false);
    setSensors([...healthMonitor.getAllSensors()]);
    setDependentOutputs(outputDetector.evaluateDependentOutputs());
  };

  return (
    <div className="space-y-4 font-mono text-slate-200 text-xs">
      {/* 1. Header & Demonstration Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold">
                STAGE 2 — DEMO B
              </span>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-400" />
                Sensor & Camera Failure Monitoring & Data-Quality Awareness
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Tracks individual stream freshness, distinguishes offline from stale data, prevents synthetic substitution, and marks dependent safety outputs degraded.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunTestSuite}
              disabled={isRunningSuite}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              {isRunningSuite ? 'Running 6-Stage Suite...' : 'Run Automated 6-Test Suite'}
            </button>
            <button
              onClick={() => failureRunner.restoreAllFeeds()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore All Feeds
            </button>
          </div>
        </div>

        {/* 4 Health Scorecards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          {/* A. Detection Latency */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
              ⏱ FAULT DETECTION LATENCY
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-100">
                {latencyMetrics.detectionLatency.toFixed(2)}s
              </span>
              <span className="text-xs text-emerald-400 font-semibold">&lt; 0.5s SLA</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Reaction time to classify dropped/stale stream
            </div>
          </div>

          {/* B. Measured Recovery Latency */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
              🔄 MEASURED RECOVERY TIME
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-300">
                {latencyMetrics.recoveryTime.toFixed(2)}s
              </span>
              <span className="text-xs text-slate-400">verified</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Requires 2-3 consecutive valid packets
            </div>
          </div>

          {/* C. Fleet Health */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">
              📊 SENSOR STREAMS HEALTH
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-indigo-300">
                {sensors.filter((s) => s.status === 'HEALTHY').length} / {sensors.length}
              </span>
              <span className="text-xs text-slate-400">
                ({Math.round((sensors.filter((s) => s.status === 'HEALTHY').length / sensors.length) * 100)}%)
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {sensors.filter((s) => s.status === 'UNKNOWN').length} unknown source preserved
            </div>
          </div>

          {/* D. Active Test Injections */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">
              🚨 ACTIVE TEST INJECTIONS
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-rose-300">{activeFaults.length}</span>
              <span className="text-xs text-slate-400">isolated test faults</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Zero mutation of simulation models
            </div>
          </div>
        </div>
      </div>

      {/* 2. Isolated Failure Injection Test Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            ISOLATED TEST HARNESS CONTROLS (STAGE 2 EVALUATION)
          </span>
          <span className="text-[10px] text-slate-400">Non-mutating test input stream filter</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Action 1: Drop Camera Offline */}
          <button
            onClick={() => failureRunner.injectCameraOffline('CAM-02', latestSnapshot?.simTimeSeconds || 0)}
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-500/60 hover:bg-rose-950/20 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-rose-400 mb-1">
              <span>Drop CAM-02 Offline</span>
              <Camera className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              CCTV Tower B RTSP feed unavailable. Tests offline detection (&gt;8s).
            </p>
          </button>

          {/* Action 2: Delayed Telemetry */}
          <button
            onClick={() => failureRunner.injectDelayedTelemetry('CURRENT-ADCP-01', latestSnapshot?.simTimeSeconds || 0, 18)}
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/60 hover:bg-amber-950/20 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-1">
              <span>Delay ADCP (+18s)</span>
              <Clock className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Delay current profiler packet arrival past 6s stale limit.
            </p>
          </button>

          {/* Action 3: Stale Frame Replay */}
          <button
            onClick={() => failureRunner.injectStaleReading('CAM-03', latestSnapshot?.simTimeSeconds || 0, 28)}
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/60 hover:bg-purple-950/20 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-purple-400 mb-1">
              <span>Freeze CAM-03 (+28s)</span>
              <EyeOff className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Replay frozen frame buffer on cliff camera. Tests stale rejection.
            </p>
          </button>

          {/* Action 4: Invalid Out-of-Range */}
          <button
            onClick={() => failureRunner.injectInvalidMeasurement('WAVE-BUOY-01', latestSnapshot?.simTimeSeconds || 0)}
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/60 hover:bg-cyan-950/20 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-cyan-400 mb-1">
              <span>Buoy Spike (8.5m)</span>
              <Activity className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Inject unphysical 8.5m wave spike. Tests range validity bounds.
            </p>
          </button>

          {/* Action 5: Multiple Simultaneous Failures */}
          <button
            onClick={() => failureRunner.injectMultipleSimultaneousFailures(latestSnapshot?.simTimeSeconds || 0)}
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-400 hover:bg-rose-950/30 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-rose-300 mb-1">
              <span>Compound Crisis (4x)</span>
              <Flame className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Simultaneous drop of 2 cameras, ADCP delay, and wave buoy spike.
            </p>
          </button>
        </div>
      </div>

      {/* 3. Task 4: Reliability-Aware Dependent Output Status Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              DOWNSTREAM SAFETY OUTPUT STATUS & DEGRADATION REASONS ({dependentOutputs.length} SERVICES)
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            Rules: Zero silent stale substitution · Model confidence separated from source reliability
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                <th className="py-2 px-3">SAFETY OUTPUT & ZONE</th>
                <th className="py-2 px-3">TYPE</th>
                <th className="py-2 px-3">REQUIRED SENSORS</th>
                <th className="py-2 px-3">OUTPUT STATE</th>
                <th className="py-2 px-3">AI MODEL CONFIDENCE</th>
                <th className="py-2 px-3">SOURCE RELIABILITY</th>
                <th className="py-2 px-3">DEGRADATION DIAGNOSTIC & OPERATIONAL ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {dependentOutputs.map((out) => {
                const isNominal = out.status === 'NOMINAL';
                const isDegraded = out.status === 'DEGRADED';
                const isUnavailable = out.status === 'UNAVAILABLE';

                return (
                  <tr key={out.outputId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-100">
                      {out.name}
                      <span className="text-[9px] text-cyan-400 block font-normal">
                        Zone: {out.affectedZoneId} ({out.outputId})
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[10px] font-mono">
                      {out.outputType}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px]">
                      {out.requiredSensorIds.map((sid) => (
                        <span key={sid} className="px-1.5 py-0.2 mr-1 rounded bg-slate-800 text-slate-300">
                          {sid}
                        </span>
                      ))}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isNominal
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : isDegraded
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        }`}
                      >
                        {out.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {out.rawAIConfidence !== undefined ? (
                        <span className="font-bold text-cyan-300">
                          {Math.round(out.rawAIConfidence * 100)}%
                        </span>
                      ) : (
                        <span className="text-slate-600">N/A (Physical)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <span
                        className={`font-bold ${
                          out.sourceReliability > 0.8
                            ? 'text-emerald-400'
                            : out.sourceReliability > 0.4
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {Math.round(out.sourceReliability * 100)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 max-w-sm">
                      {out.degradationReason ? (
                        <div className="space-y-0.5">
                          <p className="text-[10px] text-rose-300 leading-tight">
                            {out.degradationReason}
                          </p>
                          <p className="text-[9px] text-amber-300 font-semibold">
                            &gt; {out.operationalRecommendation}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[10px] text-emerald-400">
                          ✓ {out.operationalRecommendation}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Complete Sensor Fleet Inventory Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between pb-2 mb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              REAL SENSOR FLEET HEALTH & QUALITY AUDIT ({sensors.length} SOURCES)
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 text-[10px]">
            {(['ALL', 'CAMERAS', 'IOT', 'DEGRADED'] as const).map((filt) => (
              <button
                key={filt}
                onClick={() => setSelectedSensorFilter(filt)}
                className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                  selectedSensorFilter === filt
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                {filt}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                <th className="py-2 px-3">SENSOR ID & NAME</th>
                <th className="py-2 px-3">CATEGORY</th>
                <th className="py-2 px-3">ZONE</th>
                <th className="py-2 px-3">LAST OBSERVED</th>
                <th className="py-2 px-3">AGE</th>
                <th className="py-2 px-3">STATUS</th>
                <th className="py-2 px-3">QUALITY FLAGS</th>
                <th className="py-2 px-3">THRESHOLDS (WARN / STALE / OFF)</th>
                <th className="py-2 px-3">HEALTH DIAGNOSTIC</th>
                <th className="py-2 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSensors.map((s) => {
                const isHealthy = s.status === 'HEALTHY';
                const isOffline = s.status === 'OFFLINE';
                const isStale = s.status === 'STALE';
                const isUnknown = s.status === 'UNKNOWN';

                return (
                  <tr key={s.sensorId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-100">
                      {s.name}
                      <span className="text-[9px] text-slate-500 block font-normal">{s.sensorId}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 text-[10px]">
                      {s.category.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-3 text-cyan-400 font-semibold">{s.zoneId || 'GLOBAL'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300 text-[10px]">
                      {s.lastObservationTimeDisplay}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <span
                        className={`font-bold ${
                          s.observationAgeSeconds > s.thresholds.staleAgeSeconds
                            ? 'text-rose-400'
                            : s.observationAgeSeconds > s.thresholds.warningAgeSeconds
                            ? 'text-amber-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {s.observationAgeSeconds > 900 ? 'N/A' : `${s.observationAgeSeconds.toFixed(1)}s`}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isHealthy
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : isOffline
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : isStale
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : isUnknown
                            ? 'bg-slate-700/60 text-slate-300 border border-slate-600'
                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1 flex-wrap">
                        {s.qualityFlags.map((flag) => (
                          <span
                            key={flag}
                            className="px-1.5 py-0.2 rounded bg-slate-800 text-[9px] font-mono text-slate-300 border border-slate-700"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">
                      {s.thresholds.warningAgeSeconds}s / {s.thresholds.staleAgeSeconds}s / {s.thresholds.offlineAgeSeconds}s
                    </td>
                    <td className="py-2.5 px-3 text-[10px] text-slate-400 max-w-xs truncate">
                      {s.healthReason}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {s.isTestFaultInjected ? (
                        <button
                          onClick={() => failureRunner.restoreFeed(s.sensorId)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold cursor-pointer transition-all"
                        >
                          Restore Feed
                        </button>
                      ) : s.status !== 'UNKNOWN' ? (
                        <button
                          onClick={() => failureRunner.injectCameraOffline(s.sensorId, latestSnapshot?.simTimeSeconds || 0)}
                          className="px-2 py-1 rounded bg-slate-800/60 hover:bg-rose-950 text-slate-400 hover:text-rose-300 text-[10px] cursor-pointer transition-all"
                        >
                          Test Drop
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-600">Unobserved</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Automated 6-Test Suite Execution Audit Report */}
      {testResults.length > 0 && (
        <div className="bg-slate-900/90 border border-indigo-500/40 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                AUTOMATED 6-SCENARIO EVALUATION AUDIT REPORT ({testResults.filter((t) => t.passed).length}/{testResults.length} PASSED)
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              Evaluates detection latency, stale vs offline classification, and hysteresis recovery
            </span>
          </div>

          <div className="space-y-2">
            {testResults.map((t) => (
              <div
                key={t.scenarioId}
                className={`p-3 rounded-xl border text-[11px] flex flex-wrap items-center justify-between gap-3 ${
                  t.passed
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-rose-950/30 border-rose-800'
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
                    <strong className="text-slate-100">{t.scenarioName}</strong>
                    <span className="text-[10px] text-slate-500 font-mono">[{t.targetSensorId}]</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{t.injectedCondition}</p>
                  <p className="text-[10px] text-cyan-300">{t.notes}</p>
                </div>

                <div className="text-right space-y-0.5 shrink-0">
                  <div className="text-[10px]">
                    <span className="text-slate-500">Expected:</span>{' '}
                    <strong className="text-slate-300">{t.expectedStatus}</strong> |{' '}
                    <span className="text-slate-500">Actual:</span>{' '}
                    <strong className={t.actualStatus === t.expectedStatus ? 'text-emerald-400' : 'text-rose-400'}>
                      {t.actualStatus}
                    </strong>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Detection Latency: <strong className="text-white">{t.detectionLatencySeconds.toFixed(2)}s</strong>
                    {t.recoveryTimeSeconds !== undefined && (
                      <span> | Recovery: <strong className="text-emerald-300">{t.recoveryTimeSeconds.toFixed(2)}s</strong></span>
                    )}
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
