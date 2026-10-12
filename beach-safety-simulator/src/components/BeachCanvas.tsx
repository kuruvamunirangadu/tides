import React, { useEffect, useRef, useState } from 'react';
import { Beach } from '../models/Beach';
import { Zone } from '../models/Zone';
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

import { SoundControlHUD } from './SoundControlHUD';
import { soundEngine } from '../audio/BeachSoundEngine';

export type CanvasViewMode = 'tactical' | 'satellite' | 'heat' | 'sat_heat' | 'thermal' | 'hydrodynamic';

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

/**
 * Geometric projection helpers for Rushikonda Beach Aerial Photograph
 * Aligns simulation coordinates (visitors, waves, geofences, assets)
 * directly with the real physical features of the aerial photo.
 */
export function getSatRoadY(x: number, width: number, height: number): number {
  const normX = Math.max(0, Math.min(1, x / width));
  // Marine Drive & promenade corridor curves along base of conical hill:
  // Slopes down from ~0.65 on the left (base of forested hillside) to ~0.44 on the right
  return height * (0.65 - 0.21 * normX + 0.03 * Math.sin(normX * Math.PI));
}

export function getSatShorelineY(
  x: number,
  width: number,
  height: number,
  tideLevel: number = 1.2
): number {
  const normX = Math.max(0, Math.min(1, x / width));
  const tideShift = (tideLevel - 1.2) * 10;
  // Natural crescent coastline curves from basalt rocks on left (~0.76) down across the sandy cove to ~0.58 on right
  return height * (0.76 - 0.18 * normX + 0.03 * Math.sin(normX * Math.PI)) - tideShift;
}

export function projectToSatellite(
  pos: { x: number; y: number },
  beachWidth: number,
  beachHeight: number,
  tacticalShoreY: number,
  width: number,
  height: number,
  tideLevel: number = 1.2
): { x: number; y: number } {
  const normX = Math.max(0, Math.min(1, pos.x / beachWidth));
  const satX = normX * width;

  const satRoadY = getSatRoadY(satX, width, height);
  const satShoreY = getSatShorelineY(satX, width, height, tideLevel);

  if (pos.y < 45) {
    // 1. Promenade & Marine Drive Corridor (pedestrians, tourists, vehicles)
    const frac = Math.max(0, Math.min(1, pos.y / 45));
    const satY = satRoadY - 10 + frac * 15;
    return { x: satX, y: satY };
  } else if (pos.y < tacticalShoreY) {
    // 2. Golden Crescent Sand Swash (sunbathers & sand beachgoers)
    const frac = Math.max(0, Math.min(1, (pos.y - 45) / Math.max(1, tacticalShoreY - 45)));
    const sandTop = satRoadY + 6;
    const sandBottom = satShoreY - 8;
    const satY = sandTop + frac * Math.max(14, sandBottom - sandTop);
    return { x: satX, y: satY };
  } else {
    // 3. Bay of Bengal Oceanic Water (swimmers, surfers, breakers)
    const frac = Math.max(0, Math.min(1, (pos.y - tacticalShoreY) / Math.max(1, beachHeight - tacticalShoreY)));
    const waterTop = satShoreY + 8;
    const waterBottom = height - 20;
    const satY = waterTop + frac * Math.max(25, waterBottom - waterTop);
    return { x: satX, y: satY };
  }
}

export function getSatZoneRect(
  zone: Zone,
  width: number,
  height: number,
  tideLevel: number = 1.2
): { x: number; y: number; width: number; height: number } {
  if (zone.type === 'RESTRICTED') {
    // Rocky Basalt Promontory & Reef Outcrop on the far left of Rushikonda
    const zx = 8;
    const zw = width * 0.28;
    const zy = getSatShorelineY(zx + zw / 2, width, height, tideLevel) - 8;
    const zh = height - zy - 10;
    return { x: zx, y: zy, width: zw, height: zh };
  } else if (zone.name.includes('Central') || zone.id.includes('CENTRAL')) {
    // Central Sandy Swimming Bay & Surf Swash
    const zx = width * 0.31;
    const zw = width * 0.34;
    const zy = getSatShorelineY(zx + zw / 2, width, height, tideLevel) - 8;
    const zh = height - zy - 10;
    return { x: zx, y: zy, width: zw, height: zh };
  } else if (zone.name.includes('North') || zone.id.includes('NORTH')) {
    // North Protected Swimming Cove
    const zx = width * 0.67;
    const zw = width * 0.31;
    const zy = getSatShorelineY(zx + zw / 2, width, height, tideLevel) - 8;
    const zh = height - zy - 10;
    return { x: zx, y: zy, width: zw, height: zh };
  } else if (zone.type === 'BEACH_ZONE') {
    // Golden Sand Crescent
    const zx = width * 0.15;
    const zw = width * 0.75;
    const zy = getSatRoadY(width * 0.5, width, height) + 6;
    const zh = getSatShorelineY(width * 0.5, width, height, tideLevel) - 10 - zy;
    return { x: zx, y: zy, width: zw, height: zh };
  }
  return { x: zone.x, y: zone.y, width: zone.width, height: zone.height };
}

