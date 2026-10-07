import React, { useState } from 'react';
import { Camera } from '../models/Camera';
import { CVSafetyEvent } from '../models/CVSafetyEvent';
import { DetectedPerson } from '../models/Detection';
import { VisionMetrics } from '../evaluation/VisionMetrics';
import { Beach } from '../../models/Beach';
import { CameraFeed } from './CameraFeed';
import { VisionMetricsView } from './VisionMetricsView';

interface VisionPanelProps {
  cameras: Camera[];
  detections: DetectedPerson[];
  safetyEvents: CVSafetyEvent[];
  metrics: VisionMetrics;
  beach: Beach;
  onUpdatePTZ?: (cameraId: string, rotation: number, fov: number) => void;
  onTogglePower?: (cameraId: string) => void;
}

export const VisionPanel: React.FC<VisionPanelProps> = ({
  cameras = [],
  detections = [],
  safetyEvents = [],
  metrics,
  beach,
  onUpdatePTZ,
  onTogglePower,
}) => {
  const [selectedCameraId, setSelectedCameraId] = useState<string>(cameras[0]?.id || 'CAM-01');
  const [activeTab, setActiveTab] = useState<'feeds' | 'metrics' | 'events'>('feeds');
  const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');

  const selectedCam = cameras.find((c) => c.id === selectedCameraId) || cameras[0];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Coastal Vision Safety Layer (CCTV & AI Perception)
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                {cameras.filter(c => c.status === 'ONLINE').length}/{cameras.length} ONLINE
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Perception layer inferring swimmer kinematic states, restricted zone incursions, and distress
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 text-xs">
            <button
              onClick={() => setActiveTab('feeds')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                activeTab === 'feeds'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CCTV Feeds
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                activeTab === 'metrics'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ground Truth vs CV
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                activeTab === 'events'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CV Events ({safetyEvents.length})
            </button>
          </div>

          {activeTab === 'feeds' && (
            <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 text-xs">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded ${viewMode === 'grid' ? 'bg-slate-700 text-cyan-300' : 'text-slate-400'}`}
                title="Grid View (2x2)"
              >
                ⊞ Grid
              </button>
              <button
                onClick={() => setViewMode('single')}
                className={`px-2.5 py-1 rounded ${viewMode === 'single' ? 'bg-slate-700 text-cyan-300' : 'text-slate-400'}`}
                title="Single Camera View"
              >
                ◻ Single
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 flex-1">
        {activeTab === 'feeds' && (
          <div>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cameras.map((cam) => (
                  <CameraFeed
                    key={cam.id}
                    camera={cam}
                    detections={detections.filter((d) => d.cameraId === cam.id)}
                    beach={beach}
                    isSelected={cam.id === selectedCameraId}
                    onSelect={() => setSelectedCameraId(cam.id)}
                    onUpdatePTZ={onUpdatePTZ}
                    onTogglePower={onTogglePower}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {cameras.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCameraId(c.id)}
                      className={`px-3 py-1.5 rounded text-xs font-mono font-medium border ${
                        c.id === selectedCameraId
                          ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
                {selectedCam && (
                  <CameraFeed
                    camera={selectedCam}
                    detections={detections.filter((d) => d.cameraId === selectedCam.id)}
                    beach={beach}
                    isSelected={true}
                    onUpdatePTZ={onUpdatePTZ}
                    onTogglePower={onTogglePower}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'metrics' && (
          <VisionMetricsView metrics={metrics} />
        )}

        {activeTab === 'events' && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Live Computer Vision Inferred Events
            </h3>
            {safetyEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                No active safety events detected by computer vision streams.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {safetyEvents.map((evt) => {
                  let badgeBg = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
                  if (evt.severity === 'CRITICAL') badgeBg = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
                  else if (evt.severity === 'HIGH') badgeBg = 'bg-amber-500/20 text-amber-300 border-amber-500/30';

                  return (
                    <div
                      key={evt.id}
                      className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${badgeBg}`}>
                          {evt.severity}
                        </span>
                        <div>
                          <div className="font-medium text-slate-200">{evt.description}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                            Type: {evt.type} | Source Cam: {evt.cameraId} | Conf: {(evt.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                      <div className="text-right font-mono text-[10px] text-slate-500">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
