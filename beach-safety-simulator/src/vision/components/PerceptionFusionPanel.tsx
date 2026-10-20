import React, { useState } from 'react';
import { Camera } from '../models/Camera';
import { PersonTrack } from '../models/PersonTrack';
import { DetectedPerson } from '../models/Detection';
import { CrossCameraAssociation } from '../fusion/CrossCameraAssociator';
import { FusedPerceptionSummary } from '../fusion/SensorFusionAdapter';
import { CameraCoverageSummary } from '../cameras/CameraCoverageGeometry';
import { CandidateIncident } from '../models/CandidateIncident';
import {
  Camera as CameraIcon,
  Eye,
  Activity,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  ShieldAlert,
  Sliders,
  X,
  Compass,
  Maximize2,
  TrendingUp,
} from 'lucide-react';

interface PerceptionFusionPanelProps {
  cameras: Camera[];
  tracks: PersonTrack[];
  detections: DetectedPerson[];
  associations: CrossCameraAssociation[];
  fusionSummary: FusedPerceptionSummary;
  coverageSummary: CameraCoverageSummary;
  candidates: CandidateIncident[];
  onConfirmCandidate?: (candidateId: string) => void;
  onDismissCandidate?: (candidateId: string) => void;
  onToggleCamera3DCones?: () => void;
  is3DConesVisible?: boolean;
}

