'use client';

import React, { useEffect, useRef, useState } from 'react';
import { SimulationState, Visitor } from '@/lib/types';
import {
  Globe,
  Layers,
  Shield,
  HelpCircle,
  X,
  Waves,
  Eye,
  LifeBuoy,
  Plane,
  Activity,
  Crosshair,
  Flame,
} from 'lucide-react';

export type CanvasViewMode = 'tactical' | 'satellite' | 'heat' | 'sat_heat';
export type SatelliteBand = 'RGB_TRUE_COLOR' | 'NDWI_TURBIDITY' | 'BATHYMETRY';

interface BeachCanvasProps {
  state: SimulationState | null;
  onSelectVisitor?: (visitor: Visitor | null) => void;
}

export const BeachCanvas: React.FC<BeachCanvasProps> = ({ state, onSelectVisitor }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedVis, setSelectedVis] = useState<Visitor | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const wavePhaseRef = useRef<number>(0);

  // View mode & layer visibility toggles
  const [viewMode, setViewMode] = useState<CanvasViewMode>('tactical');
  const [satelliteBand, setSatelliteBand] = useState<SatelliteBand>('RGB_TRUE_COLOR');
  const [showRipStreamlines, setShowRipStreamlines] = useState<boolean>(true);
  const [showZones, setShowZones] = useState<boolean>(true);
  const [showAssets, setShowAssets] = useState<boolean>(true);
  const [showLegend, setShowLegend] = useState<boolean>(false);

  // Keep references for 60 FPS animation loop
  const viewModeRef = useRef<CanvasViewMode>(viewMode);
  const satelliteBandRef = useRef<SatelliteBand>(satelliteBand);
  const showRipStreamlinesRef = useRef<boolean>(showRipStreamlines);
  const showZonesRef = useRef<boolean>(showZones);
  const showAssetsRef = useRef<boolean>(showAssets);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    satelliteBandRef.current = satelliteBand;
  }, [satelliteBand]);

  useEffect(() => {
    showRipStreamlinesRef.current = showRipStreamlines;
  }, [showRipStreamlines]);

  useEffect(() => {
    showZonesRef.current = showZones;
  }, [showZones]);

  useEffect(() => {
    showAssetsRef.current = showAssets;
  }, [showAssets]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isSubscribed = true;

    const render = () => {
      if (!isSubscribed) return;
      wavePhaseRef.current += 0.04;

      const width = canvas.width;
      const height = canvas.height;
      const currentMode = viewModeRef.current;
      const currentBand = satelliteBandRef.current;
      const streamlinesOn = showRipStreamlinesRef.current;
      const zonesOn = showZonesRef.current;
      const assetsOn = showAssetsRef.current;

      // Coordinate scaling
      // Beach model: X from 0 to 1000m, Y from -40m (dry sand) to +160m (deep offshore)
      const scaleX = (x: number) => (x / 1000) * width;
      const scaleY = (y: number) => {
        const norm = (y + 40) / 200;
        return height - norm * height;
      };

      const tideShift = state ? (state.environment.tide_level_m - 1.0) * 12 : 0;
      const shorelineY = scaleY(0) + tideShift;

      // =========================================================================
      // 1. BASE BACKGROUND: TACTICAL VECTOR VS. SATELLITE OPTICAL RECON
      // =========================================================================
      if (currentMode === 'satellite' || currentMode === 'sat_heat') {
        // --- 1.1 SATELLITE OCEAN WATER BASE ---
        const satOcean = ctx.createLinearGradient(0, 0, 0, shorelineY);
        if (currentBand === 'RGB_TRUE_COLOR') {
          satOcean.addColorStop(0.0, '#082f49'); // Oceanic Bay of Bengal (deep abyss)
          satOcean.addColorStop(0.3, '#0c4a6e'); // Deep outer cove
          satOcean.addColorStop(0.55, '#075985'); // Mid-cove continental shelf
          satOcean.addColorStop(0.78, '#0369a1'); // Nearshore azure
          satOcean.addColorStop(0.92, '#0284c7'); // Shallow turquoise
          satOcean.addColorStop(1.0, '#38bdf8'); // Swash turquoise surf
        } else if (currentBand === 'NDWI_TURBIDITY') {
          satOcean.addColorStop(0.0, '#020617'); // Dark deep water absorption
          satOcean.addColorStop(0.35, '#042f2e');
          satOcean.addColorStop(0.75, '#083344');
          satOcean.addColorStop(1.0, '#06b6d4'); // Turbid shallow water
        } else {
          // BATHYMETRY
          satOcean.addColorStop(0.0, '#020617'); // >10m deep
          satOcean.addColorStop(0.3, '#1e1b4b'); // 3.8m deep trench
          satOcean.addColorStop(0.55, '#2563eb'); // 2.5m shelf
          satOcean.addColorStop(0.8, '#06b6d4'); // 1.5m shallow
          satOcean.addColorStop(1.0, '#14b8a6'); // 0.8m sandbar shallows
        }
        ctx.fillStyle = satOcean;
        ctx.fillRect(0, 0, width, shorelineY);

        // --- 1.2 SUN GLITTER & WATER CAUSTICS ---
        if (currentBand === 'RGB_TRUE_COLOR') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          for (let i = 0; i < 35; i++) {
            const cx = (Math.sin(i * 11.7 + wavePhaseRef.current * 0.4) * 0.5 + 0.5) * width;
            const cy = (Math.cos(i * 8.3) * 0.5 + 0.5) * (shorelineY - 20);
            ctx.beginPath();
            ctx.ellipse(cx, cy, 32, 10, 0.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // --- 1.3 SUBMERGED BASALTIC REEF OUTCROPS (North Headland / Promontory) ---
        ctx.fillStyle = currentBand === 'NDWI_TURBIDITY' ? 'rgba(34, 211, 238, 0.35)' : 'rgba(28, 25, 23, 0.65)';
        ctx.beginPath();
        ctx.ellipse(scaleX(90), scaleY(70), 80, 32, -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(scaleX(170), scaleY(45), 70, 26, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // --- 1.4 SUBMERGED RIP CURRENT OUTFLOW TRENCH (Zone B: 300m - 550m) ---
        const ripTrench = ctx.createLinearGradient(scaleX(350), shorelineY, scaleX(480), scaleY(120));
        if (currentBand === 'NDWI_TURBIDITY') {
          ripTrench.addColorStop(0, 'rgba(6, 182, 212, 0.8)');
          ripTrench.addColorStop(0.5, 'rgba(34, 211, 238, 0.9)');
          ripTrench.addColorStop(1, 'rgba(244, 63, 94, 0.6)');
        } else if (currentBand === 'BATHYMETRY') {
          ripTrench.addColorStop(0, 'rgba(30, 27, 75, 0.9)');
          ripTrench.addColorStop(0.5, 'rgba(15, 23, 42, 0.98)');
          ripTrench.addColorStop(1, 'rgba(2, 6, 23, 1)');
        } else {
          ripTrench.addColorStop(0, 'rgba(8, 47, 73, 0.7)');
          ripTrench.addColorStop(0.5, 'rgba(3, 105, 161, 0.5)');
          ripTrench.addColorStop(1, 'rgba(12, 74, 110, 0.35)');
        }
        ctx.fillStyle = ripTrench;
        ctx.beginPath();
        ctx.moveTo(scaleX(320), shorelineY);
        ctx.bezierCurveTo(scaleX(360), scaleY(40), scaleX(400), scaleY(90), scaleX(450), 0);
        ctx.lineTo(scaleX(540), 0);
        ctx.bezierCurveTo(scaleX(490), scaleY(90), scaleX(460), scaleY(40), scaleX(440), shorelineY);
        ctx.closePath();
        ctx.fill();

        // --- 1.5 GOLDEN BLUE FLAG SAND & WET SWASH SHORE ---
        const satSand = ctx.createLinearGradient(0, shorelineY, 0, height);
        satSand.addColorStop(0.0, '#9c6644'); // Wet swash sand
        satSand.addColorStop(0.12, '#f5d0a9'); // Golden fine sand
        satSand.addColorStop(0.45, '#e7e5e4'); // Dune berm
        satSand.addColorStop(0.75, '#78716c'); // Upper bank
        satSand.addColorStop(1.0, '#57534e'); // Hinterland
        ctx.fillStyle = satSand;
        ctx.fillRect(0, shorelineY, width, height - shorelineY);

        // Wet sand reflection sheen
        ctx.fillStyle = 'rgba(186, 230, 253, 0.25)';
        ctx.fillRect(0, shorelineY - 10, width, 16);

        // --- 1.6 COASTAL PROMENADE & PALM BERM (Canvas Bottom) ---
        ctx.fillStyle = '#27272a';
        ctx.fillRect(0, height - 38, width, 18);
        ctx.strokeStyle = '#e4e4e7';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(0, height - 29);
        ctx.lineTo(width, height - 29);
        ctx.stroke();
        ctx.setLineDash([]);

        // Palm trees along promenade
        for (let px = 45; px < width; px += 85) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.beginPath();
          ctx.ellipse(px + 3, height - 24 + 3, 7, 3.5, 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.arc(px, height - 24, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(px - 1, height - 25, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // --- 1.7 SATELLITE HUD OVERLAY ---
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(10, 10, 310, 26);
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1;
        ctx.strokeRect(10, 10, 310, 26);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`🛰️ SENTINEL-2 / LANDSAT-9 MSI RECON`, 18, 26);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(width - 240, 10, 230, 26);
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = 1;
        ctx.strokeRect(width - 240, 10, 230, 26);

        ctx.fillStyle = '#bae6fd';
        ctx.font = '10px monospace';
        ctx.fillText(`17°46'46.2"N 83°23'18.6"E`, width - 230, 26);

        // True North Compass Reticle
        const ncx = width - 30;
        const ncy = 65;
        ctx.beginPath();
        ctx.arc(ncx, ncy, 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(ncx, ncy - 11);
        ctx.lineTo(ncx + 4, ncy + 3);
        ctx.lineTo(ncx, ncy);
        ctx.lineTo(ncx - 4, ncy + 3);
        ctx.closePath();
        ctx.fillStyle = '#ef4444';
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('N', ncx - 3, ncy - 13);
      } else {
        // --- 1.1 TACTICAL VECTOR OCEAN ---
        const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
        oceanGrad.addColorStop(0, '#0a2540');
        oceanGrad.addColorStop(0.35, '#0e4166');
        oceanGrad.addColorStop(0.65, '#19769f');
        oceanGrad.addColorStop(0.82, '#38a3a5');
        oceanGrad.addColorStop(0.88, '#80ced7');
        oceanGrad.addColorStop(0.92, '#e9d8a6');
        oceanGrad.addColorStop(1.0, '#ee9b00');
        ctx.fillStyle = oceanGrad;
        ctx.fillRect(0, 0, width, height);

        // --- 1.2 TACTICAL SAND BEACH ---
        const sandGrad = ctx.createLinearGradient(0, shorelineY, 0, height);
        sandGrad.addColorStop(0, '#e9d8a6');
        sandGrad.addColorStop(0.3, '#ee9b00');
        sandGrad.addColorStop(1, '#ca6702');
        ctx.fillStyle = sandGrad;
        ctx.fillRect(0, shorelineY, width, height - shorelineY);
      }

      // Shoreline Wet Sand / Swash Foam Line (Both modes)
      ctx.beginPath();
      ctx.moveTo(0, shorelineY);
      for (let x = 0; x <= width; x += 10) {
        const waveOffset = Math.sin(x * 0.02 + wavePhaseRef.current * 1.5) * 6;
        ctx.lineTo(x, shorelineY + waveOffset);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.fillStyle = currentMode === 'satellite' ? 'rgba(245, 208, 169, 0.3)' : 'rgba(238, 155, 0, 0.4)';
      ctx.fill();

      // Frothy Wave Shorebreak
      ctx.beginPath();
      ctx.moveTo(0, shorelineY);
      for (let x = 0; x <= width; x += 10) {
        const waveOffset = Math.sin(x * 0.02 + wavePhaseRef.current * 1.5) * 6;
        ctx.lineTo(x, shorelineY + waveOffset);
      }
      ctx.strokeStyle = currentMode === 'satellite' || currentMode === 'sat_heat' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = currentMode === 'satellite' || currentMode === 'sat_heat' ? 3.5 : 3;
      ctx.stroke();

      // Dynamic Safety Risk Heatmap Layer (Active in 'heat' and 'sat_heat' modes)
      if ((currentMode === 'heat' || currentMode === 'sat_heat') && state) {
        ctx.save();
        state.beach.zones.forEach((z) => {
          const zx = scaleX(z.x_min);
          const zw = scaleX(z.x_max) - zx;
          const zy = scaleY(z.y_max);
          const zh = scaleY(z.y_min) - zy;
          const cx = zx + zw / 2;
          const cy = zy + zh / 2;
          const rad = Math.max(zw, zh) * 0.72 + Math.sin(wavePhaseRef.current * 2) * 8;

          const score = z.current_risk_score ?? 15;
          let colInner = 'rgba(34, 197, 94, 0.4)';
          if (score >= 75) colInner = 'rgba(239, 68, 68, 0.68)';
          else if (score >= 50) colInner = 'rgba(249, 115, 22, 0.55)';
          else if (score >= 25) colInner = 'rgba(234, 179, 8, 0.46)';

          const hGrad = ctx.createRadialGradient(cx, cy, 15, cx, cy, rad);
          hGrad.addColorStop(0, colInner);
          hGrad.addColorStop(0.65, colInner.replace(/[\d\.]+\)$/, '0.18)'));
          hGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = hGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      // 3. Draw Breaking Wave Crests in Ocean
      const waveCount = 5;
      for (let i = 1; i <= waveCount; i++) {
        const wy = scaleY(i * 28) + Math.sin(wavePhaseRef.current + i) * 4;
        ctx.beginPath();
        ctx.moveTo(0, wy);
        for (let x = 0; x <= width; x += 15) {
          const crest = Math.sin(x * 0.015 + wavePhaseRef.current * (1 + i * 0.2)) * (3 + (state?.environment.wave_height_m || 1.0) * 2);
          ctx.lineTo(x, wy + crest);
        }
        ctx.strokeStyle = currentMode === 'satellite'
          ? `rgba(255, 255, 255, ${0.25 + (i / waveCount) * 0.35})`
          : `rgba(255, 255, 255, ${0.15 + (i / waveCount) * 0.25})`;
        ctx.lineWidth = currentMode === 'satellite' ? 2.5 : 2;
        ctx.stroke();
      }

      // 4. Draw Rip Current Channel Flow Dynamics in Zone B (300m - 550m)
      if (streamlinesOn && state && state.environment.rip_current_speed_mps > 0.2) {
        const ripX1 = scaleX(300);
        const ripX2 = scaleX(550);
        const ripCenterX = scaleX(425);
        const ripSpeed = state.environment.rip_current_speed_mps;

        // Rip Channel Gradient highlight
        const ripGrad = ctx.createRadialGradient(ripCenterX, scaleY(60), 10, ripCenterX, scaleY(60), (ripX2 - ripX1) * 0.6);
        ripGrad.addColorStop(0, `rgba(220, 38, 38, ${Math.min(0.35, ripSpeed * 0.35)})`);
        ripGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
        ctx.fillStyle = ripGrad;
        ctx.fillRect(ripX1, scaleY(140), ripX2 - ripX1, scaleY(-20) - scaleY(140));

        // Animated Rip Streamlines (Vectors pulling seaward / Upwards)
        ctx.lineWidth = 1.5;
        for (let j = 0; j < 8; j++) {
          const laneX = ripX1 + ((j + 0.5) / 8) * (ripX2 - ripX1);
          const phaseOffset = (wavePhaseRef.current * ripSpeed * 4 + j * 0.8) % 1;
          const arrowY = scaleY(10) - phaseOffset * (scaleY(10) - scaleY(120));

          ctx.beginPath();
          ctx.moveTo(laneX, arrowY + 15);
          ctx.lineTo(laneX, arrowY);
          ctx.strokeStyle = ripSpeed > 0.5 ? 'rgba(239, 68, 68, 0.85)' : 'rgba(245, 158, 11, 0.7)';
          ctx.stroke();

          // Arrow tip
          ctx.beginPath();
          ctx.moveTo(laneX - 3, arrowY + 4);
          ctx.lineTo(laneX, arrowY);
          ctx.lineTo(laneX + 3, arrowY + 4);
          ctx.fillStyle = ripSpeed > 0.5 ? '#ef4444' : '#f59e0b';
          ctx.fill();
        }

        // Rip Neck Label
        ctx.fillStyle = ripSpeed > 0.5 ? '#ef4444' : '#fbbf24';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`⚡ ACTIVE RIP CURRENT: ${ripSpeed.toFixed(2)} m/s`, ripX1 + 10, scaleY(75));
      }

      // 5. Draw Zones & Boundaries
      if (zonesOn && state && state.beach.zones) {
        state.beach.zones.forEach((zone) => {
          const zx1 = scaleX(zone.x_min);
          const zx2 = scaleX(zone.x_max);
          const zyTop = scaleY(zone.y_max);
          const zyBottom = scaleY(zone.y_min);

          // Zone boundary divider line
          ctx.beginPath();
          ctx.setLineDash([4, 4]);
          ctx.moveTo(zx2, zyTop);
          ctx.lineTo(zx2, zyBottom);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.setLineDash([]);

          // Zone Header & Flag
          const flagColorMap: Record<string, string> = {
            GREEN: '#10b981',
            YELLOW: '#f59e0b',
            RED: '#ef4444',
            DOUBLE_RED: '#b91c1c',
          };
          const fColor = flagColorMap[zone.flag_status] || '#10b981';

          // Zone Tag Box
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(zx1 + 8, 8, zx2 - zx1 - 16, 26);
          ctx.strokeStyle = fColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(zx1 + 8, 8, zx2 - zx1 - 16, 26);

          // Flag Icon
          ctx.fillStyle = fColor;
          ctx.fillRect(zx1 + 14, 13, 10, 8);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(zx1 + 13, 13, 2, 16); // pole

          // Zone Name
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(zone.name.split(' - ')[0], zx1 + 30, 25);

          // Risk rating badge
          const riskMeta = state.risk_assessments[zone.id];
          if (riskMeta) {
            ctx.fillStyle = fColor;
            ctx.font = '10px monospace';
            ctx.fillText(`Risk: ${(riskMeta.total_risk_score * 100).toFixed(0)}%`, zx2 - 75, 25);
          }
        });
      }

      // 6. Draw Fixed Infrastructure (Towers, Warning Boards, PA, Cameras)
      if (state && state.beach) {
        // Warning Boards
        state.beach.warning_boards.forEach((board) => {
          const bx = scaleX(board.location_x);
          const by = scaleY(board.location_y);

          ctx.fillStyle = '#1e293b';
          ctx.fillRect(bx - 12, by - 12, 24, 16);
          ctx.strokeStyle = board.flag_color === 'RED' ? '#ef4444' : '#e2e8f0';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bx - 12, by - 12, 24, 16);

          ctx.fillStyle = board.flag_color === 'RED' ? '#ef4444' : board.flag_color === 'YELLOW' ? '#f59e0b' : '#10b981';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('LED', bx - 7, by);

          // Strobe blink
          if (board.strobe_active && Math.sin(wavePhaseRef.current * 10) > 0) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(bx, by - 16, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // PA Speaker Towers
        state.beach.pa_systems.forEach((pa) => {
          const px = scaleX(pa.location_x);
          const py = scaleY(pa.location_y);

          // Pole
          ctx.fillStyle = '#64748b';
          ctx.fillRect(px - 2, py - 18, 4, 18);

          // Speaker horn
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.moveTo(px, py - 18);
          ctx.lineTo(px - 8, py - 24);
          ctx.lineTo(px - 8, py - 12);
          ctx.closePath();
          ctx.fill();

          // Sound wave arcs if broadcasting
          if (pa.is_broadcasting) {
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
            ctx.lineWidth = 1.5;
            for (let r = 8; r <= 22; r += 7) {
              const arcPhase = (wavePhaseRef.current * 4 + r) % 24;
              ctx.beginPath();
              ctx.arc(px, py - 18, arcPhase, -Math.PI / 3, Math.PI / 3);
              ctx.stroke();
            }
          }
        });
      }

      // 7. Draw Lifeguards & Response Vectors
      if (assetsOn && state && state.beach.lifeguards) {
        state.beach.lifeguards.forEach((lg) => {
          const lx = scaleX(lg.current_x);
          const ly = scaleY(lg.current_y);

          // Lifeguard target path line if dispatched
          if (lg.status === 'DISPATCHED' && lg.target_x !== undefined && lg.target_y !== undefined) {
            ctx.beginPath();
            ctx.setLineDash([3, 3]);
            ctx.moveTo(lx, ly);
            ctx.lineTo(scaleX(lg.target_x), scaleY(lg.target_y));
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Lifeguard Avatar
          ctx.beginPath();
          ctx.arc(lx, ly, 6, 0, Math.PI * 2);
          ctx.fillStyle = lg.status === 'ON_SCENE' ? '#ef4444' : lg.status === 'DISPATCHED' ? '#f59e0b' : '#3b82f6';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Badge
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText(`🏊 ${lg.id}`, lx - 14, ly + 14);
        });
      }

      // 8. Draw Autonomous Drones & Aerial Search Cones
      if (assetsOn && state && state.beach.drones) {
        state.beach.drones.forEach((drone) => {
          const dx = scaleX(drone.current_x);
          const dy = scaleY(drone.current_y);

          // Drone field-of-view cone illumination
          const coneGrad = ctx.createRadialGradient(dx, dy, 2, dx, dy, 40);
          coneGrad.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
          coneGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
          ctx.fillStyle = coneGrad;
          ctx.beginPath();
          ctx.arc(dx, dy, 40, 0, Math.PI * 2);
          ctx.fill();

          // Drone target path
          if (drone.status === 'DISPATCHED' && drone.target_x !== undefined && drone.target_y !== undefined) {
            ctx.beginPath();
            ctx.setLineDash([2, 4]);
            ctx.moveTo(dx, dy);
            ctx.lineTo(scaleX(drone.target_x), scaleY(drone.target_y));
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Quadcopter Crosshair
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.strokeRect(dx - 6, dy - 6, 12, 12);
          ctx.beginPath();
          ctx.moveTo(dx - 10, dy);
          ctx.lineTo(dx + 10, dy);
          ctx.moveTo(dx, dy - 10);
          ctx.lineTo(dx, dy + 10);
          ctx.stroke();

          // Drone Label & Battery
          ctx.fillStyle = '#e0f2fe';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`🛸 ${drone.id} (${(drone.battery_pct ?? 100).toFixed(0)}%)`, dx - 24, dy - 10);
        });
      }

      // 9. Draw Visitors with Distress States
      if (state && state.visitors) {
        state.visitors.forEach((v) => {
          const vx = scaleX(v.x);
          const vy = scaleY(v.y);

          // Distress Animations
          if (v.distress_state === 'DROWNING_ACTIVE' || v.distress_state === 'DROWNING_PASSIVE') {
            const pulseR = 8 + (Math.sin(wavePhaseRef.current * 8) + 1) * 8;
            ctx.beginPath();
            ctx.arc(vx, vy, pulseR, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText(`🚨 SOS ${v.id}`, vx + 10, vy);
          } else if (v.distress_state === 'STRUGGLING') {
            const pulseR = 6 + (Math.sin(wavePhaseRef.current * 5) + 1) * 5;
            ctx.beginPath();
            ctx.arc(vx, vy, pulseR, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(249, 115, 22, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#f97316';
            ctx.font = '9px sans-serif';
            ctx.fillText(`⚠️ ${v.id}`, vx + 8, vy);
          } else if (v.distress_state === 'TIRED') {
            ctx.beginPath();
            ctx.arc(vx, vy, 8, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(234, 179, 8, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else if (v.distress_state === 'RESCUED') {
            ctx.beginPath();
            ctx.arc(vx, vy, 7, 0, Math.PI * 2);
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }

          // Visitor Core Dot
          ctx.beginPath();
          ctx.arc(vx, vy, 4, 0, Math.PI * 2);
          if (v.distress_state === 'DROWNING_ACTIVE') {
            ctx.fillStyle = '#dc2626';
          } else if (v.distress_state === 'STRUGGLING') {
            ctx.fillStyle = '#ea580c';
          } else if (v.distress_state === 'TIRED') {
            ctx.fillStyle = '#ca8a04';
          } else if (v.distress_state === 'RESCUED') {
            ctx.fillStyle = '#0891b2';
          } else if (v.y < 0) {
            ctx.fillStyle = '#1e293b';
          } else {
            ctx.fillStyle = '#0284c7';
          }
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }

      // 10. Draw Bottom Beach Coordinate Scale / HUD
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, height - 20, width, 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText('SHORELINE (0m)', 10, height - 6);
      ctx.fillText('ZONE A (0-300m)', scaleX(100), height - 6);
      ctx.fillText('ZONE B: RIP CHANNEL (300-550m)', scaleX(340), height - 6);
      ctx.fillText('ZONE C (550-800m)', scaleX(610), height - 6);
      ctx.fillText('ZONE D: RESTRICTED (800-1000m)', scaleX(820), height - 6);

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isSubscribed = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [state]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!state || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 1000;
    const normY = 1 - (e.clientY - rect.top) / rect.height;
    const clickY = normY * 200 - 40;

    let nearest: Visitor | null = null;
    let minDist = 30.0;
    state.visitors.forEach((v) => {
      const d = Math.hypot(v.x - clickX, v.y - clickY);
      if (d < minDist) {
        minDist = d;
        nearest = v;
      }
    });

    setSelectedVis(nearest);
    if (onSelectVisitor) onSelectVisitor(nearest);
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl">
      {/* Top Floating Control Dock: View Switcher, Spectral Bands, & Layer Toggles */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: View Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 shadow-lg backdrop-blur-md pointer-events-auto text-xs font-mono">
          <button
            onClick={() => setViewMode('tactical')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              viewMode === 'tactical'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black ring-1 ring-cyan-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>🗺️ Tactical Vector</span>
          </button>

          <button
            onClick={() => setViewMode('satellite')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              viewMode === 'satellite'
                ? 'bg-blue-600 text-white shadow-md font-black ring-1 ring-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-300" />
            <span>🛰️ Satellite View</span>
          </button>

          <button
            onClick={() => setViewMode('heat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              viewMode === 'heat'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black ring-1 ring-amber-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>🔥 Risk Heatmap</span>
          </button>

          <button
            onClick={() => setViewMode('sat_heat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              viewMode === 'sat_heat'
                ? 'bg-purple-600 text-white shadow-md font-black ring-1 ring-purple-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-300" />
            <span>🛰️+🔥 Sat + Heat</span>
          </button>
        </div>

        {/* Right: Layer Toggles & Map Guide */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 shadow-lg backdrop-blur-md pointer-events-auto text-xs font-mono">
          <button
            onClick={() => setShowRipStreamlines(!showRipStreamlines)}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              showRipStreamlines ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Toggle Hydrodynamic Feeder & Rip Streamlines"
          >
            ⚡ Rip Flow
          </button>

          <button
            onClick={() => setShowZones(!showZones)}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              showZones ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Toggle Zone Safety Geofences"
          >
            🚩 Zones
          </button>

          <button
            onClick={() => setShowAssets(!showAssets)}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              showAssets ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Toggle Drone & Lifeguard Fleet"
          >
            🛸 Assets
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

      {/* Floating Satellite Spectral Band Selector when Satellite View is Active */}
      {(viewMode === 'satellite' || viewMode === 'sat_heat') && (
        <div className="absolute top-14 left-2.5 z-20 flex items-center gap-1 bg-slate-900/95 p-1 rounded-xl border border-blue-500/50 shadow-xl backdrop-blur-md text-xs font-mono">
          <span className="text-[10px] text-blue-300 font-bold px-1.5">SPECTRAL BAND:</span>
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
            🌊 NDWI Rip Turbidity
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

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={1000}
        height={460}
        onClick={handleCanvasClick}
        className="w-full h-auto cursor-crosshair block"
      />

      {/* Interactive Telemetry Card for Clicked Swimmer */}
      {selectedVis && (
        <div className="absolute bottom-10 right-4 bg-slate-900/95 border border-cyan-500/50 backdrop-blur-md rounded-lg p-3 text-xs text-slate-200 shadow-xl max-w-xs animate-in fade-in z-20">
          <div className="flex justify-between items-center mb-1.5 border-b border-slate-700 pb-1">
            <span className="font-bold text-cyan-400">Visitor Telemetry: {selectedVis.id}</span>
            <button
              onClick={() => setSelectedVis(null)}
              className="text-slate-400 hover:text-white ml-2 text-sm"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1 font-mono">
            <div>Zone: <span className="text-white">{selectedVis.current_zone_id}</span></div>
            <div>Position: <span className="text-white">X:{selectedVis.x?.toFixed(1) ?? '--'}m, Y:{selectedVis.y?.toFixed(1) ?? '--'}m</span></div>
            <div>Status: <span className="text-white">{selectedVis.swimming_status}</span></div>
            <div>Distress: <span className={selectedVis.distress_state !== 'NONE' ? 'text-red-400 font-bold' : 'text-emerald-400'}>{selectedVis.distress_state}</span></div>
            <div>Stamina: <span className="text-amber-400">{selectedVis.stamina?.toFixed(0) ?? '--'}%</span></div>
            <div>Skill: <span className="text-slate-300">{selectedVis.skill}</span></div>
          </div>
        </div>
      )}

      {/* Interactive Map Legend Modal */}
      {showLegend && (
        <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-lg p-4 flex flex-col justify-between overflow-y-auto text-left animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Digital Beach Simulation Map Legend & Guide
              </h3>
            </div>
            <button
              onClick={() => setShowLegend(false)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs flex-1">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
              <span className="font-bold text-cyan-300 block text-[11px] uppercase border-b border-slate-800 pb-1">
                👤 Bather States
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-sky-400 inline-block shrink-0" />
                  <span><strong>UNAWARE</strong> (Recreating)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 inline-block shrink-0" />
                  <span><strong className="text-amber-300">TIRED</strong> (Stamina &lt;40%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500 inline-block shrink-0" />
                  <span><strong className="text-orange-400">STRUGGLING</strong> (Current pull)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping inline-block shrink-0" />
                  <span><strong className="text-rose-400">SOS DROWNING</strong> (Critical)</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
              <span className="font-bold text-yellow-300 block text-[11px] uppercase border-b border-slate-800 pb-1">
                🛰️ Satellite View Modes
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-blue-600 shrink-0" />
                  <span><strong>True Color</strong> (Photorealistic)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-cyan-400 shrink-0" />
                  <span><strong>NDWI Turbidity</strong> (Rip Plumes)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-indigo-600 shrink-0" />
                  <span><strong>Bathymetric Depths</strong> (Trenches)</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
              <span className="font-bold text-rose-300 block text-[11px] uppercase border-b border-slate-800 pb-1">
                🚨 Emergency Responders
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                  <span><strong>Lifeguard Squad</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Plane className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span><strong>Autonomous Drone (UAV)</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 border border-dashed border-sky-400 shrink-0" />
                  <span><strong>Search & Rescue Vectors</strong></span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
              <span className="font-bold text-amber-300 block text-[11px] uppercase border-b border-slate-800 pb-1">
                🚩 Safety Flags & Hazards
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-emerald-500 shrink-0" />
                  <span><strong>Green Flag</strong> (Safe)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-amber-500 shrink-0" />
                  <span><strong>Yellow Flag</strong> (Caution)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-rose-500 shrink-0" />
                  <span><strong>Red Flag</strong> (Prohibited)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold text-sm leading-none shrink-0">⚡</span>
                  <span><strong>Active Rip Current Flow</strong></span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-800 text-[11px] text-slate-400">
            <span>Click any swimmer dot to inspect individual coordinates, kinematics, and stamina.</span>
            <button
              onClick={() => setShowLegend(false)}
              className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 text-slate-950 rounded-lg font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
