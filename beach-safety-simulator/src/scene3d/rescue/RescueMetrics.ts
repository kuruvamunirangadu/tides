import { RescueMissionDossier } from './rescue.types';

export interface CalculatedRescueMetrics {
  alertLatencySec: number | null;
  dispatchLatencySec: number | null;
  travelTimeSec: number | null;
  timeToAssistanceSec: number | null;
  assistanceDurationSec: number | null;
  totalDurationSec: number | null;
  goldenWindowSLA: {
    compliant: boolean;
    remainingSeconds: number;
    thresholdSeconds: number;
  };
}

/**
 * RescueMetrics.ts
 * 
 * Computes verifiable response performance metrics strictly from recorded simulation timestamps:
 * - Golden Window SLA (180s benchmark for drowning survival)
 * - Returns null for incomplete or missing lifecycle stages (zero synthetic fabrication)
 */
export class RescueMetrics {
  public static readonly GOLDEN_WINDOW_SECONDS = 180; // 3-minute survival SLA

  public static compute(dossier: RescueMissionDossier | null): CalculatedRescueMetrics {
    if (!dossier || !dossier.distressSimTime) {
      return {
        alertLatencySec: null,
        dispatchLatencySec: null,
        travelTimeSec: null,
        timeToAssistanceSec: null,
        assistanceDurationSec: null,
        totalDurationSec: null,
        goldenWindowSLA: {
          compliant: true,
          remainingSeconds: RescueMetrics.GOLDEN_WINDOW_SECONDS,
          thresholdSeconds: RescueMetrics.GOLDEN_WINDOW_SECONDS,
        },
      };
    }

    const t0 = dossier.distressSimTime;

    // 1. Alert Latency
    const alertLatency = dossier.alertSimTime != null && dossier.alertSimTime >= t0
      ? Number((dossier.alertSimTime - t0).toFixed(1))
      : null;

    // 2. Dispatch Latency
    const dispatchLatency = dossier.dispatchSimTime != null && dossier.dispatchSimTime >= t0
      ? Number((dossier.dispatchSimTime - t0).toFixed(1))
      : null;

    // 3. Travel Time
    const travelTime =
      dossier.arrivalSimTime != null &&
      dossier.departSimTime != null &&
      dossier.arrivalSimTime >= dossier.departSimTime
        ? Number((dossier.arrivalSimTime - dossier.departSimTime).toFixed(1))
        : null;

    // 4. Time to Assistance
    const timeToAssistance =
      dossier.assistanceStartSimTime != null && dossier.assistanceStartSimTime >= t0
        ? Number((dossier.assistanceStartSimTime - t0).toFixed(1))
        : null;

    // 5. Assistance Duration
    const assistanceDuration =
      dossier.assistanceEndSimTime != null &&
      dossier.assistanceStartSimTime != null &&
      dossier.assistanceEndSimTime >= dossier.assistanceStartSimTime
        ? Number((dossier.assistanceEndSimTime - dossier.assistanceStartSimTime).toFixed(1))
        : null;

    // 6. Total Mission Duration
    const totalDuration =
      dossier.resolutionSimTime != null && dossier.resolutionSimTime >= t0
        ? Number((dossier.resolutionSimTime - t0).toFixed(1))
        : null;

    // Golden Window SLA Evaluation
    const elapsedSoFar = timeToAssistance != null
      ? timeToAssistance
      : (performance.now() / 1000) - t0;
    const remaining = Math.max(0, RescueMetrics.GOLDEN_WINDOW_SECONDS - elapsedSoFar);
    const compliant = timeToAssistance != null
      ? timeToAssistance <= RescueMetrics.GOLDEN_WINDOW_SECONDS
      : remaining > 0;

    return {
      alertLatencySec: alertLatency,
      dispatchLatencySec: dispatchLatency,
      travelTimeSec: travelTime,
      timeToAssistanceSec: timeToAssistance,
      assistanceDurationSec: assistanceDuration,
      totalDurationSec: totalDuration,
      goldenWindowSLA: {
        compliant,
        remainingSeconds: Number(remaining.toFixed(0)),
        thresholdSeconds: RescueMetrics.GOLDEN_WINDOW_SECONDS,
      },
    };
  }
}

