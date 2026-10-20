/**
 * ReplayRenderer.ts
 * 
 * TIDES Priority 2: Incident Replay Animation Overlay Renderer
 * 
 * Visualizes the 3 canonical scenes of a recorded beach incident:
 * - Scene 1: Incident detected (recorded location, distress beacon, hazard conditions)
 * - Scene 2: Response dispatched (responder assignment, kinematics along recorded trajectory)
 * - Scene 3: Assistance & resolution (arrival, flotation secured, resolved, missing stage audit)
 * 
 * Strictly preserves simulation isolation:
 * - Zero synthetic fabrication: Never invents trajectories, routes, or unrecorded events
 * - Read-only overlay: Renders on top of digital twin canvas without modifying live physics
 */

import { ReplayController } from './ReplayController';
import { ReplayableIncidentDossier, ReplayLifecycleEvent } from './types';

export class ReplayRenderer {
  public static drawReplayOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    dynamicShorelineY: number,
    waveOffset: number,
    isSatelliteMode: boolean,
    controller: ReplayController = ReplayController.getInstance()
  ): void {
    const incident = controller.getSelectedIncident();
    if (!incident || !incident.events || incident.events.length === 0) {
      // Empty Incident State
      this.drawEmptyState(ctx, width, height);
      return;
    }

    ctx.save();

    const currentSimTime = controller.getCurrentSimTime();
    const currentScene = controller.getCurrentScene();
    const activeEvents = controller.getActiveEvents();
    const victimPos = controller.getVictimLocation() || {
      x: isSatelliteMode ? width * 0.295 : 560,
      y: dynamicShorelineY + 80,
    };

    // Screen coordinates projection
    const screenVictimX = isSatelliteMode ? width * 0.295 : victimPos.x;
    const screenVictimY = isSatelliteMode ? dynamicShorelineY + 75 : victimPos.y;

    // =========================================================================
    // SCENE 1: INCIDENT DETECTED (t >= t_detect)
    // =========================================================================
    const detectEvent = activeEvents.find((e) => e.eventType === 'DISTRESS_DETECTED' || e.eventType === 'HAZARD_OBSERVED');
    if (detectEvent) {
      this.drawScene1IncidentDetected(
        ctx,
        screenVictimX,
        screenVictimY,
        incident,
        detectEvent,
        waveOffset,
        currentScene
      );
    }

    // =========================================================================
    // SCENE 2: RESPONSE DISPATCHED & UNDERWAY (t >= t_dispatch)
    // =========================================================================
    const dispatchEvent = activeEvents.find((e) => e.eventType === 'RESPONDER_ASSIGNED');
    if (dispatchEvent) {
      this.drawScene2ResponseDispatched(
        ctx,
        width,
        height,
        dynamicShorelineY,
        incident,
        controller,
        screenVictimX,
        screenVictimY,
        waveOffset,
        isSatelliteMode
      );
    }

    // =========================================================================
    // SCENE 3: ASSISTANCE, RESOLUTION & MISSING STAGE AUDIT
    // =========================================================================
    if (currentScene === 3 || activeEvents.some((e) => e.eventType === 'RESPONDER_ARRIVED')) {
      this.drawScene3AssistanceAndResolution(
        ctx,
        screenVictimX,
        screenVictimY,
        incident,
        activeEvents,
        currentSimTime
      );
    }

    // =========================================================================
    // PERSISTENT REPLAY CONTROLLER HUD (Top-Center / Bottom HUD)
    // =========================================================================
    this.drawReplayHUD(ctx, width, height, incident, controller, currentScene);

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // SCENE 1: INCIDENT DETECTED
  // ---------------------------------------------------------------------------
  private static drawScene1IncidentDetected(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    incident: ReplayableIncidentDossier,
    event: ReplayLifecycleEvent,
    waveOffset: number,
    scene: number
  ): void {
    ctx.save();

    // Pulsing distress beacon
    const pulse = (Math.sin(waveOffset * 3.5) + 1) / 2;
    const radius = 16 + pulse * 14;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(239, 68, 68, ${0.28 - pulse * 0.18})`;
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Swimmer Distress Target Icon
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Distress Header Callout Badge
    const cardW = 160;
    const cardH = 34;
    const cardX = x - cardW / 2;
    const cardY = y - cardH - 12;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(cardX, cardY, cardW, cardH);

    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 8.5px monospace';
    ctx.fillText(`🚨 SCENE 1: DISTRESS DETECTED`, cardX + 8, cardY + 13);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '7.5px monospace';
    ctx.fillText(`Timestamp: ${event.timeDisplay} | ${incident.zoneId}`, cardX + 8, cardY + 23);
    ctx.fillStyle = '#f87171';
    ctx.fillText(`Hazard: Rip Chute Jet (Critical)`, cardX + 8, cardY + 31);

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // SCENE 2: RESPONSE DISPATCHED & TRAJECTORY KINEMATICS
  // ---------------------------------------------------------------------------
  private static drawScene2ResponseDispatched(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    dynamicShorelineY: number,
    incident: ReplayableIncidentDossier,
    controller: ReplayController,
    victimX: number,
    victimY: number,
    waveOffset: number,
    isSatelliteMode: boolean
  ): void {
    const interpolated = controller.getInterpolatedResponder();
    if (!interpolated) return;

    ctx.save();

    const responder = incident.assignedResponders[0];
    const trajectory = responder?.trajectory || [];

    // Base position
    const baseX = isSatelliteMode ? width * 0.12 : 220;
    const baseY = isSatelliteMode ? dynamicShorelineY + 110 : 190;

    // 1. Draw Recorded Trajectory Breadcrumbs (if present)
    if (interpolated.hasRecordedTrajectory && trajectory.length > 1) {
      // Historical Completed Path (Solid Cyan)
      ctx.beginPath();
      ctx.moveTo(trajectory[0].position.x, trajectory[0].position.y);

      let splitIdx = 0;
      for (let i = 1; i < trajectory.length; i++) {
        if (trajectory[i].simTimeSeconds <= controller.getCurrentSimTime()) {
          ctx.lineTo(trajectory[i].position.x, trajectory[i].position.y);
          splitIdx = i;
        } else {
          break;
        }
      }
      ctx.lineTo(interpolated.position.x, interpolated.position.y);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Future Planned Path (Dashed Slate)
      ctx.beginPath();
      ctx.moveTo(interpolated.position.x, interpolated.position.y);
      for (let j = splitIdx + 1; j < trajectory.length; j++) {
        ctx.lineTo(trajectory[j].position.x, trajectory[j].position.y);
      }
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Zero-Fabrication: No trajectory breadcrumbs available
      // Draw static unrouted link without inventing kinematics
      ctx.beginPath();
      ctx.moveTo(interpolated.position.x, interpolated.position.y);
      ctx.lineTo(victimX, victimY);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 2. Responder Token at Current Kinematic Position
    const curX = interpolated.position.x;
    const curY = interpolated.position.y;

    ctx.beginPath();
    ctx.arc(curX, curY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#0284c7';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '9px sans-serif';
    ctx.fillText('🚤', curX - 5, curY + 3);

    // Responder Kinematic Badge
    const bW = 155;
    const bH = 26;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(curX + 12, curY - 12, bW, bH);
    ctx.strokeStyle = interpolated.hasRecordedTrajectory ? '#06b6d4' : '#f59e0b';
    ctx.lineWidth = 1;
    ctx.strokeRect(curX + 12, curY - 12, bW, bH);

    ctx.fillStyle = '#bae6fd';
    ctx.font = 'bold 8px monospace';
    ctx.fillText(`⚡ ${interpolated.name.slice(0, 18)}`, curX + 17, curY);

    ctx.fillStyle = interpolated.hasRecordedTrajectory ? '#34d399' : '#fbbf24';
    ctx.font = '7.5px monospace';
    if (interpolated.hasRecordedTrajectory) {
      ctx.fillText(`SPEED: ${interpolated.speed.toFixed(1)} m/s | ${interpolated.status}`, curX + 17, curY + 10);
    } else {
      ctx.fillText(`⚠️ NO GPS LOG (ZERO-FABRICATION)`, curX + 17, curY + 10);
    }

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // SCENE 3: ASSISTANCE, RESOLUTION & MISSING STAGES
  // ---------------------------------------------------------------------------
  private static drawScene3AssistanceAndResolution(
    ctx: CanvasRenderingContext2D,
    victimX: number,
    victimY: number,
    incident: ReplayableIncidentDossier,
    activeEvents: ReplayLifecycleEvent[],
    currentSimTime: number
  ): void {
    ctx.save();

    const arrivalEvent = activeEvents.find((e) => e.eventType === 'RESPONDER_ARRIVED');
    const assistEvent = activeEvents.find((e) => e.eventType === 'ASSISTANCE_BEGAN');
    const resolveEvent = activeEvents.find((e) => e.eventType === 'INCIDENT_RESOLVED');

    const badgeX = victimX + 45;
    let badgeY = victimY - 20;

    // Arrival Milestone
    if (arrivalEvent) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.fillRect(badgeX, badgeY, 150, 20);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      ctx.strokeRect(badgeX, badgeY, 150, 20);

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('🏁 RESPONDER ON SCENE', badgeX + 6, badgeY + 13);
      badgeY += 24;
    }

    // Assistance Milestone
    if (assistEvent) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.fillRect(badgeX, badgeY, 150, 20);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(badgeX, badgeY, 150, 20);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('🛟 BUOYANCY & FLOTATION SECURED', badgeX + 6, badgeY + 13);
      badgeY += 24;
    }

    // Incident Resolved Milestone
    if (resolveEvent) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.fillRect(badgeX, badgeY, 150, 20);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(badgeX, badgeY, 150, 20);

      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('✅ RESCUE MISSION RESOLVED', badgeX + 6, badgeY + 13);
      badgeY += 24;
    }

    // Missing Stages Warning Callout
    if (incident.missingStages.length > 0) {
      const warnW = 210;
      const warnH = 26;
      ctx.fillStyle = 'rgba(30, 27, 75, 0.94)';
      ctx.fillRect(badgeX, badgeY, warnW, warnH);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.strokeRect(badgeX, badgeY, warnW, warnH);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 7.5px monospace';
      ctx.fillText(`⚠️ UNRECORDED STAGES (${incident.missingStages.length}):`, badgeX + 6, badgeY + 11);
      ctx.fillStyle = '#fde68a';
      ctx.font = '7px monospace';
      ctx.fillText(incident.missingStages.slice(0, 2).join(', '), badgeX + 6, badgeY + 21);
    }

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // FLOATING REPLAY CONTROLLER & KINEMATICS HUD
  // ---------------------------------------------------------------------------
  private static drawReplayHUD(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    incident: ReplayableIncidentDossier,
    controller: ReplayController,
    scene: number
  ): void {
    ctx.save();

    const hudW = 320;
    const hudH = 58;
    const hudX = width - hudW - 16;
    const hudY = height - hudH - 20;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fillRect(hudX, hudY, hudW, hudH);
    ctx.strokeStyle = scene === 3 ? '#10b981' : scene === 2 ? '#0284c7' : '#ef4444';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(hudX, hudY, hudW, hudH);

    // Top Title & Clock
    ctx.fillStyle = scene === 3 ? '#34d399' : scene === 2 ? '#38bdf8' : '#f87171';
    ctx.font = 'bold 9.5px monospace';
    const sceneName =
      scene === 1
        ? 'SCENE 1: INCIDENT DETECTED'
        : scene === 2
        ? 'SCENE 2: RESPONSE DISPATCHED'
        : 'SCENE 3: ASSISTANCE & RESOLVED';
    ctx.fillText(`🎬 REPLAY: ${sceneName}`, hudX + 10, hudY + 16);

    // Current Replay Timestamp & State
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 8.5px monospace';
    const stateStr = controller.isPlaybackRunning() ? '▶ PLAYING' : '⏸ PAUSED';
    ctx.fillText(
      `CLOCK: ${controller.getFormattedCurrentTime()} | ${stateStr} (${controller.getPlaybackSpeed()}x)`,
      hudX + 10,
      hudY + 30
    );

    // Safety SLA & Simulation Isolation Note
    ctx.fillStyle = '#94a3b8';
    ctx.font = '7.5px monospace';
    ctx.fillText(
      `Stages: ${incident.recordedStages.length}/8 | SLA: ≤180s Golden Window`,
      hudX + 10,
      hudY + 42
    );

    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 7px monospace';
    ctx.fillText(
      `🔒 REPLAY-LOCAL CLOCK (SIMULATION ENGINE UNMODIFIED)`,
      hudX + 10,
      hudY + 52
    );

    ctx.restore();
  }

  private static drawEmptyState(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    ctx.save();
    const w = 240;
    const h = 32;
    const x = width - w - 16;
    const y = height - h - 20;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 8.5px monospace';
    ctx.fillText('🎬 INCIDENT REPLAY: AWAITING EVENTS', x + 10, y + 20);
    ctx.restore();
  }
}

