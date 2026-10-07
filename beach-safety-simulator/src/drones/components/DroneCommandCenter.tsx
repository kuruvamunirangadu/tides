import React, { useState } from 'react';
import { DroneManager, DroneManagerState } from '../DroneManager';
import { DroneOperationsPanel } from './DroneOperationsPanel';
import { DroneCameraView } from './DroneCameraView';
import { DroneMetricsPanel } from './DroneMetricsPanel';
import { Plane, Eye, ShieldCheck, Zap, Crosshair, AlertTriangle } from 'lucide-react';

interface DroneCommandCenterProps {
  droneManager: DroneManager;
  onRunFlagshipScenario?: () => void;
  onVerifyDistress?: (visitorId: string, pos: { x: number; y: number }) => void;
}

export const DroneCommandCenter: React.FC<DroneCommandCenterProps> = ({
  droneManager,
  onRunFlagshipScenario,
  onVerifyDistress,
}) => {
  const drones = droneManager.getDrones();
  const [selectedDroneId, setSelectedDroneId] = useState<string>(drones[0]?.id || 'UAV-01');
  const [showLiveFeed, setShowLiveFeed] = useState<boolean>(true);

  const selectedDrone = droneManager.getDrone(selectedDroneId) || drones[0];
  const analytics = droneManager.getAnalyticsEngine().getMetrics();
  const missions = droneManager.getMissionManager().getActiveMissions();
  const patrolRoutes = droneManager.getMissionManager().getPatrolRoutes();

  // Synthetic state snapshot
  const activeAirborne = drones.filter((d) => d.status !== 'AVAILABLE' && d.status !== 'CHARGING').length;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner with Scenario Launcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              PHASE 13 • AERIAL PERCEPTION & RESPONSE
            </span>
            <span className="text-xs text-slate-400 font-mono">Mobile UAV Observation Layer</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-100 tracking-tight mt-1">
            UAV Drone Fleet & Cross-Modal Detection Fusion
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-0.5">
            Autonomous multi-drone surveillance, rapid distress verification, dynamic blind-zone elimination, and Bayesian CCTV-Drone sensor fusion.
          </p>
        </div>

        {/* Flagship Scenario Trigger */}
        {onRunFlagshipScenario && (
          <button
            onClick={onRunFlagshipScenario}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            RUN FLAGSHIP DEMO SCENARIO
          </button>
        )}
      </div>

      {/* 2. Top Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Airborne Fleet</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-cyan-400">{activeAirborne}</span>
            <span className="text-xs font-mono text-slate-400">/ {drones.length} in Flight</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {drones.length - activeAirborne} on Charging Pads
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Active Missions</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-amber-300">{missions.length}</span>
            <span className="text-xs font-mono text-slate-400">Underway</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Patrols • Tracking • Verification
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Verification Latency</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {analytics.averageVerificationLatencySec}s
            </span>
            <span className="text-xs font-mono text-slate-400">Average</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            2.8x faster than manual dispatch
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Blind-Zone Coverage</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-purple-300">96.5%</span>
            <span className="text-xs font-mono text-slate-400">Total Beach</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Dynamic aerial gap filling
          </div>
        </div>
      </div>

      {/* 3. Live Drone Camera Viewport */}
      {selectedDrone && showLiveFeed && (
        <DroneCameraView
          drone={selectedDrone}
          tracks={[]}
          onClose={() => setShowLiveFeed(false)}
        />
      )}

      {/* 4. Operations & Fleet Dispatch Panel */}
      <DroneOperationsPanel
        drones={drones}
        patrolRoutes={patrolRoutes}
        selectedDroneId={selectedDroneId}
        onSelectDrone={(id) => {
          setSelectedDroneId(id);
          setShowLiveFeed(true);
        }}
        onDispatchPatrol={(id, rId) => droneManager.dispatchPatrol(id, rId, 0, '08:00')}
        onAbortReturn={(id) => droneManager.abortToReturn(id)}
        onToggleCamera={(id) => droneManager.toggleCameraPower(id)}
      />

      {/* 5. Comparative Research Analytics */}
      <DroneMetricsPanel metrics={analytics} />
    </div>
  );
};
