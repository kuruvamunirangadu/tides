/**
 * src/resilience/ResilienceOrchestrator.ts
 * 
 * TIDES — Phase 10: Resilience, Fault Tolerance & Disaster Recovery
 * 
 * Central Resilience & Recovery Orchestrator:
 * - Coordinates health monitoring, reliable event processing, offline buffering,
 *   degraded operations, disaster recovery checkpoints, and controlled fault injection.
 * - Surfaces unified metrics and actions to the Command Center HUD.
 */

import { SystemHealthMonitor } from './SystemHealthMonitor';
import { ReliableEventProcessor } from './ReliableEventProcessor';
import { OfflineResilienceManager } from './OfflineResilienceManager';
import { DegradedModeManager } from './DegradedModeManager';
import { DisasterRecoveryManager } from './DisasterRecoveryManager';
import { ControlledFaultInjector } from './ControlledFaultInjector';
import {
  FaultInjectionScenarioType,
  ResilienceAuditEntry,
} from './resilience.types';

export class ResilienceOrchestrator {
  private static instance: ResilienceOrchestrator | null = null;

  private healthMonitor: SystemHealthMonitor;
  private eventProcessor: ReliableEventProcessor;
  private offlineManager: OfflineResilienceManager;
  private degradedManager: DegradedModeManager;
  private recoveryManager: DisasterRecoveryManager;
  private faultInjector: ControlledFaultInjector;

  private auditLog: ResilienceAuditEntry[] = [];

  constructor() {
    this.healthMonitor = SystemHealthMonitor.getInstance();
    this.eventProcessor = ReliableEventProcessor.getInstance();
    this.offlineManager = OfflineResilienceManager.getInstance();
    this.degradedManager = DegradedModeManager.getInstance();
    this.recoveryManager = DisasterRecoveryManager.getInstance();
    this.faultInjector = ControlledFaultInjector.getInstance();

    this.recordAudit(
      'OP-SYSTEM',
      'TRIGGER_HEALTH_CHECK',
      'SYSTEM',
      'RUSHIKONDA',
      'Phase 10 Resilience Orchestrator initialized.',
      'SUCCESS'
    );
  }

  public static getInstance(): ResilienceOrchestrator {
    if (!ResilienceOrchestrator.instance) {
      ResilienceOrchestrator.instance = new ResilienceOrchestrator();
    }
    return ResilienceOrchestrator.instance;
  }

  public reset(): void {
    this.healthMonitor.reset();
    this.eventProcessor.reset();
    this.offlineManager.reset();
    this.degradedManager.reset();
    this.recoveryManager.reset();
    this.faultInjector.reset();
    this.auditLog = [];
  }

  public getHealthMonitor(): SystemHealthMonitor {
    return this.healthMonitor;
  }

  public getEventProcessor(): ReliableEventProcessor {
    return this.eventProcessor;
  }

  public getOfflineManager(): OfflineResilienceManager {
    return this.offlineManager;
  }

  public getDegradedManager(): DegradedModeManager {
    return this.degradedManager;
  }

  public getRecoveryManager(): DisasterRecoveryManager {
    return this.recoveryManager;
  }

  public getFaultInjector(): ControlledFaultInjector {
    return this.faultInjector;
  }

  /**
   * Generates a high-level operational overview for the command center HUD.
   */
  public getResilienceSummary() {
    const healthSummary = this.healthMonitor.getSummary();
    const deadLetterQueue = this.eventProcessor.getDeadLetterQueue();
    const processedEvents = this.eventProcessor.getProcessedEvents();
    const degradedStates = this.degradedManager.getAllDegradedStates();
    const checkpoints = this.recoveryManager.getCheckpoints();
    const latestVerifiedCkpt = this.recoveryManager.getLatestVerifiedCheckpoint();
    const recoveryObjectives = this.recoveryManager.getRecoveryObjectives();
    const totalBuffered = this.offlineManager.getTotalBufferedCount();

    return {
      health: healthSummary,
      activeDegradedCount: degradedStates.filter((d) => d.isDegraded).length,
      deadLetterCount: deadLetterQueue.length,
      totalProcessedEvents: processedEvents.length,
      totalBufferedOfflineEvents: totalBuffered,
      checkpointsCount: checkpoints.length,
      latestCheckpoint: latestVerifiedCkpt,
      rpoSeconds: recoveryObjectives.rpoSeconds,
      rtoSeconds: recoveryObjectives.rtoSeconds,
      isTestMode: this.faultInjector.isTestMode(),
    };
  }

