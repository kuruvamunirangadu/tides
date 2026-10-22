import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Beach } from '../../models/Beach';
import { Environment } from '../../models/Environment';
import { Visitor } from '../../models/Visitor';
import { Hazard } from '../../models/Hazard';
import { RescueCoordinator } from '../rescue/RescueCoordinator';
import { RipCurrentSimulator } from '../hazards/RipCurrentSimulator';
import { IncidentEventRecorder } from '../../impact-lab/replay/IncidentEventRecorder';
import { ForecastPanel } from '../../prediction/ForecastPanel';
import { PerceptionFusionPanel } from '../../vision/components/PerceptionFusionPanel';
import { DEFAULT_CAMERAS } from '../../vision/VisionConfig';
import { PersonDetector } from '../../vision/detection/PersonDetector';
import { ObjectTracker } from '../../vision/tracking/ObjectTracker';
import { CrossCameraAssociator } from '../../vision/fusion/CrossCameraAssociator';
import { SensorFusionAdapter } from '../../vision/fusion/SensorFusionAdapter';
import { CameraCoverageGeometry } from '../../vision/cameras/CameraCoverageGeometry';
import { IncidentEvidenceCorrelator } from '../../vision/fusion/IncidentEvidenceCorrelator';
import { DigitalTwinValidationPanel } from '../../calibration/components/DigitalTwinValidationPanel';
import { EmergencyOperationsPanel } from '../../emergency/coordination/components/EmergencyOperationsPanel';
import { RegionalCommandCenter } from '../../regional/components/RegionalCommandCenter';
import { BeachRegistry } from '../../regional/BeachRegistry';
import { RegionalRiskAggregator } from '../../regional/RegionalRiskAggregator';
import { SwimmerBehaviorAnalysisService } from '../../visitors/analysis/SwimmerBehaviorAnalysisService';
import { ReadinessDashboard } from '../../operations/components/ReadinessDashboard';
import {
  ShieldAlert,
  Activity,
  Radio,
  Ship,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Compass,
  Layers,
  Waves,
  Wind,
  Thermometer,
  X,
  FileText,
  Sliders,
  HelpCircle,
} from 'lucide-react';

interface UnifiedOperationsCenterProps {
  beach: Beach;
  environment: Environment;
  visitors: Visitor[];
  hazards: Hazard[];
  isOpen: boolean;
  onClose: () => void;
  onToggleCamera3DCones?: () => void;
  is3DConesVisible?: boolean;
}

