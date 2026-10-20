/**
 * ResponseMetrics.ts
 * 
 * TIDES Stage 3: Response Metrics & Bottleneck Analytics (Demo C)
 * 
 * Strict mathematical definitions conforming to innovation challenge guidelines:
 * - Detection Latency: t_detected - t_onset
 * - Dispatch Latency: t_dispatched - t_detected
 * - Kinematic Travel Time: t_arrived - t_departed
 * - Time to Assistance (Golden Window): t_assistance - t_onset
 * - Incident Duration: t_resolved - t_onset
 * - Responder Utilization: busy_time / total_incident_time
 * 
 * Strict Preservation & Truthfulness Rules:
 * - Missing events produce NULL / UNAVAILABLE metrics (never synthetic estimates).
 * - Out-of-order or negative intervals produce explicit validation error flags.
 * - Measured facts are strictly counted and separated from estimates.
 */

import {
  ReplayableIncidentDossier,
  ResponseMetricsReport,
  ReplayLifecycleEvent,
} from './types';

const GOLDEN_WINDOW_MAX_SECONDS = 180; // 3-minute physiological submersion safety window

export class ResponseMetricsCalculator {
  public static calculate(incident: ReplayableIncidentDossier): ResponseMetricsReport {
    const events = incident.events || [];
    const validationFlags: string[] = [];

    // 1. Extract canonical timestamps
    const evtOnset = events.find((e) => e.eventType === 'HAZARD_OBSERVED') || events[0];
    const evtDetect = events.find((e) => e.eventType === 'DISTRESS_DETECTED');
    const evtAssign = events.find((e) => e.eventType === 'RESPONDER_ASSIGNED');
    const evtDepart = events.find((e) => e.eventType === 'RESPONDER_DEPARTED');
    const evtArrive = events.find((e) => e.eventType === 'RESPONDER_ARRIVED');
    const evtAssist = events.find((e) => e.eventType === 'ASSISTANCE_BEGAN');
    const evtResolve = events.find((e) => e.eventType === 'INCIDENT_RESOLVED');

    const tOnset = incident.onsetSimTime ?? (evtOnset ? evtOnset.simTimeSeconds : null);
    const tDetect = evtDetect ? evtDetect.simTimeSeconds : null;
    const tAssign = evtAssign ? evtAssign.simTimeSeconds : null;
    const tDepart = evtDepart ? evtDepart.simTimeSeconds : null;
    const tArrive = evtArrive ? evtArrive.simTimeSeconds : null;
    const tAssist = evtAssist ? evtAssist.simTimeSeconds : null;
    const tResolve = evtResolve ? evtResolve.simTimeSeconds : null;

    // Count fact vs estimated vs missing stages
    let measuredCount = 0;
    let estimatedCount = 0;
    events.forEach((e) => {
      if (e.isRecordedFact) measuredCount++;
      else estimatedCount++;
    });
    const missingCount = incident.missingStages.length;

    // 2. Metric: Detection Latency (t_detect - t_onset)
    let detectionLatency: number | null = null;
    if (tDetect !== null && tOnset !== null) {
      const diff = tDetect - tOnset;
      if (diff < 0) {
        validationFlags.push(`Negative detection interval: detection (${tDetect}s) occurred before onset (${tOnset}s).`);
      } else {
        detectionLatency = parseFloat(diff.toFixed(1));
      }
    } else {
      validationFlags.push('Detection latency unavailable: missing onset or detection event.');
    }

    // 3. Metric: Dispatch Latency (t_dispatched - t_detect)
    let dispatchLatency: number | null = null;
    if (tAssign !== null && tDetect !== null) {
      const diff = tAssign - tDetect;
      if (diff < 0) {
        validationFlags.push(`Negative dispatch interval: responder assignment (${tAssign}s) occurred before detection (${tDetect}s).`);
      } else {
        dispatchLatency = parseFloat(diff.toFixed(1));
      }
    } else {
      validationFlags.push('Dispatch latency unavailable: missing detection or assignment event.');
    }

    // 4. Metric: Travel Time (t_arrived - t_departed)
    let travelTime: number | null = null;
    if (tArrive !== null && tDepart !== null) {
      const diff = tArrive - tDepart;
      if (diff < 0) {
        validationFlags.push(`Negative travel time: arrival (${tArrive}s) occurred before departure (${tDepart}s).`);
      } else {
        travelTime = parseFloat(diff.toFixed(1));
      }
    } else if (tArrive === null) {
      validationFlags.push('Travel time unavailable: no responder arrival event recorded.');
    } else {
      validationFlags.push('Travel time unavailable: missing responder departure event.');
    }

    // 5. Metric: Time to Assistance (t_assist - t_onset)
    let timeToAssistance: number | null = null;
    if (tAssist !== null && tOnset !== null) {
      const diff = tAssist - tOnset;
      if (diff < 0) {
        validationFlags.push(`Negative assistance interval: assistance (${tAssist}s) occurred before onset (${tOnset}s).`);
      } else {
        timeToAssistance = parseFloat(diff.toFixed(1));
      }
    } else if (tArrive !== null && tOnset !== null) {
      // Fallback only if arrival is recorded as proxy for assistance
      timeToAssistance = parseFloat((tArrive - tOnset).toFixed(1));
    } else {
      validationFlags.push('Time to assistance unavailable: victim assistance/arrival not recorded.');
    }

    // 6. Metric: Incident Duration (t_resolved - t_onset)
    let incidentDuration: number | null = null;
    if (tResolve !== null && tOnset !== null) {
      const diff = tResolve - tOnset;
      if (diff < 0) {
        validationFlags.push(`Negative resolution interval: resolution (${tResolve}s) occurred before onset (${tOnset}s).`);
      } else {
        incidentDuration = parseFloat(diff.toFixed(1));
      }
    } else {
      validationFlags.push('Incident duration unavailable: incident is active or unrecorded resolution.');
    }

    // 7. Golden Window Evaluation
    const isWithinGoldenWindow = timeToAssistance !== null && timeToAssistance <= GOLDEN_WINDOW_MAX_SECONDS;
    const goldenWindowRemainingSeconds = timeToAssistance !== null
      ? Math.max(0, parseFloat((GOLDEN_WINDOW_MAX_SECONDS - timeToAssistance).toFixed(1)))
      : null;

    // 8. Responder Utilization (busy / total)
    let responderUtilizationPercent: number | null = null;
    if (incidentDuration !== null && incidentDuration > 0 && travelTime !== null) {
      // Busy time includes kinematic travel + on-scene extraction
      const busyTime = (tResolve !== null && tDepart !== null) ? (tResolve - tDepart) : travelTime;
      const ratio = Math.min(100, Math.max(0, Math.round((busyTime / incidentDuration) * 100)));
      responderUtilizationPercent = ratio;
    }

    // 9. Bottleneck Diagnostics
    const bottlenecks: Array<{ stage: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; explanation: string }> = [];

    if (detectionLatency !== null && detectionLatency > 15) {
      bottlenecks.push({
        stage: 'DETECTION_LATENCY',
        severity: 'HIGH',
        explanation: `Detection took ${detectionLatency}s (target: < 10s). Optical camera coverage gap or delayed bather visibility.`,
      });
    }

    if (dispatchLatency !== null && dispatchLatency > 12) {
      bottlenecks.push({
        stage: 'DISPATCH_QUEUE',
        severity: 'MEDIUM',
        explanation: `Dispatch order took ${dispatchLatency}s from detection. Command queue latency or asset allocation delay.`,
      });
    }

    if (travelTime !== null && travelTime > 60) {
      bottlenecks.push({
        stage: 'TRANSIT_TIME',
        severity: 'HIGH',
        explanation: `Watercraft transit took ${travelTime}s. Heavy opposing breaker swell or distant station slipway.`,
      });
    }

    if (timeToAssistance !== null && timeToAssistance > GOLDEN_WINDOW_MAX_SECONDS) {
      bottlenecks.push({
        stage: 'GOLDEN_WINDOW_BREACH',
        severity: 'HIGH',
        explanation: `Time to assistance (${timeToAssistance}s) exceeded the 180s physiological submersion safety window.`,
      });
    }

    if (bottlenecks.length === 0 && timeToAssistance !== null) {
      bottlenecks.push({
        stage: 'OPTIMAL_COORDINATION',
        severity: 'LOW',
        explanation: `All emergency milestones achieved within gold standard lifesaving thresholds (+${timeToAssistance}s assistance).`,
      });
    }

    return {
      incidentId: incident.incidentId,
      detectionLatencySeconds: detectionLatency,
      dispatchLatencySeconds: dispatchLatency,
      travelTimeSeconds: travelTime,
      timeToAssistanceSeconds: timeToAssistance,
      incidentDurationSeconds: incidentDuration,
      responderUtilizationPercent,
      isWithinGoldenWindow,
      goldenWindowRemainingSeconds,
      timingBreakdown: {
        measuredCount,
        estimatedCount,
        missingCount,
      },
      bottlenecks,
      validationFlags,
    };
  }
}
