import { Beach, Environment } from '../../models/Beach';
import { Hazard } from '../../models/Hazard';
import { ImpactLabSimulationState } from '../../models/Beach';

/**
 * TacticalCanvasRenderer.ts
 * 
 * Provides photorealistic, high-fidelity procedural rendering for the Tactical Digital Twin,
 * Hydrodynamic CFD vector fields, Bathymetric depth isobaths, and on-canvas Forecast HUD.
 * 
 * Complies strictly with user requirement:
 * - Leaves Satellite Recon ('satellite') and Thermal FLIR ('thermal') screens 100% untouched.
 * - Elevates the Tactical, Hydrodynamic, and Heat screens to match the high-end graphics from the reference imagery.
 */

export class TacticalCanvasRenderer {
  /**
   * 1. High-Fidelity Tactical & Hydrodynamic Terrain & Oceanic Bathymetry
   */
  public static drawTerrain(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    dynamicShorelineY: number,
    isNightMode: boolean,
    viewMode: string,
    waveOffset: number,
    environment: Environment,
    hazards: Hazard[]
  ): void {
    const isHydro = viewMode === 'hydrodynamic';
    const currentSpeed = environment.currentSpeed ?? environment.waterCurrent ?? 0.35;
    const waveHeight = environment.waveHeight ?? 1.2;

    // -------------------------------------------------------------------------
    // A. PROCEDURAL GOLDEN SAND & DUNE RELIEF
    // -------------------------------------------------------------------------
    const sandGrad = ctx.createLinearGradient(0, 0, 0, dynamicShorelineY);
    if (isNightMode) {
      sandGrad.addColorStop(0, '#0b1120');
      sandGrad.addColorStop(0.3, '#131e33');
      sandGrad.addColorStop(0.7, '#1e293b');
      sandGrad.addColorStop(1, '#334155');
    } else {
      sandGrad.addColorStop(0, '#fef6e2'); // Upper dunes (warm golden sunlight)
      sandGrad.addColorStop(0.25, '#fae8c8');
      sandGrad.addColorStop(0.55, '#f5d6a0'); // Active dry sand
      sandGrad.addColorStop(0.85, '#e0b574'); // Intertidal damp sand
      sandGrad.addColorStop(1, '#be9455'); // Wet shoreline swash zone
    }
    ctx.fillStyle = sandGrad;
    ctx.fillRect(0, 0, width, dynamicShorelineY);

    // Micro-relief sand dune wavelets (subtle windblown sand ridges)
    if (!isNightMode) {
      ctx.save();
      ctx.lineWidth = 1;
      for (let y = 60; y < dynamicShorelineY - 25; y += 18) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.08)';
        for (let x = 0; x <= width; x += 30) {
          const dy = Math.sin(x * 0.04 + y * 0.1) * 2.2;
          if (x === 0) ctx.moveTo(x, y + dy);
          else ctx.lineTo(x, y + dy);
        }
        ctx.stroke();

        // Highlight crest
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        for (let x = 0; x <= width; x += 30) {
          const dy = Math.sin(x * 0.04 + y * 0.1) * 2.2 - 0.8;
          if (x === 0) ctx.moveTo(x, y + dy);
          else ctx.lineTo(x, y + dy);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // Wet sand mirror reflection sheen (high-tide damp boundary)
    const wetBandHeight = 32;
    const wetSandGrad = ctx.createLinearGradient(0, dynamicShorelineY - wetBandHeight, 0, dynamicShorelineY);
    if (isNightMode) {
      wetSandGrad.addColorStop(0, 'rgba(15, 23, 42, 0)');
      wetSandGrad.addColorStop(1, 'rgba(30, 41, 59, 0.6)');
    } else {
      wetSandGrad.addColorStop(0, 'rgba(180, 130, 70, 0)');
      wetSandGrad.addColorStop(0.5, 'rgba(160, 110, 50, 0.28)');
      wetSandGrad.addColorStop(1, 'rgba(140, 90, 35, 0.55)');
    }
    ctx.fillStyle = wetSandGrad;
    ctx.fillRect(0, dynamicShorelineY - wetBandHeight, width, wetBandHeight);

    // -------------------------------------------------------------------------
    // B. PROMENADE & EMERGENCY ACCESS CORRIDOR
    // -------------------------------------------------------------------------
    ctx.save();
    // Paver roadway background
    ctx.fillStyle = isNightMode ? '#020617' : '#e2e8f0';
    ctx.fillRect(0, 0, width, 45);

    // Stone paver joint grid
    ctx.strokeStyle = isNightMode ? '#0f172a' : '#cbd5e1';
    ctx.lineWidth = 1;
    for (let px = 0; px < width; px += 24) {
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, 45);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.lineTo(width, 22);
    ctx.stroke();

    // Roadway curb border
    ctx.strokeStyle = isNightMode ? '#334155' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, 45);

    // Emergency lane safety chevron striping
    ctx.fillStyle = isNightMode ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.5)';
    for (let cx = 10; cx < width; cx += 80) {
      ctx.beginPath();
      ctx.moveTo(cx, 40);
      ctx.lineTo(cx + 12, 40);
      ctx.lineTo(cx + 22, 5);
      ctx.lineTo(cx + 10, 5);
      ctx.closePath();
      ctx.fill();
    }

