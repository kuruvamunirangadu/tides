import React, { useRef, useEffect, useState } from 'react';
import { BeachGIS } from '../models/BeachGIS';
import { LayerManager } from '../layers/LayerManager';
import { Geofence } from '../models/Geofence';
import { CoordinateSystem } from '../CoordinateSystem';
import { Visitor } from '../../models/Visitor';
import { Hazard } from '../../models/Hazard';
import { BeachRiskOverview } from '../../models/Risk';
import { PredictionState } from '../../prediction/models/PredictionTypes';
import { GeoPoint } from '../models/GeoPoint';

interface GISMapProps {
  beach: BeachGIS;
  layerManager: LayerManager;
  geofences: Geofence[];
  visitors: Visitor[];
  hazards?: Hazard[];
  riskOverview?: BeachRiskOverview;
  predictionState?: PredictionState | null;
  onSelectZone?: (zoneId: string) => void;
}

export const GISMap: React.FC<GISMapProps> = ({
  beach,
  layerManager,
  geofences,
  visitors,
  hazards = [],
  riskOverview,
  predictionState,
  onSelectZone,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [mapMode, setMapMode] = useState<'vector' | 'satellite'>('vector');
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [mouseGeoCoord, setMouseGeoCoord] = useState<GeoPoint>(beach.center);
  const waveAnimRef = useRef<number>(0);

  // Helper to project GeoPoint to Canvas pixel space
  const projectGeoToPixel = (
    point: GeoPoint,
    canvasWidth: number,
    canvasHeight: number
  ): { x: number; y: number } => {
    const local = CoordinateSystem.geoToLocal(point, beach.center);
    // Local meters to pixel scaling (approx 1 meter = 1 pixel at zoom 1.0)
    const scale = (canvasWidth / beach.dimensionsMeters.width) * zoom;
    const pixelX = canvasWidth / 2 + local.x * scale + panOffset.x;
    const pixelY = canvasHeight / 2 + local.y * scale + panOffset.y;
    return { x: pixelX, y: pixelY };
  };

  useEffect(() => {
    let animId: number;

    const render = () => {
      waveAnimRef.current += 0.04;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Draw Land / Sand Area Polygon boundary pixels first
      const boundaryPixels = beach.boundary.coordinates[0].map((coord) =>
        projectGeoToPixel({ longitude: coord[0], latitude: coord[1] }, width, height)
      );

      // 1. Layer 1 — Base Map (Dark topographic ocean vs Photorealistic Satellite Orthophoto)
      if (mapMode === 'satellite') {
        const isRushikonda = beach.id.includes('RUSHIKONDA') || beach.name.toLowerCase().includes('rushikonda');
        const isSuryalanka = beach.id.includes('SURYALANKA') || beach.name.toLowerCase().includes('bapatla') || !isRushikonda;

        if (isRushikonda) {
          // --- RUSHIKONDA SATELLITE ORTHOPHOTO (CRESCENT COVE & ROCKY HEADLAND) ---
          // Deep Cove Ocean with turquoise shelf
          const satOcean = ctx.createLinearGradient(0, height * 0.2, 0, height);
          satOcean.addColorStop(0, '#0284c7'); // Tropical cove turquoise
          satOcean.addColorStop(0.2, '#0369a1'); // Nearshore azure
          satOcean.addColorStop(0.5, '#075985'); // Mid-cove shelf
          satOcean.addColorStop(0.8, '#0c4a6e'); // Deep outer bay
          satOcean.addColorStop(1, '#082f49'); // Oceanic Bay of Bengal
          ctx.fillStyle = satOcean;
          ctx.fillRect(0, 0, width, height);

          // Submerged Rocky Reefs & Central Structural Rip Trench
          ctx.fillStyle = 'rgba(28, 25, 23, 0.7)';
          ctx.beginPath();
          ctx.ellipse(width * 0.25, height * 0.55, width * 0.16, height * 0.08, -0.2, 0, Math.PI * 2);
          ctx.fill();

          // Structural Rip Trench (Funneling offshore)
          const ripGrad = ctx.createLinearGradient(width * 0.4, height * 0.35, width * 0.55, height);
          ripGrad.addColorStop(0, 'rgba(8, 47, 73, 0.65)');
          ripGrad.addColorStop(0.5, 'rgba(3, 105, 161, 0.45)');
          ripGrad.addColorStop(1, 'rgba(12, 74, 110, 0.3)');
          ctx.fillStyle = ripGrad;
          ctx.beginPath();
          ctx.ellipse(width * 0.46, height * 0.62, width * 0.12, height * 0.24, 0.2, 0, Math.PI * 2);
          ctx.fill();

          // Draw Land / Sand Area Polygon with Blue Flag Golden Sand
          if (boundaryPixels.length > 0) {
            const satLandGrad = ctx.createLinearGradient(0, 0, 0, height);
            satLandGrad.addColorStop(0, '#44403c'); // Highway & Promenade
            satLandGrad.addColorStop(0.25, '#78716c');
            satLandGrad.addColorStop(0.5, '#d6d3d1');
            satLandGrad.addColorStop(0.75, '#f5d0a9'); // Golden Blue Flag sand
            satLandGrad.addColorStop(1, '#9c6644'); // Wet tide sand
            ctx.fillStyle = satLandGrad;
            ctx.beginPath();
            ctx.moveTo(boundaryPixels[0].x, boundaryPixels[0].y);
            for (let i = 1; i < boundaryPixels.length; i++) {
              ctx.lineTo(boundaryPixels[i].x, boundaryPixels[i].y);
            }
            ctx.closePath();
            ctx.fill();
          }

          // Eastern Ghats Mountain Promontory on North/West
          ctx.save();
          ctx.fillStyle = '#14532d';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(width * 0.3, 0);
          ctx.bezierCurveTo(width * 0.32, height * 0.25, width * 0.28, height * 0.45, width * 0.18, height * 0.55);
          ctx.lineTo(0, height * 0.48);
          ctx.closePath();
          ctx.fill();

          // Rocky Cliff edge on promontory
          ctx.fillStyle = '#292524';
          ctx.beginPath();
          ctx.moveTo(width * 0.18, height * 0.55);
          ctx.lineTo(width * 0.24, height * 0.52);
          ctx.lineTo(width * 0.28, height * 0.45);
          ctx.lineTo(width * 0.22, height * 0.48);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

        } else {
          // --- SURYALANKA SATELLITE ORTHOPHOTO (WIDE DELTA SHELF & CASUARINA) ---
          const satOcean = ctx.createLinearGradient(0, height * 0.25, 0, height);
          satOcean.addColorStop(0, '#0d9488'); // Jade delta shallows
          satOcean.addColorStop(0.2, '#0f766e');
          satOcean.addColorStop(0.5, '#0369a1'); // Wide flat shelf
          satOcean.addColorStop(0.85, '#075985');
          satOcean.addColorStop(1, '#082f49');
          ctx.fillStyle = satOcean;
          ctx.fillRect(0, 0, width, height);

          // Dual Parallel Longshore Sandbars
          ctx.fillStyle = 'rgba(94, 234, 212, 0.24)';
          ctx.beginPath();
          ctx.ellipse(width * 0.5, height * 0.52, width * 0.45, height * 0.05, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(width * 0.52, height * 0.72, width * 0.42, height * 0.06, 0, 0, Math.PI * 2);
          ctx.fill();

          // Long White Breaker Lines across sandbars
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.lineWidth = 2;
          for (let bx = 0; bx < width; bx += 30) {
            ctx.beginPath();
            ctx.moveTo(bx, height * 0.51);
            ctx.lineTo(bx + 20, height * 0.51);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(bx + 10, height * 0.71);
            ctx.lineTo(bx + 28, height * 0.71);
            ctx.stroke();
          }

          // Draw Land / Sand Area Polygon (Flat Expansive Golden Sand)
          if (boundaryPixels.length > 0) {
            const satLandGrad = ctx.createLinearGradient(0, 0, 0, height);
            satLandGrad.addColorStop(0, '#78350f'); // Inland red soil
            satLandGrad.addColorStop(0.25, '#ca8a04');
            satLandGrad.addColorStop(0.6, '#eab308'); // Golden flat sand
            satLandGrad.addColorStop(0.85, '#fde047');
            satLandGrad.addColorStop(1, '#a16207'); // Wet sand mirror flat
            ctx.fillStyle = satLandGrad;
            ctx.beginPath();
            ctx.moveTo(boundaryPixels[0].x, boundaryPixels[0].y);
            for (let i = 1; i < boundaryPixels.length; i++) {
              ctx.lineTo(boundaryPixels[i].x, boundaryPixels[i].y);
            }
            ctx.closePath();
            ctx.fill();
          }

          // Dense Casuarina Forest Belt on Landward edge
          ctx.fillStyle = '#14532d';
          ctx.fillRect(0, 0, width, height * 0.16);

          // Harita Resort Red Cottages
          ctx.fillStyle = '#dc2626';
          for (let rx = width * 0.15; rx < width * 0.85; rx += width * 0.18) {
            ctx.fillRect(rx, height * 0.06, 16, 10);
          }
        }

        // High-precision WGS84 Satellite Geo-Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 60 * zoom) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 60 * zoom) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Satellite Telemetry HUD Stamp
        const locationTag = isRushikonda ? 'RUSHIKONDA BLUE FLAG COVE' : 'SURYALANKA BAPATLA SHELF';
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.fillRect(width - 340, 60, 325, 48);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(width - 340, 60, 325, 48);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`🛰️ SENTINEL-2 / WORLDVIEW-3 HIGH-RES ORTHOPHOTO`, width - 330, 75);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(`${locationTag} | WGS84 EPSG:4326`, width - 330, 89);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '8px monospace';
        ctx.fillText(`GSD: 0.3m/px | ALT: 786 KM | TRUE-COLOR RGB`, width - 330, 101);
        ctx.restore();
      } else {
        // Standard Vector Cartography Base
        ctx.fillStyle = '#082f49'; // Deep coastal water
        ctx.fillRect(0, 0, width, height);

        // Draw Bathymetric / Depth grid lines
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 50 * zoom) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 50 * zoom) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Draw Land / Sand Area Polygon
        if (boundaryPixels.length > 0) {
          const sandGrad = ctx.createLinearGradient(0, 0, 0, height);
          sandGrad.addColorStop(0, '#78350f'); // Inland
          sandGrad.addColorStop(0.35, '#ca8a04'); // Dry sand
          sandGrad.addColorStop(0.55, '#eab308'); // Wet sand
          sandGrad.addColorStop(1, '#0369a1'); // Surf wash
          ctx.fillStyle = sandGrad;
          ctx.beginPath();
          ctx.moveTo(boundaryPixels[0].x, boundaryPixels[0].y);
          for (let i = 1; i < boundaryPixels.length; i++) {
            ctx.lineTo(boundaryPixels[i].x, boundaryPixels[i].y);
          }
          ctx.closePath();
          ctx.fill();
        }
      }

      // 2. Layer 2 — Beach Boundary
      if (layerManager.isLayerVisible('layer-boundary') && boundaryPixels.length > 0) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(boundaryPixels[0].x, boundaryPixels[0].y);
        for (let i = 1; i < boundaryPixels.length; i++) {
          ctx.lineTo(boundaryPixels[i].x, boundaryPixels[i].y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 3. Layer 3 — Shoreline Vector with dynamic surf swell
      if (layerManager.isLayerVisible('layer-shoreline')) {
        const shorelinePixels = beach.shoreline.coordinates.map((coord) =>
          projectGeoToPixel({ longitude: coord[0], latitude: coord[1] }, width, height)
        );

        if (shorelinePixels.length > 1) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(shorelinePixels[0].x, shorelinePixels[0].y);
          for (let i = 1; i < shorelinePixels.length; i++) {
            const wave = Math.sin(waveAnimRef.current + i * 1.5) * 3;
            ctx.lineTo(shorelinePixels[i].x, shorelinePixels[i].y + wave);
          }
          ctx.stroke();

          // Foam wash line
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // 4. Layer 4 & 5 — Zones & Geofences
      if (layerManager.isLayerVisible('layer-zones') || layerManager.isLayerVisible('layer-restricted')) {
        beach.zones.forEach((zone) => {
          const isRestricted = zone.type === 'RESTRICTED';
          if (isRestricted && !layerManager.isLayerVisible('layer-restricted')) return;
          if (!isRestricted && !layerManager.isLayerVisible('layer-zones')) return;

          const polyCoords = zone.geometry.coordinates[0].map((coord) =>
            projectGeoToPixel({ longitude: coord[0], latitude: coord[1] }, width, height)
          );

          if (polyCoords.length > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(polyCoords[0].x, polyCoords[0].y);
            for (let i = 1; i < polyCoords.length; i++) {
              ctx.lineTo(polyCoords[i].x, polyCoords[i].y);
            }
            ctx.closePath();

            // Polygon Fill
            if (isRestricted) {
              ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
              ctx.fill();
              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = 2.5;
              ctx.setLineDash([6, 6]);
              ctx.stroke();
            } else {
              ctx.fillStyle = zone.color ? `${zone.color}22` : 'rgba(6, 182, 212, 0.15)';
              ctx.fill();
              ctx.strokeStyle = zone.color || '#06b6d4';
              ctx.lineWidth = 1.8;
              ctx.setLineDash([4, 4]);
              ctx.stroke();
            }

            // Zone Name Label
            const centerPt = polyCoords[0];
            ctx.fillStyle = isRestricted ? '#ef4444' : '#e2e8f0';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(
              `${isRestricted ? '🚫 ' : '🏊 '}${zone.name}`,
              centerPt.x + 8,
              centerPt.y + 18
            );
            ctx.restore();
          }
        });
      }

      // 5. Layer 6 — Spatial Hazards (Rip Current Seaward Vectors)
      if (layerManager.isLayerVisible('layer-hazards')) {
        const ripCenter = projectGeoToPixel({ latitude: beach.center.latitude - 0.0012, longitude: beach.center.longitude + 0.001 }, width, height);
        ctx.save();
        for (let r = 0; r < 3; r++) {
          const laneX = ripCenter.x + (r - 1) * 35 * zoom;
          const arrowAnim = (waveAnimRef.current * 25 + r * 30) % 80;
          const laneY = ripCenter.y + arrowAnim;

          ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(laneX, laneY);
          ctx.lineTo(laneX, laneY + 20 * zoom);
          ctx.stroke();

          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(laneX - 4, laneY + 14 * zoom);
          ctx.lineTo(laneX, laneY + 20 * zoom);
          ctx.lineTo(laneX + 4, laneY + 14 * zoom);
          ctx.fill();
        }
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('⚡ OFFSHORE RIP CHANNEL', ripCenter.x - 45, ripCenter.y + 95);
        ctx.restore();
      }

      // 6. Layer 7 — 4-Pillar Risk Heatmap Overlay
      if (layerManager.isLayerVisible('layer-risk-heat') && riskOverview) {
        beach.zones.forEach((zone) => {
          const za = riskOverview.zoneAssessments[zone.id];
          if (za && za.overallScore > 30) {
            const firstPt = projectGeoToPixel({ longitude: zone.geometry.coordinates[0][0][0], latitude: zone.geometry.coordinates[0][0][1] }, width, height);
            const heatRad = ctx.createRadialGradient(firstPt.x + 60, firstPt.y + 40, 10, firstPt.x + 60, firstPt.y + 40, 120 * zoom);
            const heatColor = za.overallScore > 70 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.25)';
            heatRad.addColorStop(0, heatColor);
            heatRad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = heatRad;
            ctx.fillRect(firstPt.x - 50, firstPt.y - 50, 220 * zoom, 180 * zoom);
          }
        });
      }

      // 7. Layer 8 — Live Geolocated Visitor GPS Dots
      if (layerManager.isLayerVisible('layer-visitors')) {
        visitors.forEach((v) => {
          const localX = v.position.x - 450; // map relative to center
          const localY = v.position.y - 250;
          const geoPt = CoordinateSystem.localToGeo({ x: localX, y: localY }, beach.center);
          const pixel = projectGeoToPixel(geoPt, width, height);

          const isDistressed = v.state === 'DISTRESS' || v.state === 'STRUGGLING';
          const isRestricted = v.state === 'IN_RESTRICTED_ZONE';

          if (isDistressed) {
            ctx.beginPath();
            ctx.arc(pixel.x, pixel.y, 8 + Math.sin(waveAnimRef.current * 4) * 3, 0, Math.PI * 2);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.arc(pixel.x, pixel.y, v.type === 'CHILD' ? 3 : 4.5, 0, Math.PI * 2);
          ctx.fillStyle = isDistressed ? '#dc2626' : isRestricted ? '#ef4444' : v.color || '#38bdf8';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }

      // 8. Layer 9 — Lifeguard Stations & Fleet
      if (layerManager.isLayerVisible('layer-lifeguards')) {
        beach.infrastructure.lifeguardStations.forEach((tower) => {
          const pos = projectGeoToPixel(tower.location, width, height);
          const radiusPix = (tower.coverageRadiusMeters / beach.dimensionsMeters.width) * (width * zoom);

          // Coverage circle
          ctx.save();
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, radiusPix, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.fillStyle = 'rgba(59, 130, 246, 0.05)';
          ctx.fill();

          // Tower Badge
          ctx.fillStyle = '#1e3a8a';
          ctx.fillRect(pos.x - 12, pos.y - 12, 24, 24);
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.strokeRect(pos.x - 12, pos.y - 12, 24, 24);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🛟', pos.x, pos.y + 4);

          ctx.fillStyle = '#93c5fd';
          ctx.font = 'bold 8px monospace';
          ctx.fillText(tower.id, pos.x, pos.y + 20);
          ctx.restore();
        });
      }

      // 9. Layer 10 — CCTV Cameras & Optical FOV Cones
      if (layerManager.isLayerVisible('layer-cctv')) {
        beach.infrastructure.cameras.forEach((cam) => {
          const pos = projectGeoToPixel(cam.location, width, height);
          const rangePix = (cam.rangeMeters / beach.dimensionsMeters.width) * (width * zoom);

          ctx.save();
          const startRad = ((cam.headingDegrees - cam.fovDegrees / 2) * Math.PI) / 180;
          const endRad = ((cam.headingDegrees + cam.fovDegrees / 2) * Math.PI) / 180;

          // FOV Wedge
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.arc(pos.x, pos.y, rangePix, startRad, endRad);
          ctx.closePath();
          ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Camera Icon
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#06b6d4';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(cam.id, pos.x, pos.y - 9);
          ctx.restore();
        });
      }

      // 10. Layer 11 — Emergency Points & Medical Bases
      if (layerManager.isLayerVisible('layer-emergency-points')) {
        beach.infrastructure.emergencyPoints.forEach((ep) => {
          const pos = projectGeoToPixel(ep.location, width, height);
          ctx.save();
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(ep.type === 'FIRST_AID' ? '✚ FA' : ep.type === 'BOAT_LAUNCH' ? '⛵ RAMP' : '⚡ AED', pos.x, pos.y - 8);
          ctx.restore();
        });
      }

      // 11. Layer 13 — Evacuation Routes & Assembly Points
      if (layerManager.isLayerVisible('layer-evac-routes')) {
        beach.evacuationRoutes.forEach((route) => {
          const pts = route.geometry.coordinates.map((coord) =>
            projectGeoToPixel({ longitude: coord[0], latitude: coord[1] }, width, height)
          );

          if (pts.length > 1) {
            ctx.save();
            ctx.strokeStyle = route.status === 'BLOCKED' ? '#ef4444' : '#10b981';
            ctx.lineWidth = route.status === 'RECOMMENDED' ? 3.5 : 2;
            ctx.setLineDash(route.status === 'BLOCKED' ? [6, 6] : [4, 4]);

            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
              ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.stroke();
            ctx.restore();
          }
        });

        // Assembly Points
        beach.assemblyPoints.forEach((ap) => {
          const pos = projectGeoToPixel(ap.location, width, height);
          ctx.save();
          ctx.fillStyle = '#065f46';
          ctx.fillRect(pos.x - 14, pos.y - 14, 28, 28);
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.strokeRect(pos.x - 14, pos.y - 14, 28, 28);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🏛️', pos.x, pos.y + 4);

          ctx.fillStyle = '#6ee7b7';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('MUSTER', pos.x, pos.y + 22);
          ctx.restore();
        });
      }

      // 12. Layer 14 — AI Predictive Geofence Contours
      if (layerManager.isLayerVisible('layer-prediction') && predictionState) {
        predictionState.alerts.forEach((alert, idx) => {
          const alertCenter = projectGeoToPixel({
            latitude: beach.center.latitude - 0.0008,
            longitude: beach.center.longitude - 0.0005 + idx * 0.002,
          }, width, height);

          ctx.save();
          ctx.beginPath();
          ctx.arc(alertCenter.x, alertCenter.y, 35 * zoom, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
          ctx.fill();
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();

          ctx.fillStyle = '#e9d5ff';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`+${alert.leadTimeToSpikeMinutes}m AI HAZARD`, alertCenter.x, alertCenter.y);
          ctx.restore();
        });
      }

      // Scale Bar & Coordinates HUD overlay
      ctx.save();
      // HUD Bottom Left: Scale Bar (100m)
      const scaleBarWidthPix = (100 / beach.dimensionsMeters.width) * (width * zoom);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(15, height - 45, 140, 32);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(15, height - 45, 140, 32);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(25, height - 24);
      ctx.lineTo(25 + Math.min(100, scaleBarWidthPix), height - 24);
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('100m SCALE', 25, height - 30);

      // HUD Top Right: Mouse Coordinates Readout
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(width - 210, 15, 195, 28);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(width - 210, 15, 195, 28);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '9px monospace';
      ctx.fillText(
        `GPS: ${mouseGeoCoord.latitude.toFixed(5)}°N, ${mouseGeoCoord.longitude.toFixed(5)}°E`,
        width - 200,
        32
      );
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [beach, layerManager, geofences, visitors, hazards, riskOverview, predictionState, zoom, panOffset, mouseGeoCoord, mapMode]);

  // Mouse pan/zoom handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pixelX = e.clientX - rect.left;
    const pixelY = e.clientY - rect.top;

    // Convert pixel to GeoPoint
    const scale = (canvas.width / beach.dimensionsMeters.width) * zoom;
    const localX = (pixelX - canvas.width / 2 - panOffset.x) / scale;
    const localY = (pixelY - canvas.height / 2 - panOffset.y) / scale;
    const geo = CoordinateSystem.localToGeo({ x: localX, y: localY }, beach.center);
    setMouseGeoCoord(geo);

    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoomIn = () => setZoom((prev) => Math.min(3.0, prev + 0.2));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.6, prev - 0.2));
  const handleResetView = () => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl">
      <canvas
        ref={canvasRef}
        width={850}
        height={520}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-auto block cursor-grab active:cursor-grabbing"
      />

      {/* Floating Map Navigation Controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-1.5 bg-slate-900/90 border border-slate-700/80 p-1.5 rounded-xl shadow-lg backdrop-blur-md">
        <button
          onClick={handleZoomIn}
          className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-sm flex items-center justify-center transition-colors"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-sm flex items-center justify-center transition-colors"
          title="Zoom Out"
        >
          -
        </button>
        <button
          onClick={handleResetView}
          className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center justify-center transition-colors"
          title="Reset View"
        >
          ⊙
        </button>
      </div>

      {/* Floating Map Mode Switcher (Vector vs Satellite) */}
      <div className="absolute top-4 right-4 flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 p-1 rounded-xl shadow-lg backdrop-blur-md">
        <button
          onClick={() => setMapMode('vector')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            mapMode === 'vector'
              ? 'bg-cyan-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <span>🗺️ Vector Map</span>
        </button>
        <button
          onClick={() => setMapMode('satellite')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            mapMode === 'satellite'
              ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <span>🛰️ Satellite Imagery</span>
        </button>
      </div>

      {/* Floating Zoom Indicator */}
      <div className="absolute bottom-4 right-4 bg-slate-900/80 border border-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-mono text-slate-300 backdrop-blur-md">
        Zoom: {(zoom * 100).toFixed(0)}%
      </div>
    </div>
  );
};
