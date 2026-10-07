import { IncidentEventChain } from '../EventStore';
import { AnalyticsResponseMetrics, DetectionMetrics, IncidentMetrics } from '../metrics/Types';

export class IncidentHistory {
  private resolvedCount: number = 0;
  private escalatedCount: number = 0;
  private falsePositives: number = 0;
  private falseNegatives: number = 0;

  public recordIncidentResolved(): void {
    this.resolvedCount += 1;
  }

  public recordIncidentEscalated(): void {
    this.escalatedCount += 1;
  }

  public recordFalsePositive(): void {
    this.falsePositives += 1;
  }

  public recordFalseNegative(): void {
    this.falseNegatives += 1;
  }

  public computeDetectionMetrics(
    totalActual: number,
    detected: number,
    incidentChains: IncidentEventChain[]
  ): DetectionMetrics {
    const act = Math.max(1, totalActual);
    const detectionRate = Math.min(100, Math.round((detected / act) * 100));
    const fpRate = Math.round((this.falsePositives / Math.max(1, detected + this.falsePositives)) * 100);
    const fnRate = Math.round((this.falseNegatives / act) * 100);

    const latencies = incidentChains.map((c) => c.latencies.detectionSec).filter((l) => l > 0);
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 8;

    return {
      totalActualIncidents: totalActual,
      detectedIncidents: detected,
      falsePositives: this.falsePositives,
      falseNegatives: this.falseNegatives,
      detectionRate,
      falsePositiveRate: fpRate,
      falseNegativeRate: fnRate,
      averageDetectionLatency: Number(avgLatency.toFixed(1)),
    };
  }

  public computeResponseMetrics(incidentChains: IncidentEventChain[]): AnalyticsResponseMetrics {
    if (incidentChains.length === 0) {
      return {
        averageDetectionLatency: 8,
        averageDecisionLatency: 2,
        averageDispatchLatency: 12,
        averageArrivalLatency: 28,
        averageRescueDuration: 140,
        averageTotalResponseTime: 190,
        totalIncidentsTracked: 0,
        fastestResponseTime: 45,
        slowestResponseTime: 240,
      };
    }

    let sumDet = 0, sumDec = 0, sumDisp = 0, sumArr = 0, sumRes = 0, sumTot = 0;
    let minTot = Infinity, maxTot = 0;

    for (const c of incidentChains) {
      const l = c.latencies;
      sumDet += l.detectionSec;
      sumDec += l.decisionSec;
      sumDisp += l.dispatchSec;
      sumArr += l.arrivalSec;
      sumRes += l.rescueSec;
      sumTot += l.totalResponseSec;

      if (l.totalResponseSec > 0) {
        minTot = Math.min(minTot, l.totalResponseSec);
        maxTot = Math.max(maxTot, l.totalResponseSec);
      }
    }

    const count = incidentChains.length;
    return {
      averageDetectionLatency: Number((sumDet / count).toFixed(1)),
      averageDecisionLatency: Number((sumDec / count).toFixed(1)),
      averageDispatchLatency: Number((sumDisp / count).toFixed(1)),
      averageArrivalLatency: Number((sumArr / count).toFixed(1)),
      averageRescueDuration: Number((sumRes / count).toFixed(1)),
      averageTotalResponseTime: Number((sumTot / count).toFixed(1)),
      totalIncidentsTracked: count,
      fastestResponseTime: minTot === Infinity ? 45 : Math.round(minTot),
      slowestResponseTime: maxTot === 0 ? 190 : Math.round(maxTot),
    };
  }

  public computeIncidentMetrics(
    totalIncidents: number,
    criticalCount: number,
    highCount: number,
    moderateCount: number,
    activeDistressed: number
  ): IncidentMetrics {
    return {
      total: totalIncidents,
      critical: criticalCount,
      high: highCount,
      moderate: moderateCount,
      low: Math.max(0, totalIncidents - criticalCount - highCount - moderateCount),
      resolved: this.resolvedCount,
      unresolved: Math.max(0, totalIncidents - this.resolvedCount),
      escalated: this.escalatedCount,
      falsePositives: this.falsePositives,
      falseNegatives: this.falseNegatives,
      activeDistressedCount: activeDistressed,
    };
  }

  public reset(): void {
    this.resolvedCount = 0;
    this.escalatedCount = 0;
    this.falsePositives = 0;
    this.falseNegatives = 0;
  }
}
