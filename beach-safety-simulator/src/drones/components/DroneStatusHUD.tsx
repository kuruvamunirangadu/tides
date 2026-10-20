/**
 * DroneStatusHUD.tsx
 * 
 * TIDES Drone Phase 4: Fleet Operations & Mission Manager HUD
 * 
 * Comprehensive tactical dashboard featuring:
 * - Fleet Roster tab: operational health, telemetry freshness, battery, GPS coordinates, focus camera.
 * - Mission & Patrol Manager tab: active missions, route details, waypoint progress, dwell timers, action buttons.
 * - Audit Event Log tab: real-time deduplicated event trail (validation, waypoint arrival, landing, cancellation).
 * - Quick-Dispatch panel for standard coastal missions.
 */

import React, { useState, useEffect } from 'react';
import { DroneRegistry } from '../foundation/DroneRegistry';
import { DroneMissionManager } from '../missions/DroneMissionManager';
import { DroneRecord, DroneRole, DroneOperationalStatus } from '../foundation/drone.types';
import {
  DroneMissionDossier,
  DroneMissionEvent,
  DroneMissionStatus,
  DroneMissionType,
} from '../missions/droneMission.types';
import {
  X,
  Radio,
  Battery,
  LifeBuoy,
  Camera,
  Crosshair,
  Volume2,
  Clock,
  Compass,
  Play,
  RotateCcw,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Send,
  ScrollText,
  Shield,
  Layers,
} from 'lucide-react';

interface DroneStatusHUDProps {
  isOpen: boolean;
  onClose: () => void;
  onFocusDrone?: (droneId: string, position3D: { x: number; y: number; z: number }) => void;
}

type HUDTab = 'ROSTER' | 'MISSIONS' | 'LOGS';