    // Promenade Badge & Title
    ctx.fillStyle = isNightMode ? '#0f172a' : '#0f172a';
    ctx.fillRect(15, 12, 280, 22);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1;
    ctx.strokeRect(15, 12, 280, 22);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('🛡️ EMERGENCY VEHICULAR CORRIDOR & PROMENADE', 24, 26);
    ctx.restore();

    // -------------------------------------------------------------------------
    // C. OCEANIC BATHYMETRY & HYDRODYNAMICS (WATER AREA)
    // -------------------------------------------------------------------------
    const waterHeight = height - dynamicShorelineY;

    if (isHydro) {
      // -----------------------------------------------------------------------
      // HYDRODYNAMIC MODE: COMPUTATIONAL FLUID DYNAMICS (CFD) VELOCITY FIELD
      // -----------------------------------------------------------------------
      const cfdGrad = ctx.createLinearGradient(0, dynamicShorelineY, 0, height);
      cfdGrad.addColorStop(0, '#082f49'); // Nearshore alongshore slow
      cfdGrad.addColorStop(0.35, '#0369a1');
      cfdGrad.addColorStop(0.7, '#075985');
      cfdGrad.addColorStop(1, '#0c4a6e');
      ctx.fillStyle = cfdGrad;
      ctx.fillRect(0, dynamicShorelineY, width, waterHeight);

      // Render Rip Outflow Velocity Plume
      const ripX = 560;
      const ripWidth = 140;
      const ripGrad = ctx.createRadialGradient(ripX, dynamicShorelineY + 60, 20, ripX, height - 40, ripWidth * 1.5);
      ripGrad.addColorStop(0, 'rgba(239, 68, 68, 0.55)'); // Core high-velocity rip jet (1.8+ m/s)
      ripGrad.addColorStop(0.4, 'rgba(249, 115, 22, 0.40)'); // 1.2 m/s
      ripGrad.addColorStop(0.7, 'rgba(234, 179, 8, 0.25)'); // 0.8 m/s feeder
      ripGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = ripGrad;
      ctx.fillRect(ripX - ripWidth, dynamicShorelineY, ripWidth * 2, waterHeight);

      // CFD Velocity Gradient Isobars
      ctx.save();
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 4]);
      for (let v = 0.5; v <= 2.0; v += 0.5) {
        const rad = 50 + v * 55;
        ctx.strokeStyle = v >= 1.5 ? 'rgba(239, 68, 68, 0.6)' : v >= 1.0 ? 'rgba(249, 115, 22, 0.5)' : 'rgba(234, 179, 8, 0.4)';
        ctx.beginPath();
        ctx.arc(ripX, dynamicShorelineY + 40, rad, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();

        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = 'bold 8px monospace';
        ctx.fillText(`v=${v.toFixed(1)}m/s`, ripX + Math.cos(0.3 * Math.PI) * rad, dynamicShorelineY + 40 + Math.sin(0.3 * Math.PI) * rad);
      }
      ctx.restore();

    } else {
      // -----------------------------------------------------------------------
      // TACTICAL MODE: PHOTOREALISTIC COASTAL BATHYMETRY
      // -----------------------------------------------------------------------
      const waterGrad = ctx.createLinearGradient(0, dynamicShorelineY, 0, height);
      if (isNightMode) {
        waterGrad.addColorStop(0, '#0c4a6e'); // 0-2m shallow
        waterGrad.addColorStop(0.25, '#075985');
        waterGrad.addColorStop(0.65, '#0369a1');
        waterGrad.addColorStop(1, '#082f49'); // 15m deep abyss
      } else {
        // Multi-tier photorealistic coastal ocean depth grading
        waterGrad.addColorStop(0, '#38bdf8'); // 0m crystal shorebreak shallow
        waterGrad.addColorStop(0.18, '#0ea5e9'); // 1-2m sandbar zone
        waterGrad.addColorStop(0.45, '#0284c7'); // 3-5m inner coastal trough
        waterGrad.addColorStop(0.75, '#0369a1'); // 6-10m outer sandbar shelf
        waterGrad.addColorStop(1, '#075985'); // 15m+ offshore deep oceanic blue
      }
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, dynamicShorelineY, width, waterHeight);

      // Submerged Sandbar Shoals (Visual constricted bathymetry driving the rip)
      // Left Sandbar (Zone A shoal)
      const leftShoalGrad = ctx.createRadialGradient(280, dynamicShorelineY + 45, 10, 280, dynamicShorelineY + 45, 160);
      leftShoalGrad.addColorStop(0, isNightMode ? 'rgba(14, 116, 144, 0.25)' : 'rgba(254, 240, 138, 0.22)');
      leftShoalGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = leftShoalGrad;
      ctx.fillRect(100, dynamicShorelineY, 340, 120);

      // Right Sandbar (Zone C shoal)
      const rightShoalGrad = ctx.createRadialGradient(820, dynamicShorelineY + 45, 10, 820, dynamicShorelineY + 45, 170);
      rightShoalGrad.addColorStop(0, isNightMode ? 'rgba(14, 116, 144, 0.25)' : 'rgba(254, 240, 138, 0.22)');
      rightShoalGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rightShoalGrad;
      ctx.fillRect(660, dynamicShorelineY, 340, 120);

      // Deep Rip Chute Trench (Zone B dark channel between sandbars - matches photo!)
      const trenchGrad = ctx.createLinearGradient(560 - 70, 0, 560 + 70, 0);
      trenchGrad.addColorStop(0, 'rgba(3, 105, 161, 0)');
      trenchGrad.addColorStop(0.5, isNightMode ? 'rgba(8, 47, 73, 0.45)' : 'rgba(3, 105, 161, 0.35)');
      trenchGrad.addColorStop(1, 'rgba(3, 105, 161, 0)');
      ctx.fillStyle = trenchGrad;
      ctx.fillRect(560 - 75, dynamicShorelineY, 150, waterHeight);

      // -----------------------------------------------------------------------
      // BATHYMETRIC DEPTH ISOBATHS (CONTOUR LINES WITH SOUNDINGS)
      // -----------------------------------------------------------------------
      ctx.save();
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);

      const isobaths: Array<{ depthM: number; yOffset: number; label: string }> = [
        { depthM: 1.5, yOffset: 45, label: '-1.5m ISOBATH' },
        { depthM: 3.0, yOffset: 110, label: '-3.0m BATHYMETRIC CONTOUR' },
        { depthM: 5.0, yOffset: 190, label: '-5.0m OUTER SHELF' },
        { depthM: 10.0, yOffset: 275, label: '-10.0m DEEP ABYSS' },
      ];

      for (const iso of isobaths) {
        const isoY = dynamicShorelineY + iso.yOffset;
        if (isoY < height) {
          ctx.beginPath();
          ctx.strokeStyle = isNightMode ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.35)';
          ctx.moveTo(0, isoY);
          for (let x = 0; x <= width; x += 30) {
            // Indent inward at rip channel to show the depth trench!
            const ripIndent = Math.exp(-Math.pow((x - 560) / 75, 2)) * 14;
            const curve = Math.sin(x * 0.015 + iso.depthM) * 3 - ripIndent;
            ctx.lineTo(x, isoY + curve);
          }
          ctx.stroke();

          // Depth Sounding Badge
          ctx.fillStyle = isNightMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(2, 132, 199, 0.85)';
          ctx.fillRect(width - 150, isoY - 7, 95, 13);
          ctx.strokeStyle = '#38bdf8';
          ctx.strokeRect(width - 150, isoY - 7, 95, 13);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px monospace';
          ctx.fillText(iso.label, width - 146, isoY + 3);
        }
      }
      ctx.restore();
    }
  }

  /**
   * 2. High-Fidelity Animated Surf, Progressive Breaking Waves & Foam Rollers
   */
  public static drawSurfAndWaves(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    dynamicShorelineY: number,
    isNightMode: boolean,
    viewMode: string,
    waveOffset: number,
    environment: Environment
  ): void {
    const waveAmp = 3.0 + environment.waveHeight * 2.2;
    const wavePhase = waveOffset;

    ctx.save();

    // -------------------------------------------------------------------------
    // 1. PROGRESSIVE SWELL ROLLERS (Moving Shoreward)
    // -------------------------------------------------------------------------
    for (let r = 1; r <= 4; r++) {
      const waveSpeed = 1.0 + r * 0.25;
      const progress = ((wavePhase * 35 * waveSpeed + r * 70) % 280);
      const rowY = dynamicShorelineY + 280 - progress;

      if (rowY >= dynamicShorelineY && rowY < height) {
        ctx.beginPath();
        ctx.moveTo(0, rowY);
        for (let x = 0; x <= width; x += 15) {
          // Breaker crest height diminishes inside deep rip channel (Zone B)
          const ripSuppression = 1 - Math.exp(-Math.pow((x - 560) / 80, 2)) * 0.75;
          const crest = Math.sin(x * 0.025 + wavePhase * waveSpeed) * (waveAmp * ripSuppression);
          ctx.lineTo(x, rowY + crest);
        }

        // Swell translucent front face
        ctx.strokeStyle = isNightMode
          ? `rgba(56, 189, 248, ${0.15 + (1 - progress / 280) * 0.25})`
          : `rgba(255, 255, 255, ${0.20 + (1 - progress / 280) * 0.45})`;
        ctx.lineWidth = 1.5 + (1 - progress / 280) * 2.0;
        ctx.stroke();

        // Breaking White Foam on the Crests (Only over the shallow sandbars, NOT in the deep rip!)
        if (progress > 160) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
          for (let bx = 20; bx < width - 20; bx += 32) {
            // Avoid spawning breaking foam directly in the rip current throat
            if (Math.abs(bx - 560) > 65) {
              const crestY = rowY + Math.sin(bx * 0.025 + wavePhase * waveSpeed) * waveAmp;
              ctx.beginPath();
              ctx.ellipse(bx, crestY, 14, 3.5, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // 2. DYNAMIC SURGING SHORELINE FOAM & SWASH
    // -------------------------------------------------------------------------
    const swashSurge = Math.sin(wavePhase * 1.8) * (8 + environment.waveHeight * 4.5);
    const swashY = dynamicShorelineY + swashSurge;

    // Foam wash line
    ctx.beginPath();
    ctx.moveTo(0, swashY);
    for (let x = 0; x <= width; x += 12) {
      const frothCurve = Math.sin(x * 0.035 + wavePhase * 2.2) * 4.5 + Math.cos(x * 0.08) * 2;
      ctx.lineTo(x, swashY + frothCurve);
    }
    ctx.strokeStyle = isNightMode ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 4.0;
    ctx.stroke();

    // Floating bubble froth clusters along shoreline
    ctx.fillStyle = isNightMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.85)';
    for (let fx = 15; fx < width; fx += 28) {
      const fY = swashY + Math.sin(fx * 0.05 + wavePhase) * 5;
      ctx.beginPath();
      ctx.arc(fx, fY - 2, 2.2 + (fx % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * 3. Tactical Maritime GIS Grid Overlay & Scale Bar
   */
  public static drawTacticalGISGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    isNightMode: boolean
  ): void {
    ctx.save();
    // Border coordinate ticks
    ctx.strokeStyle = isNightMode ? 'rgba(56, 189, 248, 0.4)' : 'rgba(15, 23, 42, 0.4)';
    ctx.lineWidth = 1;

    // Top border ticks
    for (let x = 100; x < width - 60; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 6);
      ctx.stroke();
    }

    // Left border ticks
    for (let y = 60; y < height - 40; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(6, y);
      ctx.stroke();
    }

    // High-tech Compass Rose in Top Left Corner (below banner)
    const compassX = 52;
    const compassY = 82;
    const compassR = 18;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.arc(compassX, compassY, compassR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // North Pointer
    ctx.beginPath();
    ctx.moveTo(compassX, compassY - 14);
    ctx.lineTo(compassX + 4, compassY);
    ctx.lineTo(compassX - 4, compassY);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    // South Pointer
    ctx.beginPath();
    ctx.moveTo(compassX, compassY + 14);
    ctx.lineTo(compassX + 4, compassY);
    ctx.lineTo(compassX - 4, compassY);
    ctx.closePath();
    ctx.fillStyle = '#94a3b8';
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 8px monospace';
    ctx.fillText('N', compassX - 2.5, compassY - 15);

    // Bottom-Left Tactical Metric Scale Bar (100m)
    const scaleX = 20;
    const scaleY = height - 18;
    const scaleLen = 100;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(scaleX - 6, scaleY - 14, scaleLen + 12, 18);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(scaleX - 6, scaleY - 14, scaleLen + 12, 18);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px monospace';
    ctx.fillText('0', scaleX, scaleY - 3);
    ctx.fillText('50m', scaleX + 40, scaleY - 3);
    ctx.fillText('100m', scaleX + 85, scaleY - 3);

    ctx.beginPath();
    ctx.moveTo(scaleX, scaleY + 1);
    ctx.lineTo(scaleX + scaleLen, scaleY + 1);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 4. On-Canvas Predictive Forecast & Uncertainty Floating HUD Card (Panel 3 of user reference)
   */
  public static drawCanvasForecastHUD(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    impactLab?: ImpactLabSimulationState
  ): void {
    if (!impactLab || !impactLab.forecastHorizons || impactLab.forecastHorizons.length === 0) {
      return;
    }

    ctx.save();
    const hudW = 280;
    const hudH = 135;
    const hudX = width - hudW - 15;
    const hudY = height - hudH - 18;

    // Floating Glassmorphic Container
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.fillRect(hudX, hudY, hudW, hudH);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(hudX, hudY, hudW, hudH);

    // Header
    ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
    ctx.fillRect(hudX, hudY, hudW, 24);
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('🔮 PREDICTIVE HAZARD FORECAST HUD', hudX + 10, hudY + 16);

    // 3 Horizon Columns (+1m, +3m, +5m)
    const horizons = impactLab.forecastHorizons.slice(0, 3);
    const colW = (hudW - 20) / horizons.length;

    horizons.forEach((h, idx) => {
      const colX = hudX + 10 + idx * colW;
      const colY = hudY + 34;

      // Horizon pill
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(colX + 2, colY, colW - 4, 18);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(colX + 2, colY, colW - 4, 18);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(h.horizonLabel, colX + 6, colY + 12);

      // Velocity
      const isCritical = h.predictedRiskCategory === 'CRITICAL';
      const isHigh = h.predictedRiskCategory === 'HIGH';
      ctx.fillStyle = isCritical ? '#f43f5e' : isHigh ? '#f59e0b' : '#34d399';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(`${h.predictedVelocity.toFixed(2)}`, colX + 4, colY + 38);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '8px monospace';
      ctx.fillText('m/s current', colX + 4, colY + 49);

      // Bounded Uncertainty Ribbon
      ctx.fillStyle = 'rgba(236, 72, 153, 0.15)';
      ctx.fillRect(colX + 2, colY + 54, colW - 4, 14);
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.5)';
      ctx.strokeRect(colX + 2, colY + 54, colW - 4, 14);

      ctx.fillStyle = '#f472b6';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`±[${h.uncertaintyMin}-${h.uncertaintyMax}]`, colX + 4, colY + 64);

      // Risk badge
      ctx.fillStyle = isCritical ? '#ef4444' : isHigh ? '#f59e0b' : '#10b981';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`${h.predictedRiskCategory} RISK`, colX + 4, colY + 81);
    });

    // Bottom Lead Time SLA Footer
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(hudX + 6, hudY + hudH - 18, hudW - 12, 14);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 8px monospace';
    ctx.fillText('⏱ VERIFIED LEAD TIME: +42s BEFORE CRITICAL INITIATION', hudX + 12, hudY + hudH - 8);

    ctx.restore();
  }
}

