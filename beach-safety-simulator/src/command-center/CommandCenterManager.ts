import { BeachStatus } from './models/BeachStatus';
import { CommandRole, ROLE_PERMISSIONS } from './models/CommandRole';
import { CommandAction, CommandActionType } from './models/CommandAction';
import { CommandAuditEntry } from './models/CommandAuditLog';
import { SimulationState } from '../models/Beach';

export interface MultiBeachCommandState {
  beaches: BeachStatus[];
  selectedBeachId: string;
  activeRole: CommandRole;
  operatorId: string;
  auditLogs: CommandAuditEntry[];
  totalIncidentsCount: number;
  criticalBeachesCount: number;
  totalLifeguardsAvailable: number;
  totalLifeguardsFleet: number;
  totalDronesAvailable: number;
  totalDronesFleet: number;
  totalAmbulancesAvailable: number;
  totalAmbulancesFleet: number;
  totalPoliceAvailable: number;
  totalPoliceFleet: number;
}

export class CommandCenterManager {
  private beaches: Map<string, BeachStatus> = new Map();
  private selectedBeachId: string = 'RK-BEACH';
  private activeRole: CommandRole = 'COMMAND_OPERATOR';
  private operatorId: string = 'OP-VIZAG-01';
  private auditLogs: CommandAuditEntry[] = [];
  private actionHistory: CommandAction[] = [];

  constructor() {
    this.initializeMultiBeachNetwork();
    this.seedInitialAuditLogs();
  }

  private initializeMultiBeachNetwork(): void {
    const defaultBeaches: BeachStatus[] = [
      {
        beachId: 'RK-BEACH',
        name: 'Ramakrishna (RK) Beach, Vizag',
        location: { latitude: 17.7125, longitude: 83.3180 },
        riskLevel: 'HIGH',
        riskScore: 78,
        activeHazards: 3,
        activeIncidents: 1,
        peopleExposed: 87,
        peopleWarned: 64,
        availableLifeguards: 5,
        totalLifeguards: 8,
        availableDrones: 2,
        totalDrones: 4,
        sensorHealth: 94,
        cameraHealth: 90,
        predictedRisk: 'HIGH → CRITICAL (+10m)',
        predictedRiskScore: 84,
        lastUpdated: Date.now(),
        timeDisplay: '08:00',
      },
      {
        beachId: 'RUSHIKONDA',
        name: 'Rushikonda Blue Flag Beach',
        location: { latitude: 17.7815, longitude: 83.3855 },
        riskLevel: 'MODERATE',
        riskScore: 48,
        activeHazards: 1,
        activeIncidents: 0,
        peopleExposed: 142,
        peopleWarned: 110,
        availableLifeguards: 6,
        totalLifeguards: 8,
        availableDrones: 2,
        totalDrones: 2,
        sensorHealth: 98,
        cameraHealth: 100,
        predictedRisk: 'MODERATE STABLE (+30m)',
        predictedRiskScore: 46,
        lastUpdated: Date.now(),
        timeDisplay: '08:00',
      },
      {
        beachId: 'BHEEMILI',
        name: 'Bheemunipatnam (Bheemili) Beach',
        location: { latitude: 17.8912, longitude: 83.4542 },
        riskLevel: 'CRITICAL',
        riskScore: 89,
        activeHazards: 4,
        activeIncidents: 2,
        peopleExposed: 65,
        peopleWarned: 52,
        availableLifeguards: 2,
        totalLifeguards: 6,
        availableDrones: 1,
        totalDrones: 2,
        sensorHealth: 78,
        cameraHealth: 80,
        predictedRisk: 'CRITICAL ESCALATING (+15m)',
        predictedRiskScore: 92,
        lastUpdated: Date.now(),
        timeDisplay: '08:00',
      },
      {
        beachId: 'MANGAMARIPETA',
        name: 'Mangamaripeta Natural Arch Beach',
        location: { latitude: 17.8105, longitude: 83.4020 },
        riskLevel: 'LOW',
        riskScore: 24,
        activeHazards: 0,
        activeIncidents: 0,
        peopleExposed: 38,
        peopleWarned: 20,
        availableLifeguards: 3,
        totalLifeguards: 4,
        availableDrones: 1,
        totalDrones: 1,
        sensorHealth: 100,
        cameraHealth: 100,
        predictedRisk: 'LOW STABLE (+60m)',
        predictedRiskScore: 22,
        lastUpdated: Date.now(),
        timeDisplay: '08:00',
      },
      {
        beachId: 'YARADA',
        name: 'Yarada Dolphin Nose Beach',
        location: { latitude: 17.6530, longitude: 83.2710 },
        riskLevel: 'HIGH',
        riskScore: 72,
        activeHazards: 2,
        activeIncidents: 1,
        peopleExposed: 45,
        peopleWarned: 35,
        availableLifeguards: 3,
        totalLifeguards: 4,
        availableDrones: 1,
        totalDrones: 2,
        sensorHealth: 88,
        cameraHealth: 85,
        predictedRisk: 'HIGH → HIGH (+30m)',
        predictedRiskScore: 74,
        lastUpdated: Date.now(),
        timeDisplay: '08:00',
      },
    ];

    defaultBeaches.forEach((b) => this.beaches.set(b.beachId, b));
  }

