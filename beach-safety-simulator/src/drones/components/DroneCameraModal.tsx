/**
 * DroneCameraModal.tsx
 * 
 * TIDES Drone Phase 5: Simulated Camera View & Gimbal Inspection Panel
 * 
 * Interactive tactical command-center window providing:
 * - Live simulated video feed rendered from the drone's virtual perspective camera
 * - Camera selection switcher between registered surveillance drones (DRONE-01 to DRONE-04)
 * - Real-time gimbal pitch controls (-90° nadir to 0° horizon) and 30x optical zoom
 * - Sensor mode filter simulator (Optical Daylight vs Thermal FLIR Infrared)
 * - Observation snapshot capture emitting timestamped audit events
 * - Clear warning banners confirming this is a software-simulated digital twin view
 */

import React, { useRef, useEffect, useState } from 'react';
import { DroneCameraRegistry } from '../camera/DroneCameraRegistry';
import { DroneVirtualFeedManager } from '../../scene3d/drones/DroneVirtualFeedManager';
import { DroneRegistry } from '../foundation/DroneRegistry';
import { DroneCameraRecord, DroneCameraStatus } from '../camera/droneCamera.types';
import { DroneRecord } from '../foundation/drone.types';
import { DroneVisionManager } from '../vision/DroneVisionManager';
import { DroneTrackRecord, DroneCandidateObservation, InferenceMetrics } from '../vision/droneDetection.types';
import {
  X,
  Camera,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Sliders,
  Radio,
  Eye,
  Crosshair,
  Compass,
  Battery,
  AlertTriangle,
  RotateCcw,
  Layers,
  Sparkles,
  Scan,
  UserCheck,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Activity,
} from 'lucide-react';

import { DroneDistressVerificationPanel } from './DroneDistressVerificationPanel';

interface DroneCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDroneId?: string;
  onFocusDrone?: (droneId: string, position3D: { x: number; y: number; z: number }) => void;
  onToggleFovCones?: (visible: boolean) => void;
  isFovConesVisible?: boolean;
}

