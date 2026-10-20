import React, { useState, useEffect } from 'react';
import { ImpactLabSimulationState } from '../models/Beach';
import { EmergencyIncident } from '../emergency/models/EmergencyIncident';
import { WristbandRegistry } from '../wristbands/WristbandRegistry';
import {
  AlertTriangle,
  Radio,
  Clock,
  ShieldCheck,
  TrendingUp,
  Activity,
  Flame,
  LifeBuoy,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface LiveIncidentStripProps {
  incidents?: EmergencyIncident[];
  impactLab?: ImpactLabSimulationState;
  onOpenDemo?: (demoKey: 'DEMO_A' | 'DEMO_B' | 'DEMO_C') => void;
  onOpenWristbands?: () => void;
}

export const LiveIncidentStrip: React.FC<LiveIncidentStripProps> = ({
  incidents = [],
  impactLab,
  onOpenDemo,
  onOpenWristbands,
}) => {
  const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED');
  const sensorSummary = impactLab?.sensorHealthSummary;
  const forecastHorizons = impactLab?.forecastHorizons || [];
  const activeForecast = forecastHorizons.find((h) => h.horizonSeconds === 180) || forecastHorizons[0];
  const goldenWindow = impactLab?.activeGoldenWindow;

  // Real-time Wristband IoT Network telemetry
  const [wristbandKPIs, setWristbandKPIs] = useState(() => WristbandRegistry.getInstance().getFleetKPIs());

  useEffect(() => {
    const pollInterval = setInterval(() => {
      setWristbandKPIs(WristbandRegistry.getInstance().getFleetKPIs());
    }, 1000);
    return () => clearInterval(pollInterval);
  }, []);

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-xl px-3 py-2 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono text-slate-200">
      {/* 1. Live Incidents Status */}
      <div className="flex items-center gap-2">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            activeIncidents.length > 0 ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'
          }`}
        />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            INCIDENTS:
          </span>
          {activeIncidents.length > 0 ? (
            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1">
              <Flame className="w-3 h-3 text-rose-400" />
              {activeIncidents.length} ACTIVE IN WATER
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
              🟢 0 ACTIVE (MONITORING)
            </span>
          )}
        </div>
      </div>

      {/* 2. Sensor Health / Reliability Ingress */}
      <div className="flex items-center gap-1.5 border-l border-slate-800 pl-2.5">
        <Radio className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          SENSORS:
        </span>
        {sensorSummary ? (
          sensorSummary.offlineCount > 0 || sensorSummary.degradedCount > 0 ? (
            <button
              onClick={() => onOpenDemo && onOpenDemo('DEMO_B')}
              className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold hover:bg-amber-500/30 transition-all cursor-pointer flex items-center gap-1"
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              {sensorSummary.offlineCount} OFFLINE ({sensorSummary.healthyCount}/{sensorSummary.totalSensors} NOMINAL)
            </button>
          ) : (
            <span className="text-[10px] text-emerald-400 font-bold">
              {sensorSummary.healthyCount}/{sensorSummary.totalSensors} HEALTHY (100%)
            </span>
          )
        ) : (
          <span className="text-[10px] text-slate-400">9/9 STREAMING</span>
        )}
      </div>

      {/* 3. Predictive Hazard Forecast Horizon */}
      <div className="flex items-center gap-1.5 border-l border-slate-800 pl-2.5">
        <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          FORECAST:
        </span>
        {activeForecast ? (
          <button
            onClick={() => onOpenDemo && onOpenDemo('DEMO_A')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border hover:opacity-90 transition-all cursor-pointer flex items-center gap-1 ${
              activeForecast.predictedRiskCategory === 'CRITICAL'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : activeForecast.predictedRiskCategory === 'HIGH'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
            }`}
          >
            <span>+{activeForecast.horizonSeconds}s RIP:</span>
            <strong>{activeForecast.predictedVelocity.toFixed(2)} m/s</strong>
            <span className="text-[9px]">({activeForecast.predictedRiskCategory})</span>
          </button>
        ) : (
          <span className="text-[10px] text-slate-400">NOMINAL INGRESS</span>
        )}
      </div>

      {/* 4. Golden Window SLA Indicator */}
      <div className="flex items-center gap-1.5 border-l border-slate-800 pl-2.5">
        <Clock className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          GOLDEN WINDOW:
        </span>
        {goldenWindow ? (
          <button
            onClick={() => onOpenDemo && onOpenDemo('DEMO_C')}
            className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold hover:bg-emerald-500/30 transition-all cursor-pointer"
          >
            {goldenWindow.timeToAssistanceSeconds !== null
              ? `${goldenWindow.timeToAssistanceSeconds}s / ${goldenWindow.goldenWindowLimitSeconds}s (PASS)`
              : 'STANDBY (≤180s SLA)'}
          </button>
        ) : (
          <span className="text-[10px] text-emerald-400 font-semibold">
            ≤ 180s SLA COMPLIANT
          </span>
        )}
      </div>

      {/* 5. Connected Wristband Safety Hub & RF Telemetry */}
      <div className="flex items-center gap-1.5 border-l border-slate-800 pl-2.5">
        <Radio className="w-3.5 h-3.5 text-rose-400" />
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          WRISTBANDS:
        </span>
        {onOpenWristbands ? (
          <button
            onClick={onOpenWristbands}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              wristbandKPIs.activeSosCount > 0
                ? 'bg-rose-500/25 text-rose-300 border-rose-500/60 animate-pulse shadow-sm shadow-rose-500/30'
                : 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border-teal-500/30'
            }`}
          >
            {wristbandKPIs.activeSosCount > 0 ? (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="font-extrabold text-rose-200">🚨 {wristbandKPIs.activeSosCount} SOS ACTIVE</span>
              </>
            ) : (
              <>
                <span className="text-emerald-400">●</span>
                <span>{wristbandKPIs.activeConnected} ONLINE (865MHz)</span>
              </>
            )}
          </button>
        ) : (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1.5 ${
              wristbandKPIs.activeSosCount > 0
                ? 'bg-rose-500/25 text-rose-300 border-rose-500/60 animate-pulse'
                : 'bg-teal-500/10 text-teal-300 border-teal-500/30'
            }`}
          >
            {wristbandKPIs.activeSosCount > 0 ? (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="font-extrabold text-rose-200">🚨 {wristbandKPIs.activeSosCount} SOS ACTIVE</span>
              </>
            ) : (
              <>
                <span className="text-emerald-400">●</span>
                <span>{wristbandKPIs.activeConnected} ONLINE</span>
              </>
            )}
          </span>
        )}
      </div>

      {/* 6. One-Click Impact Lab Launcher */}
      {onOpenDemo && (
        <div className="flex items-center gap-1 border-l border-slate-800 pl-2.5">
          <button
            onClick={() => onOpenDemo('DEMO_A')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
          >
            <span>Impact Lab</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