  private seedInitialAuditLogs(): void {
    this.auditLogs = [
      {
        id: 'LOG-001',
        timestamp: Date.now() - 120000,
        timeDisplay: '07:58:00',
        beachId: 'RK-BEACH',
        beachName: 'RK Beach',
        category: 'HAZARD',
        severity: 'ALERT',
        actor: 'HAZARD_ENGINE',
        summary: 'Offshore Rip Current detected (Velocity: 1.4 m/s in Zone A)',
        causalChain: ['ADCP Sensor velocity spike', 'Hazard Engine threshold triggered'],
      },
      {
        id: 'LOG-002',
        timestamp: Date.now() - 90000,
        timeDisplay: '07:58:30',
        beachId: 'RK-BEACH',
        beachName: 'RK Beach',
        category: 'RISK',
        severity: 'CRITICAL',
        actor: 'RISK_ENGINE',
        summary: 'Zone A Risk evaluated to CRITICAL (Score: 87/100, 78 Swimmers exposed)',
        causalChain: ['Hazard: Rip Current', 'Exposure: 78 swimmers', 'Vulnerability: HIGH (6 children)'],
      },
      {
        id: 'LOG-003',
        timestamp: Date.now() - 60000,
        timeDisplay: '07:59:00',
        beachId: 'RK-BEACH',
        beachName: 'RK Beach',
        category: 'OPERATOR_DECISION',
        severity: 'INFO',
        actor: 'OP-VIZAG-01',
        summary: 'Operator acknowledged Risk escalation and authorized Rapid UAV-01 dispatch',
        causalChain: ['Decision Engine suggestion', 'Operator authorization'],
      },
      {
        id: 'LOG-004',
        timestamp: Date.now() - 30000,
        timeDisplay: '07:59:30',
        beachId: 'RK-BEACH',
        beachName: 'RK Beach',
        category: 'DRONE_MISSION',
        severity: 'INFO',
        actor: 'UAV-01',
        summary: 'UAV-01 on station at Zone A. Confirmed distressed swimmer with 0.94 confidence',
        causalChain: ['Drone arrive on station', 'Top-down optical tracking', 'Bayesian fusion with CCTV'],
      },
    ];
  }

  public getActiveRole(): CommandRole {
    return this.activeRole;
  }

  public setActiveRole(role: CommandRole): void {
    this.activeRole = role;
  }

  public getSelectedBeachId(): string {
    return this.selectedBeachId;
  }

  public setSelectedBeachId(beachId: string): void {
    if (this.beaches.has(beachId)) {
      this.selectedBeachId = beachId;
    }
  }

  public getAllBeaches(): BeachStatus[] {
    return Array.from(this.beaches.values());
  }

  public getAuditLogs(): CommandAuditEntry[] {
    return this.auditLogs;
  }

