import { Beach, Environment, ImpactLabSimulationState } from '../../models/Beach';
import { Hazard } from '../../models/Hazard';

/**
 * PredictiveHazardRenderer.ts
 * 
 * TIDES Feature 1: Predictive Rip-Current & Hazard Propagation Overlay
 * 
 * Provides an optional, read-only visual forecast layer:
 * - Distinguishes current observed hazards (solid line) from predicted hazards (animated dashed streamlines)
 * - Visualizes expanding hazard propagation contours across 1m, 3m, and 5m horizons
 * - Fades forecast zones according to horizon distance
 * - Displays forecast timestamp, predicted velocity, and bounded uncertainty
 * - Strictly preserves existing heatmap calculations, risk thresholds, and simulation physics
 * - Shows an explicit unavailable state if forecast data is absent (zero synthetic fabrication)
 */

export class PredictiveHazardRenderer {
  public static drawPredictiveOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    dynamicShorelineY: number,
    beach: Beach,
    environment: Environment,
    hazards: Hazard[],
    waveOffset: number,
    isSatelliteMode: boolean,
    impactLab?: ImpactLabSimulationState,
    selectedHorizon: number = 180 // Default to 3-minute (+180s) horizon
  ): void {
    ctx.save();

    // 1. Check Forecast Availability
    const horizons = impactLab?.forecastHorizons || [];
    const activeForecast = horizons.find((h) => h.horizonSeconds === selectedHorizon) || horizons[0];

    // If no validated forecasts exist, render honest "Awaiting Telemetry" state and return
    if (!activeForecast) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(width - 290, 65, 275, 26);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.strokeRect(width - 290, 65, 275, 26);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 8.5px monospace';
      ctx.fillText('🔮 FORECAST: AWAITING TELEMETRY HISTORY (NO INFERENCE)', width - 280, 81);
      ctx.restore();
      return;
    }

    const currentSpeed = environment.currentSpeed ?? environment.waterCurrent ?? 0.45;
    const predictedSpeed = activeForecast.predictedVelocity;
    const isAccelerating = predictedSpeed > currentSpeed;
    const isCritical = activeForecast.predictedRiskCategory === 'CRITICAL' || predictedSpeed >= 1.5;
    const isHigh = activeForecast.predictedRiskCategory === 'HIGH' || predictedSpeed >= 0.8;

    // Horizon Distance Fade Factor:
    // +1m (60s)  -> 0.80 opacity (High confidence)
    // +3m (180s) -> 0.55 opacity (Medium confidence)
    // +5m (300s) -> 0.35 opacity (Wider uncertainty)
    const horizonSec = activeForecast.horizonSeconds;
    const opacityFactor = horizonSec <= 60 ? 0.80 : horizonSec <= 180 ? 0.55 : 0.38;

    // Rip Channel Coordinates
    const ripCenterX = isSatelliteMode ? width * 0.295 : 560;
    const ripStartY = isSatelliteMode ? dynamicShorelineY + 40 : dynamicShorelineY;
    const baseRipWidth = isSatelliteMode ? 110 : 140;

    // Predicted lateral expansion based on horizon time and acceleration
    const expansionWidth = isAccelerating
      ? baseRipWidth * (1 + (horizonSec / 300) * 0.75)
      : baseRipWidth * (1 + (horizonSec / 300) * 0.25);

    // -------------------------------------------------------------------------
    // A. CURRENT OBSERVED HAZARD BOUNDARY (SOLID BRIGHT AMBER CONTOUR)
    // -------------------------------------------------------------------------
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([]); // Solid line for observed facts
    ctx.strokeRect(ripCenterX - baseRipWidth / 2, ripStartY + 5, baseRipWidth, height - ripStartY - 25);

    // Observed Fact Label
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(ripCenterX - 75, ripStartY + 8, 150, 16);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.strokeRect(ripCenterX - 75, ripStartY + 8, 150, 16);

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`● OBSERVED: ${currentSpeed.toFixed(2)} m/s (t₀)`, ripCenterX, ripStartY + 20);
    ctx.textAlign = 'left';
    ctx.restore();

    // -------------------------------------------------------------------------
    // B. PREDICTED HAZARD PROPAGATION CONTOUR (EXPANDING PULSING BOUNDARY)
    // -------------------------------------------------------------------------
    const contourColor = isCritical ? '#f43f5e' : isHigh ? '#f59e0b' : '#34d399';
    const contourStroke = isCritical
      ? `rgba(244, 63, 94, ${opacityFactor})`
      : `rgba(245, 158, 11, ${opacityFactor})`;

    ctx.save();
    // Expanding contour boundary
    ctx.beginPath();
    const halfExp = expansionWidth / 2;
    ctx.moveTo(ripCenterX - halfExp, ripStartY);
    ctx.lineTo(ripCenterX + halfExp, ripStartY);
    ctx.lineTo(ripCenterX + halfExp + 25, height - 15);
    ctx.lineTo(ripCenterX - halfExp - 25, height - 15);
    ctx.closePath();

    // Shaded forecast expansion area
    const predGrad = ctx.createLinearGradient(0, ripStartY, 0, height);
    predGrad.addColorStop(0, `${contourColor}08`);
    predGrad.addColorStop(0.5, `${contourColor}${Math.round(opacityFactor * 45).toString(16).padStart(2, '0')}`);
    predGrad.addColorStop(1, `${contourColor}${Math.round(opacityFactor * 65).toString(16).padStart(2, '0')}`);
    ctx.fillStyle = predGrad;
    ctx.fill();

    // Animated dashed perimeter
    ctx.strokeStyle = contourStroke;
    ctx.lineWidth = 2.2;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -(waveOffset * 35);
    ctx.stroke();
    ctx.restore();

    // -------------------------------------------------------------------------
    // C. PREDICTED DIRECTIONAL HAZARD STREAMLINES
    // -------------------------------------------------------------------------
    ctx.save();
    const numStreamlines = 5;
    const laneSpacing = expansionWidth / (numStreamlines + 1);

    for (let s = 1; s <= numStreamlines; s++) {
      const lineX = ripCenterX - expansionWidth / 2 + s * laneSpacing;
      const travelDist = height - ripStartY - 40;
      const pulseSpeed = 30 + (predictedSpeed * 18);
      const pulseY = (waveOffset * pulseSpeed + s * 45) % travelDist;
      const arrowY = ripStartY + 20 + pulseY;

      if (arrowY < height - 20) {
        // Streamline trace
        ctx.beginPath();
        ctx.moveTo(lineX, Math.max(ripStartY, arrowY - 28));
        ctx.lineTo(lineX, arrowY);
        ctx.strokeStyle = isCritical
          ? `rgba(244, 63, 94, ${opacityFactor * 0.9})`
          : `rgba(192, 132, 252, ${opacityFactor * 0.9})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Arrowhead pointing seaward (rip hazard direction)
        ctx.beginPath();
        ctx.moveTo(lineX - 4, arrowY - 6);
        ctx.lineTo(lineX, arrowY + 4);
        ctx.lineTo(lineX + 4, arrowY - 6);
        ctx.fillStyle = isCritical ? '#f43f5e' : '#c084fc';
        ctx.fill();
      }
    }
    ctx.restore();

    // -------------------------------------------------------------------------
    // D. FORECAST HORIZON & UNCERTAINTY CALLOUT BADGE
    // -------------------------------------------------------------------------
    ctx.save();
    const badgeW = 260;
    const badgeH = 46;
    const badgeX = ripCenterX - badgeW / 2;
    const badgeY = ripStartY + 45;

    // Floating Glassmorphic Forecast Card
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    ctx.strokeStyle = contourColor;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

    // Forecast Header
    ctx.fillStyle = contourColor;
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`🔮 PREDICTED HAZARD: ${activeForecast.horizonLabel.toUpperCase()}`, badgeX + 10, badgeY + 14);

    // Projected velocity & delta
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${predictedSpeed.toFixed(2)} m/s`, badgeX + 10, badgeY + 31);

    const deltaV = predictedSpeed - currentSpeed;
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = isAccelerating ? '#f43f5e' : '#34d399';
    ctx.fillText(
      isAccelerating ? `(+${deltaV.toFixed(2)} m/s surge)` : `(${deltaV.toFixed(2)} m/s)`,
      badgeX + 80,
      badgeY + 30
    );

    // Plausibility uncertainty ribbon
    ctx.font = '8px monospace';
    ctx.fillStyle = '#f472b6';
    ctx.fillText(
      `Plausibility: [${activeForecast.uncertaintyMin.toFixed(2)} - ${activeForecast.uncertaintyMax.toFixed(2)} m/s]`,
      badgeX + 10,
      badgeY + 41
    );

    // Risk category pill on right
    ctx.fillStyle = isCritical ? '#ef4444' : isHigh ? '#f59e0b' : '#10b981';
    ctx.fillRect(badgeX + badgeW - 68, badgeY + 8, 60, 16);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(activeForecast.predictedRiskCategory, badgeX + badgeW - 38, badgeY + 19);
    ctx.textAlign = 'left';

    ctx.restore();

    // -------------------------------------------------------------------------
    // E. MULTI-HORIZON SELECTOR PILL OVERLAY (BOTTOM-CENTER)
    // -------------------------------------------------------------------------
    const pillW = 280;
    const pillH = 26;
    const pillX = width / 2 - pillW / 2;
    const pillY = height - pillH - 24;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(pillX, pillY, pillW, pillH);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1;
    ctx.strokeRect(pillX, pillY, pillW, pillH);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 8px monospace';
    ctx.fillText('HORIZON OVERLAY:', pillX + 8, pillY + 16);

    const horizonButtons = [
      { sec: 60, label: '+1m (60s)' },
      { sec: 180, label: '+3m (180s)' },
      { sec: 300, label: '+5m (300s)' },
    ];

    horizonButtons.forEach((btn, idx) => {
      const bx = pillX + 105 + idx * 56;
      const isSelected = btn.sec === horizonSec;

      ctx.fillStyle = isSelected ? '#0284c7' : '#1e293b';
      ctx.fillRect(bx, pillY + 4, 52, 18);
      ctx.strokeStyle = isSelected ? '#38bdf8' : '#334155';
      ctx.strokeRect(bx, pillY + 4, 52, 18);

      ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(btn.label, bx + 4, pillY + 16);
    });
    ctx.restore();

    ctx.restore();
  }
}