export const PerceptionFusionPanel: React.FC<PerceptionFusionPanelProps> = ({
  cameras,
  tracks,
  detections,
  associations,
  fusionSummary,
  coverageSummary,
  candidates,
  onConfirmCandidate,
  onDismissCandidate,
  onToggleCamera3DCones,
  is3DConesVisible = false,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'CAMERAS' | 'ASSOCIATIONS' | 'FUSION' | 'COVERAGE' | 'CANDIDATES'>(
    'CAMERAS'
  );
  const [selectedCameraId, setSelectedCameraId] = useState<string>(cameras[0]?.id || 'CAM-01');

  const selectedCam = cameras.find((c) => c.id === selectedCameraId) || cameras[0];
  const camDetections = detections.filter((d) => d.cameraId === selectedCameraId);
  const camTracks = tracks.filter((t) => t.cameraId === selectedCameraId && t.active && t.state !== 'EXPIRED');

  return (
    <div className="space-y-4 font-mono text-xs text-slate-200">
      {/* Top Telemetry & Provenance Badge Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
            <span>Vision Surveillance</span>
            <CameraIcon className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-black text-white">
            {coverageSummary.activeCamerasCount} / {cameras.length} ONLINE
          </div>
          <div className="text-[10px] text-cyan-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            PROVENANCE: SIMULATED FEED
          </div>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
            <span>Coverage Footprint</span>
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-300">
            {coverageSummary.totalCoveragePct}%
          </div>
          <div className="text-[10px] text-slate-400">
            {coverageSummary.overlaps.length} Overlapping Corridors
          </div>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
            <span>Multi-Cam Associations</span>
            <Activity className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-black text-blue-300">
            {associations.length}
          </div>
          <div className="text-[10px] text-slate-400">
            {tracks.filter((t) => t.active && t.state !== 'EXPIRED').length} Active Camera Tracks
          </div>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
            <span>Disagreements / Alerts</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-300">
            {fusionSummary.disagreements.length} / {candidates.length}
          </div>
          <div className="text-[10px] text-amber-400 font-bold">
            {candidates.filter((c) => c.status === 'CANDIDATE_UNVERIFIED').length} Pending Operator Verification
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs and 3D Viewport Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {(
            [
              { id: 'CAMERAS', label: 'CCTV Camera Feeds' },
              { id: 'ASSOCIATIONS', label: 'Cross-Cam Tracking' },
              { id: 'FUSION', label: 'Sensor Disagreements' },
              { id: 'COVERAGE', label: 'Coverage & Blind Spots' },
              { id: 'CANDIDATES', label: `Candidate Alerts (${candidates.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                activeSubTab === tab.id
                  ? 'bg-cyan-500 text-slate-950 font-extrabold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {onToggleCamera3DCones && (
          <button
            onClick={onToggleCamera3DCones}
            className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              is3DConesVisible
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{is3DConesVisible ? 'Hide 3D FOV Frustums' : 'Show 3D FOV Frustums'}</span>
          </button>
        )}
      </div>

      {/* SUB-TAB 1: CCTV CAMERA FEEDS */}
      {activeSubTab === 'CAMERAS' && (
        <div className="space-y-4">
          {/* Camera Selector Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {cameras.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCameraId(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium border cursor-pointer transition-all ${
                  c.id === selectedCameraId
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-sm'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      c.status === 'ONLINE' ? 'bg-emerald-400' : c.status === 'DEGRADED' ? 'bg-amber-400' : 'bg-rose-400'
                    }`}
                  />
                  <span>{c.name}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Camera Viewport Simulation Card */}
          {selectedCam && (
            <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div>
                  <div className="font-bold text-white text-sm flex items-center gap-2">
                    <span>{selectedCam.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      ID: {selectedCam.id}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      PROVENANCE: SIMULATED (YOLOv8 SYNTHETIC)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Position: ({selectedCam.position.x}m, {selectedCam.position.y}m) | FOV: {selectedCam.fieldOfView}° | Range: {selectedCam.range}m | Resolution: {selectedCam.resolution.width}x{selectedCam.resolution.height} @ {selectedCam.fps} FPS
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                      selectedCam.status === 'ONLINE'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {selectedCam.status}
                  </span>
                </div>
              </div>

              {/* Synthetic Camera Viewport Frame with Bounding Boxes */}
              <div className="relative w-full h-52 bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden flex flex-col justify-between p-3 select-none">
                {/* HUD Overlay details */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono z-10">
                  <div className="bg-slate-950/80 px-2 py-1 rounded border border-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                    <span className="text-rose-400 font-bold">REC</span>
                    <span>FEED-SRC: EDGE-STREAM-{selectedCam.id}</span>
                  </div>
                  <div className="bg-slate-950/80 px-2 py-1 rounded border border-slate-800 text-cyan-300">
                    DETECTIONS: {camDetections.length} | TRACKS: {camTracks.length}
                  </div>
                </div>

                {/* Simulated Bounding Box Overlay graphics */}
                <div className="absolute inset-0 p-8 flex items-center justify-around pointer-events-none">
                  {camDetections.slice(0, 4).map((det, idx) => (
                    <div
                      key={det.id}
                      className="border-2 border-cyan-400/80 bg-cyan-500/10 rounded p-1 flex flex-col justify-between min-w-[70px] min-h-[90px] animate-in fade-in"
                    >
                      <span className="text-[9px] font-bold bg-cyan-500 text-slate-950 px-1 rounded-sm w-fit">
                        PERSON {(det.confidence * 100).toFixed(0)}%
                      </span>
                      <span className="text-[9px] font-mono text-cyan-300 bg-slate-950/80 px-1 rounded-sm w-fit">
                        {det.trackId || `DET-${idx}`}
                      </span>
                    </div>
                  ))}
                  {camDetections.length === 0 && (
                    <div className="text-slate-500 text-xs italic">
                      Zero detections currently in {selectedCam.id} coverage cone.
                    </div>
                  )}
                </div>

                {/* Bottom Camera Metadata */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono z-10 bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
                  <span>GROUND-PLANE CALIBRATION: HOMOGRAPHY CONSTRAINED</span>
                  <span>BIOMETRICS: STRICTLY DISABLED (PRIVACY PROTECTED)</span>
                </div>
              </div>

              {/* Detections List */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-300 uppercase">
                  Active Detections in {selectedCam.id} Stream ({camDetections.length})
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {camDetections.map((d) => (
                    <div
                      key={d.id}
                      className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-cyan-400">{d.trackId || d.id}</span>
                        <span className="text-slate-400">
                          Pos: ({d.worldPosition.x.toFixed(1)}m, {d.worldPosition.y.toFixed(1)}m)
                        </span>
                        <span className="text-slate-500">
                          {d.inWater ? '🌊 IN OCEAN' : '🏖️ ON SAND'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-emerald-400 font-bold">{(d.confidence * 100).toFixed(0)}% CONF</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700">
                          {d.provenance}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: CROSS-CAM TRACKING */}
      {activeSubTab === 'ASSOCIATIONS' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wide">
              Cross-Camera Spatio-Temporal Association Matrix
            </h3>
            <span className="text-[10px] text-slate-400">
              Gated by ground-plane Euclidean distance (&lt;22m) &amp; timestamp skew (&lt;1.5s)
            </span>
          </div>

          {associations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              No cross-camera overlapping tracks currently detected. Bathers are either in single-camera sectors or uncalibrated zones.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {associations.map((assoc) => (
                <div
                  key={assoc.globalEntityId}
                  className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-400">{assoc.globalEntityId}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          assoc.status === 'CONFIRMED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {assoc.status}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-cyan-300 font-bold">
                      Association Confidence: {(assoc.confidence * 100).toFixed(0)}%
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
                    <span className="text-slate-400">Linked Cameras:</span>
                    {assoc.cameraTracks.map((ct) => (
                      <span
                        key={ct.trackId}
                        className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-cyan-400 font-mono"
                      >
                        {ct.cameraId} ➔ {ct.trackId}
                      </span>
                    ))}
                    <span className="text-slate-400">Ground Distance:</span>
                    <span className="text-slate-200 font-bold">{assoc.spatialDistanceMeters}m</span>
                    <span className="text-slate-400">Clock Skew:</span>
                    <span className="text-slate-200 font-bold">{assoc.timeDeltaSeconds}s</span>
                  </div>

                  <div className="text-[10px] text-slate-400 italic">
                    Reason: {assoc.notes}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: SENSOR DISAGREEMENTS */}
      {activeSubTab === 'FUSION' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wide">
              Sensor Fusion Telemetry &amp; Disagreement Monitor
            </h3>
            <span className="text-[10px] text-slate-400">
              Fusion Algorithm: {fusionSummary.fusionVersion}
            </span>
          </div>

          {/* Environmental Telemetry vs Vision Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Acoustic ADCP Current</div>
              <div className="text-lg font-black text-white">{fusionSummary.adcpCurrentMps.toFixed(2)} m/s</div>
              <div className="text-[10px] text-slate-400">Sensor: CURRENT-ADCP-01</div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Vision Swimmer Drift Speed</div>
              <div className="text-lg font-black text-cyan-300">{fusionSummary.avgDriftVelocityMps.toFixed(2)} m/s</div>
              <div className="text-[10px] text-slate-400">Active Swimmers in Ocean: {fusionSummary.swimmersInWaterCount}</div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Ocean Wave Height</div>
              <div className="text-lg font-black text-white">{fusionSummary.waveHeightMeters.toFixed(2)} m</div>
              <div className="text-[10px] text-slate-400">Sensor: BUOY-WAVE-01</div>
            </div>
          </div>

          {/* Disagreements List */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-300 uppercase">
              Sensor Divergence &amp; Coverage Voids ({fusionSummary.disagreements.length})
            </div>

            {fusionSummary.disagreements.length === 0 ? (
              <div className="p-6 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl text-xs">
                All physical and optical sensors are in mutual agreement within calibrated tolerances (&lt;0.5 m/s).
              </div>
            ) : (
              fusionSummary.disagreements.map((dis, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          dis.severity === 'SEVERE'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {dis.severity} DISAGREEMENT
                      </span>
                      <span className="font-bold text-white text-xs">{dis.property}</span>
                    </div>
                    <div className="text-xs text-slate-300">{dis.explanation}</div>
                    <div className="text-[10px] text-slate-400">
                      Comparing <span className="text-cyan-400">{dis.sourceA} ({dis.valA} {dis.unit})</span> vs{' '}
                      <span className="text-cyan-400">{dis.sourceB} ({dis.valB} {dis.unit})</span> — Divergence: {dis.diff.toFixed(2)} {dis.unit}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: COVERAGE & BLIND SPOTS */}
      {activeSubTab === 'COVERAGE' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wide">
              Surveillance Grid Geometry &amp; Blind Spot Map
            </h3>
            <span className="text-[10px] text-cyan-400 font-bold">
              Total Beach Monitored: {coverageSummary.totalCoveragePct}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Overlapping Corridors */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="font-bold text-slate-300 text-xs flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Overlapping Surveillance Corridors ({coverageSummary.overlaps.length})</span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {coverageSummary.overlaps.map((ov, i) => (
                  <div key={i} className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-[11px] space-y-0.5">
                    <div className="font-bold text-cyan-300">{ov.overlapName}</div>
                    <div className="text-slate-400 text-[10px]">
                      Span: ~{ov.approxSpanMeters}m overlap between {ov.cameraA} and {ov.cameraB}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Blind Spots */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="font-bold text-slate-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Identified Blind Spots &amp; Coverage Voids ({coverageSummary.blindSpots.length})</span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {coverageSummary.blindSpots.map((bs) => (
                  <div key={bs.id} className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-[11px] space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300">{bs.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-400 rounded border border-amber-500/30">
                        {bs.reason}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[10px]">
                      Coordinates: X [{bs.xMin}..{bs.xMax}]m, Y [{bs.yMin}..{bs.yMax}]m
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: CANDIDATE ALERTS & OPERATOR VERIFICATION */}
      {activeSubTab === 'CANDIDATES' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wide">
              Explainable Candidate Incident Queue (Human-in-the-Loop)
            </h3>
            <span className="text-[10px] text-rose-400 font-bold">
              Zero Automatic Dispatch — Lifeguard Confirmation Mandatory
            </span>
          </div>

          {candidates.length === 0 ? (
            <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              No active candidate alerts. All swimming zones operating within normal safety limits.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {candidates.map((cand) => (
                <div
                  key={cand.id}
                  className="p-4 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{cand.id}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                        {cand.candidateType}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          cand.status === 'CANDIDATE_UNVERIFIED'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : cand.status === 'OPERATOR_CONFIRMED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {cand.status}
                      </span>
                    </div>

                    <div className="text-right text-[11px] font-mono text-cyan-300 font-bold">
                      Confidence: {(cand.confidence * 100).toFixed(0)}%
                    </div>
                  </div>

                  {/* Supporting Evidence Chain */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Supporting Multi-Source Evidence:</div>
                    <ul className="space-y-0.5 text-[11px] text-slate-300 list-disc list-inside bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                      {cand.supportingEvidence.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Uncertainty & Nuance */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase text-amber-400/90">Sources of Uncertainty:</div>
                    <ul className="space-y-0.5 text-[10px] text-slate-400 list-disc list-inside bg-amber-950/20 p-2 rounded-xl border border-amber-900/30">
                      {cand.uncertaintyReasons.map((unc, i) => (
                        <li key={i}>{unc}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Operator Review Actions */}
                  {cand.status === 'CANDIDATE_UNVERIFIED' && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <div className="text-[10px] text-slate-400 italic">
                        Decision Required: Dispatch team will only activate after human confirmation.
                      </div>
                      <div className="flex items-center gap-2">
                        {onDismissCandidate && (
                          <button
                            onClick={() => onDismissCandidate(cand.id)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-all border border-slate-700"
                          >
                            Dismiss as False Alarm
                          </button>
                        )}
                        {onConfirmCandidate && (
                          <button
                            onClick={() => onConfirmCandidate(cand.id)}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-all shadow-md flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirm &amp; Escalate</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {cand.decisionNotes && cand.status !== 'CANDIDATE_UNVERIFIED' && (
                    <div className="text-[11px] text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="font-bold text-slate-300">Operator Log:</span> {cand.decisionNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