  /**
   * Execute an authorized Command Action
   */
  public executeAction(
    type: CommandActionType,
    targetId: string,
    reason?: string,
    beachId?: string
  ): { success: boolean; message: string; action?: CommandAction } {
    const perms = ROLE_PERMISSIONS[this.activeRole];
    const bId = beachId || this.selectedBeachId;
    const beach = this.beaches.get(bId);

    // Permission Verification
    if (type === 'ACKNOWLEDGE_INCIDENT' && !perms.canAcknowledge) {
      return { success: false, message: `Permission Denied: ${this.activeRole} cannot acknowledge incidents.` };
    }
    if ((type === 'DISPATCH_LIFEGUARD' || type === 'DISPATCH_RESCUE_BOAT' || type === 'DISPATCH_AMBULANCE') && !perms.canDispatchResources) {
      return { success: false, message: `Permission Denied: ${this.activeRole} cannot dispatch physical emergency resources.` };
    }
    if (type === 'DISPATCH_DRONE_VERIFICATION' && !perms.canDeployDrones) {
      return { success: false, message: `Permission Denied: ${this.activeRole} cannot deploy UAV drones.` };
    }
    if (type === 'CLOSE_ZONE' && !perms.canCloseZones) {
      return { success: false, message: `Permission Denied: ${this.activeRole} cannot order beach zone closures.` };
    }

    const action: CommandAction = {
      id: `CMD-${Date.now().toString().slice(-5)}`,
      operatorId: this.operatorId,
      operatorRole: this.activeRole,
      type,
      beachId: bId,
      targetId,
      timestamp: Date.now(),
      timeDisplay: new Date().toLocaleTimeString(),
      reason,
      status: 'EXECUTED',
      executionDetails: `Command ${type} successfully authorized and dispatched to operational fleet.`,
    };

    this.actionHistory.push(action);

    // Record in Audit Log
    const auditEntry: CommandAuditEntry = {
      id: `AUDIT-${Date.now().toString().slice(-5)}`,
      timestamp: Date.now(),
      timeDisplay: action.timeDisplay,
      beachId: bId,
      beachName: beach?.name || bId,
      category: 'OPERATOR_DECISION',
      severity: 'ALERT',
      actor: `${this.operatorId} (${this.activeRole})`,
      summary: `Operator executed [${type}] on target: ${targetId}${reason ? ` (${reason})` : ''}`,
      causalChain: ['Human-in-the-loop authorization', 'Permission validated', 'Action broadcast to Field Unit'],
    };
    this.auditLogs.unshift(auditEntry);

    if (this.auditLogs.length > 200) {
      this.auditLogs = this.auditLogs.slice(0, 200);
    }

    return {
      success: true,
      message: `Command [${type}] executed successfully on ${targetId}.`,
      action,
    };
  }

  /**
   * Sync RK Beach status with the live active simulation state
   */
  public syncLiveSimulation(state: SimulationState): void {
    const rk = this.beaches.get('RK-BEACH');
    if (rk && state) {
      const riskScore = state.riskOverview?.overallBeachRiskScore || 75;
      let riskLevel: BeachStatus['riskLevel'] = 'LOW';
      if (riskScore >= 75) riskLevel = 'CRITICAL';
      else if (riskScore >= 55) riskLevel = 'HIGH';
      else if (riskScore >= 35) riskLevel = 'MODERATE';

      rk.riskLevel = riskLevel;
      rk.riskScore = riskScore;
      rk.activeHazards = state.hazards.length;
      rk.activeIncidents = state.incidents.length + state.emergencyIncidents.length;
      rk.peopleExposed = state.visitorStats.swimming + state.visitorStats.restricted;
      rk.availableLifeguards = state.emergencyResources.filter((r) => r.type === 'LIFEGUARD' && r.status === 'AVAILABLE').length;
      rk.totalLifeguards = state.emergencyResources.filter((r) => r.type === 'LIFEGUARD').length || 8;
      rk.availableDrones = state.drones?.filter((d) => d.status === 'AVAILABLE').length || 2;
      rk.totalDrones = state.drones?.length || 4;
      rk.lastUpdated = Date.now();
      rk.timeDisplay = state.timeDisplay;
    }
  }

  public getCommandState(): MultiBeachCommandState {
    const all = this.getAllBeaches();
    return {
      beaches: all,
      selectedBeachId: this.selectedBeachId,
      activeRole: this.activeRole,
      operatorId: this.operatorId,
      auditLogs: this.auditLogs,
      totalIncidentsCount: all.reduce((acc, b) => acc + b.activeIncidents, 0),
      criticalBeachesCount: all.filter((b) => b.riskLevel === 'CRITICAL').length,
      totalLifeguardsAvailable: all.reduce((acc, b) => acc + b.availableLifeguards, 0),
      totalLifeguardsFleet: all.reduce((acc, b) => acc + b.totalLifeguards, 0),
      totalDronesAvailable: all.reduce((acc, b) => acc + b.availableDrones, 0),
      totalDronesFleet: all.reduce((acc, b) => acc + b.totalDrones, 0),
      totalAmbulancesAvailable: 5,
      totalAmbulancesFleet: 7,
      totalPoliceAvailable: 14,
      totalPoliceFleet: 18,
    };
  }
}