function drawPhotorealisticSatelliteImagery(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dynamicShorelineY: number,
  isRushikonda: boolean,
  environment: Environment,
  waveOffset: number,
  band: 'RGB_TRUE_COLOR' | 'NDWI_TURBIDITY' | 'BATHYMETRY',
  aerialImage?: HTMLImageElement | null
) {
  ctx.save();

  if (isRushikonda) {
    // Check if authentic high-resolution aerial recon photo is loaded
    if (aerialImage && aerialImage.complete && aerialImage.naturalWidth > 0) {
      // 1. Authentic Aerial Reconnaissance Photograph (Rushikonda Cove & Hill)
      // Crop top 90px of overcast sky to center the conical green mountain, curving Beach Road, golden sand, and oceanic breakers
      const srcY = 90;
      const srcH = aerialImage.naturalHeight - srcY;
      ctx.drawImage(
        aerialImage,
        0,
        srcY,
        aerialImage.naturalWidth,
        srcH,
        0,
        0,
        width,
        height
      );

      // Multispectral Band Processing
      if (band === 'NDWI_TURBIDITY') {
        // High-Turbidity / Suspended Particulate Spectral Mask
        const ndwiGrad = ctx.createLinearGradient(0, dynamicShorelineY, 0, height);
        ndwiGrad.addColorStop(0, 'rgba(6, 182, 212, 0.40)');
        ndwiGrad.addColorStop(0.4, 'rgba(4, 47, 46, 0.50)');
        ndwiGrad.addColorStop(1, 'rgba(2, 6, 23, 0.70)');
        ctx.fillStyle = ndwiGrad;
        ctx.fillRect(0, dynamicShorelineY, width, height - dynamicShorelineY);

        // Highlight active turbidity plume / rip channel outflow
        ctx.fillStyle = 'rgba(34, 211, 238, 0.35)';
        ctx.beginPath();
        ctx.ellipse(width * 0.45, dynamicShorelineY + 110, 100, 50, -0.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (band === 'BATHYMETRY') {
        // Satellite-Derived Bathymetry (SDB) Depth Heat Gradient
        const bathyGrad = ctx.createLinearGradient(0, dynamicShorelineY, 0, height);
        bathyGrad.addColorStop(0, 'rgba(20, 184, 166, 0.28)'); // 0.8m shallow swash
        bathyGrad.addColorStop(0.22, 'rgba(6, 182, 212, 0.38)'); // 1.5m
        bathyGrad.addColorStop(0.5, 'rgba(37, 99, 235, 0.48)'); // 2.5m shelf
        bathyGrad.addColorStop(0.78, 'rgba(30, 27, 75, 0.68)'); // 3.8m trench
        bathyGrad.addColorStop(1, 'rgba(2, 6, 23, 0.85)'); // >10m deep Bay of Bengal
        ctx.fillStyle = bathyGrad;
        ctx.fillRect(0, dynamicShorelineY, width, height - dynamicShorelineY);

        // Isobath Depth Contours following natural crescent coastline
        const isobathOffsets = [
          { off: 25, label: '0.8m ISOBATH' },
          { off: 65, label: '1.5m ISOBATH' },
          { off: 110, label: '2.5m SHELF' },
          { off: 160, label: '3.8m TRENCH' },
        ];
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([6, 6]);
        isobathOffsets.forEach((iso) => {
          ctx.beginPath();
          for (let x = 0; x <= width; x += 30) {
            const isoY = getSatShorelineY(x, width, height, environment.tideLevel) + iso.off;
            const cur = Math.sin(x * 0.015) * 5;
            if (x === 0) ctx.moveTo(x, isoY + cur);
            else ctx.lineTo(x, isoY + cur);
          }
          ctx.stroke();
          const labelY = getSatShorelineY(width - 95, width, height, environment.tideLevel) + iso.off;
          if (labelY < height) {
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 8px monospace';
            ctx.fillText(iso.label, width - 95, labelY - 4);
          }
        });
        ctx.setLineDash([]);
      }

      // Animated Surf Foam is handled continuously in Section 2 for unified 60 FPS flowing wave physics

      // Live Telemetry HUD Overlay
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(10, 10, 360, 26);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, 360, 26);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`🛰️ RUSHIKONDA BLUE FLAG BEACH — AERIAL RECON`, 18, 26);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(width - 240, 10, 230, 26);
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 1;
      ctx.strokeRect(width - 240, 10, 230, 26);
      ctx.fillStyle = '#bae6fd';
      ctx.font = '10px monospace';
      ctx.fillText(`17°46'46.2"N 83°23'18.6"E | WGS84`, width - 232, 26);

      // True North Compass Reticle
      const ncx = width - 30;
      const ncy = 65;
      ctx.beginPath();
      ctx.arc(ncx, ncy, 14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ncx, ncy - 10);
      ctx.lineTo(ncx + 4, ncy + 3);
      ctx.lineTo(ncx, ncy);
      ctx.lineTo(ncx - 4, ncy + 3);
      ctx.closePath();
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('N', ncx - 3, ncy - 13);

      ctx.restore();
      return;
    }

    // =========================================================================
    // 1. RUSHIKONDA BLUE FLAG BEACH (VIZAG) - PROCEDURAL FALLBACK
    // =========================================================================

    // 1.1 Ocean Base (Crescent Cove & Continental Shelf)
    const satOcean = ctx.createLinearGradient(0, dynamicShorelineY, 0, height);
    if (band === 'RGB_TRUE_COLOR') {
      satOcean.addColorStop(0, '#0284c7'); // Shallow turquoise shore
      satOcean.addColorStop(0.15, '#0369a1'); // Nearshore azure
      satOcean.addColorStop(0.38, '#075985'); // Mid-cove shelf
      satOcean.addColorStop(0.72, '#0c4a6e'); // Deep outer cove
      satOcean.addColorStop(1, '#082f49'); // Oceanic Bay of Bengal
    } else if (band === 'NDWI_TURBIDITY') {
      satOcean.addColorStop(0, '#083344');
      satOcean.addColorStop(0.4, '#042f2e');
      satOcean.addColorStop(1, '#020617');
    } else {
      // BATHYMETRY
      satOcean.addColorStop(0, '#14b8a6'); // 0.8m
      satOcean.addColorStop(0.2, '#06b6d4'); // 1.5m
      satOcean.addColorStop(0.45, '#2563eb'); // 2.5m
      satOcean.addColorStop(0.75, '#1e1b4b'); // 3.8m structural trench
      satOcean.addColorStop(1, '#020617'); // 10m+
    }
    ctx.fillStyle = satOcean;
    ctx.fillRect(0, dynamicShorelineY, width, height - dynamicShorelineY);

    // 1.2 Sun Glitter & Caustics in Shallow Cove
    if (band === 'RGB_TRUE_COLOR') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      for (let i = 0; i < 35; i++) {
        const cx = (Math.sin(i * 11.7 + waveOffset * 0.4) * 0.5 + 0.5) * width;
        const cy = dynamicShorelineY + 25 + (Math.cos(i * 8.3) * 0.5 + 0.5) * (height - dynamicShorelineY - 35);
        ctx.beginPath();
        ctx.ellipse(cx, cy, 32, 10, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 1.3 Submerged Basaltic Reef Outcrops (Base of Rushikonda Rocky Promontory)
    ctx.fillStyle = band === 'NDWI_TURBIDITY' ? 'rgba(34, 211, 238, 0.4)' : 'rgba(28, 25, 23, 0.7)';
    ctx.beginPath();
    ctx.ellipse(220, dynamicShorelineY + 65, 95, 42, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(140, dynamicShorelineY + 105, 85, 38, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // 1.4 Structural Rip Current Outflow Trench (between rocky reef and central sandbar)
    const ripGrad = ctx.createLinearGradient(350, dynamicShorelineY, 490, dynamicShorelineY + 220);
    if (band === 'NDWI_TURBIDITY') {
      ripGrad.addColorStop(0, 'rgba(6, 182, 212, 0.75)');
      ripGrad.addColorStop(0.5, 'rgba(34, 211, 238, 0.9)');
      ripGrad.addColorStop(1, 'rgba(244, 63, 94, 0.65)');
    } else if (band === 'BATHYMETRY') {
      ripGrad.addColorStop(0, 'rgba(30, 27, 75, 0.85)');
      ripGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.98)');
      ripGrad.addColorStop(1, 'rgba(2, 6, 23, 1)');
    } else {
      ripGrad.addColorStop(0, 'rgba(8, 47, 73, 0.7)');
      ripGrad.addColorStop(0.5, 'rgba(3, 105, 161, 0.5)');
      ripGrad.addColorStop(1, 'rgba(12, 74, 110, 0.35)');
    }
    ctx.fillStyle = ripGrad;
    ctx.beginPath();
    ctx.moveTo(330, dynamicShorelineY);
    ctx.bezierCurveTo(360, dynamicShorelineY + 75, 400, dynamicShorelineY + 135, 450, height);
    ctx.lineTo(540, height);
    ctx.bezierCurveTo(490, dynamicShorelineY + 135, 460, dynamicShorelineY + 75, 440, dynamicShorelineY);
    ctx.closePath();
    ctx.fill();

    // Rip Channel Surface Churn & Turbulence Ribbons
    ctx.strokeStyle = band === 'NDWI_TURBIDITY' ? 'rgba(165, 243, 252, 0.95)' : 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.6;
    for (let r = 0; r < 5; r++) {
      const ripY = dynamicShorelineY + 20 + ((r * 40 + waveOffset * 28) % (height - dynamicShorelineY - 30));
      const ripX = 380 + Math.sin(ripY * 0.04) * 25;
      ctx.beginPath();
      ctx.moveTo(ripX - 22, ripY);
      ctx.lineTo(ripX + 26, ripY + 14);
      ctx.stroke();
    }

    // 1.5 Crescent Sand Shore (Golden Blue Flag Sand & Wet Swash Zone)
    const satSand = ctx.createLinearGradient(0, 0, 0, dynamicShorelineY);
    satSand.addColorStop(0, '#57534e');
    satSand.addColorStop(0.25, '#78716c');
    satSand.addColorStop(0.5, '#e7e5e4');
    satSand.addColorStop(0.8, '#f5d0a9');
    satSand.addColorStop(1, '#9c6644');
    ctx.fillStyle = satSand;
    ctx.fillRect(0, 0, width, dynamicShorelineY);

    // Wet sand reflection sheen
    ctx.fillStyle = 'rgba(186, 230, 253, 0.22)';
    ctx.fillRect(0, dynamicShorelineY - 14, width, 18);

    // 1.6 Vizag Beach Road & Blue Flag Paved Promenade
    ctx.fillStyle = '#27272a';
    ctx.fillRect(0, 0, width, 38);
    ctx.strokeStyle = '#e4e4e7';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(0, 19);
    ctx.lineTo(width, 19);
    ctx.stroke();
    ctx.setLineDash([]);

    // Paved Promenade
    ctx.fillStyle = '#52525b';
    ctx.fillRect(0, 38, width, 22);

    // Palm Tree clusters along promenade with shadows
    for (let px = 60; px < width; px += 95) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(px + 4, 48 + 4, 8, 4, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(px, 48, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(px - 1, 47, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Blue Flag Cabanas & Wooden Boardwalks
    for (let bx = 280; bx < width - 100; bx += 140) {
      ctx.fillStyle = '#a16207';
      ctx.fillRect(bx, 60, 10, dynamicShorelineY - 75);

      const umbrellaColors = ['#ef4444', '#3b82f6', '#eab308', '#10b981'];
      for (let u = 0; u < 3; u++) {
        const ux = bx + (u - 1) * 22;
        const uy = dynamicShorelineY - 45 + (u % 2) * 12;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(ux + 3, uy + 4, 7, 5, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = umbrellaColors[(bx / 10 + u) % umbrellaColors.length];
        ctx.beginPath();
        ctx.arc(ux, uy, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 1.7 Eastern Ghats Mountain Promontory (North Headland Cove)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(260, 0);
    ctx.bezierCurveTo(275, dynamicShorelineY * 0.4, 255, dynamicShorelineY + 40, 210, dynamicShorelineY + 95);
    ctx.bezierCurveTo(170, dynamicShorelineY + 125, 90, dynamicShorelineY + 120, 0, dynamicShorelineY + 75);
    ctx.closePath();

    const hillGrad = ctx.createLinearGradient(0, 0, 240, dynamicShorelineY + 100);
    hillGrad.addColorStop(0, '#14532d');
    hillGrad.addColorStop(0.4, '#166534');
    hillGrad.addColorStop(0.75, '#1b4332');
    hillGrad.addColorStop(1, '#44403c');
    ctx.fillStyle = hillGrad;
    ctx.fill();

    // Granite ledges
    ctx.fillStyle = '#292524';
    ctx.beginPath();
    ctx.moveTo(210, dynamicShorelineY + 95);
    ctx.lineTo(170, dynamicShorelineY + 125);
    ctx.lineTo(140, dynamicShorelineY + 130);
    ctx.lineTo(120, dynamicShorelineY + 115);
    ctx.lineTo(165, dynamicShorelineY + 80);
    ctx.closePath();
    ctx.fill();

    // Winding Hill Road
    ctx.strokeStyle = '#71717a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.bezierCurveTo(120, 45, 180, dynamicShorelineY * 0.6, 170, dynamicShorelineY + 40);
    ctx.stroke();

    // Hilltop Villa
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(110, 35, 18, 12);
    ctx.fillStyle = '#f87171';
    ctx.fillRect(112, 37, 7, 8);
    ctx.restore();

    // 1.8 Breakers crashing against headland rocks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 3.5;
    for (let w = 0; w < 3; w++) {
      const foamRad = 35 + w * 20 + Math.sin(waveOffset * 2 + w) * 8;
      ctx.beginPath();
      ctx.arc(200, dynamicShorelineY + 95, foamRad, 0.4, 1.8);
      ctx.stroke();
    }

    // Scalloped crescent wave trains rolling onto sand
    for (let wx = 220; wx < width; wx += 35) {
      const wavePhase = Math.sin(wx * 0.025 + waveOffset * 1.8) * (4 + environment.waveHeight * 2.2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(wx, dynamicShorelineY + 15 + wavePhase);
      ctx.lineTo(wx + 24, dynamicShorelineY + 15 + wavePhase);
      ctx.stroke();
    }

  } else {
    // =========================================================================
    // 2. SURYALANKA / BAPATLA BEACH - EXPANSIVE CONTINENTAL SHELF & CASUARINA
    // =========================================================================

    // 2.1 Delta Coastal Waters
    const satOcean = ctx.createLinearGradient(0, dynamicShorelineY, 0, height);
    if (band === 'RGB_TRUE_COLOR') {
      satOcean.addColorStop(0, '#0d9488');
      satOcean.addColorStop(0.18, '#0f766e');
      satOcean.addColorStop(0.45, '#0369a1');
      satOcean.addColorStop(0.8, '#075985');
      satOcean.addColorStop(1, '#082f49');
    } else if (band === 'NDWI_TURBIDITY') {
      satOcean.addColorStop(0, '#042f2e');
      satOcean.addColorStop(0.3, '#083344');
      satOcean.addColorStop(1, '#020617');
    } else {
      satOcean.addColorStop(0, '#10b981');
      satOcean.addColorStop(0.3, '#06b6d4');
      satOcean.addColorStop(0.7, '#1d4ed8');
      satOcean.addColorStop(1, '#0f172a');
    }
    ctx.fillStyle = satOcean;
    ctx.fillRect(0, dynamicShorelineY, width, height - dynamicShorelineY);

    // 2.2 Dual Parallel Longshore Sandbars
    ctx.fillStyle = band === 'NDWI_TURBIDITY' ? 'rgba(34, 211, 238, 0.4)' : 'rgba(94, 234, 212, 0.22)';
    ctx.beginPath();
    ctx.ellipse(width * 0.5, dynamicShorelineY + 45, width * 0.48, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(width * 0.55, dynamicShorelineY + 115, width * 0.46, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Breaking White Surf Lines across the sandbars
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2.5;
    for (let bx = 0; bx < width; bx += 20) {
      const foamSwell = Math.sin(bx * 0.04 + waveOffset * 1.4) * 3;
      ctx.beginPath();
      ctx.moveTo(bx, dynamicShorelineY + 43 + foamSwell);
      ctx.lineTo(bx + 14, dynamicShorelineY + 43 + foamSwell);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(bx + 8, dynamicShorelineY + 112 + foamSwell);
      ctx.lineTo(bx + 22, dynamicShorelineY + 112 + foamSwell);
      ctx.stroke();
    }

    // 2.3 Vast Flat Golden Sand & Intertidal Wet Flat
    const satSand = ctx.createLinearGradient(0, 0, 0, dynamicShorelineY);
    satSand.addColorStop(0, '#78350f');
    satSand.addColorStop(0.2, '#ca8a04');
    satSand.addColorStop(0.5, '#eab308');
    satSand.addColorStop(0.85, '#fde047');
    satSand.addColorStop(1, '#a16207');
    ctx.fillStyle = satSand;
    ctx.fillRect(0, 0, width, dynamicShorelineY);

    ctx.fillStyle = 'rgba(186, 230, 253, 0.28)';
    ctx.fillRect(0, dynamicShorelineY - 26, width, 32);

    // 2.4 Casuarina Forest Belt
    const forestGrad = ctx.createLinearGradient(0, 0, 0, 60);
    forestGrad.addColorStop(0, '#14532d');
    forestGrad.addColorStop(0.6, '#166534');
    forestGrad.addColorStop(1, '#15803d');
    ctx.fillStyle = forestGrad;
    ctx.fillRect(0, 0, width, 55);

    for (let cx = 15; cx < width; cx += 22) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(cx + 3, 50, 7, 4, 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = (cx % 44 === 0) ? '#14532d' : '#166534';
      ctx.beginPath();
      ctx.arc(cx, 44, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(cx - 2, 42, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Harita Beach Resort Cottages
    for (let rx = 120; rx < width - 120; rx += 180) {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(rx, 22, 22, 14);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(rx + 2, 24, 18, 5);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(rx + 8, 36, 6, 26);
    }

    // Coastal Access Road
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(0, 0, width, 18);
    ctx.strokeStyle = '#e4e4e7';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(0, 9);
    ctx.lineTo(width, 9);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // =========================================================================
  // 3. UNIVERSAL WGS84 GEO-GRID & SATELLITE OPTICAL RETICLE
  // =========================================================================

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
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

  // Central Optical Reticle Crosshairs
  const midX = width / 2;
  const midY = height / 2;
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(midX - 16, midY);
  ctx.lineTo(midX - 4, midY);
  ctx.moveTo(midX + 4, midY);
  ctx.lineTo(midX + 16, midY);
  ctx.moveTo(midX, midY - 16);
  ctx.lineTo(midX, midY - 4);
  ctx.moveTo(midX, midY + 4);
  ctx.lineTo(midX, midY + 16);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(midX, midY, 12, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawRiskHeatmap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dynamicShorelineY: number,
  beach: Beach,
  riskOverview?: BeachRiskOverview,
  hazards: Hazard[] = [],
  waveOffset: number = 0,
  isSatelliteMode: boolean = false,
  tideLevel: number = 1.2
) {
  ctx.save();

  // 1. Render zone risk heat gradients (continuous interpolation from green -> yellow -> orange -> red)
  beach.zones.forEach((zone) => {
    const za = riskOverview?.zoneAssessments[zone.id];
    const score = za?.overallScore ?? 15;
    const zRect = isSatelliteMode
      ? getSatZoneRect(zone, width, height, tideLevel)
      : zone;
    const centerX = zRect.x + zRect.width / 2;
    const centerY = zRect.y + zRect.height / 2;
    const radius = Math.max(zRect.width, zRect.height) * 0.72 + Math.sin(waveOffset * 1.5) * 8;

    let heatColorInner = 'rgba(34, 197, 94, 0.38)'; // 0-24: LOW Green
    let heatColorOuter = 'rgba(34, 197, 94, 0)';

    if (score >= 75) {
      // 75-100: CRITICAL Red
      heatColorInner = 'rgba(239, 68, 68, 0.68)';
      heatColorOuter = 'rgba(239, 68, 68, 0)';
    } else if (score >= 50) {
      // 50-74: HIGH Orange
      heatColorInner = 'rgba(249, 115, 22, 0.55)';
      heatColorOuter = 'rgba(249, 115, 22, 0)';
    } else if (score >= 25) {
      // 25-49: MODERATE Yellow
      heatColorInner = 'rgba(234, 179, 8, 0.46)';
      heatColorOuter = 'rgba(234, 179, 8, 0)';
    }

    const radGrad = ctx.createRadialGradient(centerX, centerY, 15, centerX, centerY, radius);
    radGrad.addColorStop(0, heatColorInner);
    radGrad.addColorStop(0.65, heatColorInner.replace(/[\d\.]+\)$/, '0.18)'));
    radGrad.addColorStop(1, heatColorOuter);

    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  // 2. Focused hazard plume (e.g. rip current or severe breaker trench)
  const ripHazard = hazards.find((h) => h.type === 'RIP_CURRENT');
  if (ripHazard) {
    const ripX = isSatelliteMode ? width * 0.295 : 560;
    const ripY = isSatelliteMode
      ? getSatShorelineY(ripX, width, height, tideLevel) + 65
      : dynamicShorelineY + 90;
    const ripRad = 135 + Math.sin(waveOffset * 2.5) * 12;

    const ripGrad = ctx.createRadialGradient(ripX, ripY, 12, ripX, ripY, ripRad);
    ripGrad.addColorStop(0, 'rgba(239, 68, 68, 0.85)');
    ripGrad.addColorStop(0.45, 'rgba(249, 115, 22, 0.55)');
    ripGrad.addColorStop(0.8, 'rgba(234, 179, 8, 0.25)');
    ripGrad.addColorStop(1, 'rgba(234, 179, 8, 0)');

    ctx.fillStyle = ripGrad;
    ctx.beginPath();
    ctx.arc(ripX, ripY, ripRad, 0, Math.PI * 2);
    ctx.fill();
  }

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
  const rushikondaImgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);

  const [viewMode, setViewMode] = useState<CanvasViewMode>('tactical');
  const [satelliteBand, setSatelliteBand] = useState<'RGB_TRUE_COLOR' | 'NDWI_TURBIDITY' | 'BATHYMETRY'>('RGB_TRUE_COLOR');
  const [showStreamlines, setShowStreamlines] = useState<boolean>(true);
  const [showCCTV, setShowCCTV] = useState<boolean>(showCCTVCones);
  const [showGeofences, setShowGeofences] = useState<boolean>(true);
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [clarityMode, setClarityMode] = useState<boolean>(true);

  // Preload authentic high-resolution Rushikonda aerial imagery
  useEffect(() => {
    const img = new Image();
    img.src = '/rushikonda_aerial.png';
    img.onload = () => {
      rushikondaImgRef.current = img;
      setImgLoaded(true);
    };
  }, []);

  // Live state reference for smooth 60 FPS animation loop
  const stateRef = useRef({
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
    cameras,
    drones,
    droneCoverages,
    viewMode,
    satelliteBand,
    showStreamlines,
    showCCTV,
    showGeofences,
    showLegend,
    clarityMode,
    imgLoaded,
  });

  useEffect(() => {
    stateRef.current = {
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
      cameras,
      drones,
      droneCoverages,
      viewMode,
      satelliteBand,
      showStreamlines,
      showCCTV,
      showGeofences,
      showLegend,
      clarityMode,
      imgLoaded,
    };
    soundEngine.updateEnvironment(
      environment.waveHeight,
      environment.wavePeriod,
      environment.windSpeed || 15
    );
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
    cameras,
    drones,
    droneCoverages,
    viewMode,
    satelliteBand,
    showStreamlines,
    showCCTV,
    showGeofences,
    showLegend,
    clarityMode,
    imgLoaded,
  ]);

  // Automatic acoustic alerts on danger events
  const prevDistressRef = useRef<number>(0);
  const prevBreachRef = useRef<number>(0);

  useEffect(() => {
    const distressCount = visitors.filter(
      (v) => v.state === 'DISTRESS' || v.state === 'STRUGGLING'
    ).length;
    if (distressCount > prevDistressRef.current) {
      soundEngine.playDistressAlarm();
    }
    prevDistressRef.current = distressCount;

    const breachCount = visitors.filter((v) => {
      const zone = beach.zones.find((z) => z.id === v.currentZone);
      return zone?.type === 'RESTRICTED' || v.state === 'IN_RESTRICTED_ZONE';
    }).length;
    if (breachCount > prevBreachRef.current) {
      soundEngine.playLifeguardWhistle();
    }
    prevBreachRef.current = breachCount;
  }, [visitors, beach.zones]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let isMounted = true;

    const render = () => {
      if (!isMounted) return;

      const {
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
        cameras,
        drones,
        droneCoverages,
        viewMode,
        satelliteBand,
        showStreamlines,
        showCCTV,
        showGeofences,
        clarityMode,
      } = stateRef.current;

      waveOffsetRef.current += 0.022 * (1 + (environment.waveHeight || 1.2) * 0.4);
      droneRotorRef.current += 0.35;

      const width = beach.width;
      const height = beach.height;

      ctx.clearRect(0, 0, width, height);

      const tidePixelOffset = (environment.tideLevel - 1.2) * 15;
      const dynamicShorelineY = beach.shorelineY + tidePixelOffset;
      const currentSpeedVal = environment.currentSpeed ?? environment.waterCurrent ?? 0.3;

    const isSuryalanka = beach.presetId === 'SURYALANKA_BAPATLA' || beach.id.includes('SURYALANKA');
    const isRushikonda = !isSuryalanka;
    const isSatelliteMode = (viewMode === 'satellite' || viewMode === 'sat_heat') && isRushikonda && !!rushikondaImgRef.current;

    // =========================================================================
    // 1. TERRAIN & WATER BACKGROUND RENDERING (BY VIEW MODE)
    // =========================================================================

    if (viewMode === 'satellite' || viewMode === 'sat_heat') {
      // PHOTOREALISTIC SATELLITE ORTHOPHOTO IMAGERY (WGS84 SENSORS)
      drawPhotorealisticSatelliteImagery(
        ctx,
        width,
        height,
        dynamicShorelineY,
        isRushikonda,
        environment,
        waveOffsetRef.current,
        satelliteBand,
        rushikondaImgRef.current
      );
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

    // Dynamic Risk Heatmap Overlay (Active in 'heat' and 'sat_heat' modes)
    if (viewMode === 'heat' || viewMode === 'sat_heat') {
      drawRiskHeatmap(
        ctx,
        width,
        height,
        dynamicShorelineY,
        beach,
        riskOverview,
        hazards,
        waveOffsetRef.current,
        isSatelliteMode,
        environment.tideLevel
      );
    }

    // =========================================================================
    // 2. ANIMATED WATERLINE & SURF RIDGES
    // =========================================================================

    if (isSatelliteMode) {
      // SATELLITE MODE: REALISTIC CURVED COASTLINE & FLOWING WAVES MATCHING THE AERIAL IMAGE
      const wavePhase = waveOffsetRef.current;
      const waveAmp = 2.5 + environment.waveHeight * 1.8;

      // 1. Dynamic Swash & Backwash Surge (Water flowing up onto the golden sand and retreating)
      const swashCycle = (Math.sin(wavePhase * 1.4) + 1) / 2; // 0 to 1 smooth surge cycle
      const swashReach = 16 + environment.waveHeight * 9;

      ctx.save();
      // Translucent shallow swash wash across wet sand
      ctx.beginPath();
      for (let x = 0; x <= width; x += 10) {
        const baseShoreY = getSatShorelineY(x, width, height, environment.tideLevel);
        const curve = Math.sin(x * 0.02 + wavePhase * 1.8) * waveAmp;
        const swashY = baseShoreY - swashCycle * swashReach + curve;
        if (x === 0) ctx.moveTo(x, swashY);
        else ctx.lineTo(x, swashY);
      }
      for (let x = width; x >= 0; x -= 20) {
        const baseShoreY = getSatShorelineY(x, width, height, environment.tideLevel);
        ctx.lineTo(x, baseShoreY + 12);
      }
      ctx.closePath();
      const swashGrad = ctx.createLinearGradient(0, height * 0.5, 0, height);
      swashGrad.addColorStop(0, `rgba(186, 230, 253, ${0.12 + 0.16 * swashCycle})`);
      swashGrad.addColorStop(1, `rgba(56, 189, 248, ${0.22 + 0.14 * swashCycle})`);
      ctx.fillStyle = swashGrad;
      ctx.fill();

      // Frothy white swash leading edge
      ctx.beginPath();
      for (let x = 0; x <= width; x += 8) {
        const baseShoreY = getSatShorelineY(x, width, height, environment.tideLevel);
        const curve = Math.sin(x * 0.02 + wavePhase * 1.8) * waveAmp;
        const swashY = baseShoreY - swashCycle * swashReach + curve;
        if (x === 0) ctx.moveTo(x, swashY);
        else ctx.lineTo(x, swashY);
      }
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.75 + swashCycle * 0.22})`;
      ctx.lineWidth = 3.0;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
      ctx.shadowBlur = 8;
      ctx.stroke();

      // Delicate trailing foam bubbles on sand during backwash
      for (let i = 0; i < 28; i++) {
        const bx = (i * 37 + wavePhase * 18) % width;
        const bShore = getSatShorelineY(bx, width, height, environment.tideLevel);
        const by = bShore - (swashCycle * 0.65) * swashReach + Math.sin(i * 4.3) * 5;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.beginPath();
        ctx.arc(bx, by, 1.2 + (i % 3) * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 2. Continuous Oceanic Swell Wave Trains Rolling In Shoreward
      const numSwellRanks = 5;
      for (let s = 0; s < numSwellRanks; s++) {
        // Swells propagate continuously from deep ocean (high offset) to nearshore (0 offset)
        const progress = ((wavePhase * 0.32 + s / numSwellRanks) % 1.0);
        const distFromShore = (1.0 - progress) * (height * 0.36);

        ctx.save();
        ctx.beginPath();
        for (let x = 0; x <= width; x += 12) {
          const shoreY = getSatShorelineY(x, width, height, environment.tideLevel);
          const rowY = shoreY + distFromShore;
          if (rowY < height + 15) {
            const waveUndulation = Math.sin(x * 0.016 + wavePhase * 2.0 + s * 1.2) * (2.8 + environment.waveHeight * 1.6);
            if (x === 0) ctx.moveTo(x, rowY + waveUndulation);
            else ctx.lineTo(x, rowY + waveUndulation);
          }
        }

        // Shoaling effect: crest height and brightness grow as wave reaches shallows
        const shoaling = 1.0 - (distFromShore / (height * 0.36));
        const alpha = 0.22 + shoaling * 0.68;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 1.6 + shoaling * 2.4;
        ctx.shadowColor = 'rgba(186, 230, 253, 0.6)';
        ctx.shadowBlur = shoaling > 0.55 ? 6 : 2;
        ctx.stroke();
        ctx.restore();
      }

      // 3. Basalt Headland Rocky Reef Surf Crash & Spray (Left x <= 0.28 * width)
      const reefBurst = Math.sin(wavePhase * 2.2);
      for (let w = 0; w < 3; w++) {
        const rx = width * (0.08 + w * 0.07);
        const ry = height * (0.78 + w * 0.03);
        const reefFoamRad = 20 + w * 14 + Math.max(0, reefBurst) * 10;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 - w * 0.15})`;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.arc(rx, ry, reefFoamRad, 0.3, 2.5);
        ctx.stroke();

        // Spray particles flying off rocks
        if (reefBurst > 0.2) {
          for (let p = 0; p < 5; p++) {
            const px = rx + Math.cos(p * 1.3 + wavePhase) * (reefFoamRad + 6);
            const py = ry - Math.sin(p * 1.3) * (reefFoamRad * 0.6 + 4);
            ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * reefBurst})`;
            ctx.beginPath();
            ctx.arc(px, py, 1.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }

      // 4. Dancing Sunlight Caustics in Shallow Cove Water
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      for (let c = 0; c < 22; c++) {
        const cx = (c * 47 + wavePhase * 14) % width;
        const cy = getSatShorelineY(cx, width, height, environment.tideLevel) + 12 + Math.sin(c * 2.3 + wavePhase) * 16;
        if (cy < height - 15) {
          ctx.beginPath();
          ctx.ellipse(cx, cy, 14, 5, 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 5. Atmospheric Coastal Sea Spray Mist
      const mistShift = (wavePhase * 12) % 40;
      const mistGrad = ctx.createLinearGradient(0, height * 0.65, 0, height * 0.78);
      mistGrad.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
      mistGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.04 + Math.min(0.08, (environment.windSpeed || 15) * 0.003)})`);
      mistGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = mistGrad;
      ctx.fillRect(0, height * 0.65 + mistShift * 0.2, width, 55);
      ctx.restore();
    } else {
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
        const zRect = isSatelliteMode
          ? getSatZoneRect(zone, width, height, environment.tideLevel)
          : zone;

        ctx.save();

        if (zone.type === 'RESTRICTED') {
          ctx.fillStyle = isCritical ? 'rgba(239, 68, 68, 0.32)' : 'rgba(239, 68, 68, 0.16)';
          ctx.fillRect(zRect.x, zRect.y, zRect.width, zRect.height);

          ctx.strokeStyle = isCritical ? '#dc2626' : '#ef4444';
          ctx.lineWidth = isCritical ? 3 : 2;
          ctx.setLineDash([6, 6]);
          ctx.strokeRect(zRect.x, zRect.y, zRect.width, zRect.height);

          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(`⚠️ ${zone.name.toUpperCase()}`, zRect.x + 10, zRect.y + 22);

          if (za && za.overallScore > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(`🔴 RISK: ${za.overallScore}/100 [${za.category}]`, zRect.x + 10, zRect.y + 38);
          }
        } else if (zone.type === 'SWIMMING') {
          if (isCritical) ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
          else if (isHigh) ctx.fillStyle = 'rgba(249, 115, 22, 0.2)';
          else if (isModerate) ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
          else ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
          ctx.fillRect(zRect.x, zRect.y, zRect.width, zRect.height);

          ctx.strokeStyle = isCritical ? '#ef4444' : isHigh ? '#f97316' : isModerate ? '#f59e0b' : '#38bdf8';
          ctx.lineWidth = isCritical || isHigh ? 2.5 : 1.5;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(zRect.x, zRect.y, zRect.width, zRect.height);

          const bannerColor = isCritical ? '#991b1b' : isHigh ? '#c2410c' : isModerate ? '#b45309' : '#0284c7';
          ctx.fillStyle = bannerColor;
          ctx.fillRect(zRect.x + 8, zRect.y + 8, Math.min(220, zRect.width - 16), 22);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText(`🏊 ${zone.name}`, zRect.x + 14, zRect.y + 23);

          if (za) {
            ctx.fillStyle = isCritical ? '#fecaca' : isHigh ? '#fed7aa' : isModerate ? '#fef3c7' : '#e0f2fe';
            ctx.font = 'bold 10px monospace';
            const dot = isCritical ? '🔴' : isHigh ? '🟠' : isModerate ? '🟡' : '🟢';
            ctx.fillText(`${dot} RISK: ${za.overallScore}/100 [${za.category}]`, zRect.x + 14, zRect.y + 45);
          }
        } else if (zone.type === 'BEACH_ZONE') {
          ctx.strokeStyle = 'rgba(217, 119, 6, 0.35)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(zRect.x, zRect.y, zRect.width, zRect.height);

          ctx.fillStyle = isNightMode ? '#cbd5e1' : '#92400e';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText(`🏖️ ${zone.name}`, zRect.x + 10, zRect.y + 20);
        }
        ctx.restore();
      });
    }

    // =========================================================================
    // 4. HYDRODYNAMIC STREAMLINES & RIP CHUTES
    // =========================================================================

    const isRipActive = currentSpeedVal >= 0.5 || hazards.some((h) => h.type === 'RIP_CURRENT') || viewMode === 'hydrodynamic';

    if (showStreamlines && isRipActive) {
      const ripChannelX = isSatelliteMode ? width * 0.295 : 560;
      const ripStartY = isSatelliteMode ? getSatShorelineY(ripChannelX, width, height, environment.tideLevel) : dynamicShorelineY;
      const ripWidth = isSatelliteMode ? 110 : 140;

      ctx.save();
      // Channel shading
      const channelGrad = ctx.createLinearGradient(0, ripStartY, 0, height);
      channelGrad.addColorStop(0, 'rgba(239, 68, 68, 0.08)');
      channelGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.22)');
      channelGrad.addColorStop(1, 'rgba(168, 85, 247, 0.25)');
      ctx.fillStyle = channelGrad;
      ctx.fillRect(ripChannelX - ripWidth / 2, ripStartY, ripWidth, height - ripStartY);

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(ripChannelX - ripWidth / 2, ripStartY, ripWidth, height - ripStartY);
      ctx.setLineDash([]);

      // Feeder vectors (left & right)
      const feederPulse = (waveOffsetRef.current * 22) % 60;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;

      const leftFeederStart = isSatelliteMode ? width * 0.12 : 320;
      for (let fx = leftFeederStart; fx < ripChannelX - 35; fx += 45) {
        const arrowX = fx + feederPulse;
        if (arrowX < ripChannelX - 10) {
          const arrowY = isSatelliteMode ? getSatShorelineY(arrowX, width, height, environment.tideLevel) + 20 : dynamicShorelineY + 25;
          ctx.beginPath();
          ctx.moveTo(arrowX - 15, arrowY);
          ctx.lineTo(arrowX + 5, arrowY);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(arrowX, arrowY - 4);
          ctx.lineTo(arrowX + 6, arrowY);
          ctx.lineTo(arrowX, arrowY + 4);
          ctx.fillStyle = '#f59e0b';
          ctx.fill();
        }
      }

      const rightFeederStart = isSatelliteMode ? width * 0.52 : 800;
      for (let fx = rightFeederStart; fx > ripChannelX + 35; fx -= 45) {
        const arrowX = fx - feederPulse;
        if (arrowX > ripChannelX + 10) {
          const arrowY = isSatelliteMode ? getSatShorelineY(arrowX, width, height, environment.tideLevel) + 20 : dynamicShorelineY + 25;
          ctx.beginPath();
          ctx.moveTo(arrowX + 15, arrowY);
          ctx.lineTo(arrowX - 5, arrowY);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(arrowX, arrowY - 4);
          ctx.lineTo(arrowX - 6, arrowY);
          ctx.lineTo(arrowX, arrowY + 4);
          ctx.fillStyle = '#f59e0b';
          ctx.fill();
        }
      }

      // Seaward Rip Chute
      for (let j = 0; j < 3; j++) {
        const laneX = ripChannelX - 25 + j * 25;
        const maxTravel = Math.max(80, height - ripStartY - 40);
        const arrowPhase = (waveOffsetRef.current * 28 + j * 30) % maxTravel;
        const arrowY = ripStartY + 25 + arrowPhase;

        if (arrowY < height - 15) {
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

      // Animated Rip Current Floating Foam Particles (visible undertow flow)
      const numTracers = 36;
      for (let p = 0; p < numTracers; p++) {
        const tracerPhase = ((waveOffsetRef.current * 32 + p * 19) % Math.max(100, height - ripStartY));
        const progressFrac = tracerPhase / Math.max(100, height - ripStartY);
        const lateralSpread = (Math.sin(p * 2.7) * (ripWidth * 0.35)) * (0.4 + progressFrac * 1.2);
        const tracerX = ripChannelX + lateralSpread;
        const tracerY = ripStartY + tracerPhase;

        if (tracerY < height - 10) {
          ctx.beginPath();
          ctx.arc(tracerX, tracerY, 1.2 + (p % 3) * 0.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.85 - progressFrac * 0.5})`;
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(tracerX, tracerY);
          ctx.lineTo(tracerX - lateralSpread * 0.1, tracerY - 6);
          ctx.strokeStyle = `rgba(6, 182, 212, ${0.5 - progressFrac * 0.3})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`⚡ SEAWARD RIP JET: ${currentSpeedVal.toFixed(2)} m/s`, ripChannelX - 65, height - 25);
      ctx.restore();
    }

    // =========================================================================
    // 5. CCTV FOV CONES & CAMERAS
    // =========================================================================

    if (showCCTV && cameras && cameras.length > 0) {
      cameras.forEach((cam) => {
        const isOnline = cam.status === 'ONLINE';
        const camColor = cam.color || '#06b6d4';
        const camPos = isSatelliteMode
          ? projectToSatellite(cam.position, beach.width, beach.height, dynamicShorelineY, width, height, environment.tideLevel)
          : cam.position;

        if (isOnline) {
          ctx.save();
          const startAngle = ((cam.rotation - cam.fieldOfView / 2) * Math.PI) / 180;
          const endAngle = ((cam.rotation + cam.fieldOfView / 2) * Math.PI) / 180;

          ctx.beginPath();
          ctx.moveTo(camPos.x, camPos.y);
          ctx.arc(camPos.x, camPos.y, cam.range, startAngle, endAngle);
          ctx.closePath();

          const fovGrad = ctx.createRadialGradient(
            camPos.x,
            camPos.y,
            10,
            camPos.x,
            camPos.y,
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
        ctx.arc(camPos.x, camPos.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isOnline ? camColor : '#64748b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const rotRad = (cam.rotation * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(camPos.x, camPos.y);
        ctx.lineTo(camPos.x + Math.cos(rotRad) * 11, camPos.y + Math.sin(rotRad) * 11);
        ctx.strokeStyle = isOnline ? '#22c55e' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(camPos.x - 22, camPos.y - 20, 44, 12);
        ctx.strokeStyle = isOnline ? camColor : '#64748b';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(camPos.x - 22, camPos.y - 20, 44, 12);

        ctx.fillStyle = isOnline ? '#e2e8f0' : '#94a3b8';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(cam.id, camPos.x, camPos.y - 11);
        ctx.restore();
      });
    }

    // =========================================================================
    // 6. EMERGENCY RESPONDERS (LIFEGUARDS, BOATS, DRONES, AMBULANCES)
    // =========================================================================

    emergencyResources
      .filter((r) => r.type === 'LIFEGUARD')
      .forEach((lg) => {
        const lgPos = isSatelliteMode
          ? projectToSatellite(lg.position, beach.width, beach.height, dynamicShorelineY, width, height, environment.tideLevel)
          : lg.position;
        const isDispatched = lg.status === 'EN_ROUTE' || lg.status === 'ON_SCENE' || lg.status === 'DISPATCHED';

        if (isDispatched && lg.targetPosition) {
          const tgtPos = isSatelliteMode
            ? projectToSatellite(lg.targetPosition, beach.width, beach.height, dynamicShorelineY, width, height, environment.tideLevel)
            : lg.targetPosition;
          ctx.beginPath();
          ctx.moveTo(lgPos.x, lgPos.y);
          ctx.lineTo(tgtPos.x, tgtPos.y);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.arc(lgPos.x, lgPos.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = isDispatched ? '#f59e0b' : '#ca8a04';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px sans-serif';
        ctx.fillText('🛟', lgPos.x - 5, lgPos.y + 4);

        ctx.fillStyle = '#78350f';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(lg.id, lgPos.x - 12, lgPos.y - 16);
      });

    // Rescue Boats
    emergencyResources
      .filter((r) => r.type === 'RESCUE_BOAT')
      .forEach((boat) => {
        const boatPos = isSatelliteMode
          ? projectToSatellite(boat.position, beach.width, beach.height, dynamicShorelineY, width, height, environment.tideLevel)
          : boat.position;
        const isDispatched = boat.status === 'EN_ROUTE' || boat.status === 'ON_SCENE';

        if (isDispatched && boat.targetPosition) {
          const tgtPos = isSatelliteMode
            ? projectToSatellite(boat.targetPosition, beach.width, beach.height, dynamicShorelineY, width, height, environment.tideLevel)
            : boat.targetPosition;
          ctx.beginPath();
          ctx.moveTo(boatPos.x, boatPos.y);
          ctx.lineTo(boatPos.x - 20, boatPos.y + 10);
          ctx.moveTo(boatPos.x, boatPos.y);
          ctx.lineTo(boatPos.x - 20, boatPos.y - 10);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.fillStyle = viewMode === 'thermal' ? '#f59e0b' : '#0284c7';
        ctx.beginPath();
        ctx.ellipse(boatPos.x, boatPos.y, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px sans-serif';
        ctx.fillText('🚤', boatPos.x - 7, boatPos.y + 4);
      });

    // Airborne Drones
    drones.forEach((drone) => {
      const dronePos = isSatelliteMode
        ? projectToSatellite(drone.canvasPosition, beach.width, beach.height, dynamicShorelineY, width, height, environment.tideLevel)
        : drone.canvasPosition;
      const isAirborne = drone.altitude > 2;
      const cov = droneCoverages.find((c) => c.droneId === drone.id);

      if (isAirborne && cov) {
        ctx.beginPath();
        ctx.arc(dronePos.x, dronePos.y, cov.radiusMeters, 0, Math.PI * 2);
        ctx.fillStyle = viewMode === 'thermal' ? 'rgba(254, 240, 138, 0.12)' : 'rgba(6, 182, 212, 0.08)';
        ctx.fill();
        ctx.strokeStyle = viewMode === 'thermal' ? '#fde047' : 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.save();
      ctx.translate(dronePos.x, dronePos.y);
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
      ctx.save();
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);

      if (isSatelliteMode) {
        // Lateral Escape Corridors out of Rip Trench into Central Sandy Cove
        const ripChX = width * 0.295;
        const ripSY = getSatShorelineY(ripChX, width, height, environment.tideLevel);
        const escapeSY = ripSY + 45;

        // Escape Path to Central Shallows
        ctx.beginPath();
        ctx.moveTo(ripChX, escapeSY);
        ctx.lineTo(width * 0.44, escapeSY - 15);
        ctx.lineTo(width * 0.44, getSatRoadY(width * 0.44, width, height) + 35);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('◀ LATERAL ESCAPE TO SHALLOWS', width * 0.32, escapeSY - 10);
      } else {
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
      }
      ctx.restore();
    }

    // Acoustic Siren Rings radiating from Lifeguards
    if (emergencyResources.some((r) => r.type === 'LIFEGUARD' && (r.status === 'EN_ROUTE' || r.status === 'ON_SCENE')) || environment.waveHeight > 2.0 || (environment.currentSpeed ?? environment.waterCurrent ?? 0) > 0.8) {
      emergencyResources.filter((r) => r.type === 'LIFEGUARD').forEach((lg) => {
        const lgPos = isSatelliteMode
          ? projectToSatellite(lg.position, beach.width, beach.height, dynamicShorelineY, width, height, environment.tideLevel)
          : lg.position;
        const sirenRing = (Date.now() / 40) % 45;
        ctx.beginPath();
        ctx.arc(lgPos.x, lgPos.y, 15 + sirenRing, 0, Math.PI * 2);
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

      // Project position to satellite geometry if satellite mode is active
      const pos = isSatelliteMode
        ? projectToSatellite(v.position, beach.width, beach.height, dynamicShorelineY, width, height, environment.tideLevel)
        : v.position;

      if (viewMode === 'thermal') {
        // FLIR THERMAL HEAT SIGNATURE RENDERING (~37°C white-hot core with infrared corona)
        const rad = isDistressed ? 10 + pulsePhase * 0.5 : awareness === 'FLEEING' ? 9 : 7;
        const heatGrad = ctx.createRadialGradient(pos.x, pos.y, 1.5, pos.x, pos.y, rad);
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
        ctx.arc(pos.x, pos.y, rad, 0, Math.PI * 2);
        ctx.fill();

        // Thermal temperature tag
        if (isDistressed || isSelected || awareness === 'FLEEING') {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px monospace';
          const tag = isDistressed ? '37.8°C [SOS]' : awareness === 'FLEEING' ? '37.4°C [FLEE]' : '36.8°C';
          ctx.fillText(tag, pos.x - 14, pos.y - 10);
        }
      } else {
        // TACTICAL & SATELLITE STANDARD RENDERING
        const shoreBoundary = isSatelliteMode
          ? getSatShorelineY(pos.x, width, height, environment.tideLevel)
          : dynamicShorelineY;
        const isInWater = pos.y >= shoreBoundary;

        if (isInWater) {
          // 1. Water Wake Ripple around Swimmer
          const wakeRad = 7 + (pulsePhase % 5);
          ctx.beginPath();
          ctx.ellipse(pos.x, pos.y + 1, wakeRad, wakeRad * 0.42, 0, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
          ctx.lineWidth = 1.0;
          ctx.stroke();

          // 2. Active Distress Water Splashes (flailing arms & foamy water turbulence)
          if (isDistressed) {
            // Concentric shockwave SOS beacon ring expanding outward in water
            const sosRadius = 10 + ((Date.now() / 40) % 36);
            ctx.beginPath();
            ctx.ellipse(pos.x, pos.y + 2, sosRadius, sosRadius * 0.48, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(239, 68, 68, ${Math.max(0, 0.85 - sosRadius / 45)})`;
            ctx.lineWidth = 2.0;
            ctx.stroke();

            // Water spray droplets shooting outward
            for (let sp = 0; sp < 6; sp++) {
              const spAngle = (sp * Math.PI) / 3 + (Date.now() / 140);
              const spDist = 6 + Math.sin(sp * 1.5 + Date.now() / 90) * 5;
              const spX = pos.x + Math.cos(spAngle) * spDist;
              const spY = pos.y + Math.sin(spAngle) * (spDist * 0.6);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
              ctx.beginPath();
              ctx.arc(spX, spY, 1.2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else {
          // 3. Grounded Drop-Shadow on Golden Beach Sand
          ctx.beginPath();
          ctx.ellipse(pos.x + 1.2, pos.y + 3.5, 4.5, 2.0, 0.15, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
          ctx.fill();
        }

        // 1. Sensory Perception Auras
        if (awareness === 'SUSPICIOUS') {
          // Amber/Yellow Sensory Halo (Hesitation & Awareness)
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 9, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([2, 2]);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText('⚠️', pos.x + 5, pos.y - 6);
        } else if (awareness === 'FLEEING') {
          // Red/Amber Pulsating Halo with Active Escape Vector
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 10 + (pulsePhase % 4), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(244, 63, 94, ${0.9 - (pulsePhase % 4) * 0.15})`;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Draw Directional Escape Vector Arrow
          const esc = v.escapeVector || { dx: 0, dy: -1 };
          const arrowLen = 18;
          const endX = pos.x + esc.dx * arrowLen;
          const endY = pos.y + esc.dy * arrowLen;

          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
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
          ctx.arc(pos.x, pos.y, 13 + pulsePhase, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(217, 70, 239, 0.9)';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.fillStyle = '#d946ef';
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText('🚨 TRAPPED', pos.x - 18, pos.y - 14);
        }

        // Selected Reticle
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2);
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // Distress Callout
        if (isDistressed) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 12 + pulsePhase, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.8 - pulsePhase * 0.07})`;
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('🆘 SOS', pos.x - 14, pos.y - 12);
        }

        // Computer Vision Edge Bounding Box Overlay (CCTV Mode)
        if (showCCTV && (viewMode === 'tactical' || viewMode === 'satellite')) {
          const bw = 16;
          const bh = 22;
          const bx = pos.x - bw / 2;
          const by = pos.y - bh / 2;
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

        // Clarity Focus Highlight Rings (when Clarity Mode is active)
        if (clarityMode) {
          if (v.type === 'CHILD') {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          } else if (isInWater) {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        const radius = v.type === 'CHILD' ? 3.5 : 5;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
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

    const coordStr = isSuryalanka
      ? '15°50\'04"N  80°30\'18"E | BAPATLA SHELF'
      : '17°46\'46"N  83°23\'18"E | RUSHIKONDA BLUE FLAG';

    if (viewMode === 'satellite' || viewMode === 'sat_heat') {
      const beachName = isSuryalanka ? 'SURYALANKA BAPATLA SHELF' : 'RUSHIKONDA BLUE FLAG COVE';
      const bandName =
        satelliteBand === 'RGB_TRUE_COLOR'
          ? 'RGB TRUE-COLOR [432]'
          : satelliteBand === 'NDWI_TURBIDITY'
          ? 'NDWI RIP TURBIDITY INDEX'
          : 'BATHYMETRIC DEPTH CONTOURS';

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(15, 55, 360, 50);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(15, 55, 360, 50);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(
        viewMode === 'sat_heat'
          ? `🛰️+🔥 RUSHIKONDA SATELLITE DIGITAL TWIN + RISK HEATMAP`
          : `🛰️ RUSHIKONDA SATELLITE DIGITAL TWIN [AERIAL RECON]`,
        25,
        70
      );
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`${beachName} | ${coordStr}`, 25, 84);
      ctx.fillStyle = '#34d399';
      ctx.font = '8px monospace';
      ctx.fillText(`BAND: ${bandName} | AERIAL GEOMETRY SYNCHRONIZED`, 25, 96);
    } else if (viewMode === 'heat') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(15, 55, 310, 42);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(15, 55, 310, 42);

      ctx.fillStyle = '#fb923c';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('🔥 DYNAMIC SAFETY RISK HEATMAP', 25, 70);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '8px monospace';
      ctx.fillText('🟢 LOW (0-24) | 🟡 MOD (25-49) | 🟠 HIGH (50-74) | 🔴 CRIT (75-100)', 25, 85);
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

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      isMounted = false;
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = beach.width / rect.width;
    const scaleY = beach.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const isSuryalanka = beach.presetId === 'SURYALANKA_BAPATLA' || beach.id.includes('SURYALANKA');
    const isRushikonda = !isSuryalanka;
    const isSatelliteMode = (viewMode === 'satellite' || viewMode === 'sat_heat') && isRushikonda && !!rushikondaImgRef.current;
    const tidePixelOffset = (environment.tideLevel - 1.2) * 15;
    const dynamicShorelineY = beach.shorelineY + tidePixelOffset;

    let closest: Visitor | null = null;
    let minDist = 25;

    visitors.forEach((v) => {
      const pos = isSatelliteMode
        ? projectToSatellite(v.position, beach.width, beach.height, dynamicShorelineY, beach.width, beach.height, environment.tideLevel)
        : v.position;
      const dist = Math.hypot(pos.x - clickX, pos.y - clickY);
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
                ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400 font-extrabold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-300" />
            <span>🛰️ Satellite Recon</span>
          </button>

          <button
            onClick={() => setViewMode('heat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'heat'
                ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400 font-extrabold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>🔥 Risk Heatmap</span>
          </button>

          <button
            onClick={() => setViewMode('sat_heat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'sat_heat'
                ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400 font-extrabold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-300" />
            <span>🛰️+🔥 Sat + Heat</span>
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

        {/* Right: Sound Controls, Layer Toggles & Legend */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 shadow-lg backdrop-blur-md pointer-events-auto text-xs">
          <SoundControlHUD />

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
            onClick={() => setClarityMode(!clarityMode)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer border ${
              clarityMode ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm' : 'text-slate-400 hover:bg-slate-800 border-transparent'
            }`}
            title="Toggle High-Clarity Visual Focus (Swimmer Halos, Splashes & Rip Particles)"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>Clarity {clarityMode ? 'ON' : 'OFF'}</span>
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

      {/* Floating Satellite Spectral Band Selector */}
      {(viewMode === 'satellite' || viewMode === 'sat_heat') && (
        <div className="absolute top-14 right-2.5 z-20 flex items-center gap-1.5 bg-slate-900/95 p-1 rounded-xl border border-blue-500/50 shadow-xl backdrop-blur-md text-xs font-mono">
          <span className="text-[10px] text-blue-300 font-bold px-1.5">BAND:</span>
          <button
            onClick={() => setSatelliteBand('RGB_TRUE_COLOR')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              satelliteBand === 'RGB_TRUE_COLOR'
                ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            🌍 True Color Orthophoto
          </button>
          <button
            onClick={() => setSatelliteBand('NDWI_TURBIDITY')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              satelliteBand === 'NDWI_TURBIDITY'
                ? 'bg-cyan-500 text-slate-950 shadow-sm font-extrabold ring-1 ring-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            🌊 NDWI Rip Turbulence
          </button>
          <button
            onClick={() => setSatelliteBand('BATHYMETRY')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              satelliteBand === 'BATHYMETRY'
                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            📊 Bathymetric Depths
          </button>
        </div>
      )}

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
