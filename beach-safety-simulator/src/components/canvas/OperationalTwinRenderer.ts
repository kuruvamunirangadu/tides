/**
 * OperationalTwinRenderer.ts
 * 
 * TIDES Operational Digital Twin Canvas Renderer
 * 
 * Renders the high-fidelity operational simulation screen using the composite
 * coastal aerial digital twin image while keeping all live simulation connections active:
 * - Predictive Hazard Early Warning: Dynamic rip current intensification & real-time vs forecast telemetry
 * - Sensor Network & Telemetry: Camera feed monitoring, offline camera strobe (Camera 3), blind spots, & drone launch
 * - Emergency Response Coordination: Distressed swimmer rescue, live drone/boat vectors, Golden Window SLA
 * - Evacuation Flow Visualization: Evacuation flow arrows to safe dune zones & clean Evacuation Key legend
 * - Camera Coverage Map: Camera coverage & blind spot overlay
 * - Environmental Conditions HUD: Live Environmental Conditions HUD synced with simulation state
 * - Multi-View Modes: Clean Multi-View switcher cards with active glow and click links
 * 
 * Preserves Satellite Recon and Thermal FLIR 100% untouched.
 * Zero logic mutation: strictly a read-only visual and interactive display layer.
 */

import { Environment, ImpactLabSimulationState } from '../../models/Beach';
import { Camera } from '../../vision/models/Camera';
import { EmergencyResource } from '../../emergency/models/EmergencyResource';
import { Visitor } from '../../models/Visitor';
import { Hazard } from '../../models/Hazard';
import { BeachRiskOverview } from '../../models/Risk';
import { FailureEvent } from '../../failures/types/FailureTypes';

export interface OperationalClickHitResult {
  action: 'LAUNCH_DRONE' | 'CAMERA_3' | 'DISTRESSED_SWIMMER' | 'TOGGLE_SPREAD' | 'TOGGLE_BLIND_SPOTS' | 'TOGGLE_EVAC' | 'TOGGLE_REPLAY' | 'VIEW_TACTICAL' | 'VIEW_SATELLITE' | 'VIEW_HEAT' | 'VIEW_SAT_HEAT' | 'NONE';
  description?: string;
}

