import React from 'react';
import { IoTManager, DataSourceMode } from '../IoTManager';
import { DataSourceSwitcher } from './DataSourceSwitcher';
import { SensorCard } from './SensorCard';
import { SensorFusionMatrix } from './SensorFusionMatrix';
import { SensorReading } from '../models/SensorReading';

interface IoTCommandCenterProps {
  iotManager: IoTManager;
  onModeChange: (mode: DataSourceMode) => void;
  onToggleSensor: (sensorId: string) => void;
}

export const IoTCommandCenter: React.FC<IoTCommandCenterProps> = ({
  iotManager,
  onModeChange,
  onToggleSensor,
}) => {
  const currentMode = iotManager.getDataSourceMode();
  const sensors = iotManager.getAllSensors();
  const fusedState = iotManager.getLatestFusedState();
  const offlineBuffer = iotManager.getOfflineBuffer();
  const ingestionService = iotManager.getIngestionService();

  const onlineCount = sensors.filter((s) => s.status === 'ONLINE').length;
  const degradedCount = sensors.filter((s) => s.status === 'DEGRADED').length;
  const offlineCount = sensors.filter((s) => s.status === 'OFFLINE').length;

  const bufferCount = offlineBuffer.getBufferedCount();
  const isNetworkOnline = offlineBuffer.getOnlineStatus();

  return (
    <div className="space-y-6">
      {/* Top Header & Mode Control */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              PHASE 12 • DIGITAL TWIN FOUNDATION
            </span>
            <span className="text-xs text-slate-400 font-mono">Unified Ingestion Pipeline</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-100 tracking-tight mt-1">
            IoT & Physical Sensor Fleet Ingestion
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-0.5">
            Normalized sensor abstraction layer harmonizing acoustic tide gauges, wave buoys, Doppler profilers, and AWS meteorological stations into source-agnostic safety intelligence.
          </p>
        </div>

        {/* Mode Switcher */}
        <div>
          <DataSourceSwitcher mode={currentMode} onModeChange={onModeChange} />
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Fleet Status</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-400">{onlineCount}</span>
            <span className="text-xs font-mono text-slate-400">/ {sensors.length} Online</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {degradedCount} Degraded • {offlineCount} Offline
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Fusion Confidence</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-cyan-300">
              {fusedState ? `${(fusedState.overallConfidence * 100).toFixed(1)}%` : '--'}
            </span>
            <span className="text-xs font-mono text-slate-400">Composite</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Bayesian cross-validation active
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Edge Buffer (Store & Fwd)</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-amber-300">{bufferCount}</span>
            <span className="text-xs font-mono text-slate-400">Readings Queued</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-mono ${isNetworkOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
              ● {isNetworkOnline ? 'Link Online' : 'Link Disconnected'}
            </span>
            <button
              onClick={() => offlineBuffer.setOnlineStatus(!isNetworkOnline)}
              className="text-[9px] font-mono underline text-slate-400 hover:text-slate-200"
            >
              Toggle Link
            </button>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Ingested Telemetry</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-indigo-300">
              {sensors.length * 60}
            </span>
            <span className="text-xs font-mono text-slate-400">pts / min</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Protocols: MQTT • LoRaWAN • Modbus
          </div>
        </div>
      </div>

      {/* Sensor Fusion Matrix */}
      <SensorFusionMatrix fusedState={fusedState} />

      {/* Sensor Fleet Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-wide uppercase text-slate-200">
            Hardware & Virtual Telemetry Fleet ({sensors.length} Devices)
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Click 'Toggle Device Health' to simulate field degradation / network dropout
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sensors.map((sensor) => {
            const latestReading = ingestionService.getLatestReading(sensor.id);
            return (
              <SensorCard
                key={sensor.id}
                sensor={sensor}
                latestReading={latestReading}
                onToggleStatus={onToggleSensor}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