  /**
   * Creates a snapshot checkpoint from current platform state.
   */
  public createSnapshot(
    siteId: string = 'RUSHIKONDA',
    platformState: any,
    operatorId: string = 'OP-COMMAND-CENTER'
  ) {
    const ckpt = this.recoveryManager.createCheckpoint(siteId, platformState, operatorId);
    this.recordAudit(
      operatorId,
      'CREATE_DISASTER_CHECKPOINT',
      ckpt.checkpointId,
      siteId,
      `Created checkpoint with ${ckpt.recordCounts.incidents} incidents (Checksum: ${ckpt.checksum}).`,
      'SUCCESS'
    );
    return ckpt;
  }

  /**
   * Executes an isolated restoration verification drill on a checkpoint.
   */
  public verifyRestorationDrill(checkpointId: string, operatorId: string = 'OP-COMMAND-CENTER') {
    const result = this.recoveryManager.runIsolatedRestorationTest(checkpointId);
    this.recordAudit(
      operatorId,
      'RUN_ISOLATED_RESTORATION_TEST',
      checkpointId,
      'RUSHIKONDA',
      `Restoration drill outcome: ${result.outcome} (${result.durationMs}ms).`,
      result.outcome === 'RESTORATION_VERIFIED' ? 'SUCCESS' : 'WARNING'
    );
    return result;
  }

  /**
   * Executes a controlled fault-injection scenario.
   */
  public async runFaultInjectionScenario(
    type: FaultInjectionScenarioType,
    operatorId: string = 'OP-COMMAND-CENTER'
  ) {
    try {
      const scenario = await this.faultInjector.executeScenario(type);
      this.recordAudit(
        operatorId,
        'EXECUTE_FAULT_INJECTION_SCENARIO',
        scenario.targetComponentId,
        'RUSHIKONDA',
        `Ran scenario ${scenario.name}: ${scenario.status}.`,
        scenario.status === 'PASSED' ? 'SUCCESS' : 'WARNING'
      );
      return scenario;
    } catch (err: any) {
      this.recordAudit(
        operatorId,
        'EXECUTE_FAULT_INJECTION_SCENARIO',
        type,
        'RUSHIKONDA',
        `Scenario rejected: ${err?.message}`,
        'REJECTED'
      );
      throw err;
    }
  }

  public setTestMode(enabled: boolean, operatorId: string = 'OP-COMMAND-CENTER') {
    this.faultInjector.setTestMode(enabled);
    this.recordAudit(
      operatorId,
      'TRIGGER_HEALTH_CHECK',
      'FAULT_INJECTOR',
      'RUSHIKONDA',
      `Test mode set to ${enabled}.`,
      'SUCCESS'
    );
  }

  private recordAudit(
    operatorId: string,
    action: ResilienceAuditEntry['action'],
    targetComponentId: string,
    siteId: string,
    details: string,
    outcome: ResilienceAuditEntry['outcome']
  ): void {
    this.auditLog.unshift({
      auditId: `AUD-RES-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      operatorId,
      action,
      targetComponentId,
      siteId,
      details,
      outcome,
    });
    if (this.auditLog.length > 200) {
      this.auditLog.pop();
    }
  }

  public getAuditLog(): ResilienceAuditEntry[] {
    return [...this.auditLog];
  }
}

