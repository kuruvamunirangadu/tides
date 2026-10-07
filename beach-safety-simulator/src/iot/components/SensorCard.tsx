import React from 'react';
import { Sensor } from '../models/Sensor';
import { SensorReading } from '../models/SensorReading';

interface SensorCardProps {
  sensor: Sensor;
  latestReading?: SensorReading;
  onToggleStatus?: (sensorId: string) => void;
}

export const SensorCard: React.FC<SensorCardProps> = ({
  sensor,
  latestReading,
  onToggleStatus,
}) => {
  const health = sensor.getHealth();

  const getStatusBadge = () => {
    switch (sensor.status) {
      case 'ONLINE':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/30">● ONLINE</span>;
      case 'DEGRADED':
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] border border-amber-500/30">▲ DEGRADED</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[10px] border border-rose-500/30">✖ OFFLINE</span>;
    }
  };

  const renderValue = () => {
    if (!latestReading) return <span className="text-slate-500 font-mono">No signal</span>;
    if (typeof latestReading.value === 'number') {
      return (
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold font-mono text-slate-100">{latestReading.value}</span>
          <span className="text-xs font-mono text-cyan-400">{latestReading.unit}</span>
        </div>
      );
    }
    if (typeof latestReading.value === 'object' && latestReading.value !== null) {
      const p = latestReading.value as Record<string, any>;
      if (p.windSpeedKmh !== undefined) {
        return (
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-slate-100">{p.windSpeedKmh}</span>
            <span className="text-xs font-mono text-cyan-400">km/h ({p.condition})</span>
          </div>
        );
      }
    }
    return <span className="text-xs font-mono text-slate-300">Active telemetry</span>;
  };

  return (
    <div className="bg-slate-900/85 border border-slate-800 rounded-xl p-3.5 shadow-lg flex flex-col justify-between space-y-3 hover:border-slate-700 transition-all">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono font-bold text-xs text-cyan-300">{sensor.id}</span>
          {getStatusBadge()}
        </div>
        <h4 className="text-xs font-semibold text-slate-200 mt-1 line-clamp-1">{sensor.name}</h4>
        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
          {sensor.metadata.manufacturer} • {sensor.metadata.model}
        </div>
      </div>

      {/* Live Reading Display */}
      <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-lg flex items-center justify-between">
        <div>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Telemetric Reading
          </span>
          {renderValue()}
        </div>
        <div className="text-right font-mono text-[10px]">
          <span className="text-slate-400 block">Confidence</span>
          <span className="text-emerald-400 font-bold">
            {latestReading ? `${(latestReading.confidence * 100).toFixed(0)}%` : '--'}
          </span>
        </div>
      </div>

      {/* Telemetry Diagnostics Bar */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/60 font-mono text-[10px] text-slate-400">
        <div>
          Protocol: <strong className="text-slate-300">{sensor.metadata.communicationProtocol}</strong>
        </div>
        <div>
          Battery: <strong className="text-slate-300">{health.batteryLevel || 100}%</strong>
        </div>
        <div>
          Latency: <strong className="text-cyan-400">{health.latencyMs}ms</strong>
        </div>
      </div>

      {/* Controls & Fault Injection */}
      {onToggleStatus && (
        <button
          onClick={() => onToggleStatus(sensor.id)}
          className="w-full py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono transition-colors"
        >
          Toggle Device Health ({sensor.status})
        </button>
      )}
    </div>
  );
};
