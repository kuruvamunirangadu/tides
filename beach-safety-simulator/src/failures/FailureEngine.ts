import { FailureManager } from './FailureManager';
import { FallbackEngine, FallbackStrategy } from './fallback/FallbackEngine';
import { ResilienceCalculator, ResilienceDimensions } from './metrics/ResilienceMetrics';
import { FailureEvent, FailureType, FailureSeverity } from './types/FailureTypes';
import { EmergencyResourceManager } from '../emergency/resources/ResourceManager';

export class FailureEngine {
  private manager: FailureManager = new FailureManager();
  private totalFailuresInjected: number = 0;
  private failuresDetected: number = 0;
  private fallbacksTriggered: number = 0;
  private incidentsUnderFailure: number = 0;
  private incidentsResolvedUnderFailure: number = 0;

  public getManager(): FailureManager {
    return this.manager;
  }

  public injectFailure(
    type: FailureType,
    name: string,
    description: string,
    severity: FailureSeverity = 'HIGH',
    targetId?: string,
    duration?: number,
    parameters?: Record<string, any>
  ): FailureEvent {
    this.totalFailuresInjected += 1;
    this.failuresDetected += 1;
    this.fallbacksTriggered += 1;
    return this.manager.injectFailure(type, name, description, severity, targetId, duration, parameters);
  }

  public removeFailure(id: string): void {
    this.manager.removeFailure(id);
  }

  public clearAll(): void {
    this.manager.clearAllFailures();
  }

  public tick(
    emergencyResourceMgr: EmergencyResourceManager,
    _currentTime: number,
    _deltaTime: number
  ): {
    activeFailures: FailureEvent[];
    fallbackStrategy: FallbackStrategy;
    resilience: ResilienceDimensions;
    isNightMode: boolean;
  } {
    const activeFailures = this.manager.getActiveFailures();
    const fleet = emergencyResourceMgr.getAll();
    const availLifeguards = fleet.filter((r) => r.type === 'LIFEGUARD' && r.status === 'AVAILABLE').length;
    const availDrones = fleet.filter((r) => r.type === 'DRONE' && r.status === 'AVAILABLE').length;

    // Evaluate degradation & fallback strategy
    const fallbackStrategy = FallbackEngine.evaluateDegradation(
      activeFailures,
      availLifeguards,
      availDrones
    );

    // Calculate multidimensional resilience
    const resilience = ResilienceCalculator.calculateResilience(
      this.totalFailuresInjected,
      this.failuresDetected,
      this.fallbacksTriggered,
      this.incidentsResolvedUnderFailure,
      this.incidentsUnderFailure
    );

    return {
      activeFailures,
      fallbackStrategy,
      resilience,
      isNightMode: this.manager.getNightMode(),
    };
  }

  public recordIncidentUnderFailure(resolved: boolean): void {
    this.incidentsUnderFailure += 1;
    if (resolved) {
      this.incidentsResolvedUnderFailure += 1;
    }
  }

  public reset(): void {
    this.manager.clearAllFailures();
    this.totalFailuresInjected = 0;
    this.failuresDetected = 0;
    this.fallbacksTriggered = 0;
    this.incidentsUnderFailure = 0;
    this.incidentsResolvedUnderFailure = 0;
  }
}
