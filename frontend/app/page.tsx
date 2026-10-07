'use client';

import React, { useEffect, useState } from 'react';
import { SimulationState, ScenarioMeta, Visitor } from '@/lib/types';
import {
  fetchSimulationState,
  fetchScenarios,
  subscribeSimulationWS,
} from '@/lib/api';
import { BeachCanvas } from '@/components/beach-map/BeachCanvas';
import { EnvironmentalGauges } from '@/components/dashboard/EnvironmentalGauges';
import { RiskMatrix } from '@/components/dashboard/RiskMatrix';
import { HazardFeed } from '@/components/dashboard/HazardFeed';
import { DecisionStream } from '@/components/dashboard/DecisionStream';
import { MetricsScorecard } from '@/components/dashboard/MetricsScorecard';
import { IncidentTimeline } from '@/components/incidents/IncidentTimeline';
import { SimulationControls } from '@/components/controls/SimulationControls';
import { Shield, Waves, Radio, Terminal } from 'lucide-react';

export default function DashboardPage() {
  const [state, setState] = useState<SimulationState | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  // Initial bootstrap
  useEffect(() => {
    fetchSimulationState()
      .then((s) => {
        setState(s);
        setWsConnected(true);
      })
      .catch((err) => console.error('Initial state fetch error:', err));

    fetchScenarios()
      .then(setScenarios)
      .catch((err) => console.error('Scenarios fetch error:', err));

    // Subscribe to live WebSocket simulation updates
    const unsubscribe = subscribeSimulationWS((newState) => {
      setState(newState);
      setWsConnected(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 space-y-5 font-sans">
      {/* Top Mission Control Navigation */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20 text-white">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-black tracking-tight text-white">
                ANDHRA PRADESH COASTAL SAFETY PLATFORM
              </h1>
              <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-[10px] font-mono text-cyan-300 font-bold">
                SIMULATION V1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Digital Beach Simulator & Central Rule-Based Safety Engine • RK Beach / Rushikonda Deployment
            </p>
          </div>
        </div>

        {/* System Status Indicators */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800">
            <Radio className={`w-3.5 h-3.5 ${wsConnected ? 'text-emerald-400 animate-pulse' : 'text-red-400'}`} />
            <span className="text-slate-300">Telemetry: {wsConnected ? 'LIVE FEED' : 'CONNECTING'}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-400">Seed:</span>
            <span className="text-cyan-400 font-bold">{state?.seed || 42}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-400">Visitors:</span>
            <span className="text-white font-bold">{state?.visitors.length || 0}</span>
          </div>

          {selectedVisitor && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-300">
              <span>Target: {selectedVisitor.id}</span>
            </div>
          )}
        </div>
      </header>

      {/* 1. Environmental Sensors & Ocean Telemetry */}
      <section>
        <EnvironmentalGauges env={state?.environment} />
      </section>

      {/* 2. Simulation Playback Controls & Scenario Injectors */}
      <section>
        <SimulationControls
          isRunning={state?.is_running ?? true}
          isPaused={state?.is_paused ?? false}
          speed={state?.speed_multiplier ?? 1.0}
          simClock={state?.sim_clock_display || '08:00:00 AM'}
          tick={state?.tick || 0}
          currentScenarioId={state?.scenario_id || 'normal'}
          scenarios={scenarios}
        />
      </section>

      {/* 3. Main Operational View: Interactive Beach Canvas + Real-time Hazards/Decisions */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 8 Cols: Interactive Beach Map Visualization */}
        <div className="lg:col-span-8 flex flex-col space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase">
              <Waves className="w-4 h-4 text-cyan-400" /> Digital Beach Spatial Simulation
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Click swimmer dot to inspect kinematics & stamina
            </span>
          </div>
          <BeachCanvas state={state} onSelectVisitor={setSelectedVisitor} />
        </div>

        {/* Right 4 Cols: Active Hazards & Decision Directives */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="flex-1">
            <HazardFeed hazards={state?.hazards} />
          </div>
          <div className="flex-1">
            <DecisionStream decisions={state?.decisions} />
          </div>
        </div>
      </section>

      {/* 4. Zone Risk Assessment Matrix (Separating Hazard vs Exposure) */}
      <section>
        <RiskMatrix assessments={state?.risk_assessments} zones={state?.beach.zones} />
      </section>

      {/* 5. Metrics & Latency Scorecard */}
      <section>
        <MetricsScorecard metrics={state?.metrics} />
      </section>

      {/* 6. Incident Log & Audit Trail */}
      <section>
        <IncidentTimeline
          activeIncidents={state?.active_incidents}
          recentIncidents={state?.recent_incidents}
        />
      </section>

      {/* Footer System Console Log */}
      <footer className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2 mb-1 text-slate-300 font-bold text-[11px]">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" /> RECENT ENGINE SYSTEM LOGS
        </div>
        <div className="space-y-0.5 max-h-20 overflow-y-auto text-[11px]">
          {state?.recent_events.slice(-5).map((log, i) => (
            <div key={i} className="text-slate-300">{log}</div>
          ))}
        </div>
      </footer>
    </main>
  );
}
