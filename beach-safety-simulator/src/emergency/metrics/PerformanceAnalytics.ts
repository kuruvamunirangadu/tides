import { ResponseMetrics, PerformanceAnalytics } from '../models/ResponseMetrics';
import { EmergencyResource } from '../models/EmergencyResource';

export class PerformanceAnalyticsCalculator {
  private metricsList: ResponseMetrics[] = [];
  private totalEscalations: number = 0;

  public logResolvedMetrics(metrics: ResponseMetrics): void {
    this.metricsList.unshift(metrics);
    if (this.metricsList.length > 50) {
      this.metricsList.pop();
    }
  }

  public recordEscalation(): void {
    this.totalEscalations += 1;
  }

  public getAnalytics(resources: EmergencyResource[]): PerformanceAnalytics {
    const n = this.metricsList.length;

    if (n === 0) {
      return {
        averageDetectionTime: 2.0,
        averageDecisionTime: 2.0,
        averageDispatchTime: 2.0,
        averageArrivalTime: 16.0,
        averageRescueTime: 18.0,
        averageTotalResponseTime: 40.0,
        lifeguardUtilization: this.calculateUtilization(resources, 'LIFEGUARD'),
        droneUtilization: this.calculateUtilization(resources, 'DRONE'),
        boatUtilization: this.calculateUtilization(resources, 'RESCUE_BOAT'),
        ambulanceUtilization: this.calculateUtilization(resources, 'AMBULANCE'),
        policeUtilization: this.calculateUtilization(resources, 'POLICE'),
        incidentResolutionRate: 100,
        escalationRate: 0,
        totalIncidentsResolved: 0,
        totalIncidentsEscalated: this.totalEscalations,
      };
    }

    const sumDetection = this.metricsList.reduce((acc, m) => acc + m.detectionTime, 0);
    const sumDecision = this.metricsList.reduce((acc, m) => acc + m.decisionTime, 0);
    const sumDispatch = this.metricsList.reduce((acc, m) => acc + m.dispatchTime, 0);
    const sumArrival = this.metricsList.reduce((acc, m) => acc + m.arrivalTime, 0);
    const sumRescue = this.metricsList.reduce((acc, m) => acc + (m.rescueTime || 0), 0);
    const sumTotal = this.metricsList.reduce((acc, m) => acc + m.totalResponseTime, 0);

    const totalResolved = this.metricsList.length;
    const totalAll = totalResolved + this.totalEscalations;
    const resRate = totalAll > 0 ? Math.round((totalResolved / totalAll) * 100) : 100;
    const escRate = totalAll > 0 ? Math.round((this.totalEscalations / totalAll) * 100) : 0;

    return {
      averageDetectionTime: Math.round((sumDetection / n) * 10) / 10,
      averageDecisionTime: Math.round((sumDecision / n) * 10) / 10,
      averageDispatchTime: Math.round((sumDispatch / n) * 10) / 10,
      averageArrivalTime: Math.round((sumArrival / n) * 10) / 10,
      averageRescueTime: Math.round((sumRescue / n) * 10) / 10,
      averageTotalResponseTime: Math.round((sumTotal / n) * 10) / 10,
      lifeguardUtilization: this.calculateUtilization(resources, 'LIFEGUARD'),
      droneUtilization: this.calculateUtilization(resources, 'DRONE'),
      boatUtilization: this.calculateUtilization(resources, 'RESCUE_BOAT'),
      ambulanceUtilization: this.calculateUtilization(resources, 'AMBULANCE'),
      policeUtilization: this.calculateUtilization(resources, 'POLICE'),
      incidentResolutionRate: resRate,
      escalationRate: escRate,
      totalIncidentsResolved: totalResolved,
      totalIncidentsEscalated: this.totalEscalations,
    };
  }

  private calculateUtilization(resources: EmergencyResource[], type: string): number {
    const subset = resources.filter((r) => r.type === type);
    if (subset.length === 0) return 0;
    const busyCount = subset.filter((r) => r.status !== 'AVAILABLE').length;
    return Math.round((busyCount / subset.length) * 100);
  }

  public getRecentMetrics(): ResponseMetrics[] {
    return [...this.metricsList];
  }

  public clear(): void {
    this.metricsList = [];
    this.totalEscalations = 0;
  }
}