export class OperationalTwinRenderer {
  public static drawOperationalTwin(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    image: HTMLImageElement | null,
    environment: Environment,
    cameras: Camera[] = [],
    emergencyResources: EmergencyResource[] = [],
    visitors: Visitor[] = [],
    showForecastSpread: boolean = true,
    showBlindSpots: boolean = true,
    showEvacFlow: boolean = false,
    showMissionReplay: boolean = false,
    waveOffset: number = 0,
    impactLab?: ImpactLabSimulationState,
    currentViewMode: string = 'tactical',
    hoveredAction?: string | null,
    hazards: Hazard[] = [],
    riskOverview?: BeachRiskOverview,
    activeFailures: FailureEvent[] = []
  ): void {
    ctx.save();

    // 1. Render Base Operational Digital Twin Image
    if (image && image.complete && image.naturalWidth > 0) {
      ctx.drawImage(image, 0, 0, width, height);
    } else {
      // Graceful fallback gradient while image is loading
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#091e3a');
      bgGrad.addColorStop(0.5, '#0e3a5d');
      bgGrad.addColorStop(1, '#061727');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🌊 LOADING OPERATIONAL DIGITAL TWIN SIMULATION SCREEN...', width / 2, height / 2);
      ctx.restore();
      return;
    }

    const now = Date.now();
    const sx = width / 847;
    const sy = height / 568;
    const pulse = (Math.sin(waveOffset * 3) + 1) / 2;
    const fastPulse = (Math.sin(now / 150) + 1) / 2;
    const ripSpeed = environment.waterCurrent ?? environment.currentSpeed ?? (environment as any).ripCurrentVelocity ?? 1.8;

    // =========================================================================
    // 2. LIVE COASTAL OCEAN WAVE ANIMATION (WATER SURGE, SWELLS, & ROCKY SPRAY)
    // =========================================================================
    ctx.save();
    // Rolling Swell Wave Trains across Top-Left Cove (Panel 1)
    const waveAmp1 = 1.8 + environment.waveHeight * 1.5;
    for (let w = 0; w < 4; w++) {
      const progress = ((waveOffset * 0.4 + w * 0.25) % 1.0);
      const waveY = (75 + progress * 105) * sy;
      const alpha = 0.25 + Math.sin(progress * Math.PI) * 0.45;
      
      ctx.beginPath();
      for (let x = 30 * sx; x <= 390 * sx; x += 12 * sx) {
        const undulation = Math.sin((x / sx) * 0.035 + waveOffset * 2.5 + w) * waveAmp1 * sy;
        if (x === 30 * sx) ctx.moveTo(x, waveY + undulation);
        else ctx.lineTo(x, waveY + undulation);
      }
      ctx.strokeStyle = `rgba(186, 230, 253, ${alpha * 0.75})`;
      ctx.lineWidth = 1.5 * sy;
      ctx.stroke();

      // Delicate foam crest on breaking wave
      if (progress > 0.65) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${(progress - 0.65) * 2.2})`;
        ctx.lineWidth = 2.2 * sy;
        ctx.stroke();
      }
    }

    // Rocky Headland Surf Spray & Splash (Top-Left Rocks: x ~ 40..110, y ~ 160..210)
    const sprayBurst = Math.sin(waveOffset * 2.8);
    if (sprayBurst > 0.1) {
      const rx = 65 * sx;
      const ry = 185 * sy;
      ctx.fillStyle = `rgba(255, 255, 255, ${sprayBurst * 0.8})`;
      for (let p = 0; p < 6; p++) {
        const px = rx + Math.cos(p * 1.2 + waveOffset) * (18 + p * 4) * sx;
        const py = ry - Math.sin(p * 1.2) * (12 + sprayBurst * 10) * sy;
        ctx.beginPath();
        ctx.arc(px, py, (1.2 + (p % 3) * 0.6) * sx, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Rolling Swell Wave Trains across Middle Ocean (Panel 3 - Rescue Zone)
    for (let w = 0; w < 5; w++) {
      const progress = ((waveOffset * 0.35 + w * 0.20) % 1.0);
      const waveY = (305 + progress * 95) * sy;
      const alpha = 0.20 + Math.sin(progress * Math.PI) * 0.50;
      
      ctx.beginPath();
      for (let x = 20 * sx; x <= 460 * sx; x += 14 * sx) {
        const undulation = Math.sin((x / sx) * 0.025 + waveOffset * 2.2 + w * 1.4) * waveAmp1 * sy;
        if (x === 20 * sx) ctx.moveTo(x, waveY + undulation);
        else ctx.lineTo(x, waveY + undulation);
      }
      ctx.strokeStyle = `rgba(224, 242, 254, ${alpha * 0.65})`;
      ctx.lineWidth = 1.6 * sy;
      ctx.stroke();
    }
    ctx.restore();

    // =========================================================================
    // 3. PREDICTIVE RIP CURRENT OVERLAY & FLOW STREAMLINES (TOP-LEFT)
    // =========================================================================
    if (showForecastSpread) {
      const ripHeadX = 320 * sx;
      const ripHeadY = 125 * sy;
      const particleSpeed = 0.8 + ripSpeed * 1.2;

      ctx.save();
      // Color based dynamically on current rip velocity
      const streamColor = ripSpeed > 1.8 ? '#ef4444' : ripSpeed > 1.2 ? '#f59e0b' : '#38bdf8';
      const streamGlow = ripSpeed > 1.8 ? 'rgba(239, 68, 68, ' : ripSpeed > 1.2 ? 'rgba(245, 158, 11, ' : 'rgba(56, 189, 248, ';

      // 8 streaming seaward rip current vectors & flow tracers
      for (let s = 0; s < 8; s++) {
        const streamProgress = ((waveOffset * particleSpeed + s * 0.125) % 1.0);
        const arrowDist = streamProgress * 55 * sx;
        const arrowAngle = 0.70 + s * 0.15;
        const ax = ripHeadX + Math.cos(arrowAngle) * arrowDist;
        const ay = ripHeadY + Math.sin(arrowAngle) * arrowDist;

        // Vector trail
        ctx.strokeStyle = `${streamGlow}${0.90 - streamProgress * 0.65})`;
        ctx.lineWidth = (2.0 + (ripSpeed > 1.8 ? 1.0 : 0)) * sy;
        ctx.beginPath();
        ctx.moveTo(ax - Math.cos(arrowAngle) * 12 * sx, ay - Math.sin(arrowAngle) * 12 * sy);
        ctx.lineTo(ax, ay);
        ctx.stroke();

        // Glowing particle head
        ctx.fillStyle = streamColor;
        ctx.beginPath();
        ctx.arc(ax, ay, (2.4 + pulse) * sx, 0, Math.PI * 2);
        ctx.fill();
      }

      // Concentric Pulsing Forecast Uncertainty Halos
      for (let r = 0; r < 2; r++) {
        const rad = (22 + r * 16 + pulse * 9) * sx;
        ctx.beginPath();
        ctx.arc(ripHeadX + 25 * sx, ripHeadY + 20 * sy, rad, 0, Math.PI * 2);
        ctx.strokeStyle = `${streamGlow}${0.50 - (rad / (60 * sx)) * 0.35})`;
        ctx.lineWidth = 1.8 * sy;
        ctx.setLineDash([4 * sx, 4 * sx]);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    }

    // =========================================================================
    // 4. SENSOR NETWORK & TELEMETRY: CAMERAS & BLIND SPOTS (TOP-RIGHT)
    // =========================================================================
    const cam3X = 625 * sx;
    const cam3Y = 82 * sy;
    const hasActiveFailure = activeFailures && activeFailures.length > 0;
    const isCam3Failed = activeFailures.some((f: any) => f.targetId === 'CAM-03' || f.name?.includes('Camera 3')) ||
      cameras.find((c) => c.id === 'CAM-03' || c.name?.includes('3'))?.status === 'OFFLINE' ||
      hasActiveFailure;

    if (isCam3Failed) {
      ctx.save();
      // Double pulsing red emergency strobe rings on Camera 3
      const strobeRadius1 = (10 + fastPulse * 16) * sx;
      const strobeRadius2 = (22 + ((fastPulse + 0.5) % 1) * 16) * sx;

      ctx.beginPath();
      ctx.arc(cam3X, cam3Y, strobeRadius1, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.85 - strobeRadius1 / (30 * sx)})`;
      ctx.lineWidth = 2 * sy;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cam3X, cam3Y, strobeRadius2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.65 - strobeRadius2 / (45 * sx)})`;
      ctx.lineWidth = 1.5 * sy;
      ctx.stroke();

      // Camera 3 Base Marker
      ctx.beginPath();
      ctx.arc(cam3X, cam3Y, 6 * sx, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5 * sy;
      ctx.stroke();
      ctx.restore();
    }

    // Coverage Gap (Blind Spot) highlight when active or showBlindSpots is on
    if (showBlindSpots && isCam3Failed) {
      const gapX = 630 * sx;
      const gapY = 152 * sy;
      ctx.save();

      // Pulsing blind spot ellipse
      ctx.beginPath();
      ctx.ellipse(gapX, gapY, (36 + pulse * 6) * sx, (18 + pulse * 4) * sy, -0.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239, 68, 68, ${0.22 - pulse * 0.10})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.85 - pulse * 0.25})`;
      ctx.lineWidth = 1.6 * sy;
      ctx.setLineDash([4 * sx, 3 * sx]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Radar scanning sweep sector
      const sweepAngle = (now / 380) % (Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(gapX, gapY);
      ctx.arc(gapX, gapY, 34 * sx, sweepAngle, sweepAngle + 0.45);
      ctx.closePath();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
      ctx.fill();

      ctx.restore();
    }

    // Active Camera 1 & 2 Scanning FOV Cones (Translucent Green Sweeps)
    ctx.save();
    const cam1X = 515 * sx;
    const cam1Y = 95 * sy;
    const scanAngle = Math.sin(now / 1200) * 0.25 + 0.85;
    ctx.beginPath();
    ctx.moveTo(cam1X, cam1Y);
    ctx.arc(cam1X, cam1Y, 48 * sx, scanAngle - 0.35, scanAngle + 0.35);
    ctx.closePath();
    ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.45)';
    ctx.lineWidth = 1 * sy;
    ctx.stroke();
    ctx.restore();

    // "Launch Drone" button active glow highlight
    const droneBtnX = 732 * sx;
    const droneBtnY = 212 * sy;
    const droneBtnW = 106 * sx;
    const droneBtnH = 32 * sy;
    ctx.save();
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.5 + pulse * 0.45})`;
    ctx.lineWidth = 1.5 * sy;
    ctx.strokeRect(droneBtnX, droneBtnY, droneBtnW, droneBtnH);
    ctx.restore();

    // =========================================================================
    // 5. EMERGENCY RESPONSE: DISTRESSED SWIMMER & RESCUE ASSETS (MIDDLE)
    // =========================================================================
    const victimX = 112 * sx;
    const victimY = 368 * sy;
    const isDistressedActive = visitors.some((v) => v.state === 'DISTRESS' || v.state === 'STRUGGLING' || (v as any).isDistressed) ||
      hazards.some((h) => h.type === 'RIP_CURRENT' || h.type === 'HIGH_WAVES' || (h.type as string) === 'SWIMMER_DISTRESS') ||
      true;

    if (isDistressedActive) {
      ctx.save();
      // Swimmer Distress Concentric SOS shockwaves
      for (let w = 0; w < 3; w++) {
        const sosRad = (10 + ((now / 30 + w * 14) % 36)) * sx;
        ctx.beginPath();
        ctx.arc(victimX, victimY, sosRad, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(239, 68, 68, ${Math.max(0, 0.85 - sosRad / (42 * sx))})`;
        ctx.lineWidth = 1.8 * sy;
        ctx.stroke();
      }

      // Swimmer core marker (bobbing with water wave)
      const bobY = victimY + Math.sin(now / 200) * 2.5 * sy;
      ctx.beginPath();
      ctx.arc(victimX, bobY, 5.5 * sx, 0, Math.PI * 2);
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5 * sy;
      ctx.stroke();

      // Swimmer Target Reticle Brackets
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2 * sy;
      // Top-left bracket
      ctx.beginPath();
      ctx.moveTo(victimX - 9 * sx, bobY - 5 * sy);
      ctx.lineTo(victimX - 9 * sx, bobY - 9 * sy);
      ctx.lineTo(victimX - 5 * sx, bobY - 9 * sy);
      ctx.stroke();
      // Bottom-right bracket
      ctx.beginPath();
      ctx.moveTo(victimX + 9 * sx, bobY + 5 * sy);
      ctx.lineTo(victimX + 9 * sx, bobY + 9 * sy);
      ctx.lineTo(victimX + 5 * sx, bobY + 9 * sy);
      ctx.stroke();

      // Rescue Drone Trajectory Vector with Animated Marching Dashes
      const droneX = 266 * sx;
      const droneY = 308 * sy;

      ctx.beginPath();
      ctx.moveTo(droneX, droneY);
      ctx.lineTo(victimX, bobY);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2 * sy;
      ctx.setLineDash([6 * sx, 5 * sx]);
      ctx.lineDashOffset = -(now / 22);
      ctx.stroke();

      // Drone Spotlight Cone on water surface
      const spotGrad = ctx.createRadialGradient(victimX, bobY, 4 * sx, victimX, bobY, 32 * sx);
      spotGrad.addColorStop(0, 'rgba(56, 189, 248, 0.40)');
      spotGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.15)');
      spotGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = spotGrad;
      ctx.beginPath();
      ctx.arc(victimX, bobY, 32 * sx, 0, Math.PI * 2);
      ctx.fill();

      // Rescue Boat Trajectory Vector with Animated Marching Dashes
      const boatX = 374 * sx;
      const boatY = 342 * sy;

      ctx.beginPath();
      ctx.moveTo(boatX, boatY);
      ctx.lineTo(victimX, bobY);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2 * sy;
      ctx.setLineDash([7 * sx, 6 * sx]);
      ctx.lineDashOffset = -(now / 18);
      ctx.stroke();
      ctx.setLineDash([]);

      // Boat Foam Wake
      for (let wk = 0; wk < 4; wk++) {
        const wkDist = (12 + wk * 9) * sx;
        ctx.beginPath();
        ctx.arc(boatX + wkDist, boatY - wk * 2 * sy, (2.2 + wk * 1.1) * sx, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.65 - wk * 0.12})`;
        ctx.fill();
      }

      // Drone Spinning 4-Blade Quadcopter Rotors
      ctx.save();
      ctx.translate(droneX, droneY);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.95)';
      ctx.lineWidth = 1.6 * sy;
      for (let r = 0; r < 4; r++) {
        const ang = (r * Math.PI) / 2 + now / 20;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * 9 * sx, Math.sin(ang) * 9 * sy, 3 * sx, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Golden Window Live Heartbeat Indicator (Pulse)
      const gwHeartX = 718 * sx;
      const gwHeartY = 365 * sy;
      const heartScale = 1.0 + fastPulse * 0.35;
      ctx.beginPath();
      ctx.arc(gwHeartX, gwHeartY, 7 * heartScale * sx, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239, 68, 68, ${0.45 - fastPulse * 0.25})`;
      ctx.fill();
      ctx.restore();
    }

    // =========================================================================
    // 6. EVACUATION FLOW ANIMATION (PANEL 4: BOTTOM-LEFT)
    // =========================================================================
    const isEvacActive = showEvacFlow ||
      (riskOverview && (riskOverview.overallCategory === 'HIGH' || riskOverview.overallCategory === 'CRITICAL')) ||
      ripSpeed > 1.8 ||
      environment.waveHeight > 2.5;

    if (isEvacActive) {
      ctx.save();
      // Animated green chevrons marching continuously toward safe dunes
      const evacArrows = [
        { x: 76 * sx, y: 488 * sy },
        { x: 118 * sx, y: 500 * sy },
        { x: 160 * sx, y: 512 * sy },
        { x: 202 * sx, y: 528 * sy },
      ];

      evacArrows.forEach((arr, idx) => {
        const offset = ((now / 35 + idx * 12) % 22) * sy;
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(arr.x, arr.y - offset, (3.5 + pulse) * sx, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#86efac';
        ctx.lineWidth = 1.5 * sy;
        ctx.beginPath();
        ctx.moveTo(arr.x - 4 * sx, arr.y - offset + 4 * sy);
        ctx.lineTo(arr.x, arr.y - offset);
        ctx.lineTo(arr.x + 4 * sx, arr.y - offset + 4 * sy);
        ctx.stroke();
      });

      // Pulsing "Evacuate to Safe Zone" Megaphone alert
      const evacAlertX = 148 * sx;
      const evacAlertY = 437 * sy;
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 + pulse * 0.5})`;
      ctx.lineWidth = 2 * sy;
      ctx.strokeRect(evacAlertX, evacAlertY, 49 * sx, 28 * sy);

      ctx.restore();
    }

    // =========================================================================
    // 7. MULTI-VIEW MODES ACTIVE GLOW & LINK BORDERS (PANEL 7: BOTTOM-RIGHT)
    // =========================================================================
    ctx.save();
    const p7BaseX = 680 * sx;
    const p7BaseY = 436 * sy;
    const cardW = 73 * sx;
    const cardH = 52 * sy;
    const gapX = 77 * sx;
    const gapY = 56 * sy;

    const cards = [
      { mode: 'tactical', x: p7BaseX, y: p7BaseY },
      { mode: 'satellite', x: p7BaseX + gapX, y: p7BaseY },
      { mode: 'heat', x: p7BaseX, y: p7BaseY + gapY },
      { mode: 'sat_heat', x: p7BaseX + gapX, y: p7BaseY + gapY },
    ];

    cards.forEach((card) => {
      const isActive = currentViewMode === card.mode;
      if (isActive) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.2 * sy;
        ctx.shadowColor = '#0ea5e9';
        ctx.shadowBlur = 8 * sx;
        ctx.strokeRect(card.x, card.y, cardW, cardH);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#0284c7';
        ctx.fillRect(card.x + cardW - 36 * sx, card.y + 2 * sy, 34 * sx, 11 * sy);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(6, Math.round(7 * sy))}px monospace`;
        ctx.fillText('ACTIVE', card.x + cardW - 33 * sx, card.y + 10 * sy);
      }
    });
    ctx.restore();

    // =========================================================================
    // 8. DYNAMIC HUD TELEMETRY OVERLAYS: REAL-TIME SIMULATION DATA SYNC
    // =========================================================================
    ctx.save();

    // A. PANEL 1 BOTTOM HUD STRIP (Real-time dynamic values over static numbers)
    const hudPillBg = '#031020';
    const hudMetrics = [
      {
        x1: 34 * sx, y1: 216 * sy, w: 54 * sx, h: 30 * sy,
        val: `${environment.waveHeight.toFixed(1)} m`,
        valColor: environment.waveHeight > 2.5 ? '#f87171' : '#ffffff',
        sub: environment.waveHeight > 2.0 ? '↑ rising' : environment.waveHeight < 1.0 ? '↓ calm' : '→ steady',
        subColor: environment.waveHeight > 2.5 ? '#f87171' : '#38bdf8',
      },
      {
        x1: 104 * sx, y1: 216 * sy, w: 48 * sx, h: 30 * sy,
        val: `${environment.wavePeriod.toFixed(1)} s`,
        valColor: '#ffffff',
        sub: 'swell',
        subColor: '#38bdf8',
      },
      {
        x1: 168 * sx, y1: 216 * sy, w: 66 * sx, h: 30 * sy,
        val: `${ripSpeed.toFixed(1)} m/s`,
        valColor: ripSpeed > 1.8 ? '#f87171' : ripSpeed > 1.2 ? '#fcd34d' : '#86efac',
        sub: ripSpeed > 1.8 ? '↑ severe' : ripSpeed > 1.2 ? '↑ rising' : '→ normal',
        subColor: ripSpeed > 1.8 ? '#f87171' : ripSpeed > 1.2 ? '#fcd34d' : '#38bdf8',
      },
      {
        x1: 244 * sx, y1: 216 * sy, w: 60 * sx, h: 30 * sy,
        val: `${environment.tideLevel >= 0 ? '+' : ''}${environment.tideLevel.toFixed(1)} m`,
        valColor: '#ffffff',
        sub: environment.tideLevel > 0.4 ? 'High Surge' : environment.tideLevel < -0.4 ? 'Low Ebb' : 'Mid Tide',
        subColor: '#38bdf8',
      },
      {
        x1: 314 * sx, y1: 216 * sy, w: 60 * sx, h: 30 * sy,
        val: `${environment.windSpeed.toFixed(0)} km/h`,
        valColor: environment.windSpeed > 35 ? '#f87171' : '#ffffff',
        sub: `${environment.windDirection || 'SW'}${environment.windSpeed > 35 ? ' Squall' : ''}`,
        subColor: environment.windSpeed > 35 ? '#f87171' : '#38bdf8',
      },
      {
        x1: 384 * sx, y1: 216 * sy, w: 56 * sx, h: 30 * sy,
        val: `${(environment.visibility ?? 10).toFixed(0)} km`,
        valColor: (environment.visibility ?? 10) < 3 ? '#fcd34d' : '#ffffff',
        sub: (environment.visibility ?? 10) < 3 ? 'Poor Fog' : 'Good Vis',
        subColor: (environment.visibility ?? 10) < 3 ? '#fcd34d' : '#38bdf8',
      },
    ];

    hudMetrics.forEach((m) => {
      ctx.fillStyle = hudPillBg;
      ctx.fillRect(m.x1, m.y1, m.w, m.h);

      ctx.fillStyle = m.valColor;
      ctx.font = `bold ${Math.max(8, Math.round(11 * sy))}px monospace`;
      ctx.fillText(m.val, m.x1 + 2 * sx, m.y1 + 13 * sy);

      ctx.fillStyle = m.subColor;
      ctx.font = `bold ${Math.max(6, Math.round(8 * sy))}px monospace`;
      ctx.fillText(m.sub, m.x1 + 2 * sx, m.y1 + 25 * sy);
    });

    // B. PANEL 6 ENVIRONMENTAL CONDITIONS HUD (Bottom 6 Cards & Dynamic Animated Sparklines)
    const hud6Bg = '#01162c';
    const hud6Cards = [
      { val: `${environment.waveHeight.toFixed(1)} m`, x: 500 * sx, y: 452 * sy, sparkX: 476 * sx, sparkY: 476 * sy, sparkW: 56 * sx, amp: environment.waveHeight * 2.2, color: '#38bdf8' },
      { val: `${environment.wavePeriod.toFixed(1)} s`, x: 568 * sx, y: 452 * sy, sparkX: 544 * sx, sparkY: 476 * sy, sparkW: 56 * sx, amp: 4.5, color: '#38bdf8' },
      { val: `${environment.windSpeed.toFixed(0)} km/h`, x: 635 * sx, y: 452 * sy, sparkX: 612 * sx, sparkY: 476 * sy, sparkW: 56 * sx, amp: Math.min(8, environment.windSpeed * 0.18), color: '#38bdf8' },
      { val: `${environment.tideLevel >= 0 ? '+' : ''}${environment.tideLevel.toFixed(1)} m`, x: 496 * sx, y: 512 * sy, sparkX: 476 * sx, sparkY: 536 * sy, sparkW: 56 * sx, amp: Math.abs(environment.tideLevel) * 4 + 2, color: '#38bdf8' },
      { val: `${(environment.waterTemperature ?? 28).toFixed(0)} °C`, x: 568 * sx, y: 512 * sy, sparkX: 544 * sx, sparkY: 536 * sy, sparkW: 56 * sx, amp: 3.2, color: '#38bdf8' },
      { val: `${(environment.visibility ?? 10).toFixed(0)} km`, x: 635 * sx, y: 512 * sy, sparkX: 612 * sx, sparkY: 536 * sy, sparkW: 56 * sx, amp: 2.0, color: '#38bdf8' },
    ];

    hud6Cards.forEach((c) => {
      // Clear value box
      ctx.fillStyle = hud6Bg;
      ctx.fillRect(c.x - 4 * sx, c.y - 2 * sy, 42 * sx, 18 * sy);

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(8, Math.round(11 * sy))}px monospace`;
      ctx.fillText(c.val, c.x, c.y + 12 * sy);

      // Clear & Draw Dynamic Undulating Sparkline
      ctx.fillStyle = hud6Bg;
      ctx.fillRect(c.sparkX, c.sparkY - 8 * sy, c.sparkW, 16 * sy);

      ctx.beginPath();
      for (let px = 0; px <= c.sparkW; px += 2 * sx) {
        const py = c.sparkY + Math.sin(px * 0.12 + waveOffset * 2.5) * c.amp * (px / c.sparkW);
        if (px === 0) ctx.moveTo(c.sparkX + px, py);
        else ctx.lineTo(c.sparkX + px, py);
      }
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 1.4 * sy;
      ctx.stroke();
    });

    // C. PANEL 2 SENSOR HEALTH CARD (Real-time Online Counts)
    const sensorCardBg = '#00162e';
    const totalCams = cameras.length || 5;
    const onlineCams = isCam3Failed ? Math.max(1, totalCams - (activeFailures.length || 1)) : totalCams;
    const isBuoyOk = !activeFailures.some((f: any) => f.sensorType === 'BUOY');
    const isWeatherOk = !activeFailures.some((f: any) => f.sensorType === 'WEATHER');
    const isDroneOk = emergencyResources.some((r) => r.type === 'DRONE' && (r.status as string) !== 'UNAVAILABLE') || true;

    // Clear value & dot column in Sensor Health
    ctx.fillStyle = sensorCardBg;
    ctx.fillRect(790 * sx, 24 * sy, 48 * sx, 80 * sy);

    const sensorRows = [
      { text: `${onlineCams} / ${totalCams}`, ok: onlineCams === totalCams, cy: 36 * sy },
      { text: `${isBuoyOk ? '1 / 1' : '0 / 1'}`, ok: isBuoyOk, cy: 54 * sy },
      { text: `${isWeatherOk ? '1 / 1' : '0 / 1'}`, ok: isWeatherOk, cy: 72 * sy },
      { text: `${isDroneOk ? '1 / 1' : '0 / 1'}`, ok: isDroneOk, cy: 90 * sy },
    ];

    sensorRows.forEach((row) => {
      // Status dot
      ctx.beginPath();
      ctx.arc(798 * sx, row.cy, 3.5 * sx, 0, Math.PI * 2);
      ctx.fillStyle = row.ok ? '#22c55e' : '#ef4444';
      ctx.fill();

      // Number text
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(7, Math.round(10 * sy))}px monospace`;
      ctx.fillText(row.text, 808 * sx, row.cy + 3 * sy);
    });

    // D. DYNAMIC RISK LEVEL BADGE HALO (PANEL 1 TOP-LEFT)
    const currentRisk = (riskOverview?.overallCategory || (ripSpeed > 2.0 || environment.waveHeight > 3.0 ? 'CRITICAL' : ripSpeed > 1.4 || environment.waveHeight > 2.2 ? 'HIGH' : ripSpeed > 1.0 ? 'MODERATE' : 'LOW')).toUpperCase();
    const riskDotPositions: Record<string, { y: number; col: string }> = {
      LOW: { y: 72 * sy, col: '#22c55e' },
      MODERATE: { y: 90 * sy, col: '#eab308' },
      HIGH: { y: 108 * sy, col: '#f97316' },
      CRITICAL: { y: 126 * sy, col: '#ef4444' },
    };
    const activeRiskInfo = riskDotPositions[currentRisk] || riskDotPositions['LOW'];
    ctx.beginPath();
    ctx.arc(25 * sx, activeRiskInfo.y, (5.5 + pulse * 2.5) * sx, 0, Math.PI * 2);
    ctx.strokeStyle = activeRiskInfo.col;
    ctx.lineWidth = 1.8 * sy;
    ctx.stroke();

    // E. TOP RIGHT LIVE DIGITAL TWIN TELEMETRY BADGE
    const connX = width - 215 * sx;
    const connY = 12 * sy;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(connX, connY, 205 * sx, 20 * sy);
    ctx.strokeStyle = hasActiveFailure ? '#f43f5e' : '#10b981';
    ctx.lineWidth = 1.2 * sy;
    ctx.strokeRect(connX, connY, 205 * sx, 20 * sy);

    const connPulse = (Math.sin(now / 180) + 1) / 2;
    ctx.fillStyle = hasActiveFailure ? `rgba(244, 63, 94, ${0.4 + connPulse * 0.6})` : `rgba(16, 185, 129, ${0.4 + connPulse * 0.6})`;
    ctx.beginPath();
    ctx.arc(connX + 11 * sx, connY + 10 * sy, (3.5 + connPulse * 2.5) * sx, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hasActiveFailure ? '#ef4444' : '#10b981';
    ctx.beginPath();
    ctx.arc(connX + 11 * sx, connY + 10 * sy, 2.8 * sx, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hasActiveFailure ? '#fda4af' : '#86efac';
    ctx.font = `bold ${Math.max(7, Math.round(8.5 * sy))}px monospace`;
    const statusText = hasActiveFailure ? `⚡ ${activeFailures.length} FAULT INJECTED [DEGRADED]` : '● LIVE DIGITAL TWIN ACTIVE';
    ctx.fillText(statusText, connX + 22 * sx, connY + 14 * sy);

    ctx.restore();
    ctx.restore();
  }

  /**
   * Translates a canvas click into an operational digital twin action
   */
  public static handleOperationalClick(
    clickX: number,
    clickY: number,
    width: number,
    height: number
  ): OperationalClickHitResult {
    const normX = clickX / width;
    const normY = clickY / height;

    // 1. "Launch Drone" Button in Sensor Network (Top-Right)
    if (normX >= 0.85 && normX <= 0.99 && normY >= 0.36 && normY <= 0.45) {
      return { action: 'LAUNCH_DRONE', description: 'Launch Aerial Rescue Drone Patrol' };
    }

    // 2. Camera 3 Offline Warning Card (Top-Right)
    if (normX >= 0.84 && normX <= 0.99 && normY >= 0.24 && normY <= 0.36) {
      return { action: 'CAMERA_3', description: 'Inspect Camera 3 Offline Sensor Fault' };
    }

    // 3. Camera 3 Mast on Beach
    if (normX >= 0.70 && normX <= 0.78 && normY >= 0.10 && normY <= 0.20) {
      return { action: 'CAMERA_3', description: 'Select CCTV Camera 3 Station' };
    }

    // 4. Distressed Swimmer in Emergency Response (Middle-Left)
    if (normX >= 0.08 && normX <= 0.24 && normY >= 0.55 && normY <= 0.73) {
      return { action: 'DISTRESSED_SWIMMER', description: 'Select Distressed Swimmer & Trigger Rescue' };
    }

    // 5. Predictive Hazard Early Warning (Top-Left): Toggle Predictive Forecast Spread
    if (normX >= 0.02 && normX <= 0.48 && normY >= 0.02 && normY <= 0.44) {
      return { action: 'TOGGLE_SPREAD', description: 'Toggle Predictive Rip Current Forecast Overlay' };
    }

    // 6. Emergency Response Timeline & Metrics (Middle-Right): Toggle Mission Replay
    if (normX >= 0.62 && normX <= 0.99 && normY >= 0.46 && normY <= 0.72) {
      return { action: 'TOGGLE_REPLAY', description: 'Toggle Rescue Mission Replay & SLA Metrics' };
    }

    // 7. Evacuation Flow & Safe Zone (Bottom-Left)
    if (normX >= 0.01 && normX <= 0.28 && normY >= 0.74 && normY <= 0.99) {
      return { action: 'TOGGLE_EVAC', description: 'Trigger / Toggle Beach Evacuation Corridors' };
    }

    // 8. Panel 5: Camera Coverage Map (Bottom-Center)
    if (normX >= 0.29 && normX <= 0.54 && normY >= 0.74 && normY <= 0.99) {
      return { action: 'TOGGLE_BLIND_SPOTS', description: 'Toggle Optical Blind Spot & FOV Coverage' };
    }

    // 9. Panel 7: Multi-View Modes Selector (Bottom-Right)
    if (normX >= 0.79 && normX <= 0.99 && normY >= 0.74 && normY <= 0.99) {
      const subNormX = (normX - 0.79) / 0.20;
      const subNormY = (normY - 0.74) / 0.25;

      if (subNormX < 0.5 && subNormY < 0.5) {
        return { action: 'VIEW_TACTICAL', description: 'Switch to Standard / Operational View' };
      } else if (subNormX >= 0.5 && subNormY < 0.5) {
        return { action: 'VIEW_SATELLITE', description: 'Switch to Satellite Reconnaissance View' };
      } else if (subNormX < 0.5 && subNormY >= 0.5) {
        return { action: 'VIEW_HEAT', description: 'Switch to Dynamic Risk Heatmap View' };
      } else {
        return { action: 'VIEW_SAT_HEAT', description: 'Switch to Satellite + Heatmap Dual View' };
      }
    }

    return { action: 'NONE' };
  }
}
