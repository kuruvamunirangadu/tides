/**
 * WristbandOperationsHUD.tsx
 * 
 * TIDES Track B — Wristband Phase 2: Operations HUD & Virtual Wristband Simulator
 * 
 * Interactive Operator & Hardware Interface:
 * - Fleet KPI strip (Registered, Connected, Active SOS, Dispatched Warnings, Ack Rate)
 * - Virtual Hardware Simulator (OLED display preview, LED indicator, Haptic feedback, 1-Tap SOS trigger)
 * - Localized Warning Dispatcher with live candidate radius preview
 * - Coastal Gateway status & RF downlink telemetry monitor
 */

import React, { useState, useEffect } from 'react';
import {
  Radio,
  AlertTriangle,
  Battery,
  Wifi,
  WifiOff,
  Bell,
  CheckCircle2,
  XCircle,
  Activity,
  Crosshair,
  Send,
  RefreshCw,
  Sliders,
  ShieldAlert,
  Cpu,
  Server,
} from 'lucide-react';
import { WristbandRegistry } from '../WristbandRegistry';
import { WristbandEventAdapter } from '../WristbandEventAdapter';
import { WristbandIncidentBridge } from '../WristbandIncidentBridge';
import { LocalizedWarningDistributionEngine } from '../LocalizedWarningDistributionEngine';
import { BeachGatewayService, RawHardwarePacket } from '../gateway/BeachGatewayService';
import { HardwareWristbandAdapter } from '../hardware/HardwareWristbandAdapter';
import {
  WristbandId,
  SwimmerWristband,
  WarningCategory,
  LocalizedWarningPacket,
} from '../wristband.types';

interface WristbandOperationsHUDProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const WristbandOperationsHUD: React.FC<WristbandOperationsHUDProps> = ({ onClose, isModal = false }) => {
  const registry = WristbandRegistry.getInstance();
  const eventAdapter = WristbandEventAdapter.getInstance();
  const incidentBridge = WristbandIncidentBridge.getInstance();
  const warningEngine = LocalizedWarningDistributionEngine.getInstance();
  const gatewayService = BeachGatewayService.getInstance();
  const hardwareAdapter = HardwareWristbandAdapter.getInstance();

  const [wristbands, setWristbands] = useState<SwimmerWristband[]>([]);
  const [selectedId, setSelectedId] = useState<WristbandId>('WB-101');
  const [activeWarnings, setActiveWarnings] = useState<LocalizedWarningPacket[]>([]);
  const [gatewayHealth, setGatewayHealth] = useState(gatewayService.getHealthStatus());
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Warning dispatch form state
  const [warningCategory, setWarningCategory] = useState<WarningCategory>('CAUTION');
  const [targetMode, setTargetMode] = useState<'RADIUS' | 'ZONE' | 'RIP_CORRIDOR'>('RADIUS');
  const [targetZone, setTargetZone] = useState<string>('SWIM_ZONE_NORTH');
  const [targetRadius, setTargetRadius] = useState<number>(100);
  const [customMessage, setCustomMessage] = useState<string>('Rip current detected nearby. Stay alert or move toward shore.');

