import React from 'react';
import { SimulationMetrics } from '../metrics/Types';
import {
  Clock,
  ShieldAlert,
  Users,
  AlertTriangle,
  LifeBuoy,
  Zap,
  Activity,
  CheckCircle2,
} from 'lucide-react';

interface KPICardsProps {
  metrics?: SimulationMetrics;
}

export const KPICards: React.FC<KPICardsProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
        Awaiting simulation data...
      </div>
    );
  }

  const { response, exposure, incidents, resources, detection } = metrics;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
      {/* 1. Detection Latency */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
          <span>Detection</span>
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="my-1">
          <div className="text-xl font-bold font-mono text-cyan-300">
            {response.averageDetectionLatency}s
          </div>
          <p className="text-[10px] text-slate-400">Avg hazard-to-distress</p>
        </div>
        <div className="text-[10px] text-slate-400 font-mono">
          Rate: <span className="text-emerald-400">{detection.detectionRate}%</span>
        </div>
      </div>

      {/* 2. Decision Latency */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
          <span>Decision</span>
          <Zap className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="my-1">
          <div className="text-xl font-bold font-mono text-amber-300">
            {response.averageDecisionLatency}s
          </div>
          <p className="text-[10px] text-slate-400">Rule policy synthesis</p>
        </div>
        <div className="text-[10px] text-slate-400 font-mono">
          Decisions: <span className="text-amber-400">Automated</span>
        </div>
      </div>

      {/* 3. Dispatch Latency */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
          <span>Dispatch</span>
          <Clock className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <div className="my-1">
          <div className="text-xl font-bold font-mono text-blue-300">
            {response.averageDispatchLatency}s
          </div>
          <p className="text-[10px] text-slate-400">Command to wheels up</p>
        </div>
        <div className="text-[10px] text-slate-400 font-mono">
          Arrival: <span className="text-blue-400">{response.averageArrivalLatency}s</span>
        </div>
      </div>

      {/* 4. Rescue Operation */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
          <span>Rescue Op</span>
          <LifeBuoy className="w-3.5 h-3.5 text-rose-400" />
        </div>
        <div className="my-1">
          <div className="text-xl font-bold font-mono text-rose-300">
            {Math.floor(response.averageRescueDuration / 60)}m {Math.round(response.averageRescueDuration % 60)}s
          </div>
          <p className="text-[10px] text-slate-400">Extraction duration</p>
        </div>
        <div className="text-[10px] text-slate-400 font-mono">
          Total: <span className="text-rose-400">{Math.floor(response.averageTotalResponseTime / 60)}m {Math.round(response.averageTotalResponseTime % 60)}s</span>
        </div>
      </div>

      {/* 5. Exposure & Safety */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
          <span>Exposed</span>
          <Users className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div className="my-1">
          <div className="text-xl font-bold font-mono text-purple-300">
            {exposure.totalPeopleExposed}
          </div>
          <p className="text-[10px] text-slate-400">Swimmers in hazard zones</p>
        </div>
        <div className="text-[10px] text-slate-400 font-mono">
          Warned: <span className="text-emerald-400">{exposure.peopleWarned}</span> | Peak: {exposure.peakExposure}
        </div>
      </div>

      {/* 6. Resource Utilization */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
          <span>Fleet Load</span>
          <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="my-1">
          <div className="text-xl font-bold font-mono text-emerald-300">
            {resources.overallUtilizationRate}%
          </div>
          <p className="text-[10px] text-slate-400">Active fleet utilization</p>
        </div>
        <div className="text-[10px] text-slate-400 font-mono">
          Avail: <span className="text-emerald-400">{resources.availableCount}</span> / {resources.totalFleetCount}
        </div>
      </div>
    </div>
  );
};
