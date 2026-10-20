import { Beach } from '../../models/Beach';

/**
 * EvacuationFlowRenderer.ts
 * 
 * TIDES Feature 5: Evacuation Flow Visualization
 * 
 * Provides an optional, read-only evacuation routing layer:
 * - Animated arrows directing visitors away from high-risk rip channels toward designated safe assembly dunes
 * - Highlights evacuation routes crossing hazard zones in warning dashed amber
 * - Shows evacuation corridor arrows and muster points
 * - Read-only: does not alter visitor engine calculations or pathfinding
 */

export class EvacuationFlowRenderer {
  public static drawEvacuationFlow(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    dynamicShorelineY: number,
    waveOffset: number,
    isSatelliteMode: boolean
  ): void {
    ctx.save();

    // 1. Designated Safe Assembly / Muster Points on Dry Sand
    const safeZones = [
      { x: isSatelliteMode ? width * 0.18 : 220, y: 35, label: 'SAFE ZONE A (WEST DUNE)' },
      { x: isSatelliteMode ? width * 0.72 : 880, y: 35, label: 'SAFE ZONE C (EAST DUNE)' },
    ];

    safeZones.forEach((sz) => {
      ctx.save();
      // Glowing green safe perimeter
      ctx.beginPath();
      ctx.arc(sz.x, sz.y, 22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
      ctx.fill();
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inner assembly icon
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⛑️', sz.x, sz.y + 3);

      // Label
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(sz.x - 60, sz.y + 14, 120, 14);
      ctx.strokeStyle = '#22c55e';
      ctx.strokeRect(sz.x - 60, sz.y + 14, 120, 14);
      ctx.fillStyle = '#86efac';
      ctx.font = 'bold 7.5px monospace';
      ctx.fillText(sz.label, sz.x, sz.y + 24);
      ctx.restore();
    });

    // 2. Animated Directional Evacuation Arrows Moving from Surf to Assembly Dunes
    // Corridor 1: Water $\rightarrow$ West Dune
    const arrowPhase = (waveOffset * 35) % 120;
    const ripX = isSatelliteMode ? width * 0.295 : 560;

    // West escape flow
    for (let i = 0; i < 4; i++) {
      const step = (arrowPhase + i * 30) % 120;
      const progress = step / 120;
      const ax = (ripX - 40) - progress * (isSatelliteMode ? 140 : 260);
      const ay = dynamicShorelineY + 30 - progress * (dynamicShorelineY - 45);

      if (ay > 20 && ay < height) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ax, ay, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#22c55e';
        ctx.fill();

        // Arrow vector pointing toward West Safe Zone
        ctx.beginPath();
        ctx.moveTo(ax + 8, ay + 6);
        ctx.lineTo(ax - 6, ay - 6);
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(ax - 8, ay - 3);
        ctx.lineTo(ax - 6, ay - 6);
        ctx.lineTo(ax - 3, ay - 8);
        ctx.fillStyle = '#22c55e';
        ctx.fill();
        ctx.restore();
      }
    }

    // East escape flow (Water $\rightarrow$ East Dune)
    for (let i = 0; i < 4; i++) {
      const step = (arrowPhase + i * 30) % 120;
      const progress = step / 120;
      const ax = (ripX + 40) + progress * (isSatelliteMode ? 260 : 300);
      const ay = dynamicShorelineY + 30 - progress * (dynamicShorelineY - 45);

      if (ay > 20 && ay < height) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ax, ay, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#22c55e';
        ctx.fill();

        // Arrow vector pointing toward East Safe Zone
        ctx.beginPath();
        ctx.moveTo(ax - 8, ay + 6);
        ctx.lineTo(ax + 6, ay - 6);
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(ax + 8, ay - 3);
        ctx.lineTo(ax + 6, ay - 6);
        ctx.lineTo(ax + 3, ay - 8);
        ctx.fillStyle = '#22c55e';
        ctx.fill();
        ctx.restore();
      }
    }

    // 3. Hazard Egress Boundary Label (Evacuation Directive)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(ripX - 95, dynamicShorelineY - 26, 190, 18);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1;
    ctx.strokeRect(ripX - 95, dynamicShorelineY - 26, 190, 18);

    ctx.fillStyle = '#86efac';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🚶 RECOMMENDED EVACUATION PATHS', ripX, dynamicShorelineY - 14);
    ctx.textAlign = 'left';

    ctx.restore();
  }
}