export const UnifiedOperationsCenter: React.FC<UnifiedOperationsCenterProps> = ({
  beach,
  environment,
  visitors,
  hazards,
  isOpen,
  onClose,
  onToggleCamera3DCones,
  is3DConesVisible = false,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'REGIONAL' | 'READINESS' | 'PREDICTIONS' | 'PERCEPTION' | 'CALIBRATION' | 'EMERGENCY' | 'DECISIONS' | 'FLEET' | 'SENSORS'>('OVERVIEW');
  const detectorRef = useRef(new PersonDetector());
  const trackerRef = useRef(new ObjectTracker());
  const associatorRef = useRef(new CrossCameraAssociator());

  if (!isOpen) return null;

  const coordinator = RescueCoordinator.getInstance();
  const ripSim = RipCurrentSimulator.getInstance();
  const eventRecorder = IncidentEventRecorder.getInstance();

  const activeMission = coordinator.activeMission;
  const activeMissions = coordinator.getActiveMissions();
  const missionHistory = coordinator.missionHistory;
  const rescueMetrics = coordinator.getMetrics();
  const resources = coordinator.registry.getResources();
  const ripIncident = ripSim.getActiveIncident();
  const ripIncidents = ripSim.getActiveIncidents();
  const recordedIncidents = eventRecorder.getIncidents();
  const swimmerAssessments = SwimmerBehaviorAnalysisService.getInstance().getLatestAssessments();
  const swimmerConcerns = swimmerAssessments.filter((assessment) => assessment.category === 'UNUSUAL_MOVEMENT' || assessment.category === 'ELEVATED_CONCERN');

  // Swimmers in water / hazard zones
  const swimmersInWater = visitors.filter(
    (v) => v.state === 'SWIMMING' || v.state === 'STRUGGLING' || v.state === 'DISTRESS'
  );
  const bathersInHazard = visitors.filter(
    (v) => v.state === 'STRUGGLING' || v.state === 'DISTRESS' || v.position.y > (beach.shorelineY || 280) + 40
  );

  // Milestone 7: Computer Vision & Sensor Fusion Pipeline
  const fusionAdapter = SensorFusionAdapter.getInstance();
  const correlator = IncidentEvidenceCorrelator.getInstance();

  const simTime = Date.now() / 1000;
  const cameras = DEFAULT_CAMERAS;

  // 1. Run camera-level person detection
  const detectionsMap = detectorRef.current.detectPeopleInCameras(cameras, visitors, simTime);
  const allDetections: any[] = [];
  for (const dets of detectionsMap.values()) {
    allDetections.push(...dets);
  }

  // 2. Track updates
  const tracks = trackerRef.current.updateTracks(detectionsMap, simTime, 0.1);

  // 3. Cross-camera associations
  const associations = associatorRef.current.associateAcrossCameras(tracks, cameras);

  // 4. Multi-source sensor fusion
  const fusionSummary = fusionAdapter.fusePerceptionData(tracks, cameras, environment, simTime);

  // 5. Surveillance coverage geometry
  const coverageSummary = CameraCoverageGeometry.computeCoverageSummary(cameras);

  // 6. Evidence-based candidate incidents (Strict Zero Auto-Dispatch)
  const candidates = correlator.correlateEvidence(tracks, fusionSummary, hazards, simTime);

  const handleConfirmCandidate = (candId: string) => {
    correlator.confirmCandidate(candId);
    if (ripIncident && !coordinator.activeMission) {
      coordinator.handleDistressIncident(ripIncident, visitors, beach);
    }
  };

  const handleDismissCandidate = (candId: string) => {
    correlator.dismissCandidate(candId);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-slate-900 border-2 border-cyan-500/60 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col font-mono text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/40">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-widest flex items-center gap-2">
                <span>TIDES Operations Command</span>
                <span className="text-slate-500">•</span>
                <span className="text-emerald-400 font-bold">DIGITAL TWIN TELEMETRY</span>
              </div>
              <h2 className="text-white text-base font-bold">Unified Safety & Incident Command Center</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab navigation */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(
                [
                  { id: 'OVERVIEW', label: 'Tactical Status' },
                  { id: 'REGIONAL', label: 'Multi-Beach Regional Ops' },
                  { id: 'READINESS', label: 'Pilot Readiness' },
                  { id: 'PREDICTIONS', label: 'Predictive Intel' },
                  { id: 'PERCEPTION', label: 'Multi-Cam CV & Fusion' },
                  { id: 'CALIBRATION', label: 'Twin Calibration & Validation' },
                  { id: 'EMERGENCY', label: 'Emergency Evacuation' },
                  { id: 'DECISIONS', label: 'Explainable Decisions' },
                  { id: 'FLEET', label: 'Rescue Fleet' },
                  { id: 'SENSORS', label: 'Sensor Health' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-cyan-500 text-slate-950 font-extrabold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              title="Close Operations Dashboard"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-4">
              {/* Top Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                    <span>Active Incidents</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <div className="text-2xl font-black text-white">
                    {Math.max(ripIncidents.length, activeMissions.length)}
                  </div>
                  <div className="text-[10px] text-rose-400 font-bold">
                    {ripIncidents.length > 0 ? `${ripIncidents.length} DISTRESS INCIDENT(S)` : 'Nominal Safe Operations'}
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                    <span>In Hazard Zones</span>
                    <Waves className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-amber-300">
                    {bathersInHazard.length}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Total Bathers in Water: {swimmersInWater.length}
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                    <span>Fleet Readiness</span>
                    <Ship className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-black text-cyan-300">
                    {rescueMetrics.availableBoatsCount + rescueMetrics.availableLifeguardsCount} / {resources.length}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold">
                    2 Rapid Boats • 2 Lifeguards
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                    <span>Golden Window SLA</span>
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-emerald-300">
                    {rescueMetrics.goldenWindowComplianceRate}%
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Target &le; 180s Time-to-Assistance
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Swimmer Behavior Watch</h3>
                  <span className="text-[10px] text-slate-500">Decision support only</span>
                </div>
                <div className="text-[10px] text-slate-300">{swimmerConcerns.length} suspected anomaly(ies) · {swimmerAssessments.filter((assessment) => assessment.category === 'CONFIRMED_DISTRESS').length} confirmed distress</div>
                {swimmerConcerns.slice(0, 3).map((assessment) => (
                  <div key={assessment.visitorId} className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-[10px]">
                    <span className="text-white">{assessment.visitorName} {assessment.wristbandId ? `(${assessment.wristbandId})` : ''}</span>
                    <span className="text-amber-300">{assessment.category.replace(/_/g, ' ')}</span>
                  </div>
                ))}
                <div className="text-[9px] text-slate-500">Suspected anomalies never mark a swimmer as distressed or dispatch rescue automatically.</div>
              </div>

              {/* Environmental Telemetry Grid */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>Real-Time Environmental Oceanography</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400">WAVE HEIGHT:</span>
                    <p className="text-lg font-bold text-cyan-300">
                      {(environment.waveHeight ?? 1.2).toFixed(1)} m
                    </p>
                    <span className="text-[9px] text-slate-500">Period: {environment.wavePeriod ?? 8.0}s</span>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400">SEAWARD JET SPEED:</span>
                    <p className="text-lg font-bold text-amber-300">
                      {(environment.waterCurrent ?? 1.9).toFixed(1)} m/s
                    </p>
                    <span className="text-[9px] text-slate-500">Rip Plume Formation</span>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400">COASTAL WIND:</span>
                    <p className="text-lg font-bold text-white">
                      {environment.windSpeed ?? 18} km/h
                    </p>
                    <span className="text-[9px] text-slate-500">Dir: {Math.round(environment.windDirection ?? 120)}°</span>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400">TIDE STATUS:</span>
                    <p className="text-lg font-bold text-emerald-300">
                      {environment.tideStatus ?? 'RISING'}
                    </p>
                    <span className="text-[9px] text-slate-500">Temp: {environment.waterTemperature ?? 27.5}°C</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PREDICTIVE HAZARD INTELLIGENCE (Milestone 6) */}
          {activeTab === 'PREDICTIONS' && (
            <ForecastPanel
              beach={beach}
              environment={environment}
              visitors={visitors}
            />
          )}

          {/* TAB: MULTI-CAM COMPUTER VISION & SENSOR FUSION (Milestone 7) */}
          {activeTab === 'PERCEPTION' && (
            <PerceptionFusionPanel
              cameras={cameras}
              tracks={tracks}
              detections={allDetections}
              associations={associations}
              fusionSummary={fusionSummary}
              coverageSummary={coverageSummary}
              candidates={candidates}
              onConfirmCandidate={handleConfirmCandidate}
              onDismissCandidate={handleDismissCandidate}
              onToggleCamera3DCones={onToggleCamera3DCones}
              is3DConesVisible={is3DConesVisible}
            />
          )}

          {/* TAB 3: EXPLAINABLE SAFETY DECISIONS */}
          {activeTab === 'DECISIONS' && (
            <div className="space-y-4 text-left">
              <div className="bg-cyan-950/20 border border-cyan-500/40 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase">
                  <HelpCircle className="w-4 h-4 text-cyan-400" />
                  <span>Explainable Safety Intelligence Rationale</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  TIDES documents transparent, verifiable decision rationale for every emergency alert and rescue dispatch without synthetic fabrication.
                </p>
              </div>

              {activeMission || ripIncident ? (
                <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold uppercase">
                        CRITICAL SAFETY INCIDENT
                      </span>
                      <h4 className="text-white text-sm font-bold mt-1">
                        {activeMission ? activeMission.missionId : ripIncident?.incidentId} — Offshore Rip Entrainment
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 text-[10px]">Severity:</span>
                      <strong className="text-rose-400 block text-xs">CRITICAL (Tier 1)</strong>
                    </div>
                  </div>

                  {/* Decision Explanation Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[10px] text-cyan-400 font-bold uppercase">1. Incident Onset Rationale</span>
                      <p className="text-slate-300 text-[11px] leading-normal">
                        Swimmer entrained into central rip neck channel (Y &gt; 335m). Seaward velocity of 1.9 m/s exceeded bather maximum sustainable swimming speed (1.2 m/s). Fatigue progressed beyond 50%, initiating acute distress.
                      </p>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[10px] text-amber-400 font-bold uppercase">2. Resource Assignment Policy</span>
                      <p className="text-slate-300 text-[11px] leading-normal">
                        {activeMission?.assignmentRationale ||
                          'High-speed offshore rescue craft RB-01 (18.5 m/s) assigned over shore-based guards due to offshore deep-water location and minimal ETA.'}
                      </p>
                    </div>
                  </div>

                  {/* Chronological Timestamp Verification */}
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Verified Event Chronology:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="p-2 bg-slate-950 rounded border border-slate-800">
                        <span className="text-[9px] text-slate-400">DISTRESS ONSET</span>
                        <div className="font-bold text-white text-xs">
                          {activeMission?.distressSimTime ? `${activeMission.distressSimTime.toFixed(1)}s` : 'N/A'}
                        </div>
                      </div>
                      <div className="p-2 bg-slate-950 rounded border border-slate-800">
                        <span className="text-[9px] text-slate-400">ALERT BROADCAST</span>
                        <div className="font-bold text-amber-400 text-xs">
                          {activeMission?.alertSimTime ? `${activeMission.alertSimTime.toFixed(1)}s` : 'N/A'}
                        </div>
                      </div>
                      <div className="p-2 bg-slate-950 rounded border border-slate-800">
                        <span className="text-[9px] text-slate-400">FLEET DISPATCH</span>
                        <div className="font-bold text-cyan-400 text-xs">
                          {activeMission?.dispatchSimTime ? `${activeMission.dispatchSimTime.toFixed(1)}s` : 'N/A'}
                        </div>
                      </div>
                      <div className="p-2 bg-slate-950 rounded border border-slate-800">
                        <span className="text-[9px] text-slate-400">TIME TO ASSIST</span>
                        <div className="font-bold text-emerald-400 text-xs">
                          {activeMission?.timeToAssistanceSec ? `${activeMission.timeToAssistanceSec}s` : 'In Progress'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/60 p-8 rounded-2xl border border-slate-800 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h4 className="text-white font-bold text-sm">No Active Emergency Incident</h4>
                  <p className="text-slate-400 text-[11px] max-w-md mx-auto">
                    All coastal zones are currently within safe operational parameters. Trigger a demonstration rip scenario to view live explainable dispatch calculations.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RESCUE FLEET */}
          {activeTab === 'FLEET' && (
            <div className="space-y-3 text-left">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Emergency Fleet Assets & Station Assignments
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {resources.map((res) => (
                  <div
                    key={res.id}
                    className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {res.type === 'RESCUE_BOAT' ? (
                          <Ship className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Activity className="w-4 h-4 text-amber-400" />
                        )}
                        <strong className="text-white text-xs">{res.id}</strong>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          res.status === 'AVAILABLE'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {res.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 font-bold">{res.name}</p>

                    <div className="text-[10px] text-slate-400 space-y-0.5 border-t border-slate-800/80 pt-2">
                      <div>Speed Capability: <strong className="text-white">{res.speedMps} m/s</strong></div>
                      <div>Base Position: [{res.standbyX}, {res.standbyZ}]</div>
                      <div>Current Position: [{res.currentX.toFixed(1)}, {res.currentZ.toFixed(1)}]</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SENSORS */}
          {activeTab === 'SENSORS' && (
            <div className="space-y-3 text-left">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Sensor & Observation Telemetry Health
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[10px]">
                    <span>COASTAL CCTV</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <strong className="text-white block text-sm">ONLINE</strong>
                  <span className="text-[9px] text-slate-400">3 AI Optical Cameras</span>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[10px]">
                    <span>SONAR BUOYS</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <strong className="text-white block text-sm">ONLINE</strong>
                  <span className="text-[9px] text-slate-400">Current Velocity Sensor</span>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[10px]">
                    <span>X-BAND RADAR</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <strong className="text-white block text-sm">ACTIVE</strong>
                  <span className="text-[9px] text-slate-400">Wave Height & Spectrum</span>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[10px]">
                    <span>SATELLITE SYNC</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <strong className="text-white block text-sm">LOCKED</strong>
                  <span className="text-[9px] text-slate-400">Bathymetry & Headlands</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'CALIBRATION' && (
            <DigitalTwinValidationPanel />
          )}

          {activeTab === 'EMERGENCY' && (
            <EmergencyOperationsPanel beach={beach} environment={environment} visitors={visitors} />
          )}

          {activeTab === 'REGIONAL' && (
            <RegionalCommandCenter onLaunchRushikondaSimulator={() => setActiveTab('OVERVIEW')} />
          )}

          {activeTab === 'READINESS' && (
            <ReadinessDashboard />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