  const refreshState = () => {
    setWristbands(registry.getWristbands());
    setActiveWarnings(warningEngine.getActiveWarnings());
    setGatewayHealth(gatewayService.getHealthStatus());
    incidentBridge.syncIncidentResolutions();
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    refreshState();
    const interval = setInterval(refreshState, 1500);
    return () => clearInterval(interval);
  }, []);

  const selectedWristband = wristbands.find((w) => w.id === selectedId) || wristbands[0];
  const fleetKPIs = registry.getFleetKPIs();
  const gateways = registry.getGateways();

  // Preview targeted count
  const previewEligibleCount = () => {
    if (!selectedWristband) return 0;
    const center = selectedWristband.telemetry.simPosition || { x: 500, y: 350 };
    return warningEngine.previewTargetCount({
      category: warningCategory,
      title: `${warningCategory} Advisory`,
      message: customMessage,
      centerCoordinate: targetMode === 'RADIUS' ? center : undefined,
      radiusMeters: targetMode === 'RADIUS' ? targetRadius : undefined,
      zoneIds: targetMode === 'ZONE' ? [targetZone] : undefined,
      ripCorridors: targetMode === 'RIP_CORRIDOR' ? [{ x_min: 700, x_max: 780 }] : undefined,
      excludeWristbandIds: selectedWristband.isSosActive ? [selectedWristband.id] : undefined,
    });
  };

  // Actions
  const handleTriggerSOS = () => {
    if (!selectedWristband) return;
    if (selectedWristband.provenance === 'HARDWARE') {
      // Simulate real hardware transmission via gateway
      const seq = Math.floor(Date.now() / 1000) % 100000;
      const packet: RawHardwarePacket = {
        magic: [0x54, 0x49],
        version: 1,
        msgType: 0x01,
        deviceId: selectedWristband.id,
        sequenceNumber: seq,
        deviceTimestampMs: Date.now(),
        batteryMillivolts: 3920,
        batteryPercent: selectedWristband.batteryPercent,
        statusFlags: 0x01,
        hmacSignature: [0x54, 0x49, 0x44, 0x45, 0x53, 0x01, 0x02, 0x03],
        crc16: 0x1021,
        rssiDbm: -78,
        snrDb: 8.5,
        rfFrequencyHz: 865200000,
      };
      gatewayService.ingestRawRadioPacket(packet);
    } else {
      const rawEvent = registry.triggerSOS(selectedWristband.id, true);
      if (rawEvent) {
        const validation = eventAdapter.ingestSOSEvent(rawEvent);
        if (validation.isValid && validation.validatedEvent) {
          incidentBridge.handleSOSEvent(validation.validatedEvent);
        }
      }
    }
    refreshState();
  };

  const handleCancelSOS = () => {
    if (!selectedWristband) return;
    registry.cancelSOS(selectedWristband.id);
    refreshState();
  };

  const handleAcknowledgeAlert = () => {
    if (!selectedWristband) return;
    registry.acknowledgeWarning(selectedWristband.id);
    if (selectedWristband.lastWarningReceived) {
      warningEngine.acknowledgeWarning(
        selectedWristband.lastWarningReceived.warningId,
        selectedWristband.id
      );
    }
    refreshState();
  };

  const handleToggleConnectivity = () => {
    if (!selectedWristband) return;
    const nextConn = selectedWristband.connectivity === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED';
    registry.updateWristband(selectedWristband.id, { connectivity: nextConn });
    refreshState();
  };

  const handleToggleBackendLink = () => {
    gatewayService.setBackendAvailable(!gatewayService.getBackendAvailable());
    refreshState();
  };

  const handleDispatchWarning = () => {
    if (!selectedWristband) return;
    const center = selectedWristband.telemetry.simPosition || { x: 500, y: 350 };

    warningEngine.dispatchTargetedWarning({
      category: warningCategory,
      title: `${warningCategory} Alert: Rushikonda Beach`,
      message: customMessage,
      centerCoordinate: targetMode === 'RADIUS' ? center : undefined,
      radiusMeters: targetMode === 'RADIUS' ? targetRadius : undefined,
      zoneIds: targetMode === 'ZONE' ? [targetZone] : undefined,
      ripCorridors: targetMode === 'RIP_CORRIDOR' ? [{ x_min: 700, x_max: 780 }] : undefined,
      excludeWristbandIds: selectedWristband.isSosActive ? [selectedWristband.id] : undefined,
    });

    refreshState();
  };

  return (
    <div
      className={
        isModal
          ? "absolute top-16 right-4 w-[620px] max-w-[calc(100vw-2rem)] max-h-[88vh] bg-slate-900/95 backdrop-blur-md text-slate-100 rounded-xl shadow-2xl border border-cyan-500/30 flex flex-col z-40 overflow-hidden font-sans"
          : "relative w-full max-w-5xl mx-auto h-full max-h-full bg-slate-900/95 backdrop-blur-md text-slate-100 rounded-xl shadow-2xl border border-cyan-500/30 flex flex-col overflow-hidden font-sans"
      }
    >
      {/* Top Header */}
      <div className="px-5 py-3 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-slate-900 border-b border-cyan-500/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Radio className="w-5 h-5 text-cyan-400 animate-pulse shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-wider text-cyan-300 uppercase truncate">
              Track B — Connected Wristband Safety HUD
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              Phase 2: Authoritative Incident Bridge & Localized Warning Engine
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button
            onClick={refreshState}
            title="Refresh device telemetry"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Close Panel"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 transition cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content scroll area */}
      <div className={`p-4 space-y-4 overflow-y-auto text-xs ${isModal ? 'max-h-[calc(88vh-70px)]' : 'flex-1 min-h-0'}`}>
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60 min-w-0">
            <span className="text-[10px] text-slate-400 block font-medium truncate">REGISTERED FLEET</span>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-base font-bold text-white">{fleetKPIs.totalRegistered}</span>
              <span className="text-[10px] text-emerald-400 font-semibold">({fleetKPIs.activeConnected} Online)</span>
            </div>
          </div>
          <div className={`p-2.5 rounded-lg border min-w-0 ${fleetKPIs.activeSosCount > 0 ? 'bg-rose-950/40 border-rose-500/60' : 'bg-slate-800/80 border-slate-700/60'}`}>
            <span className="text-[10px] text-slate-400 block font-medium truncate">ACTIVE SOS ALERTS</span>
            <span className={`text-base font-bold ${fleetKPIs.activeSosCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-300'}`}>
              {fleetKPIs.activeSosCount}
            </span>
          </div>
          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60 min-w-0">
            <span className="text-[10px] text-slate-400 block font-medium truncate">DOWNLINKS SENT</span>
            <span className="text-base font-bold text-amber-400">{fleetKPIs.activeWarningsDispatched}</span>
          </div>
          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60 min-w-0">
            <span className="text-[10px] text-slate-400 block font-medium truncate">ACK RATE</span>
            <span className="text-base font-bold text-cyan-400">{fleetKPIs.acknowledgmentRatePercent}%</span>
          </div>
        </div>

        {/* Section 1: Virtual Hardware Simulator */}
        <div className="bg-slate-800/90 rounded-lg p-3.5 border border-cyan-500/30 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sliders className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-semibold text-cyan-300 uppercase tracking-wide truncate">
                Virtual Hardware Inspection Panel
              </span>
            </div>
            {/* Device Picker */}
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-cyan-300 text-xs rounded-md px-2.5 py-1 focus:outline-none focus:border-cyan-400 max-w-full"
            >
              {wristbands.map((wb) => (
                <option key={wb.id} value={wb.id}>
                  [{wb.provenance === 'HARDWARE' ? 'HARDWARE' : 'SIMULATED'}] {wb.id} — {wb.pairedVisitorName || 'Standby Reserve'} ({wb.currentZone})
                </option>
              ))}
            </select>
          </div>

          {selectedWristband && (
            <div className="space-y-3">
              {/* Provenance Badge */}
              <div className="flex items-center justify-between">
                {selectedWristband.provenance === 'HARDWARE' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-500/50 flex items-center gap-1.5 shadow-sm shadow-purple-950">
                    <Cpu className="w-3 h-3 text-purple-400" />
                    PHYSICAL HARDWARE PROTOTYPE (ESP32-S3 + SX1262 LoRa)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/50 flex items-center gap-1.5">
                    <Activity className="w-3 h-3 text-cyan-400" />
                    DIGITAL TWIN SIMULATED WRISTBAND
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-mono">
                  FW: {selectedWristband.telemetry.hardwareMetadata?.firmwareVersion || '1.0.0-IN865'}
                </span>
              </div>

              {/* Hardware Prototype Telemetry & Diagnostic Card if Hardware */}
              {selectedWristband.provenance === 'HARDWARE' && (
                <div className="bg-purple-950/40 p-2.5 rounded-lg border border-purple-500/40 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-purple-300 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-purple-400" />
                      Physical Prototype Diagnostic Telemetry
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-900/60 border border-purple-400/30 text-purple-200">
                      MODEL: TSB-HW-01
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-slate-300 font-mono text-[10px]">
                    <div>RF Spectrum: <span className="text-cyan-400">865.2 MHz (IN865)</span></div>
                    <div>Gateway: <span className="text-emerald-400">{selectedWristband.telemetry.hardwareMetadata?.gatewayId || 'GW-TOWER-01'}</span></div>
                    <div>Signal RSSI/SNR: <span className="text-amber-400">{selectedWristband.telemetry.signalStrengthDbm} dBm / +8.5 dB</span></div>
                    <div>Cell Voltage: <span className="text-emerald-400">{selectedWristband.telemetry.hardwareMetadata?.batteryMv || 3920} mV (Li-Po)</span></div>
                    <div className="col-span-2 text-amber-300/90 font-sans">
                      GPS Fix: <span className="font-semibold text-amber-400">UNAVAILABLE (Zero Fabrication Enforced — Sector Estimated)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Virtual Device OLED Display Screen & Indicators */}
              <div className="bg-black/90 p-3 rounded-lg border-2 border-slate-700 flex flex-col items-center justify-center space-y-2 relative overflow-hidden shadow-inner">
                {/* OLED Bezel label */}
                <div className="w-full flex justify-between items-center text-[9px] text-slate-500 tracking-wider">
                  <span>TIDES SMARTBAND OLED 128x64</span>
                  <div className="flex items-center gap-1.5">
                    {selectedWristband.connectivity === 'CONNECTED' ? (
                      <span className="text-emerald-400 flex items-center gap-0.5">
                        <Wifi className="w-3 h-3" /> RF LINK
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-0.5">
                        <WifiOff className="w-3 h-3" /> DISCONNECTED
                      </span>
                    )}
                    <span className="text-cyan-400 font-mono">
                      {selectedWristband.batteryPercent}%
                    </span>
                  </div>
                </div>

                {/* Digital OLED Message Banner */}
                <div className={`w-full py-2.5 px-3 rounded text-center font-mono font-bold tracking-widest text-sm transition-all duration-300 ${
                  selectedWristband.isSosActive
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-500 animate-pulse'
                    : selectedWristband.oledMessage.includes('CAUTION') || selectedWristband.oledMessage.includes('WARNING')
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-500'
                    : selectedWristband.oledMessage.includes('EVACUATE')
                    ? 'bg-orange-950/80 text-orange-300 border border-orange-500 animate-bounce'
                    : 'bg-emerald-950/40 text-emerald-300 border border-emerald-600/50'
                }`}>
                  [ {selectedWristband.oledMessage} ]
                </div>

                {/* Simulated Hardware Indicators Row */}
                <div className="w-full pt-1.5 flex items-center justify-around border-t border-slate-800 text-[10px]">
                  {/* LED Indicator */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">STATUS LED:</span>
                    <span className={`w-3 h-3 rounded-full inline-block ${
                      selectedWristband.ledState === 'FLASHING_RED'
                        ? 'bg-rose-500 ring-2 ring-rose-400 animate-ping'
                        : selectedWristband.ledState === 'STROBE_AMBER'
                        ? 'bg-amber-400 ring-2 ring-amber-300 animate-pulse'
                        : selectedWristband.ledState === 'RAPID_CYAN'
                        ? 'bg-cyan-400 ring-2 ring-cyan-300 animate-ping'
                        : 'bg-emerald-500 shadow-sm shadow-emerald-400'
                    }`} />
                    <span className="font-mono text-slate-300">{selectedWristband.ledState}</span>
                  </div>

                  {/* Haptic Vibration */}
                  <div className="flex items-center gap-1.5">
                    <Activity className={`w-3.5 h-3.5 ${selectedWristband.vibrationPattern !== 'OFF' ? 'text-amber-400 animate-bounce' : 'text-slate-600'}`} />
                    <span className="text-slate-400">HAPTIC:</span>
                    <span className="font-mono text-slate-300">{selectedWristband.vibrationPattern}</span>
                  </div>
                </div>
              </div>

              {/* Hardware Telemetry Details */}
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded border border-slate-800">
                <div>
                  <span className="text-slate-400">Swimmer:</span>{' '}
                  <span className="font-semibold text-slate-200">
                    {selectedWristband.pairedVisitorName || 'Standby'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Zone:</span>{' '}
                  <span className="font-semibold text-cyan-300">
                    {selectedWristband.currentZone}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Location Fix:</span>{' '}
                  {selectedWristband.telemetry.hasLocation ? (
                    <span className="text-emerald-400 font-mono">
                      (X: {selectedWristband.telemetry.simPosition?.x.toFixed(0)}, Y: {selectedWristband.telemetry.simPosition?.y.toFixed(0)}) ±{selectedWristband.telemetry.accuracyMeters}m
                    </span>
                  ) : (
                    <span className="text-amber-400 font-mono">UNAVAILABLE (Zero Fabrication)</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400">RF Signal:</span>{' '}
                  <span className="text-slate-300 font-mono">
                    {selectedWristband.telemetry.signalStrengthDbm} dBm
                  </span>
                </div>
              </div>

              {/* Interactive Device Controls */}
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedWristband.isSosActive ? (
                  <button
                    onClick={handleCancelSOS}
                    className="flex-1 py-1.5 px-3 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium flex items-center justify-center gap-1.5 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset SOS Distress
                  </button>
                ) : (
                  <button
                    onClick={handleTriggerSOS}
                    className="flex-1 py-1.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950 transition animate-pulse"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Simulate 1-Tap SOS Button
                  </button>
                )}

                <button
                  onClick={handleAcknowledgeAlert}
                  disabled={!selectedWristband.lastWarningReceived || selectedWristband.lastWarningReceived.status === 'ACKNOWLEDGED'}
                  className={`flex-1 py-1.5 px-3 rounded font-medium flex items-center justify-center gap-1.5 transition ${
                    selectedWristband.lastWarningReceived && selectedWristband.lastWarningReceived.status !== 'ACKNOWLEDGED'
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Acknowledge Warning
                </button>

                <button
                  onClick={handleToggleConnectivity}
                  className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded transition"
                  title="Toggle Connectivity"
                >
                  {selectedWristband.connectivity === 'CONNECTED' ? (
                    <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Localized Warning Distribution Engine */}
        <div className="bg-slate-800/90 rounded-lg p-3.5 border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-amber-300 uppercase tracking-wide">
                Localized Warning Dispatcher
              </span>
            </div>
            <span className="text-[10px] text-amber-400/90 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
              Targeted Downlink Engine
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Targeting Filter</label>
              <select
                value={targetMode}
                onChange={(e) => setTargetMode(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1"
              >
                <option value="RADIUS">Distance Radius (Around Selected Swimmer)</option>
                <option value="ZONE">Designated Coastal Zone</option>
                <option value="RIP_CORRIDOR">Active Rip Current Corridor</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Warning Category</label>
              <select
                value={warningCategory}
                onChange={(e) => setWarningCategory(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1"
              >
                <option value="ADVISORY">ADVISORY (Informational)</option>
                <option value="CAUTION">CAUTION (Rip Current Proximity)</option>
                <option value="EVACUATE_ZONE">EVACUATE_ZONE (Imminent Hazard)</option>
                <option value="EMERGENCY">EMERGENCY (Critical Rescue in Proximity)</option>
              </select>
            </div>
          </div>

          {targetMode === 'RADIUS' && (
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Localized Radius: {targetRadius}m</span>
                <span className="text-amber-400 font-mono">
                  {previewEligibleCount()} virtual wristband(s) in range
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="250"
                step="10"
                value={targetRadius}
                onChange={(e) => setTargetRadius(Number(e.target.value))}
                className="w-full accent-amber-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>
          )}

          {targetMode === 'ZONE' && (
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Select Target Zone:</span>
                <span className="text-amber-400 font-mono">
                  {previewEligibleCount()} device(s) in zone
                </span>
              </div>
              <select
                value={targetZone}
                onChange={(e) => setTargetZone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1"
              >
                <option value="SWIM_ZONE_NORTH">SWIM_ZONE_NORTH</option>
                <option value="CENTRAL_SURF">CENTRAL_SURF</option>
                <option value="RIP_CURRENT_CORRIDOR_SOUTH">RIP_CURRENT_CORRIDOR_SOUTH</option>
                <option value="SHORELINE_SOUTH">SHORELINE_SOUTH</option>
              </select>
            </div>
          )}

          {targetMode === 'RIP_CORRIDOR' && (
            <div className="text-[11px] text-amber-300/90 bg-amber-950/30 p-2 rounded border border-amber-900/60">
              Targeting all swimmers inside or adjacent to active rip current corridor (X: 700 - 780).
              <span className="block text-slate-400 mt-0.5">Matching: {previewEligibleCount()} device(s)</span>
            </div>
          )}

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Broadcast Downlink Message</label>
            <input
              type="text"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
            />
          </div>

          <button
            onClick={handleDispatchWarning}
            className="w-full py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold rounded flex items-center justify-center gap-2 shadow-md transition"
          >
            <Send className="w-3.5 h-3.5 text-slate-950" />
            Transmit Localized Warning Downlink ({previewEligibleCount()} targeted)
          </button>
        </div>

        {/* Section 3: Coastal RF Gateways Status & Hardware Bench Controls */}
        <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-cyan-400" /> Coastal Base Station Gateways & Offline Buffer
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">
              Buffer: {gatewayHealth.bufferedEventCount} queued
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {gateways.map((gw) => (
              <div key={gw.id} className="bg-slate-900/80 p-2 rounded border border-slate-800 text-[10px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">{gw.name.split(' ')[0]}</span>
                  <span className={`w-2 h-2 rounded-full ${gw.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                </div>
                <div className="text-slate-400">Packets: {gw.packetsForwarded}</div>
                <div className="text-slate-500 font-mono text-[9px]">(X:{gw.position.x}, Y:{gw.position.y})</div>
              </div>
            ))}
          </div>

          {/* Gateway Link Test & Buffer Controls */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800 text-[10px]">
            <button
              onClick={handleToggleBackendLink}
              className={`flex-1 py-1 px-2 rounded font-medium border flex items-center justify-center gap-1 transition ${
                gatewayHealth.status === 'ONLINE'
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40'
                  : 'bg-amber-950/80 text-amber-200 border-amber-500 animate-pulse'
              }`}
            >
              <WifiOff className="w-3 h-3" />
              {gatewayHealth.status === 'ONLINE' ? 'Simulate Gateway Link Disconnect' : 'Restore Gateway Link (Flush Buffer)'}
            </button>
          </div>
        </div>

        {/* Life-Safety Boundary Disclaimer */}
        <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800 flex items-start gap-2 text-[10px] text-slate-400">
          <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-cyan-300">Phase 3 Physical Prototype Safety Boundary:</span>{' '}
            Hardware prototype firmware, RF wire protocol, and beach gateway services are implemented and verified via controlled bench testing. Live in-water swimmer deployment is prohibited until marine IP68 hydrostatic pressure certification is complete.
          </div>
        </div>
      </div>
    </div>
  );
};