export const DroneCameraModal: React.FC<DroneCameraModalProps> = ({
  isOpen,
  onClose,
  initialDroneId = 'DRONE-01',
  onFocusDrone,
  onToggleFovCones,
  isFovConesVisible = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedDroneId, setSelectedDroneId] = useState<string>(initialDroneId);
  const [cameraRecord, setCameraRecord] = useState<DroneCameraRecord | undefined>(undefined);
  const [drone, setDrone] = useState<DroneRecord | undefined>(undefined);
  const [sensorFilter, setSensorFilter] = useState<'OPTICAL' | 'THERMAL'>('OPTICAL');
  const [lastObservation, setLastObservation] = useState<string | null>(null);

  const cameraRegistry = DroneCameraRegistry.getInstance();
  const droneRegistry = DroneRegistry.getInstance();
  const feedManager = DroneVirtualFeedManager.getInstance();
  const visionManager = DroneVisionManager.getInstance();

  const [cvTracks, setCvTracks] = useState<DroneTrackRecord[]>([]);
  const [cvMetrics, setCvMetrics] = useState<InferenceMetrics>(visionManager.getMetrics());
  const [isCvOverlayEnabled, setIsCvOverlayEnabled] = useState<boolean>(visionManager.getIsOverlayEnabled());
  const [isObservationsDrawerOpen, setIsObservationsDrawerOpen] = useState<boolean>(false);
  const [candidateObservations, setCandidateObservations] = useState<DroneCandidateObservation[]>([]);
  const [isTriagePanelOpen, setIsTriagePanelOpen] = useState<boolean>(false);

  useEffect(() => {
    setSelectedDroneId(initialDroneId);
  }, [initialDroneId]);

  useEffect(() => {
    if (!isOpen) {
      feedManager.setFeedActive(false);
      feedManager.attachCanvas(null);
      return;
    }

    feedManager.setSelectedDrone(selectedDroneId);
    feedManager.setFeedActive(true);

    if (canvasRef.current) {
      feedManager.attachCanvas(canvasRef.current);
    }

    const refresh = () => {
      const cam = cameraRegistry.getCameraByDroneId(selectedDroneId);
      const dr = droneRegistry.getDrone(selectedDroneId);
      setCameraRecord(cam ? { ...cam } : undefined);
      setDrone(dr ? { ...dr } : undefined);

      if (cam) {
        const activeTracks = visionManager.getActiveTracks().filter((t) => t.cameraId === cam.cameraId);
        setCvTracks(activeTracks);
      } else {
        setCvTracks([]);
      }
      setCvMetrics(visionManager.getMetrics());
      setIsCvOverlayEnabled(visionManager.getIsOverlayEnabled());
      setCandidateObservations(visionManager.getObservationPublisher().getObservationHistory());
    };

    refresh();
    const unsub = cameraRegistry.subscribe(refresh);
    const unsubVision = visionManager.subscribe(refresh);
    const interval = setInterval(refresh, 500);

    return () => {
      unsub();
      unsubVision();
      clearInterval(interval);
      feedManager.setFeedActive(false);
      feedManager.attachCanvas(null);
    };
  }, [isOpen, selectedDroneId]);

  if (!isOpen) return null;

  const cameras = cameraRegistry.getAllCameras();

  const handleSelectCamera = (droneId: string) => {
    setSelectedDroneId(droneId);
    feedManager.setSelectedDrone(droneId);
  };

  const handlePitchChange = (newPitch: number) => {
    if (cameraRecord) {
      cameraRegistry.setGimbalPitch(cameraRecord.cameraId, newPitch);
    }
  };

  const handleZoomChange = (newZoom: number) => {
    if (cameraRecord) {
      cameraRegistry.setOpticalZoom(cameraRecord.cameraId, newZoom);
    }
  };

  const handleCaptureObservation = () => {
    const obs = cameraRegistry.generateObservation(selectedDroneId);
    if (obs) {
      setLastObservation(`Saved ${obs.observationId} @ ${new Date(obs.timestampMs).toLocaleTimeString()}`);
      setTimeout(() => setLastObservation(null), 4000);
    }
  };

  const handleToggleFault = () => {
    if (cameraRecord) {
      const nextStatus: DroneCameraStatus = cameraRecord.status === 'ACTIVE' ? 'FAULTED' : 'ACTIVE';
      cameraRegistry.setCameraStatus(cameraRecord.cameraId, nextStatus);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-950/95 border border-cyan-500/50 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <Camera className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono">
                  Drone Optical Surveillance Feed
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  SIMULATED LIVE VIEW
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <Scan className="w-3 h-3 text-emerald-400" />
                  CV: {cvTracks.length} TRACKED
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Synthesized 3D virtual perspective downlink • CV Swimmer Detection (Phase 6)
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

        {/* Camera Selector Bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-900/50 border-b border-slate-800/80 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">SELECT DRONE:</span>
            {cameras.map((c) => {
              const isCurrent = c.droneId === selectedDroneId;
              return (
                <button
                  key={c.cameraId}
                  onClick={() => handleSelectCamera(c.droneId)}
                  className={`px-3 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-500/50'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {c.droneId} ({c.status})
                </button>
              );
            })}
          </div>

          {/* Quick Focus Button */}
          {onFocusDrone && drone && (
            <button
              onClick={() => onFocusDrone(drone.droneId, drone.position3D)}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5" />
              Focus 3D Viewport
            </button>
          )}
        </div>

        {/* Main Feed Viewport & Gimbal Controls */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Virtual Canvas Monitor (3 Cols) */}
          <div className="lg:col-span-3 space-y-2">
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
              {/* Virtual Render Target Canvas */}
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                className={`w-full h-full object-contain ${
                  sensorFilter === 'THERMAL' ? 'filter hue-rotate-180 contrast-150 saturate-200' : ''
                }`}
              />

              {/* Watermark Overlay */}
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/60 border border-cyan-500/30 text-[9px] font-mono text-cyan-300 pointer-events-none flex items-center gap-1.5">
                <span>[SIMULATED PERSPECTIVE • {sensorFilter}]</span>
                {isCvOverlayEnabled && (
                  <span className="text-emerald-400 border-l border-slate-700 pl-1.5">CV BOXES ON</span>
                )}
              </div>

              {/* Observation Saved Toast */}
              {lastObservation && (
                <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-emerald-950/90 border border-emerald-500 text-emerald-300 text-xs font-mono animate-in fade-in">
                  ✓ {lastObservation}
                </div>
              )}
            </div>

            {/* Video Feed Telemetry Ticker */}
            <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <span>FPS: <strong className="text-cyan-300">30</strong></span>
                <span>INFERENCE: <strong className="text-emerald-400">8 Hz ({cvMetrics.inferenceLatencyMs}ms)</strong></span>
                <span>CV DETECTIONS: <strong className="text-emerald-400">{cvTracks.length}</strong></span>
                <span>TRACKS: <strong className="text-cyan-300">{cvTracks.map(t => t.trackId).join(', ') || 'NONE'}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300">CV PIPELINE ACTIVE</span>
              </div>
            </div>
          </div>

          {/* Gimbal & Optics Controls (1 Col) */}
          <div className="space-y-3 font-mono text-xs">
            {/* Camera Status Card */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <span className="text-[10px] text-slate-500 block uppercase">Camera Payload</span>
              <div className="flex justify-between items-center">
                <strong className="text-white text-xs">{cameraRecord?.cameraId ?? 'N/A'}</strong>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  cameraRecord?.status === 'ACTIVE'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-red-950 text-red-400 border border-red-800'
                }`}>
                  {cameraRecord?.status ?? 'UNKNOWN'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{cameraRecord?.role ?? 'Standard'}</p>
            </div>

            {/* Gimbal Pitch Tilt */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 uppercase">Gimbal Pitch</span>
                <strong className="text-cyan-300">{cameraRecord?.gimbal.pitchDegrees.toFixed(0)}°</strong>
              </div>
              <input
                type="range"
                min="-90"
                max="0"
                step="5"
                value={cameraRecord?.gimbal.pitchDegrees ?? -35}
                onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>-90° (Nadir)</span>
                <span>-45° (Oblique)</span>
                <span>0° (Horizon)</span>
              </div>
            </div>

            {/* Optical Zoom */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 uppercase">Optical Zoom</span>
                <strong className="text-amber-300">{cameraRecord?.opticalZoomLevel.toFixed(1)}x</strong>
              </div>
              <input
                type="range"
                min="1.0"
                max="10.0"
                step="0.5"
                value={cameraRecord?.opticalZoomLevel ?? 1.0}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex gap-1.5">
                {[1.0, 2.0, 5.0, 10.0].map((z) => (
                  <button
                    key={z}
                    onClick={() => handleZoomChange(z)}
                    className={`flex-1 py-1 rounded text-[10px] font-bold border ${
                      cameraRecord?.opticalZoomLevel === z
                        ? 'bg-amber-950 text-amber-300 border-amber-600'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {z}x
                  </button>
                ))}
              </div>
            </div>

            {/* Sensor Filter Mode */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <span className="text-[10px] text-slate-500 uppercase">Sensor Filter</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setSensorFilter('OPTICAL')}
                  className={`py-1.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                    sensorFilter === 'OPTICAL'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  Daylight
                </button>
                <button
                  onClick={() => setSensorFilter('THERMAL')}
                  className={`py-1.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                    sensorFilter === 'THERMAL'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  Thermal IR
                </button>
              </div>
            </div>

              {/* AI Computer Vision Controls (Phase 6) */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/30 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-emerald-400 uppercase flex items-center gap-1 font-bold">
                    <Scan className="w-3 h-3" /> AI Person Detection
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {cvTracks.length} Tracked
                  </span>
                </div>
                <button
                  onClick={() => visionManager.setOverlayEnabled(!isCvOverlayEnabled)}
                  className={`w-full py-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    isCvOverlayEnabled
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  CV Bounding Boxes: {isCvOverlayEnabled ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => setIsObservationsDrawerOpen((prev) => !prev)}
                  className={`w-full py-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    isObservationsDrawerOpen
                      ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  Observations Log ({candidateObservations.length})
                </button>
              </div>

              {/* Action Buttons */}
              <div className="space-y-1.5 pt-1">
                <button
                  onClick={handleCaptureObservation}
                  className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Capture Observation
                </button>

                {onToggleFovCones && (
                  <button
                    onClick={() => onToggleFovCones(!isFovConesVisible)}
                    className={`w-full py-1.5 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      isFovConesVisible
                        ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    FOV Frustum Cones: {isFovConesVisible ? 'ON' : 'OFF'}
                  </button>
                )}

                <button
                  onClick={handleToggleFault}
                  className="w-full py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-red-400 border border-slate-800 text-[10px] transition-colors cursor-pointer"
                  title="Simulate optical camera link fault"
                >
                  Simulate Camera Fault
                </button>
              </div>
            </div>
          </div>

          {/* Candidate Observations Review Panel (Phase 6) */}
          {isObservationsDrawerOpen && (
            <div className="border-t border-slate-800 bg-slate-950 p-4 max-h-56 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Candidate Observations Log (Verification Gate)
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {candidateObservations.length} events recorded
                  </span>
                  <button
                    onClick={() => setIsTriagePanelOpen(true)}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <ShieldAlert className="w-3 h-3" />
                    Open Distress Triage
                  </button>
                </div>
              </div>

              {/* Strict Phasing Safety Disclaimer */}
              <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/40 text-[10px] text-amber-200/90 font-mono flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>OPERATOR VERIFICATION REQUIRED:</strong> Computer vision outputs are candidate visual observations, not confirmed drowning or distress. Lifeguard verification required prior to rescue dispatch.
                </span>
              </div>

              {candidateObservations.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500 font-mono">
                  No candidate observations emitted yet for this patrol circuit.
                </div>
              ) : (
                <div className="space-y-1.5 font-mono text-[11px]">
                  {candidateObservations.slice(0, 10).map((obs) => (
                    <div
                      key={obs.observationId}
                      className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-300 font-bold">{obs.observationId}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-slate-700">
                          {obs.category}
                        </span>
                        <span className="text-emerald-400 text-[10px]">
                          {(obs.confidence * 100).toFixed(0)}% Conf
                        </span>
                        <span className="text-slate-500 text-[10px]">
                          {new Date(obs.timestampMs).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            obs.reviewStatus === 'VERIFIED'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : obs.reviewStatus === 'DISMISSED'
                              ? 'bg-slate-800 text-slate-400 border border-slate-700'
                              : 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                          }`}
                        >
                          {obs.reviewStatus}
                        </span>
                        {obs.reviewStatus === 'PENDING_REVIEW' && (
                          <>
                            <button
                              onClick={() =>
                                visionManager.getObservationPublisher().updateReviewStatus(obs.observationId, 'VERIFIED')
                              }
                              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Verify candidate observation"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Verify
                            </button>
                            <button
                              onClick={() =>
                                visionManager.getObservationPublisher().updateReviewStatus(obs.observationId, 'DISMISSED')
                              }
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Dismiss false positive"
                            >
                              <XCircle className="w-3 h-3" />
                              Dismiss
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {isTriagePanelOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="max-w-3xl w-full">
              <DroneDistressVerificationPanel onClose={() => setIsTriagePanelOpen(false)} />
            </div>
          </div>
        )}
      </div>
    );
  };

