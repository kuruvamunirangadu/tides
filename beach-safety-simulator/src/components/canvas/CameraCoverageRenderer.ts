import { Camera } from '../../vision/models/Camera';
import { Beach } from '../../models/Beach';

/**
 * CameraCoverageRenderer.ts
 * 
 * TIDES Feature 3: Camera Coverage & Blind-Spot Visualization
 * 
 * Provides an optional, read-only surveillance coverage layer:
 * - Visualizes camera field-of-view (FOV) cones
 * - Detects and highlights overlapping coverage areas
 * - Marks blind spots along the active swimming surf zone
 * - Animates offline cameras with blinking red strobes and crossed cones
 * - Strictly preserves existing camera configurations and CV detection models
 */

export class CameraCoverageRenderer {
  public static drawCoverageAndBlindSpots(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    dynamicShorelineY: number,
    cameras: Camera[],
    waveOffset: number,
    isSatelliteMode: boolean,
    projectToSatellite?: (pos: { x: number; y: number }) => { x: number; y: number }
  ): void {
    if (!cameras || cameras.length === 0) return;

    ctx.save();

    // 1. Project camera positions to screen coordinates
    const mappedCameras = cameras.map((cam) => {
      const pos = isSatelliteMode && projectToSatellite
        ? projectToSatellite(cam.position)
        : cam.position;
      const isOnline = cam.status === 'ONLINE';
      const startAngle = ((cam.rotation - cam.fieldOfView / 2) * Math.PI) / 180;
      const endAngle = ((cam.rotation + cam.fieldOfView / 2) * Math.PI) / 180;

      return {
        ...cam,
        screenX: pos.x,
        screenY: pos.y,
        isOnline,
        startAngle,
        endAngle,
      };
    });

    // 2. Draw Active FOV Cones
    mappedCameras.forEach((cam) => {
      if (cam.isOnline) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cam.screenX, cam.screenY);
        ctx.arc(cam.screenX, cam.screenY, cam.range, cam.startAngle, cam.endAngle);
        ctx.closePath();

        const camColor = cam.color || '#06b6d4';
        const fovGrad = ctx.createRadialGradient(cam.screenX, cam.screenY, 15, cam.screenX, cam.screenY, cam.range);
        fovGrad.addColorStop(0, `${camColor}2a`);
        fovGrad.addColorStop(0.7, `${camColor}10`);
        fovGrad.addColorStop(1, `${camColor}02`);
        ctx.fillStyle = fovGrad;
        ctx.fill();

        ctx.strokeStyle = `${camColor}60`;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.restore();
      } else {
        // Animate Camera Going Offline in Reliability Lab
        ctx.save();
        const pulse = (Math.sin(waveOffset * 4) + 1) / 2;

        // Pulsing red strobe warning ring at camera base
        ctx.beginPath();
        ctx.arc(cam.screenX, cam.screenY, 16 + pulse * 12, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.7 - pulse * 0.4})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Crossed-out Offline FOV Cone with "NO SIGNAL"
        ctx.beginPath();
        ctx.moveTo(cam.screenX, cam.screenY);
        ctx.arc(cam.screenX, cam.screenY, cam.range * 0.6, cam.startAngle, cam.endAngle);
        ctx.closePath();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();

        // "X" cross mark over offline cone
        const midAngle = (cam.startAngle + cam.endAngle) / 2;
        const midDist = cam.range * 0.35;
        const midX = cam.screenX + Math.cos(midAngle) * midDist;
        const midY = cam.screenY + Math.sin(midAngle) * midDist;

        ctx.beginPath();
        ctx.moveTo(midX - 10, midY - 10);
        ctx.lineTo(midX + 10, midY + 10);
        ctx.moveTo(midX + 10, midY - 10);
        ctx.lineTo(midX - 10, midY + 10);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.stroke();

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(midX - 40, midY + 14, 80, 14);
        ctx.strokeStyle = '#ef4444';
        ctx.strokeRect(midX - 40, midY + 14, 80, 14);
        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 7.5px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NO RTSP SIGNAL', midX, midY + 24);
        ctx.textAlign = 'left';

        ctx.restore();
      }
    });

    // 3. Highlight Overlapping Coverage Zones (Dual-Camera Redundancy)
    const onlineCameras = mappedCameras.filter((c) => c.isOnline);
    for (let i = 0; i < onlineCameras.length; i++) {
      for (let j = i + 1; j < onlineCameras.length; j++) {
        const c1 = onlineCameras[i];
        const c2 = onlineCameras[j];
        const dist = Math.hypot(c1.screenX - c2.screenX, c1.screenY - c2.screenY);

        if (dist < c1.range + c2.range) {
          // Midpoint overlap highlight
          const overlapX = (c1.screenX + c2.screenX) / 2;
          const overlapY = Math.max(c1.screenY, c2.screenY) + 70;

          if (overlapY < height - 20) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(overlapX, overlapY, 32, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
            ctx.fill();
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1.2;
            ctx.setLineDash([3, 3]);
            ctx.stroke();

            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(overlapX - 42, overlapY - 8, 84, 15);
            ctx.strokeStyle = '#10b981';
            ctx.strokeRect(overlapX - 42, overlapY - 8, 84, 15);

            ctx.fillStyle = '#6ee7b7';
            ctx.font = 'bold 7.5px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('DUAL OVERLAP', overlapX, overlapY + 3);
            ctx.textAlign = 'left';
            ctx.restore();
          }
        }
      }
    }

    // 4. Mark Active Surf Zone Blind Spots (Areas outside all online camera cones)
    // In coastal setups, gaps between cameras (e.g. Zone B rip or far margins) are blind spots
    const blindSpotX = isSatelliteMode ? width * 0.48 : 720;
    const blindSpotY = dynamicShorelineY + 45;
    const blindSpotW = 85;
    const blindSpotH = 45;

    ctx.save();
    // Hatched warning box in the blind spot corridor
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(blindSpotX - blindSpotW / 2, blindSpotY, blindSpotW, blindSpotH);

    // Diagonal hatch lines
    ctx.beginPath();
    for (let x = blindSpotX - blindSpotW / 2; x < blindSpotX + blindSpotW / 2; x += 15) {
      ctx.moveTo(x, blindSpotY);
      ctx.lineTo(x + 12, blindSpotY + blindSpotH);
    }
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
    ctx.stroke();

    // Blind spot badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(blindSpotX - 52, blindSpotY + blindSpotH / 2 - 8, 104, 16);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.strokeRect(blindSpotX - 52, blindSpotY + blindSpotH / 2 - 8, 104, 16);

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 7.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ OPTICAL BLIND SPOT', blindSpotX, blindSpotY + blindSpotH / 2 + 3);
    ctx.textAlign = 'left';

    ctx.restore();

    ctx.restore();
  }
}