export const DroneStatusHUD: React.FC<DroneStatusHUDProps> = ({
  isOpen,
  onClose,
  onFocusDrone,
}) => {
  const [activeTab, setActiveTab] = useState<HUDTab>('ROSTER');
  const [drones, setDrones] = useState<DroneRecord[]>([]);
  const [activeMissions, setActiveMissions] = useState<DroneMissionDossier[]>([]);
  const [missionHistory, setMissionHistory] = useState<DroneMissionDossier[]>([]);
  const [events, setEvents] = useState<DroneMissionEvent[]>([]);
  const [selectedDroneId, setSelectedDroneId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const registry = DroneRegistry.getInstance();
    const missionManager = DroneMissionManager.getInstance();

    const refresh = () => {
      registry.auditFleetHealth();
      setDrones([...registry.getAllDrones()]);
      setActiveMissions([...missionManager.getActiveMissions()]);
      setMissionHistory([...missionManager.getMissionHistory()]);
      setEvents([...missionManager.getMissionEvents()].reverse().slice(0, 50));
    };

    refresh();
    const unsub = missionManager.subscribe(refresh);
    const interval = setInterval(refresh, 1000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const totalDrones = drones.length;
  const availableCount = drones.filter((d) => d.status === 'IDLE' || d.status === 'PATROLLING').length;
  const dispatchedCount = drones.filter((d) => d.status === 'DISPATCHED' || d.status === 'ASSISTING' || d.status === 'SEARCHING' || d.status === 'RETURNING').length;
  const chargingCount = drones.filter((d) => d.status === 'CHARGING' || d.status === 'MAINTENANCE').length;

  const getRoleBadge = (role: DroneRole) => {
    switch (role) {
      case 'SURVEILLANCE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">SURVEILLANCE</span>;
      case 'RESCUE_ASSISTANCE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">RESCUE FLOTATION</span>;
      case 'MULTI_ROLE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-400 border border-purple-800">MULTI-ROLE</span>;
    }
  };

  const getStatusBadge = (status: DroneOperationalStatus) => {
    switch (status) {
      case 'PATROLLING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 animate-pulse">PATROLLING</span>;
      case 'IDLE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">STANDBY IDLE</span>;
      case 'DISPATCHED':
      case 'SEARCHING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800 animate-pulse">DISPATCHED</span>;
      case 'ASSISTING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-400 border border-red-800 animate-pulse">ASSISTING</span>;
      case 'RETURNING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800 animate-pulse">RETURNING</span>;
      case 'CHARGING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">CHARGING</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-slate-400">{status}</span>;
    }
  };

  const getMissionStatusBadge = (status: DroneMissionStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 animate-pulse">ACTIVE</span>;
      case 'PENDING':
      case 'VALIDATING':
      case 'ACCEPTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">{status}</span>;
      case 'RETURNING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800 animate-pulse">RETURNING</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">COMPLETED</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">CANCELLED</span>;
      case 'FAILED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950 text-red-400 border border-red-800">FAILED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-slate-400">{status}</span>;
    }
  };

  // Quick Dispatch Handlers
  const handleLaunchPatrol = () => {
    setActionError(null);
    const mm = DroneMissionManager.getInstance();
    const result = mm.createMission({
      type: 'PATROL',
      droneId: 'DRONE-01',
      routeId: 'ROUTE-COASTAL-CRESCENT',
      notes: 'Standard 1 km Rushikonda Coastal Crescent Patrol Sweep',
    });

    if (!result.success || !result.mission) {
      setActionError(result.errors.join(' | '));
      return;
    }

    const startRes = mm.startMission(result.mission.missionId);
    if (!startRes.success) {
      setActionError(startRes.errorReason || 'Failed to start mission');
    }
  };

  const handleLaunchObservation = () => {
    setActionError(null);
    const mm = DroneMissionManager.getInstance();
    const result = mm.createMission({
      type: 'OBSERVATION',
      droneId: 'DRONE-03',
      targetPosition3D: { x: 5.0, y: 22.0, z: -45.0 }, // Central rip corridor
      observationDurationSec: 30.0,
      notes: 'Stationary Rip Current Corridor Aerial Observation (30s Dwell)',
    });

    if (!result.success || !result.mission) {
      setActionError(result.errors.join(' | '));
      return;
    }

    const startRes = mm.startMission(result.mission.missionId);
    if (!startRes.success) {
      setActionError(startRes.errorReason || 'Failed to start observation');
    }
  };

  const handleReturnAll = () => {
    setActionError(null);
    const mm = DroneMissionManager.getInstance();
    activeMissions.forEach((m) => {
      mm.requestReturnToBase(m.missionId, 'Operator All-Recall Command');
    });
  };

  const handleStartMission = (missionId: string) => {
    setActionError(null);
    const mm = DroneMissionManager.getInstance();
    const res = mm.startMission(missionId);
    if (!res.success) setActionError(res.errorReason || 'Failed to start mission');
  };

  const handleReturnMission = (missionId: string) => {
    setActionError(null);
    const mm = DroneMissionManager.getInstance();
    const res = mm.requestReturnToBase(missionId, 'Operator Command');
    if (!res.success) setActionError(res.errorReason || 'Failed to request return');
  };

  const handleCancelMission = (missionId: string) => {
    setActionError(null);
    const mm = DroneMissionManager.getInstance();
    const res = mm.cancelMission(missionId, 'Cancelled from Fleet Command HUD');
    if (!res.success) setActionError(res.errorReason || 'Failed to cancel mission');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-950/95 border border-cyan-500/40 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono">
                TIDES Drone Fleet Operations
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Phase 4 Mission & Patrol Manager
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Authoritative fleet telemetry, mission lifecycles, coastal patrol circuits & audit history
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/40 px-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('ROSTER')}
              className={`py-3 px-4 text-xs font-bold font-mono transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'ROSTER'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              FLEET ROSTER ({drones.length})
            </button>
            <button
              onClick={() => setActiveTab('MISSIONS')}
              className={`py-3 px-4 text-xs font-bold font-mono transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'MISSIONS'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              MISSIONS & PATROLS ({activeMissions.length})
            </button>
            <button
              onClick={() => setActiveTab('LOGS')}
              className={`py-3 px-4 text-xs font-bold font-mono transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'LOGS'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <ScrollText className="w-3.5 h-3.5" />
              AUDIT EVENT LOG ({events.length})
            </button>
          </div>

          {/* Quick Dispatch Shortcuts */}
          <div className="flex items-center gap-2 py-2">
            <button
              onClick={handleLaunchPatrol}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Launch Coastal Crescent Patrol with DRONE-01"
            >
              <Play className="w-3 h-3" /> Patrol (DRONE-01)
            </button>
            <button
              onClick={handleLaunchObservation}
              className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Launch Rip Current Observation with DRONE-03"
            >
              <Camera className="w-3 h-3" /> Observe Rip (DRONE-03)
            </button>
            {activeMissions.length > 0 && (
              <button
                onClick={handleReturnAll}
                className="px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Recall all airborne drones to home launch pads"
              >
                <RotateCcw className="w-3 h-3" /> Recall All
              </button>
            )}
          </div>
        </div>

        {/* Action Error Banner */}
        {actionError && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="p-1 text-red-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Fleet Summary Cards */}
        <div className="grid grid-cols-4 gap-3 px-6 py-3 border-b border-slate-800/80 bg-slate-900/30 text-xs font-mono">
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">TOTAL FLEET</span>
            <strong className="text-white text-sm">{totalDrones}</strong>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
            <span className="text-emerald-400">AVAILABLE</span>
            <strong className="text-emerald-300 text-sm">{availableCount}</strong>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
            <span className="text-amber-400">ACTIVE MISSIONS</span>
            <strong className="text-amber-300 text-sm">{activeMissions.length}</strong>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">CHARGING / DOCK</span>
            <strong className="text-slate-300 text-sm">{chargingCount}</strong>
          </div>
        </div>

        {/* TAB 1: FLEET ROSTER */}
        {activeTab === 'ROSTER' && (
          <div className="p-6 overflow-y-auto space-y-3 flex-1">
            {drones.map((drone) => {
              const isSelected = selectedDroneId === drone.droneId;
              const batt = drone.battery.percentage;
              const battColor = batt <= 20 ? 'text-red-400' : batt <= 40 ? 'text-amber-400' : 'text-emerald-400';

              return (
                <div
                  key={drone.droneId}
                  className={`p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-cyan-950/30 border-cyan-500/80 shadow-lg shadow-cyan-950/50'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                  onClick={() => setSelectedDroneId(drone.droneId)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white font-mono">{drone.droneId}</span>
                        <span className="text-xs text-slate-400 font-medium font-sans">({drone.callsign})</span>
                        {getRoleBadge(drone.role)}
                        {getStatusBadge(drone.status)}
                        {drone.movementState && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                            {drone.movementState}
                          </span>
                        )}
                        {drone.currentMissionId && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-800">
                            {drone.currentMissionId}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-3">
                        <span>Model: <strong className="text-slate-300">{drone.modelName}</strong></span>
                        <span>•</span>
                        <span>Base: <strong className="text-slate-300">{drone.homeBaseId}</strong></span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          Freshness:
                          <strong className={drone.isStale ? 'text-red-400' : 'text-emerald-400'}>
                            {drone.telemetryFreshnessSeconds.toFixed(1)}s
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Actions & Telemetry Gauges */}
                    <div className="flex items-center gap-4">
                      {/* Battery */}
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end font-mono">
                          <Battery className={`w-4 h-4 ${battColor}`} />
                          <span className={`text-xs font-bold ${battColor}`}>{batt}%</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{drone.battery.voltageVolts?.toFixed(1) ?? '22.2'}V</span>
                      </div>

                      {/* Camera Focus Button */}
                      {onFocusDrone && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFocusDrone(drone.droneId, drone.position3D);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Focus 3D Viewport Camera on this drone"
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                          <span>Focus</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sub-details: Capabilities and Coordinates */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    {/* Capabilities */}
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-[11px]">Payloads:</span>
                      {drone.capabilities.hasThermalCamera && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-sky-300 border border-slate-700 flex items-center gap-1">
                          <Camera className="w-3 h-3" /> Thermal IR
                        </span>
                      )}
                      {drone.capabilities.hasOpticalZoom && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-sky-300 border border-slate-700">
                          30x Zoom
                        </span>
                      )}
                      {drone.capabilities.hasFlotationPayload && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center gap-1">
                          <LifeBuoy className="w-3 h-3" /> Auto-Buoy ({drone.capabilities.flotationPayloadCapacityKg}kg)
                        </span>
                      )}
                      {drone.capabilities.hasMegaphoneSiren && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-purple-300 border border-slate-700 flex items-center gap-1">
                          <Volume2 className="w-3 h-3" /> Siren PA
                        </span>
                      )}
                    </div>

                    {/* 3D Coordinates, GPS & Heading */}
                    <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                      {drone.positionGeo && (
                        <span className="text-cyan-400">
                          GPS: {drone.positionGeo.latitude.toFixed(4)}°N, {drone.positionGeo.longitude.toFixed(4)}°E
                        </span>
                      )}
                      <span>Pos: [{drone.position3D.x.toFixed(1)}, {drone.position3D.y.toFixed(1)}, {drone.position3D.z.toFixed(1)}]</span>
                      <span>Alt: <strong className="text-cyan-300">{drone.position3D.y.toFixed(1)}m</strong></span>
                      <span>Heading: <strong className="text-white">{drone.headingDegrees}°</strong></span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">
                        {drone.provenance}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: MISSIONS & PATROLS */}
        {activeTab === 'MISSIONS' && (
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {activeMissions.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 font-mono text-xs">
                No active drone missions underway. Use the Quick Dispatch buttons above to launch a coastal patrol or observation mission.
              </div>
            ) : (
              activeMissions.map((m) => (
                <div key={m.missionId} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <strong className="text-white text-sm">{m.missionId}</strong>
                      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-bold">
                        {m.type}
                      </span>
                      {getMissionStatusBadge(m.status)}
                      <span className="text-slate-400">Assigned: <strong className="text-white">{m.droneId}</strong></span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {m.status === 'PENDING' && (
                        <button
                          onClick={() => handleStartMission(m.missionId)}
                          className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3" /> Start
                        </button>
                      )}
                      {(m.status === 'ACTIVE' || m.status === 'PAUSED') && (
                        <button
                          onClick={() => handleReturnMission(m.missionId)}
                          className="px-2.5 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" /> Return to Base
                        </button>
                      )}
                      {m.status !== 'COMPLETED' && m.status !== 'CANCELLED' && m.status !== 'FAILED' && (
                        <button
                          onClick={() => handleCancelMission(m.missionId)}
                          className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Ban className="w-3 h-3" /> Cancel
                        </button>
                      )}
                      {onFocusDrone && (
                        <button
                          onClick={() => {
                            const d = drones.find((dr) => dr.droneId === m.droneId);
                            if (d) onFocusDrone(d.droneId, d.position3D);
                          }}
                          className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Crosshair className="w-3 h-3" /> Focus
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Progress</span>
                      <span className="text-cyan-300 font-bold">{m.progressPercent}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                        style={{ width: `${m.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Details Line */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>Route: <strong className="text-slate-300">{m.routeId ?? 'Direct Dispatch'}</strong></span>
                    <span>Waypoints: <strong className="text-slate-300">{m.currentWaypointIndex + 1} / {m.waypoints.length || 1}</strong></span>
                    {m.observationTimerSec !== undefined && (
                      <span>Dwell Time: <strong className="text-amber-300">{m.observationTimerSec.toFixed(1)}s / {m.observationDurationSec}s</strong></span>
                    )}
                    <span>Started: <strong className="text-slate-300">{m.startedAtMs ? new Date(m.startedAtMs).toLocaleTimeString() : 'Pending'}</strong></span>
                  </div>
                </div>
              ))
            )}

            {/* Historical Completed / Cancelled Missions */}
            {missionHistory.length > 0 && (
              <div className="pt-4 border-t border-slate-800">
                <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Completed & Historical Missions ({missionHistory.length})
                </h3>
                <div className="space-y-2">
                  {missionHistory.slice(-5).reverse().map((h) => (
                    <div key={h.missionId} className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-300">{h.missionId}</strong>
                        <span className="text-slate-500">[{h.type}]</span>
                        <span className="text-slate-400">Drone: {h.droneId}</span>
                        {getMissionStatusBadge(h.status)}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        {h.cancellationReason && <span className="text-amber-400 mr-2">Reason: {h.cancellationReason}</span>}
                        {h.failureReason && <span className="text-red-400 mr-2">Error: {h.failureReason}</span>}
                        {new Date(h.completedAtMs ?? h.updatedAtMs).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AUDIT EVENT LOG */}
        {activeTab === 'LOGS' && (
          <div className="p-6 overflow-y-auto space-y-2 flex-1 font-mono text-xs">
            {events.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No mission audit events recorded yet.</div>
            ) : (
              events.map((evt) => (
                <div key={evt.eventId} className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] text-slate-500">{evt.eventId}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                      {evt.eventType}
                    </span>
                    <strong className="text-white">{evt.missionId}</strong>
                    <span className="text-slate-400">({evt.droneId})</span>
                    {evt.details && (
                      <span className="text-slate-500 text-[11px]">
                        {JSON.stringify(evt.details)}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-500 text-[11px]">
                    {new Date(evt.timestampMs).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Mission Dispatch Engine: <strong className="text-slate-200">ONLINE (Phase 4 Manager)</strong></span>
          </div>
          <span className="text-slate-500">TIDES Coastal Aerial System v1.4.0</span>
        </div>
      </div>
    </div>
  );
};
