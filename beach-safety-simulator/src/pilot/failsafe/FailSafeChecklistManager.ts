/**
 * FailSafeChecklistManager.ts
 * 
 * TIDES Phase 5: Controlled Field Pilot & Real-World Validation Framework
 * 
 * Documented fail-safe operating procedures and emergency response checklists:
 * - 10 critical operational failure modes and immediate mitigation steps
 * - Life-safety boundaries and test mode isolation
 * - Conventional lifeguard communication and rescue backup disclaimers
 */

import { FailSafeProcedure } from '../pilot.types';

export class FailSafeChecklistManager {
  private static instance: FailSafeChecklistManager | null = null;
  private procedures: FailSafeProcedure[] = [];

  public static getInstance(): FailSafeChecklistManager {
    if (!FailSafeChecklistManager.instance) {
      FailSafeChecklistManager.instance = new FailSafeChecklistManager();
    }
    return FailSafeChecklistManager.instance;
  }

  constructor() {
    this.initializeProcedures();
  }

  private initializeProcedures(): void {
    this.procedures = [
      {
        failureCode: 'FAIL-01',
        title: 'Lost Wristband Connectivity',
        triggerCondition: 'Wristband misses 3 consecutive heartbeats (30s) or gateway RSSI falls below -120 dBm.',
        immediateAction: 'Mark device state as DEGRADED / DISCONNECTED in registry. Avoid assuming swimmer is at last reported coordinates.',
        escalationProcedure: 'Dispatch patrolling lifeguard (LG-01) or surveillance drone (DRONE-01) for visual spot-check in last known zone.',
        backupRescueChannel: 'Direct VHF Marine Channel 16 / Coast Guard Lifeguard Radio.',
        verificationStep: 'Visual confirmation from beach patrol tower within 60 seconds.',
      },
      {
        failureCode: 'FAIL-02',
        title: 'Missing Warning Acknowledgement',
        triggerCondition: 'Localized warning downlink unacknowledged after 3 automated retry attempts (1.5s total).',
        immediateAction: 'Flag device as UNACKNOWLEDGED in command dashboard. Do not fabricate delivered status.',
        escalationProcedure: 'Trigger physical beach tower megaphone siren (SZ-01) and dispatch rescue boat (RB-01).',
        backupRescueChannel: 'Beach audio public address siren and tower visual red flag.',
        verificationStep: 'Observe swimmer physical reaction to audible beach broadcast.',
      },
      {
        failureCode: 'FAIL-03',
        title: 'Coastal Gateway Station Failure',
        triggerCondition: 'Gateway station stops pinging NTP or ethernet backhaul drops offline.',
        immediateAction: 'Switch active downlinks to adjacent secondary gateway (GW-COMMAND-02 / GW-TOWER-03).',
        escalationProcedure: 'Activate cellular 4G failover modem on gateway tower and notify radio maintenance supervisor.',
        backupRescueChannel: 'Secondary coastal RF gateway coverage overlap (450m radius).',
        verificationStep: 'Verify packet ingress restored on secondary gateway within 5 seconds.',
      },
      {
        failureCode: 'FAIL-04',
        title: 'Command Center Backend Outage',
        triggerCondition: 'FastAPI / WebSocket server connection drops or health check times out (>3s).',
        immediateAction: 'Gateways automatically enter OFFLINE_BUFFERING mode, queuing up to 1,000 raw packets locally.',
        escalationProcedure: 'Watch commander switches to local tactical tablet client and initiates manual lifeguard dispatch.',
        backupRescueChannel: 'Physical lifeguard whistle, patrol megaphone, and visual binoculars.',
        verificationStep: 'Automatic FIFO queue replay upon backend recovery without duplicate incident creation.',
      },
      {
        failureCode: 'FAIL-05',
        title: 'Fixed Camera Feed Loss',
        triggerCondition: 'RTSP video stream freezes or frame dropped rate exceeds 50% for 5 seconds.',
        immediateAction: 'Camera status flagged as OFFLINE. Correlator ceases reliance on automated vision detections from this unit.',
        escalationProcedure: 'Dispatch surveillance drone (DRONE-01) to assume aerial optical patrol over the blind zone.',
        backupRescueChannel: 'Tower lifeguard with 10x50 marine optical binoculars.',
        verificationStep: 'Drone arrival and video stream confirmation in command center.',
      },
      {
        failureCode: 'FAIL-06',
        title: 'Drone Telemetry or C2 Link Loss',
        triggerCondition: 'Drone fails to transmit telemetry packet for > 5 seconds during active flight.',
        immediateAction: 'Drone flight controller initiates autonomous Return-To-Home (RTH) failsafe at 30m altitude.',
        escalationProcedure: 'Safety pilot on beach pad assumes manual RC transmitter control (2.4 GHz direct link).',
        backupRescueChannel: 'Lifeguard rescue boat (RB-01) and personal watercraft standby.',
        verificationStep: 'Visual confirmation of drone landing on designated launch pad.',
      },
      {
        failureCode: 'FAIL-07',
        title: 'Critical Low Battery (<20%)',
        triggerCondition: 'Drone battery <= 20% or wristband battery <= 15%.',
        immediateAction: 'Prevent new mission assignments. Recall drone to charging pad immediately.',
        escalationProcedure: 'Reassign active surveillance or rescue mission to backup drone (DRONE-02 / Falcon-Rescue-02).',
        backupRescueChannel: 'Multi-drone automated battery lockout system.',
        verificationStep: 'Battery status log and pad docking telemetry confirmation.',
      },
      {
        failureCode: 'FAIL-08',
        title: 'Conflicting Multi-Sensor Observations',
        triggerCondition: 'Camera and drone report divergent distress coordinates (>35m apart in different zones).',
        immediateAction: 'Maintain two distinct candidate dossiers. Avoid incorrect spatial averaging or coordinate fabrication.',
        escalationProcedure: 'Present both candidate video feeds to human watch commander for manual priority triage.',
        backupRescueChannel: 'Dispatch tower supervisor to confirm with high-power spotting scope.',
        verificationStep: 'Operator verification or dismissal logged with explicit rationale.',
      },
      {
        failureCode: 'FAIL-09',
        title: 'Unresolved Emergency Incident',
        triggerCondition: 'Incident remains in active state > 10 minutes without swimmer retrieval confirmation.',
        immediateAction: 'Escalate severity to CRITICAL+. Trigger multi-agency coastal emergency response alert.',
        escalationProcedure: 'Contact Indian Coast Guard (ICG Visakhapatnam District HQ) and District Disaster Management.',
        backupRescueChannel: 'Government Coastal Emergency Hotline (108 / 112).',
        verificationStep: 'Formal handover to Coast Guard incident commander.',
      },
      {
        failureCode: 'FAIL-10',
        title: 'Accidental Test Activation / False Alarm',
        triggerCondition: 'Test scenario inadvertently broadcasts alert or test event outside designated test bench.',
        immediateAction: 'Issue immediate CANCEL packet (MSG_CANCEL 0x03) across all connected gateway downlinks.',
        escalationProcedure: 'Broadcast audible stand-down advisory on lifeguard PA stating test drill has concluded.',
        backupRescueChannel: 'Verbal confirmation with all lifeguards and beach visitors.',
        verificationStep: 'Log incident cancellation reason and file pilot incident report.',
      },
    ];
  }

  public getAllProcedures(): FailSafeProcedure[] {
    return [...this.procedures];
  }

  public getProcedure(code: string): FailSafeProcedure | undefined {
    return this.procedures.find((p) => p.failureCode === code);
  }

  public getSafetyDisclaimers(): string[] {
    return [
      'CONTROLLED PILOT & VALIDATION MODE: This system is a prototype evaluation platform.',
      'DO NOT RELY ON TIDES AS THE SOLE LIFE-SAFETY WARNING MECHANISM: Conventional lifeguard towers, flags, sirens, and rescue boats must remain authoritative and fully staffed throughout all field evaluations.',
      'ZERO PUBLIC BROADCASTS DURING TESTING: Test alerts must never be routed into public municipal emergency networks.',
      'NO UNVALIDATED VISITOR EXPOSURE: Physical prototypes must only be tested on bench stations or consenting, trained test participants under direct lifeguard supervision.',
    ];
  }
}

