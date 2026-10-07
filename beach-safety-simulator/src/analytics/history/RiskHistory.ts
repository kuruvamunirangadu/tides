import { BeachRiskOverview } from '../../models/Risk';
import { RiskSample, ZoneMetrics } from '../metrics/Types';

export class RiskHistory {
  private samples: RiskSample[] = [];
  private maxSamples: number = 100;
  private peakScore: number = 0;
  private timeAtCriticalSec: number = 0;
  private timeAtHighSec: number = 0;
  private zoneMetricsMap: Map<string, ZoneMetrics> = new Map();

  public sample(
    simTime: number,
    timeDisplay: string,
    deltaTimeSec: number,
    riskOverview?: BeachRiskOverview
  ): void {
    if (!riskOverview) return;

    const overallScore = riskOverview.overallBeachRiskScore;
    const overallCat = riskOverview.overallCategory;
    this.peakScore = Math.max(this.peakScore, overallScore);

    if (overallCat === 'CRITICAL') {
      this.timeAtCriticalSec += deltaTimeSec;
    } else if (overallCat === 'HIGH') {
      this.timeAtHighSec += deltaTimeSec;
    }

    const zoneScores: Record<string, number> = {};
    for (const [zId, zAssess] of Object.entries(riskOverview.zoneAssessments)) {
      zoneScores[zId] = zAssess.overallScore;

      let zm = this.zoneMetricsMap.get(zId);
      if (!zm) {
        zm = {
          zoneId: zId,
          zoneName: zAssess.zoneName,
          currentRisk: zAssess.category,
          currentScore: zAssess.overallScore,
          peakRisk: zAssess.category,
          peakScore: zAssess.overallScore,
          averageScore: zAssess.overallScore,
          timeAtHighRiskSeconds: 0,
          timeAtCriticalRiskSeconds: 0,
          incidentsCount: 0,
          peopleExposed: zAssess.swimmerCount,
          warningsIssued: 0,
          evacuationsCount: 0,
        };
        this.zoneMetricsMap.set(zId, zm);
      }

      zm.currentRisk = zAssess.category;
      zm.currentScore = zAssess.overallScore;
      zm.peopleExposed = Math.max(zm.peopleExposed, zAssess.swimmerCount);

      if (zAssess.overallScore > zm.peakScore) {
        zm.peakScore = zAssess.overallScore;
        zm.peakRisk = zAssess.category;
      }

      if (zAssess.category === 'CRITICAL') {
        zm.timeAtCriticalRiskSeconds += deltaTimeSec;
      } else if (zAssess.category === 'HIGH') {
        zm.timeAtHighRiskSeconds += deltaTimeSec;
      }
    }

    const last = this.samples[this.samples.length - 1];
    if (!last || simTime - last.simulationTime >= 5 || Math.abs(last.overallScore - overallScore) > 5) {
      this.samples.push({
        simulationTime: simTime,
        timeDisplay,
        overallScore,
        overallCategory: overallCat,
        zoneScores,
      });

      if (this.samples.length > this.maxSamples) {
        this.samples.shift();
      }
    }
  }

  public recordZoneIncident(zoneId: string): void {
    const zm = this.zoneMetricsMap.get(zoneId);
    if (zm) zm.incidentsCount += 1;
  }

  public recordZoneWarning(zoneId: string): void {
    const zm = this.zoneMetricsMap.get(zoneId);
    if (zm) zm.warningsIssued += 1;
  }

  public recordZoneEvacuation(zoneId: string): void {
    const zm = this.zoneMetricsMap.get(zoneId);
    if (zm) zm.evacuationsCount += 1;
  }

  public getSamples(): RiskSample[] {
    return [...this.samples];
  }

  public getZoneMetrics(): ZoneMetrics[] {
    return Array.from(this.zoneMetricsMap.values());
  }

  public getPeakRisk() {
    return {
      peakScore: this.peakScore,
      timeAtCriticalSec: Math.round(this.timeAtCriticalSec),
      timeAtHighSec: Math.round(this.timeAtHighSec),
    };
  }

  public reset(): void {
    this.samples = [];
    this.peakScore = 0;
    this.timeAtCriticalSec = 0;
    this.timeAtHighSec = 0;
    this.zoneMetricsMap.clear();
  }
}
