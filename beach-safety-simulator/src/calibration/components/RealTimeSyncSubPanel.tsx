/**
 * src/calibration/components/RealTimeSyncSubPanel.tsx
 * 
 * TIDES — Phase 9: Digital Twin Calibration & Real-Time Synchronization
 * 
 * Real-Time Synchronization and Source Mode Governance Sub-Panel.
 * Controls digital twin source modes, displays device synchronization latency,
 * tracks temporal ordering, and manages offline buffer synchronization.
 */

import React, { useState } from 'react';
import { DigitalTwinSyncEngine } from '../DigitalTwinSyncEngine';
import {
  DigitalTwinSourceMode,
  DeviceSyncHealth,
} from '../digitalTwinObservation.types';
import {
  RefreshCw,
  Activity,
  Wifi,
  WifiOff,
  Clock,
  Shield,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sliders,
  Info,
} from 'lucide-react';

export const RealTimeSyncSubPanel: React.FC = () => {
  const syncEngine = DigitalTwinSyncEngine.getInstance();

  const [sourceMode, setSourceMode] = useState<DigitalTwinSourceMode>(syncEngine.getActiveSourceMode());
  const [devices, setDevices] = useState<DeviceSyncHealth[]>(syncEngine.getAllDeviceHealths());
  const [offlineCount, setOfflineCount] = useState<number>(syncEngine.getOfflineBufferSize('RUSHIKONDA'));
  const [testVariable, setTestVariable] = useState<string>('WAVE_HEIGHT');
  const [testValue, setTestValue] = useState<string>('1.45');
  const [lastActionFeedback, setLastActionFeedback] = useState<string | null>(null);

  const refreshState = () => {
    setDevices(syncEngine.getAllDeviceHealths());
    setOfflineCount(syncEngine.getOfflineBufferSize('RUSHIKONDA'));
  };

  const handleSourceModeChange = (mode: DigitalTwinSourceMode) => {
    syncEngine.setActiveSourceMode(mode, 'OP-COMMAND-HUD');
    setSourceMode(mode);
    setLastActionFeedback(`Digital Twin Source Mode switched to: ${mode}`);
    refreshState();
  };

  const handleSimulateIngestion = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(testValue);
    if (isNaN(val)) return;

    const now = Date.now();
    const res = syncEngine.ingestObservation({
      observationId: `OBS-LIVE-${now}`,
      sourceId: testVariable === 'WAVE_HEIGHT' ? 'INCOIS-WAVE-BUOY-01' : testVariable === 'WIND_SPEED' ? 'IMD-AWS-VIZAG-COAST' : 'NIOT-TIDE-GAUGE-01',
      sourceType: testVariable === 'WAVE_HEIGHT' ? 'WAVE_BUOY' : testVariable === 'WIND_SPEED' ? 'WEATHER_STATION' : 'TIDE_GAUGE',
      siteId: 'RUSHIKONDA',
      variable: testVariable as any,
      rawValue: val,
      rawUnits: testVariable === 'WAVE_HEIGHT' ? 'm' : testVariable === 'WIND_SPEED' ? 'km/h' : 'm',
      sourceTimestamp: now - 350, // 350ms ago
      currentSimulationValue: testVariable === 'WAVE_HEIGHT' ? 1.20 : testVariable === 'WIND_SPEED' ? 18.0 : 0.85,
    });

    setLastActionFeedback(
      `Ingested observation: ${res.observation.observationId}. Raw: ${res.observation.rawValue}${res.observation.rawUnits} -> Calibrated: ${res.observation.calibratedValue}${res.observation.calibratedUnits} (${res.observation.qualityStatus}). Discrepancy: ${res.discrepancy ? res.discrepancy.classification : 'None'}`
    );
    refreshState();
  };

  const handleFlushBuffer = () => {
    const res = syncEngine.flushOfflineBuffer('RUSHIKONDA');
    setLastActionFeedback(`Offline buffer flushed: ${res.flushedCount} synced, ${res.duplicatesFiltered} duplicates filtered.`);
    refreshState();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SYNCHRONIZED':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">SYNCHRONIZED</span>;
      case 'DELAYED':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-950 text-blue-300 border border-blue-800">DELAYED</span>;
      case 'STALE':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-800">STALE</span>;
      case 'UNCALIBRATED':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-950 text-purple-300 border border-purple-800">UNCALIBRATED</span>;
      case 'FAILED':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800">FAILED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-slate-400 border border-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs select-none">
      {/* 1. Source Mode Governance Banner */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Digital Twin Operational Source Mode
            </h4>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Deterministic simulation clock and visitor safety rules are preserved</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[
            {
              id: 'SIMULATION_ONLY',
              label: '1. Simulation Only',
              desc: '100% deterministic physics & simulation. Zero live data injection. Default baseline.',
              color: 'cyan',
            },
            {
              id: 'OBSERVED_ONLY',
              label: '2. Observed Only',
              desc: 'Displays verified real-world measurements for supported coastal sensor fields.',
              color: 'emerald',
            },
            {
              id: 'SIDE_BY_SIDE_COMPARISON',
              label: '3. Side-by-Side',
              desc: 'Renders simulated ground truth alongside live sensor streams for comparative analysis.',
              color: 'amber',
            },
            {
              id: 'VALIDATED_SYNCHRONIZED',
              label: '4. Validated Twin',
              desc: 'Displays twin overlay calibrated against verified in-situ coastal observations.',
              color: 'purple',
            },
          ].map((mode) => {
            const isSelected = sourceMode === mode.id;
            return (
              <div
                key={mode.id}
                onClick={() => handleSourceModeChange(mode.id as DigitalTwinSourceMode)}
                className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1 ${
                  isSelected
                    ? 'bg-cyan-950/80 border-cyan-500 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-[11px] ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                    {mode.label}
                  </span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">{mode.desc}</p>
              </div>
            );
          })}
        </div>

        {lastActionFeedback && (
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 text-[10px]">
            {lastActionFeedback}
          </div>
        )}
      </div>

      {/* 2. Device Synchronization Health Matrix */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Sensor Synchronization Latency & Health Matrix
            </h4>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span>Buffer: {offlineCount} pending</span>
            {offlineCount > 0 && (
              <button
                onClick={handleFlushBuffer}
                className="px-2 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 font-bold cursor-pointer"
              >
                Flush Reconnect Buffer
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                <th className="pb-2 font-bold">Device Name</th>
                <th className="pb-2 font-bold">Source Type</th>
                <th className="pb-2 font-bold">Sync Status</th>
                <th className="pb-2 font-bold">Last Value</th>
                <th className="pb-2 font-bold">Latency</th>
                <th className="pb-2 font-bold">Updates</th>
                <th className="pb-2 font-bold">Duplicates</th>
                <th className="pb-2 font-bold">Out-of-Order</th>
                <th className="pb-2 font-bold">Calibration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {devices.map((d) => (
                <tr key={d.deviceId} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-2.5 font-bold text-white pr-2 whitespace-nowrap">
                    <div>{d.deviceName}</div>
                    <span className="text-[9px] text-slate-500 font-normal">{d.deviceId}</span>
                  </td>
                  <td className="py-2.5 text-slate-300 text-[10px]">{d.sourceType}</td>
                  <td className="py-2.5">{getStatusBadge(d.status)}</td>
                  <td className="py-2.5 text-cyan-300 font-bold">
                    {d.lastKnownValue !== undefined ? `${d.lastKnownValue} ${d.units || ''}` : '—'}
                  </td>
                  <td className="py-2.5 text-slate-300">
                    {d.syncLatencyMs > 0 ? `${d.syncLatencyMs} ms` : '—'}
                  </td>
                  <td className="py-2.5 text-slate-300">{d.totalUpdatesReceived}</td>
                  <td className="py-2.5 text-slate-400">{d.duplicateCount}</td>
                  <td className="py-2.5 text-slate-400">{d.outOfOrderCount}</td>
                  <td className="py-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      d.calibrationStatus === 'CALIBRATED_VALID'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {d.calibrationStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Ingestion Pipeline Live Test Harness */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <Send className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Live Telemetry Ingestion & Synchronization Test Harness
          </h4>
        </div>

        <form onSubmit={handleSimulateIngestion} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-[11px]">
          <div>
            <label className="text-slate-400 block mb-1">Target Variable</label>
            <select
              value={testVariable}
              onChange={(e) => setTestVariable(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="WAVE_HEIGHT">Wave Height (INCOIS Buoy 01)</option>
              <option value="WIND_SPEED">Wind Speed (IMD Coastal AWS)</option>
              <option value="TIDE_LEVEL">Tide Level (NIOT Tide Gauge)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Raw Measurement</label>
            <input
              type="text"
              value={testValue}
              onChange={(e) => setTestValue(e.target.value)}
              placeholder="e.g. 1.45"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="text-[10px] text-slate-400">
            <span>Automated checks:</span>
            <div className="text-slate-500 text-[9px]">Units • Gradient • Drift • Calibration Curve • Discrepancy</div>
          </div>

          <button
            type="submit"
            className="w-full py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-cyan-600/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Ingest & Sync Observation</span>
          </button>
        </form>
      </div>
    </div>
  );
};

