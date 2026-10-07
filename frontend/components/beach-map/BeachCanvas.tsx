'use client';

import React, { useEffect, useRef, useState } from 'react';
import { SimulationState, Visitor } from '@/lib/types';

interface BeachCanvasProps {
  state: SimulationState | null;
  onSelectVisitor?: (visitor: Visitor | null) => void;
}

export const BeachCanvas: React.FC<BeachCanvasProps> = ({ state, onSelectVisitor }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedVis, setSelectedVis] = useState<Visitor | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const wavePhaseRef = useRef<number>(0);

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

      // Coordinate scaling
      // Beach model: X from 0 to 1000m, Y from -40m (dry sand) to +160m (deep offshore)
      const scaleX = (x: number) => (x / 1000) * width;
      const scaleY = (y: number) => {
        const norm = (y + 40) / 200;
        return height - norm * height;
      };

      // 1. Draw Deep Ocean Background
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

      // 2. Sand Beach Ground
      const tideShift = state ? (state.environment.tide_level_m - 1.0) * 12 : 0;
      const shorelineY = scaleY(0) + tideShift;

      const sandGrad = ctx.createLinearGradient(0, shorelineY, 0, height);
      sandGrad.addColorStop(0, '#e9d8a6');
      sandGrad.addColorStop(0.3, '#ee9b00');
      sandGrad.addColorStop(1, '#ca6702');
      ctx.fillStyle = sandGrad;
      ctx.fillRect(0, shorelineY, width, height - shorelineY);

      // Shoreline Wet Sand / Swash Foam Line
      ctx.beginPath();
      ctx.moveTo(0, shorelineY);
      for (let x = 0; x <= width; x += 10) {
        const waveOffset = Math.sin(x * 0.02 + wavePhaseRef.current * 1.5) * 6;
        ctx.lineTo(x, shorelineY + waveOffset);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.fillStyle = 'rgba(238, 155, 0, 0.4)';
      ctx.fill();

      // Frothy Wave Shorebreak
      ctx.beginPath();
      ctx.moveTo(0, shorelineY);
      for (let x = 0; x <= width; x += 10) {
        const waveOffset = Math.sin(x * 0.02 + wavePhaseRef.current * 1.5) * 6;
        ctx.lineTo(x, shorelineY + waveOffset);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 3;
      ctx.stroke();

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
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + (i / waveCount) * 0.25})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 4. Draw Rip Current Channel Flow Dynamics in Zone B (300m - 550m)
      if (state && state.environment.rip_current_speed_mps > 0.2) {
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
      if (state && state.beach.zones) {
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
      if (state && state.beach.lifeguards) {
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
      if (state && state.beach.drones) {
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
          ctx.fillText(`🛸 ${drone.id} (${drone.battery_pct.toFixed(0)}%)`, dx - 24, dy - 10);
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
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(0, height - 22, width, 22);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText('SHORELINE (0m)', 10, height - 8);
      ctx.fillText('ZONE A (0-300m)', scaleX(100), height - 8);
      ctx.fillText('ZONE B: RIP CHANNEL (300-550m)', scaleX(340), height - 8);
      ctx.fillText('ZONE C (550-800m)', scaleX(610), height - 8);
      ctx.fillText('ZONE D: RESTRICTED (800-1000m)', scaleX(820), height - 8);

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
      <canvas
        ref={canvasRef}
        width={1000}
        height={460}
        onClick={handleCanvasClick}
        className="w-full h-auto cursor-crosshair block"
      />
      {selectedVis && (
        <div className="absolute bottom-10 right-4 bg-slate-900/95 border border-cyan-500/50 backdrop-blur-md rounded-lg p-3 text-xs text-slate-200 shadow-xl max-w-xs animate-in fade-in">
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
            <div>Position: <span className="text-white">X:{selectedVis.x.toFixed(1)}m, Y:{selectedVis.y.toFixed(1)}m</span></div>
            <div>Status: <span className="text-white">{selectedVis.swimming_status}</span></div>
            <div>Distress: <span className={selectedVis.distress_state !== 'NONE' ? 'text-red-400 font-bold' : 'text-emerald-400'}>{selectedVis.distress_state}</span></div>
            <div>Stamina: <span className="text-amber-400">{selectedVis.stamina.toFixed(0)}%</span></div>
            <div>Skill: <span className="text-slate-300">{selectedVis.skill}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};
