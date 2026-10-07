import React, { useEffect, useRef, useState } from 'react';
import { Beach } from '../models/Beach';
import { Environment } from '../models/Environment';
import { Visitor, VisionTrackOverlay } from '../models/Visitor';
import { EscapePath } from '../simulation/VisitorEngine';
import { Hazard } from '../models/Hazard';
import { BeachRiskOverview } from '../models/Risk';
import { Incident } from '../models/Incident';
import { EmergencyResource } from '../emergency/models/EmergencyResource';
import { BoardDisplayState } from '../emergency/communication/WarningBoardManager';
import { FailureEvent } from '../failures/types/FailureTypes';
import { SensorConflict } from '../failures/sensors/SensorReading';
import { Camera } from '../vision/models/Camera';
import { Drone } from '../drones/models/Drone';
import { DroneCoverage } from '../drones/models/DroneCoverage';
import {
  HelpCircle,
  X,
  LifeBuoy,
  Ship,
  Camera as CameraIcon,
  Plane,
  Shield,
  Radio,
  AlertTriangle,
  Globe,
  Flame,
  Waves,
  Eye,
  Crosshair,
  Sliders,
  Layers,
} from 'lucide-react';

export type CanvasViewMode = 'tactical' | 'satellite' | 'thermal' | 'hydrodynamic';

function drawComputerVisionHUD(
  ctx: CanvasRenderingContext2D,
  detections: VisionTrackOverlay[],
  scaleX: (x: number) => number,
  scaleY: (y: number) => number
) {
  detections.forEach((det) => {
    const screenX = scaleX(det.x);
    const screenY = scaleY(det.y);
    const boxSize = 24;

    ctx.save();

    // 1. Target Reticle Color
    if (det.className === 'struggling_arms' || det.className === 'submerged_head') {
      ctx.strokeStyle = '#ef4444'; // Red distress
      ctx.fillStyle = '#ef4444';
    } else if (det.isBreach) {
      ctx.strokeStyle = '#f59e0b'; // Amber geofence breach
      ctx.fillStyle = '#f59e0b';
    } else {
      ctx.strokeStyle = '#06b6d4'; // Cyan normal
      ctx.fillStyle = '#06b6d4';
    }

    ctx.lineWidth = 1.5;

    // Corner bounding reticle
    const half = boxSize / 2;
    const corner = 5;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(screenX - half, screenY - half + corner);
    ctx.lineTo(screenX - half, screenY - half);
    ctx.lineTo(screenX - half + corner, screenY - half);
    // Top-right
    ctx.moveTo(screenX + half - corner, screenY - half);
    ctx.lineTo(screenX + half, screenY - half);
    ctx.lineTo(screenX + half, screenY - half + corner);
    // Bottom-left
    ctx.moveTo(screenX - half, screenY + half - corner);
    ctx.lineTo(screenX - half, screenY + half);
    ctx.lineTo(screenX - half + corner, screenY + half);
    // Bottom-right
    ctx.moveTo(screenX + half - corner, screenY + half);
    ctx.lineTo(screenX + half, screenY + half);
    ctx.lineTo(screenX + half, screenY + half - corner);
    ctx.stroke();

    // Tracking Tag Label
    ctx.font = '10px monospace';
    const tag = `#${det.trackId} ${(det.confidence * 100).toFixed(0)}% ${det.className.toUpperCase()}`;
    ctx.fillText(tag, screenX - half, screenY - half - 4);

    ctx.restore();
  });
}

function drawEscapeVectors(
  ctx: CanvasRenderingContext2D,
  paths: EscapePath[],
  scaleX: (x: number) => number,
  scaleY: (y: number) => number
) {
  ctx.save();
  paths.forEach((path) => {
    const startX = scaleX(path.originX);
    const startY = scaleY(path.originY);
    const interX = scaleX(path.intermediateX);
    const interY = scaleY(path.intermediateY);
    const endX = scaleX(path.finalTargetX);
    const endY = scaleY(path.finalTargetY);

    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]); // Dashed evacuation trajectory

    if (path.escapeMode === 'LATERAL_TRAVERSE') {
      // Step 1: Lateral escape segment (Cyan)
      ctx.strokeStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(interX, interY);
      ctx.stroke();

      // Step 2: Return to shore segment (Green)
      ctx.strokeStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(interX, interY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    } else {
      // Direct path (Green)
      ctx.strokeStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    // Directional Arrowhead at target
    ctx.setLineDash([]);
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(endX, endY, 3.5, 0, 2 * Math.PI);
    ctx.fill();
  });
  ctx.restore();
}

interface BeachCanvasProps {
  beach: Beach;
  environment: Environment;
  visitors: Visitor[];
  hazards?: Hazard[];
  incidents?: Incident[];
  riskOverview?: BeachRiskOverview;
  emergencyResources?: EmergencyResource[];
  boardStates?: BoardDisplayState[];
  activeFailures?: FailureEvent[];
  sensorConflict?: SensorConflict;
  isNightMode?: boolean;
  selectedVisitorId?: string;
  cameras?: Camera[];
  drones?: Drone[];
  droneCoverages?: DroneCoverage[];
  showCCTVCones?: boolean;
  onSelectVisitor?: (visitor?: Visitor) => void;
}

