import React, { useState } from 'react';
import { SimulationMetrics } from '../metrics/Types';
import { EventStore } from '../EventStore';
import { ReplayEngine } from '../replay/ReplayEngine';
import { ScenarioComparator } from '../scenarios/ScenarioComparator';
import { KPICards } from './KPICards';
import { IncidentTimeline } from './IncidentTimeline';
import { HazardHistoryChart } from './HazardHistoryChart';
import { RiskHistoryChart } from './RiskHistoryChart';
import { ResourceUtilization } from './ResourceUtilization';
import { ZoneRiskMap } from './ZoneRiskMap';
import { ResponsePerformance } from './ResponsePerformance';
import { ScenarioComparison } from './ScenarioComparison';
import { SimulationReplay } from './SimulationReplay';
import {
  BarChart3,
  Clock,
  Layers,
  MapPin,
  TrendingUp,
  Film,
  Download,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react';

interface SafetyDashboardProps {
  metrics?: SimulationMetrics;
  eventStore: EventStore;
  replayEngine: ReplayEngine;
  scenarioComparator: ScenarioComparator;
}

export const SafetyDashboard: React.FC<SafetyDashboardProps> = ({
  metrics,
  eventStore,
  replayEngine,
  scenarioComparator,
}) => {
  const [activeTab, setActiveTab] = useState<'kpis' | 'timeline' | 'charts' | 'performance' | 'comparison' | 'replay'>('kpis');

  const events = eventStore.getAllEvents();
  const chains = eventStore.getAllIncidentChains();

  const currentSummary = metrics
    ? scenarioComparator.convertMetricsToSummary(
        'CURRENT_LIVE_RUN',
        'Current Live Simulation Run',
        'Active runtime simulation telemetry snapshot',
        metrics
      )
    : undefined;

  const handleExportJSON = () => {
    const data = {
      timestamp: new Date().toISOString(),
      metrics,
      events,
      incidentChains: chains,
      benchmarkScenarios: scenarioComparator.getBenchmarkScenarios(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BeachSafety_Analytics_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 p-4 shadow-2xl space-y-4 text-left">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wide">
              Simulation Analytics & Safety Performance Dashboard
            </h3>
            <p className="text-[11px] text-slate-400 font-sans">
              Objective evaluation, latency profiling, causal tracing & experiment comparison
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
            title="Export simulation metrics & events to JSON"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            EXPORT DATA
          </button>
        </div>
      </div>

      {/* Primary KPI Cards (Always visible) */}
      <KPICards metrics={metrics} />

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800/80 pb-2">
        <button
          onClick={() => setActiveTab('kpis')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'kpis'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Overview & Sector Risk
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'timeline'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Incident Timeline ({events.length})
        </button>

        <button
          onClick={() => setActiveTab('charts')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'charts'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Hazard & Risk Trends
        </button>

        <button
          onClick={() => setActiveTab('performance')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'performance'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Response Performance
        </button>

        <button
          onClick={() => setActiveTab('comparison')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'comparison'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Scenario Comparison
        </button>

        <button
          onClick={() => setActiveTab('replay')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'replay'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          Simulation Replay
        </button>
      </div>

      {/* Tab Contents */}
      <div>
        {activeTab === 'kpis' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ZoneRiskMap zones={metrics?.risk.zones || []} />
            <ResourceUtilization resources={metrics?.resources || { overallUtilizationRate: 0, fleetBreakdown: { lifeguardUtilization: 0, droneUtilization: 0, boatUtilization: 0, ambulanceUtilization: 0, policeUtilization: 0 }, totalFleetCount: 0, availableCount: 0, busyCount: 0, failedCount: 0, resources: [] }} />
          </div>
        )}

        {activeTab === 'timeline' && (
          <IncidentTimeline events={events} incidentChains={chains} />
        )}

        {activeTab === 'charts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HazardHistoryChart samples={metrics?.hazards.history || []} />
            <RiskHistoryChart samples={metrics?.risk.history || []} />
          </div>
        )}

        {activeTab === 'performance' && (
          <ResponsePerformance chains={chains} bottleneck={metrics?.bottleneck} />
        )}

        {activeTab === 'comparison' && (
          <ScenarioComparison currentRunSummary={currentSummary} />
        )}

        {activeTab === 'replay' && (
          <SimulationReplay replayEngine={replayEngine} />
        )}
      </div>
    </div>
  );
};
