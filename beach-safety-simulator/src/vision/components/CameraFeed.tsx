import React, { useRef, useEffect } from 'react';
import { Camera } from '../models/Camera';
import { DetectedPerson } from '../models/Detection';
import { Beach } from '../../models/Beach';

interface CameraFeedProps {
  camera: Camera;
  detections?: DetectedPerson[];
  beach: Beach;
  onUpdatePTZ?: (cameraId: string, rotation: number, fov: number) => void;
  onTogglePower?: (cameraId: string) => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({
  camera,
  detections = [],
  beach,
  onUpdatePTZ,
  onTogglePower,
  isSelected,
  onSelect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    if (camera.status !== 'ONLINE') {
      // Offline / Error screen
      ctx.fillStyle = '#475569';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`CAM NO SIGNAL [${camera.status}]`, width / 2, height / 2);
      return;
    }

    // Draw Simulated Camera View
    ctx.save();
    
    // Background ocean & shoreline gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0c4a6e'); // Deep water
    bgGrad.addColorStop(0.55, '#0284c7'); // Surf line
    bgGrad.addColorStop(1, '#ca8a04'); // Sand
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Perspective & Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let j = 0; j < height; j += 30) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(width, j);
      ctx.stroke();
    }

    // Draw visible detections with bounding boxes
    if (detections && detections.length > 0) {
      detections.forEach((det) => {
        // Map 2D world coords relative to camera FOV to canvas pixel coords
        const rad = (camera.rotation * Math.PI) / 180;
        const dx = det.worldPosition.x - camera.position.x;
        const dy = det.worldPosition.y - camera.position.y;
        
        // Project onto camera local coordinate system
        const localX = dx * Math.cos(-rad) - dy * Math.sin(-rad);
        const localY = dx * Math.sin(-rad) + dy * Math.cos(-rad); // Distance ahead

        if (localY <= 0) return; // Behind camera

        const halfFovRad = ((camera.fieldOfView / 2) * Math.PI) / 180;
        const maxRange = camera.range;

        // Normalized screen coordinates
        const normX = 0.5 + (localX / (localY * Math.tan(halfFovRad) * 2));
        const normY = 1.0 - (localY / maxRange);

        const screenX = Math.max(15, Math.min(width - 15, normX * width));
        const screenY = Math.max(25, Math.min(height - 15, normY * height));

        // Bounding box size scaled by distance
        const scale = Math.max(0.3, 1.0 - (localY / maxRange));
        const boxW = Math.max(16, 28 * scale);
        const boxH = Math.max(24, 44 * scale);

        // Color coding based on state
        let boxColor = det.inWater ? '#38bdf8' : '#22c55e'; // Water blue vs sand green
        if (det.confidence < 0.6) boxColor = '#eab308'; // Amber for lower confidence

        // Draw Bounding Box
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(screenX - boxW / 2, screenY - boxH, boxW, boxH);

        // Corner accents
        const cornerLen = 3;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(screenX - boxW / 2, screenY - boxH + cornerLen);
        ctx.lineTo(screenX - boxW / 2, screenY - boxH);
        ctx.lineTo(screenX - boxW / 2 + cornerLen, screenY - boxH);
        ctx.stroke();

        // Label Tag
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(screenX - boxW / 2, screenY - boxH - 12, boxW + 24, 11);
        ctx.fillStyle = boxColor;
        ctx.font = '8px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(
          `${det.trackId ? `T${det.trackId.slice(-3)}` : 'P'} ${(det.confidence * 100).toFixed(0)}%`,
          screenX - boxW / 2 + 2,
          screenY - boxH - 3
        );
      });
    }

    // Draw Scanlines overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 2);
    }

    // Camera HUD / OSD overlay
    ctx.restore();
    ctx.fillStyle = '#22c55e';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`REC ● [${camera.id}] ${camera.name}`, 10, 16);
    ctx.fillText(`FOV: ${camera.fieldOfView}° | ROT: ${camera.rotation}° | RNG: ${camera.range}m`, 10, 30);
    ctx.textAlign = 'right';
    ctx.fillText(`OBJECTS: ${detections.length}`, width - 10, 16);
    ctx.fillText(`FPS: ${camera.fps}`, width - 10, 30);

  }, [camera, detections, beach]);

  return (
    <div
      onClick={onSelect}
      className={`relative bg-slate-900 rounded-lg overflow-hidden border transition-all cursor-pointer ${
        isSelected ? 'border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-950/50' : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Video Canvas */}
      <canvas
        ref={canvasRef}
        width={380}
        height={220}
        className="w-full h-auto block bg-slate-950"
      />

      {/* Camera Controls Bar */}
      <div className="p-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              camera.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className="font-mono font-semibold text-slate-200">{camera.id}</span>
          <span className="text-[10px] text-slate-400">({camera.zoneIds.join(', ')})</span>
        </div>

        {/* PTZ Quick Adjusters */}
        {onUpdatePTZ && (
          <div className="flex items-center gap-1 font-mono text-[10px]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onUpdatePTZ(camera.id, (camera.rotation - 10 + 360) % 360, camera.fieldOfView)}
              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
              title="Pan Left"
            >
              ◀
            </button>
            <span className="w-8 text-center text-cyan-400">{camera.rotation}°</span>
            <button
              onClick={() => onUpdatePTZ(camera.id, (camera.rotation + 10) % 360, camera.fieldOfView)}
              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
              title="Pan Right"
            >
              ▶
            </button>
            <button
              onClick={() => onUpdatePTZ(camera.id, camera.rotation, Math.max(30, camera.fieldOfView - 10))}
              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 ml-1"
              title="Zoom In (Narrow FOV)"
            >
              +
            </button>
            <button
              onClick={() => onUpdatePTZ(camera.id, camera.rotation, Math.min(120, camera.fieldOfView + 10))}
              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
              title="Zoom Out (Wide FOV)"
            >
              -
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