export const BeachCanvas: React.FC<BeachCanvasProps> = ({
  beach,
  environment,
  visitors,
  hazards = [],
  riskOverview,
  emergencyResources = [],
  boardStates = [],
  activeFailures = [],
  sensorConflict,
  isNightMode = false,
  selectedVisitorId,
  cameras = [],
  drones = [],
  droneCoverages = [],
  showCCTVCones = true,
  onSelectVisitor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveOffsetRef = useRef<number>(0);
  const droneRotorRef = useRef<number>(0);

  const [viewMode, setViewMode] = useState<CanvasViewMode>('tactical');
  const [showStreamlines, setShowStreamlines] = useState<boolean>(true);
  const [showCCTV, setShowCCTV] = useState<boolean>(showCCTVCones);
  const [showGeofences, setShowGeofences] = useState<boolean>(true);
  const [showLegend, setShowLegend] = useState<boolean>(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    waveOffsetRef.current += 0.04 * (1 + environment.waveHeight * 0.4);
    droneRotorRef.current += 0.35;

    const width = beach.width;
    const height = beach.height;

    ctx.clearRect(0, 0, width, height);

    const tidePixelOffset = (environment.tideLevel - 1.2) * 15;
    const dynamicShorelineY = beach.shorelineY + tidePixelOffset;
    const currentSpeedVal = environment.currentSpeed ?? environment.waterCurrent ?? 0.3;

    // =========================================================================
    // 1. TERRAIN & WATER BACKGROUND RENDERING (BY VIEW MODE)
    // =========================================================================

    if (viewMode === 'satellite') {
      // SATELLITE RECONNAISSANCE MODE: Photorealistic coastal imagery
      // 1.1 Deep satellite ocean with bathymetric depth gradient
      const satOcean = ctx.createLinearGradient(0, dynamicShorelineY, 0, height);
      satOcean.addColorStop(0, '#0284c7'); // Shallow turquoise shore
      satOcean.addColorStop(0.18, '#0369a1'); // Sandbar transition
      satOcean.addColorStop(0.45, '#075985'); // Mid-depth coastal shelf
      satOcean.addColorStop(0.8, '#0c4a6e'); // Deep outer bay
      satOcean.addColorStop(1, '#082f49'); // Deep ocean abyss
      ctx.fillStyle = satOcean;
      ctx.fillRect(0, dynamicShorelineY, width, height - dynamicShorelineY);

      // Underwater sandbars & submarine trenches (Procedural optical texture)
      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.beginPath();
      ctx.ellipse(320, dynamicShorelineY + 50, 180, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(820, dynamicShorelineY + 55, 200, 35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Deep rip trench between sandbars (Darker blue channel)
      ctx.fillStyle = 'rgba(12, 74, 110, 0.35)';
      ctx.fillRect(500, dynamicShorelineY, 120, height - dynamicShorelineY);

      // 1.2 Satellite Sand Shore & Promenade
      const satSand = ctx.createLinearGradient(0, 0, 0, dynamicShorelineY);
      satSand.addColorStop(0, '#78716c'); // Urban asphalt / promenade
      satSand.addColorStop(0.2, '#a8a29e');
      satSand.addColorStop(0.35, '#d6d3d1');
      satSand.addColorStop(0.55, '#e7e5e4'); // Dry dunes
      satSand.addColorStop(0.85, '#f5d0a9'); // Golden sand
      satSand.addColorStop(1, '#d4a373'); // Wet tide-washed sand
      ctx.fillStyle = satSand;
      ctx.fillRect(0, 0, width, dynamicShorelineY);

      // Promenade coastal highway & greenery buffer
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, width, 40);
      ctx.fillStyle = '#15803d'; // Coastal shrub line
      ctx.fillRect(0, 40, width, 14);

      // Satellite Geo-Grid Lines (100m grid overlay)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < width; gx += 100) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      for (let gy = 0; gy < height; gy += 100) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      // Foamy breaking surf on sandbar crests
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 2.5;
      for (let sx = 0; sx < width; sx += 25) {
        const surfWave = Math.sin(sx * 0.03 + waveOffsetRef.current * 1.5) * (3 + environment.waveHeight * 2);
        ctx.beginPath();
        ctx.moveTo(sx, dynamicShorelineY + 35 + surfWave);
        ctx.lineTo(sx + 15, dynamicShorelineY + 35 + surfWave);
        ctx.stroke();
      }
    } else if (viewMode === 'thermal') {
      // THERMAL INFRARED (FLIR / FALSE-COLOR IRONBOW SPECTRUM)
      // Cool Ocean (18°C - 24°C: Dark Purple / Indigo)
      const flirOcean = ctx.createLinearGradient(0, dynamicShorelineY, 0, height);
      flirOcean.addColorStop(0, '#1e1b4b'); // 24°C shallow
      flirOcean.addColorStop(0.3, '#170c38'); // 22°C
      flirOcean.addColorStop(0.7, '#0f051d'); // 20°C
      flirOcean.addColorStop(1, '#05000c'); // 18°C deep abyss
      ctx.fillStyle = flirOcean;
      ctx.fillRect(0, dynamicShorelineY, width, height - dynamicShorelineY);

      // Ambient Ground / Sand (28°C - 33°C: Dark Bronze / Terracotta)
      const flirSand = ctx.createLinearGradient(0, 0, 0, dynamicShorelineY);
      flirSand.addColorStop(0, '#451a03');
      flirSand.addColorStop(0.4, '#7c2d12');
      flirSand.addColorStop(0.8, '#9a3412');
      flirSand.addColorStop(1, '#78350f');
      ctx.fillStyle = flirSand;
      ctx.fillRect(0, 0, width, dynamicShorelineY);

      // Thermal Scanline Effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.5);
      }

      // Thermal Temperature Calibration Scale on Right Edge
      const scaleX = width - 24;
      const scaleH = 160;
      const scaleY = 60;
      const scaleGrad = ctx.createLinearGradient(0, scaleY, 0, scaleY + scaleH);
      scaleGrad.addColorStop(0, '#ffffff'); // 40°C
      scaleGrad.addColorStop(0.2, '#fef08a'); // 37°C
      scaleGrad.addColorStop(0.4, '#ef4444'); // 33°C
      scaleGrad.addColorStop(0.65, '#9333ea'); // 26°C
      scaleGrad.addColorStop(0.85, '#3b82f6'); // 22°C
      scaleGrad.addColorStop(1, '#05000c'); // 16°C
      ctx.fillStyle = scaleGrad;
      ctx.fillRect(scaleX, scaleY, 10, scaleH);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(scaleX, scaleY, 10, scaleH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('42°C', scaleX - 24, scaleY + 8);
      ctx.fillText('37°C', scaleX - 24, scaleY + scaleH * 0.25);
      ctx.fillText('26°C', scaleX - 24, scaleY + scaleH * 0.65);
      ctx.fillText('16°C', scaleX - 24, scaleY + scaleH);
    } else {
      // TACTICAL & HYDRODYNAMIC VECTOR MODES (Crisp Modern Vector Map)
      const sandGrad = ctx.createLinearGradient(0, 0, 0, dynamicShorelineY);
      if (isNightMode) {
        sandGrad.addColorStop(0, '#0f172a');
        sandGrad.addColorStop(0.5, '#1e293b');
        sandGrad.addColorStop(1, '#334155');
      } else {
        sandGrad.addColorStop(0, '#fef3c7');
        sandGrad.addColorStop(0.5, '#fde68a');
        sandGrad.addColorStop(1, '#fcd34d');
      }
      ctx.fillStyle = sandGrad;
      ctx.fillRect(0, 0, width, dynamicShorelineY);

      // Promenade banner
      ctx.fillStyle = isNightMode ? '#020617' : '#e2e8f0';
      ctx.fillRect(0, 0, width, 45);
      ctx.strokeStyle = isNightMode ? '#1e293b' : '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, width, 45);

      ctx.fillStyle = isNightMode ? '#94a3b8' : '#64748b';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('EMERGENCY VEHICULAR CORRIDOR & PROMENADE', 20, 26);

      // Water Area
      const waterGrad = ctx.createLinearGradient(0, dynamicShorelineY, 0, height);
      if (isNightMode) {
        waterGrad.addColorStop(0, '#0c4a6e');
        waterGrad.addColorStop(0.3, '#075985');
        waterGrad.addColorStop(0.7, '#0369a1');
        waterGrad.addColorStop(1, '#082f49');
      } else {
        waterGrad.addColorStop(0, '#7dd3fc');
        waterGrad.addColorStop(0.3, '#38bdf8');
        waterGrad.addColorStop(0.7, '#0284c7');
        waterGrad.addColorStop(1, '#0369a1');
      }
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, dynamicShorelineY, width, height - dynamicShorelineY);
    }

    // =========================================================================
    // 2. ANIMATED WATERLINE & SURF RIDGES
    // =========================================================================

    // Wet sand swash zone
    ctx.fillStyle = isNightMode ? 'rgba(51, 65, 85, 0.4)' : 'rgba(217, 119, 6, 0.25)';
    ctx.fillRect(0, dynamicShorelineY - 8, width, 16);

    // Animated Frothy Shoreline
    ctx.beginPath();
    ctx.moveTo(0, dynamicShorelineY);
    for (let x = 0; x <= width; x += 15) {
      const wave = Math.sin(x * 0.03 + waveOffsetRef.current) * (3 + environment.waveHeight * 2);
      ctx.lineTo(x, dynamicShorelineY + wave);
    }
    ctx.strokeStyle =
      viewMode === 'thermal'
        ? 'rgba(254, 240, 138, 0.5)'
        : isNightMode
        ? 'rgba(255, 255, 255, 0.45)'
        : 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Ocean swell crests
    for (let r = 1; r <= 3; r++) {
      const rowY = dynamicShorelineY + r * 75;
      if (rowY < height) {
        ctx.beginPath();
        ctx.moveTo(0, rowY);
        for (let x = 0; x <= width; x += 20) {
          const crest = Math.sin(x * 0.02 + waveOffsetRef.current * (1 + r * 0.2)) * (2 + environment.waveHeight * 1.5);
          ctx.lineTo(x, rowY + crest);
        }
        ctx.strokeStyle =
          viewMode === 'thermal' ? 'rgba(147, 51, 234, 0.3)' : `rgba(255, 255, 255, ${0.25 - r * 0.05})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // =========================================================================
    // 3. SAFETY ZONES & GEOFENCES
    // =========================================================================

    if (showGeofences) {
      beach.zones.forEach((zone) => {
        const za = riskOverview?.zoneAssessments[zone.id];
        const isCritical = za?.category === 'CRITICAL';
        const isHigh = za?.category === 'HIGH';
        const isModerate = za?.category === 'MODERATE';

        ctx.save();

        if (zone.type === 'RESTRICTED') {
          ctx.fillStyle = isCritical ? 'rgba(239, 68, 68, 0.32)' : 'rgba(239, 68, 68, 0.16)';
          ctx.fillRect(zone.x, zone.y, zone.width, zone.height);

          ctx.strokeStyle = isCritical ? '#dc2626' : '#ef4444';
          ctx.lineWidth = isCritical ? 3 : 2;
          ctx.setLineDash([6, 6]);
          ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);

          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(`⚠️ ${zone.name.toUpperCase()}`, zone.x + 10, zone.y + 22);

          if (za && za.overallScore > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(`🔴 RISK: ${za.overallScore}/100 [${za.category}]`, zone.x + 10, zone.y + 38);
          }
        } else if (zone.type === 'SWIMMING') {
          if (isCritical) ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
          else if (isHigh) ctx.fillStyle = 'rgba(249, 115, 22, 0.2)';
          else if (isModerate) ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
          else ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
          ctx.fillRect(zone.x, zone.y, zone.width, zone.height);

          ctx.strokeStyle = isCritical ? '#ef4444' : isHigh ? '#f97316' : isModerate ? '#f59e0b' : '#38bdf8';
          ctx.lineWidth = isCritical || isHigh ? 2.5 : 1.5;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);

          const bannerColor = isCritical ? '#991b1b' : isHigh ? '#c2410c' : isModerate ? '#b45309' : '#0284c7';
          ctx.fillStyle = bannerColor;
          ctx.fillRect(zone.x + 8, zone.y + 8, 220, 22);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText(`🏊 ${zone.name}`, zone.x + 14, zone.y + 23);

          if (za) {
            ctx.fillStyle = isCritical ? '#fecaca' : isHigh ? '#fed7aa' : isModerate ? '#fef3c7' : '#e0f2fe';
            ctx.font = 'bold 10px monospace';
            const dot = isCritical ? '🔴' : isHigh ? '🟠' : isModerate ? '🟡' : '🟢';
            ctx.fillText(`${dot} RISK: ${za.overallScore}/100 [${za.category}]`, zone.x + 14, zone.y + 45);
          }
        } else if (zone.type === 'BEACH_ZONE') {
          ctx.strokeStyle = 'rgba(217, 119, 6, 0.35)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);

          ctx.fillStyle = isNightMode ? '#cbd5e1' : '#92400e';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText(`🏖️ ${zone.name}`, zone.x + 10, zone.y + 20);
        }
        ctx.restore();
      });
    }

    // =========================================================================
    // 4. HYDRODYNAMIC STREAMLINES & RIP CHUTES
    // =========================================================================

    const isRipActive = currentSpeedVal >= 0.5 || hazards.some((h) => h.type === 'RIP_CURRENT') || viewMode === 'hydrodynamic';

    if (showStreamlines && isRipActive) {
      const ripChannelX = 560;
      const ripWidth = 140;

      ctx.save();
      // Channel shading
      const channelGrad = ctx.createLinearGradient(0, dynamicShorelineY, 0, height);
      channelGrad.addColorStop(0, 'rgba(239, 68, 68, 0.08)');
      channelGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.22)');
      channelGrad.addColorStop(1, 'rgba(168, 85, 247, 0.25)');
      ctx.fillStyle = channelGrad;
      ctx.fillRect(ripChannelX - ripWidth / 2, dynamicShorelineY, ripWidth, height - dynamicShorelineY);

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(ripChannelX - ripWidth / 2, dynamicShorelineY, ripWidth, height - dynamicShorelineY);
      ctx.setLineDash([]);

      // Feeder vectors (left & right)
      const feederPulse = (waveOffsetRef.current * 22) % 60;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;

      for (let fx = 320; fx < ripChannelX - 40; fx += 50) {
        const arrowX = fx + feederPulse;
        if (arrowX < ripChannelX - 10) {
          ctx.beginPath();
          ctx.moveTo(arrowX - 15, dynamicShorelineY + 25);
          ctx.lineTo(arrowX + 5, dynamicShorelineY + 25);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(arrowX, dynamicShorelineY + 21);
          ctx.lineTo(arrowX + 6, dynamicShorelineY + 25);
          ctx.lineTo(arrowX, dynamicShorelineY + 29);
          ctx.fillStyle = '#f59e0b';
          ctx.fill();
        }
      }

      for (let fx = 800; fx > ripChannelX + 40; fx -= 50) {
        const arrowX = fx - feederPulse;
        if (arrowX > ripChannelX + 10) {
          ctx.beginPath();
          ctx.moveTo(arrowX + 15, dynamicShorelineY + 25);
          ctx.lineTo(arrowX - 5, dynamicShorelineY + 25);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(arrowX, dynamicShorelineY + 21);
          ctx.lineTo(arrowX - 6, dynamicShorelineY + 25);
          ctx.lineTo(arrowX, dynamicShorelineY + 29);
          ctx.fillStyle = '#f59e0b';
          ctx.fill();
        }
      }

      // Seaward Rip Chute
      for (let j = 0; j < 3; j++) {
        const laneX = ripChannelX - 35 + j * 35;
        const arrowPhase = (waveOffsetRef.current * 28 + j * 30) % 150;
        const arrowY = dynamicShorelineY + 30 + arrowPhase;

        if (arrowY < height - 20) {
          ctx.beginPath();
          ctx.moveTo(laneX, arrowY);
          ctx.lineTo(laneX, arrowY + 22);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(laneX - 4, arrowY + 15);
          ctx.lineTo(laneX, arrowY + 23);
          ctx.lineTo(laneX + 4, arrowY + 15);
          ctx.fillStyle = '#ef4444';
          ctx.fill();
        }
      }

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`⚡ SEAWARD RIP JET: ${currentSpeedVal.toFixed(2)} m/s`, ripChannelX - 65, height - 35);
      ctx.restore();
    }

    // =========================================================================
    // 5. CCTV FOV CONES & CAMERAS
    // =========================================================================

    if (showCCTV && cameras && cameras.length > 0) {
      cameras.forEach((cam) => {
        const isOnline = cam.status === 'ONLINE';
        const camColor = cam.color || '#06b6d4';

        if (isOnline) {
          ctx.save();
          const startAngle = ((cam.rotation - cam.fieldOfView / 2) * Math.PI) / 180;
          const endAngle = ((cam.rotation + cam.fieldOfView / 2) * Math.PI) / 180;

          ctx.beginPath();
          ctx.moveTo(cam.position.x, cam.position.y);
          ctx.arc(cam.position.x, cam.position.y, cam.range, startAngle, endAngle);
          ctx.closePath();

          const fovGrad = ctx.createRadialGradient(
            cam.position.x,
            cam.position.y,
            10,
            cam.position.x,
            cam.position.y,
            cam.range
          );
          fovGrad.addColorStop(0, `${camColor}33`);
          fovGrad.addColorStop(1, `${camColor}06`);
          ctx.fillStyle = fovGrad;
          ctx.fill();

          ctx.strokeStyle = `${camColor}55`;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.restore();
        }

        // Camera Base
        ctx.save();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cam.position.x, cam.position.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isOnline ? camColor : '#64748b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const rotRad = (cam.rotation * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(cam.position.x, cam.position.y);
        ctx.lineTo(cam.position.x + Math.cos(rotRad) * 11, cam.position.y + Math.sin(rotRad) * 11);
        ctx.strokeStyle = isOnline ? '#22c55e' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(cam.position.x - 22, cam.position.y - 20, 44, 12);
        ctx.strokeStyle = isOnline ? camColor : '#64748b';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(cam.position.x - 22, cam.position.y - 20, 44, 12);

        ctx.fillStyle = isOnline ? '#e2e8f0' : '#94a3b8';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(cam.id, cam.position.x, cam.position.y - 11);
        ctx.restore();
      });
    }

    // =========================================================================
    // 6. EMERGENCY RESPONDERS (LIFEGUARDS, BOATS, DRONES, AMBULANCES)
    // =========================================================================

    emergencyResources
      .filter((r) => r.type === 'LIFEGUARD')
      .forEach((lg) => {
        const isDispatched = lg.status === 'EN_ROUTE' || lg.status === 'ON_SCENE' || lg.status === 'DISPATCHED';

        if (isDispatched && lg.targetPosition) {
          ctx.beginPath();
          ctx.moveTo(lg.position.x, lg.position.y);
          ctx.lineTo(lg.targetPosition.x, lg.targetPosition.y);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.arc(lg.position.x, lg.position.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = isDispatched ? '#f59e0b' : '#ca8a04';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px sans-serif';
        ctx.fillText('🛟', lg.position.x - 5, lg.position.y + 4);

        ctx.fillStyle = '#78350f';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(lg.id, lg.position.x - 12, lg.position.y - 16);
      });

    // Rescue Boats
    emergencyResources
      .filter((r) => r.type === 'RESCUE_BOAT')
      .forEach((boat) => {
        const isDispatched = boat.status === 'EN_ROUTE' || boat.status === 'ON_SCENE';

        if (isDispatched && boat.targetPosition) {
          ctx.beginPath();
          ctx.moveTo(boat.position.x, boat.position.y);
          ctx.lineTo(boat.position.x - 20, boat.position.y + 10);
          ctx.moveTo(boat.position.x, boat.position.y);
          ctx.lineTo(boat.position.x - 20, boat.position.y - 10);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.fillStyle = viewMode === 'thermal' ? '#f59e0b' : '#0284c7';
        ctx.beginPath();
        ctx.ellipse(boat.position.x, boat.position.y, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px sans-serif';
        ctx.fillText('🚤', boat.position.x - 7, boat.position.y + 4);
      });

    // Airborne Drones
    drones.forEach((drone) => {
      const isAirborne = drone.altitude > 2;
      const cov = droneCoverages.find((c) => c.droneId === drone.id);

      if (isAirborne && cov) {
        ctx.beginPath();
        ctx.arc(drone.canvasPosition.x, drone.canvasPosition.y, cov.radiusMeters, 0, Math.PI * 2);
        ctx.fillStyle = viewMode === 'thermal' ? 'rgba(254, 240, 138, 0.12)' : 'rgba(6, 182, 212, 0.08)';
        ctx.fill();
        ctx.strokeStyle = viewMode === 'thermal' ? '#fde047' : 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.save();
      ctx.translate(drone.canvasPosition.x, drone.canvasPosition.y);
      ctx.strokeStyle = viewMode === 'thermal' ? '#ffffff' : '#38bdf8';
      ctx.lineWidth = 1.5;

      for (let b = 0; b < 4; b++) {
        const ang = (b * Math.PI) / 2 + droneRotorRef.current;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * 9, Math.sin(ang) * 9, 3.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = viewMode === 'thermal' ? '#ffffff' : '#0284c7';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // =========================================================================
    // 6.5. SAFE EVACUATION CORRIDORS & ACOUSTIC SIREN WAVES
    // =========================================================================

    if (showGeofences || viewMode === 'tactical') {
      // Lateral Escape Corridors out of Rip Trench into Shallow Sandbars
      ctx.save();
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);

      // Left Lateral Escape Path (Rip -> North Sandbar)
      ctx.beginPath();
      ctx.moveTo(400, 340);
      ctx.lineTo(240, 310);
      ctx.lineTo(240, 140);
      ctx.stroke();

      // Right Lateral Escape Path (Rip -> South Sandbar)
      ctx.beginPath();
      ctx.moveTo(440, 340);
      ctx.lineTo(600, 310);
      ctx.lineTo(600, 140);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.85)';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('◀ LATERAL ESCAPE ROUTE', 250, 305);
      ctx.fillText('LATERAL ESCAPE ROUTE ▶', 460, 305);
      ctx.restore();
    }

    // Acoustic Siren Rings radiating from Lifeguard Towers
    if (emergencyResources.some((r) => r.type === 'LIFEGUARD' && (r.status === 'EN_ROUTE' || r.status === 'ON_SCENE')) || environment.waveHeight > 2.0 || (environment.currentSpeed ?? environment.waterCurrent ?? 0) > 0.8) {
      emergencyResources.filter((r) => r.type === 'LIFEGUARD').forEach((lg) => {
        const sirenRing = (Date.now() / 40) % 45;
        ctx.beginPath();
        ctx.arc(lg.position.x, lg.position.y, 15 + sirenRing, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(239, 68, 68, ${Math.max(0, 0.6 - sirenRing / 50)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    // =========================================================================
    // 7. VISITORS & HUMAN HEAT SIGNATURES WITH DIRECT SENSORY AURA & ESCAPE VECTORS
    // =========================================================================

    const pulsePhase = (Date.now() / 250) % 10;

    visitors.forEach((v) => {
      const isDistressed = v.state === 'DISTRESS' || v.state === 'STRUGGLING';
      const isSelected = v.id === selectedVisitorId;
      const awareness = v.awarenessState || 'UNAWARE';

      if (viewMode === 'thermal') {
        // FLIR THERMAL HEAT SIGNATURE RENDERING (~37°C white-hot core with infrared corona)
        const rad = isDistressed ? 10 + pulsePhase * 0.5 : awareness === 'FLEEING' ? 9 : 7;
        const heatGrad = ctx.createRadialGradient(v.position.x, v.position.y, 1.5, v.position.x, v.position.y, rad);
        if (isDistressed) {
          heatGrad.addColorStop(0, '#ffffff'); // 37.5°C white core
          heatGrad.addColorStop(0.35, '#fde047'); // 36.5°C yellow
          heatGrad.addColorStop(0.7, '#ef4444'); // 34°C red corona
          heatGrad.addColorStop(1, 'rgba(147, 51, 234, 0)'); // Falloff
        } else if (awareness === 'FLEEING') {
          heatGrad.addColorStop(0, '#ffffff');
          heatGrad.addColorStop(0.4, '#f87171');
          heatGrad.addColorStop(0.8, '#dc2626');
          heatGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        } else {
          heatGrad.addColorStop(0, '#ffffff');
          heatGrad.addColorStop(0.4, '#fde047');
          heatGrad.addColorStop(0.75, '#ea580c');
          heatGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        }
        ctx.fillStyle = heatGrad;
        ctx.beginPath();
        ctx.arc(v.position.x, v.position.y, rad, 0, Math.PI * 2);
        ctx.fill();

        // Thermal temperature tag
        if (isDistressed || isSelected || awareness === 'FLEEING') {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px monospace';
          const tag = isDistressed ? '37.8°C [SOS]' : awareness === 'FLEEING' ? '37.4°C [FLEE]' : '36.8°C';
          ctx.fillText(tag, v.position.x - 14, v.position.y - 10);
        }
      } else {
        // TACTICAL & SATELLITE STANDARD RENDERING

        // 1. Sensory Perception Auras
        if (awareness === 'SUSPICIOUS') {
          // Amber/Yellow Sensory Halo (Hesitation & Awareness)
          ctx.beginPath();
          ctx.arc(v.position.x, v.position.y, 9, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([2, 2]);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText('⚠️', v.position.x + 5, v.position.y - 6);
        } else if (awareness === 'FLEEING') {
          // Red/Amber Pulsating Halo with Active Escape Vector
          ctx.beginPath();
          ctx.arc(v.position.x, v.position.y, 10 + (pulsePhase % 4), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(244, 63, 94, ${0.9 - (pulsePhase % 4) * 0.15})`;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Draw Directional Escape Vector Arrow
          const esc = v.escapeVector || { dx: 0, dy: -1 };
          const arrowLen = 18;
          const endX = v.position.x + esc.dx * arrowLen;
          const endY = v.position.y + esc.dy * arrowLen;

          ctx.beginPath();
          ctx.moveTo(v.position.x, v.position.y);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Arrowhead
          const angle = Math.atan2(esc.dy, esc.dx);
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - 5 * Math.cos(angle - Math.PI / 6), endY - 5 * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(endX - 5 * Math.cos(angle + Math.PI / 6), endY - 5 * Math.sin(angle + Math.PI / 6));
          ctx.fillStyle = '#22c55e';
          ctx.fill();
        } else if (awareness === 'TRAPPED') {
          // Purple Pulsating Trap/Surrounded Indicator
          ctx.beginPath();
          ctx.arc(v.position.x, v.position.y, 13 + pulsePhase, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(217, 70, 239, 0.9)';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.fillStyle = '#d946ef';
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText('🚨 TRAPPED', v.position.x - 18, v.position.y - 14);
        }

        // Selected Reticle
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(v.position.x, v.position.y, 14, 0, Math.PI * 2);
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // Distress Callout
        if (isDistressed) {
          ctx.beginPath();
          ctx.arc(v.position.x, v.position.y, 12 + pulsePhase, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.8 - pulsePhase * 0.07})`;
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('🆘 SOS', v.position.x - 14, v.position.y - 12);
        }

        // Computer Vision Edge Bounding Box Overlay (CCTV Mode)
        if (showCCTV && (viewMode === 'tactical' || viewMode === 'satellite')) {
          const bw = 16;
          const bh = 22;
          const bx = v.position.x - bw / 2;
          const by = v.position.y - bh / 2;
          const boxColor = isDistressed ? '#f43f5e' : awareness === 'FLEEING' ? '#f59e0b' : '#22d3ee';

          // Corner reticle brackets
          ctx.save();
          ctx.strokeStyle = boxColor;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(bx, by, bw, bh);

          // Header classification badge
          const className = isDistressed ? 'STRUGGLING 98%' : awareness === 'FLEEING' ? 'EVACUATING 95%' : 'SWIMMER 92%';
          ctx.fillStyle = isDistressed ? 'rgba(244, 63, 94, 0.9)' : 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(bx - 4, by - 9, className.length * 4.5 + 4, 8);
          ctx.fillStyle = isDistressed ? '#ffffff' : '#22d3ee';
          ctx.font = 'bold 6px monospace';
          ctx.fillText(className, bx - 2, by - 3);
          ctx.restore();
        }

        const radius = v.type === 'CHILD' ? 3.5 : 5;
        ctx.beginPath();
        ctx.arc(v.position.x, v.position.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isDistressed ? '#dc2626' : awareness === 'FLEEING' ? '#f43f5e' : v.color || '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    });

    // =========================================================================
    // 8. SATELLITE & THERMAL HUD TELEMETRY OVERLAY
    // =========================================================================

    const isSuryalanka = beach.presetId === 'SURYALANKA_BAPATLA' || beach.id.includes('SURYALANKA');
    const coordStr = isSuryalanka
      ? '15°50\'04"N  80°30\'18"E | BAPATLA SHELF'
      : '17°46\'46"N  83°23\'18"E | RUSHIKONDA BLUE FLAG';

    if (viewMode === 'satellite') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(15, 55, 260, 36);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(15, 55, 260, 36);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('🛰️ SATELLITE OPTICAL RECON [EO/IR]', 25, 68);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '8px monospace';
      ctx.fillText(`${coordStr} | ALT: 850m`, 25, 82);
    } else if (viewMode === 'thermal') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(15, 55, 260, 36);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.strokeRect(15, 55, 260, 36);

      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('🌡️ FLIR THERMAL INFRARED [IRONBOW]', 25, 68);
      ctx.fillStyle = '#fef08a';
      ctx.font = '8px monospace';
      ctx.fillText(`${coordStr} | 16°C - 42°C`, 25, 82);
    }
  }, [
    beach,
    environment,
    visitors,
    hazards,
    riskOverview,
    emergencyResources,
    boardStates,
    activeFailures,
    sensorConflict,
    isNightMode,
    selectedVisitorId,
    viewMode,
    showStreamlines,
    showCCTV,
    showGeofences,
  ]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = beach.width / rect.width;
    const scaleY = beach.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    let closest: Visitor | null = null;
    let minDist = 25;

    visitors.forEach((v) => {
      const dist = Math.hypot(v.position.x - clickX, v.position.y - clickY);
      if (dist < minDist) {
        minDist = dist;
        closest = v;
      }
    });

    if (onSelectVisitor) {
      onSelectVisitor(closest || undefined);
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800/90 bg-slate-950 shadow-2xl backdrop-blur-xl">
      {/* Top Floating Glassmorphic View Controller Bar */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: View Mode Pills */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 shadow-lg backdrop-blur-md pointer-events-auto">
          <button
            onClick={() => setViewMode('tactical')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'tactical'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Tactical Map</span>
          </button>

          <button
            onClick={() => setViewMode('satellite')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'satellite'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-300" />
            <span>Satellite Recon</span>
          </button>

          <button
            onClick={() => setViewMode('thermal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'thermal'
                ? 'bg-rose-500 text-white shadow-sm ring-1 ring-rose-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-yellow-300" />
            <span>Thermal FLIR</span>
          </button>

          <button
            onClick={() => setViewMode('hydrodynamic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'hydrodynamic'
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Hydrodynamics</span>
          </button>
        </div>

        {/* Right: Layer Toggles & Legend */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 shadow-lg backdrop-blur-md pointer-events-auto text-xs">
          <button
            onClick={() => setShowStreamlines(!showStreamlines)}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              showStreamlines ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Toggle Hydrodynamic Feeder & Rip Streamlines"
          >
            ⚡ Vectors
          </button>

          <button
            onClick={() => setShowCCTV(!showCCTV)}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              showCCTV ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Toggle CCTV Vision Coverage Cones"
          >
            📹 CCTV
          </button>

          <button
            onClick={() => setShowGeofences(!showGeofences)}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              showGeofences ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Toggle Zone Safety Geofences"
          >
            🚩 Zones
          </button>

          <button
            onClick={() => setShowLegend(!showLegend)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold transition-all cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showLegend ? 'Hide' : 'Legend'}</span>
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={beach.width}
        height={beach.height}
        onClick={handleCanvasClick}
        className="w-full h-auto block cursor-crosshair"
      />

      {/* Interactive Map Legend & Symbol Guide Modal HUD */}
      {showLegend && (
        <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-lg p-3 sm:p-5 flex flex-col justify-between overflow-y-auto text-left animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Digital Beach Simulation Map Legend & Multi-Spectrum Guide
              </h3>
            </div>
            <button
              onClick={() => setShowLegend(false)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 4 Categorized Symbol Grids */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs flex-1">
            {/* 1. Swimmer & Visitor States */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
              <span className="font-bold text-cyan-300 block text-[11px] uppercase border-b border-slate-800 pb-1">
                👤 Bather Sensory & Escape States
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-sky-400 inline-block shrink-0 shadow-sm" />
                  <span><strong>UNAWARE Bather</strong> (Recreating)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-dashed border-amber-400 bg-amber-400/30 inline-block shrink-0" />
                  <span><strong className="text-amber-300">SUSPICIOUS</strong> (Noticing surge/undertow)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-rose-500 bg-rose-500/40 inline-block shrink-0" />
                  <span><strong className="text-rose-400">FLEEING</strong> (Following Escape Vector)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500 animate-ping inline-block shrink-0" />
                  <span><strong className="text-purple-400">TRAPPED</strong> (Tidal cut-off / Rip pull)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shrink-0 animate-ping" />
                  <span><strong className="text-rose-400">Distressed / Drowning</strong> (SOS)</span>
                </div>
              </div>
            </div>

            {/* 2. Multi-Spectrum Thermal & Satellite */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
              <span className="font-bold text-yellow-300 block text-[11px] uppercase border-b border-slate-800 pb-1">
                🌡️ Multi-Spectrum Modes
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-300 border border-red-500 shrink-0" />
                  <span><strong>FLIR 37°C Core</strong> (Human Heat)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-gradient-to-r from-blue-700 to-sky-400 shrink-0" />
                  <span><strong>Satellite Bathymetry</strong> (Depths)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-purple-950 border border-purple-500 shrink-0" />
                  <span><strong>Thermal Ocean Sink</strong> (22°C Water)</span>
                </div>
              </div>
            </div>

            {/* 3. Emergency Fleet */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
              <span className="font-bold text-rose-300 block text-[11px] uppercase border-b border-slate-800 pb-1">
                🚨 Emergency Responders
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <LifeBuoy className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  <span><strong>Active Lifeguard Squad</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Ship className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span><strong>Rapid Rescue Boat</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Plane className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span><strong>Autonomous UAV Drone</strong></span>
                </div>
              </div>
            </div>

            {/* 4. Safety Zones & Marine Hazards */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
              <span className="font-bold text-amber-300 block text-[11px] uppercase border-b border-slate-800 pb-1">
                🚩 Zones & Marine Hazards
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-400 shrink-0" />
                  <span><strong>Swimming Zone</strong> (Safe)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-rose-500/30 border border-rose-500 shrink-0" />
                  <span><strong>Restricted Reef Zone</strong> (Prohibited)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold text-sm leading-none shrink-0">➜➜</span>
                  <span><strong>Feeder / Rip Streamlines</strong></span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-800 text-[10px] text-slate-400">
            <span>Click any bather, lifeguard, boat, or drone on the canvas to inspect real-time telemetry.</span>
            <button
              onClick={() => setShowLegend(false)}
              className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 text-slate-950 rounded-lg font-bold cursor-pointer"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
