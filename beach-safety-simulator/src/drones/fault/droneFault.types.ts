/**
 * droneFault.types.ts
 * 
 * TIDES Drone Phase 12: Fault Handling, Resilience & Recovery Type Definitions
 * 
 * Defines formal data models, lifecycle states, diagnostic classifications,
 * recovery strategies, and life-safety policy constraints for drone operational failures.
 */

import { DroneWorld3DPosition, DroneOperationalStatus, DroneConnectivity } from '../foundation/drone.types';
import { IncidentSeverity } from '../../models/Incident';

/**
 * Diagnostic classifications of operational drone faults
 */
export type DroneFaultCategory =
  | 'LOW_BATTERY'                 // Battery <= warning threshold (e.g. 30%)
  | 'CRITICAL_BATTERY'            // Battery <= critical reserve threshold (e.g. 20%)
  | 'MISSING_BATTERY_DATA'        // Battery reading missing, undefined, or NaN
  | 'STALE_TELEMETRY'             // Telemetry age > stale threshold (e.g. 15s)
  | 'COMMUNICATION_LOST'          // Telemetry age > lost comms threshold (e.g. 30s) or explicit DISCONNECTED
  | 'INVALID_COORDINATES'         // Telemetry contains NaN, undefined, or unphysical leaps (>35m/s)
  | 'DRONE_OFFLINE'               // Drone explicitly marked OFFLINE or entered MAINTENANCE
  | 'MISSION_EXECUTION_FAILURE'   // DroneMissionManager reports MISSION_FAILED or invalid transition
  | 'MOVEMENT_NAVIGATION_ERROR'   // DroneMovementEngine translation stalled or target unreachable
  | 'MISSION_TIMEOUT'             // Observation or transit duration exceeded safety limit
  | 'STATE_INCONSISTENCY'         // Conflicting status between registry, movement, and mission
  | 'ASSIGNMENT_FAILURE'          // Resource allocation aborted or rejected
  | 'UNEXPECTED_INTERRUPTION';    // Preemption or external cancellation during execution

/**
 * Fault severity levels
 */
export type DroneFaultSeverity =
  | 'INFO'
  | 'WARNING'
  | 'CRITICAL'
  | 'FATAL';

/**
 * Formal lifecycle of an operational fault
 * 
 * DETECTED -> VALIDATING -> RESPONSE_REQUIRED -> RECOVERING -> RESOLVED
 *                            ↳ OPERATOR_REVIEW  ↳ UNRECOVERABLE
 */
export type DroneFaultLifecycleStatus =
  | 'DETECTED'           // Initial anomaly flagged by telemetry or mission monitor
  | 'VALIDATING'         // Correlating secondary sensor readings; debouncing transient glitches
  | 'RESPONSE_REQUIRED'  // Validated fault; awaiting strategy selection
  | 'RECOVERING'         // Recovery procedure actively executing (e.g. RTB or replacement dispatch)
  | 'RESOLVED'           // Resolution verified by fresh telemetry and verified recovery
  | 'OPERATOR_REVIEW'    // Autonomous recovery unsafe; manual command center intervention required
  | 'UNRECOVERABLE';     // Hard physical failure; asset locked in safety landing/quarantine

/**
 * Supported recovery actions (only actions supported by the coastal simulator)
 */
export type DroneRecoveryAction =
  | 'CONTINUE_SAFELY'                 // Transient glitch cleared; safe to continue
  | 'RETURN_TO_BASE'                  // Autonomous kinematic transit to home launch pad
  | 'HOLD_STATION'                    // Maintain current altitude and position; hold visual contact
  | 'LAND_SAFELY'                     // Controlled descent to nearest emergency landing zone
  | 'RETRY_OPERATION'                 // Bounded retry of waypoint navigation or command
  | 'MARK_UNAVAILABLE'                // Lock drone from new allocations to protect active incident
  | 'REQUEST_OPERATOR_INTERVENTION'   // Prompt command center operator for manual override
  | 'REQUEST_REPLACEMENT_DRONE'       // Signal multi-drone allocator to dispatch secondary asset
  | 'ESCALATE_TO_SURFACE_RESCUE';     // Alert Lifeguard LG-01 or Jet Boat RB-01 for priority response

/**
 * Recovery execution outcome
 */
export type DroneRecoveryOutcome =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'RETRY_EXHAUSTED'
  | 'ESCALATED'
  | 'CANCELLED';

/**
 * Comprehensive operational fault record
 */
export interface DroneFaultRecord {
  faultId: string;
  droneId: string;
  relatedMissionId?: string;
  relatedIncidentId?: string;
  category: DroneFaultCategory;
  severity: DroneFaultSeverity;
  status: DroneFaultLifecycleStatus;
  detectedTimestampMs: number;
  lastKnownValidTelemetryTimestampMs?: number;
  lastKnownValidPosition3D?: DroneWorld3DPosition;
  isPositionUncertain: boolean;
  diagnostics: string;
  retryCount: number;
  maxRetries: number;
  recoveryAction?: DroneRecoveryAction;
  recoveryActionRationale?: string;
  recoveryOutcome: DroneRecoveryOutcome;
  operatorAcknowledged: boolean;
  operatorId?: string;
  acknowledgedAtMs?: number;
  replacementRequested: boolean;
  replacementDroneId?: string;
  resolutionTimestampMs?: number;
  resolutionReason?: string;
  history: Array<{
    timestampMs: number;
    fromStatus: DroneFaultLifecycleStatus;
    toStatus: DroneFaultLifecycleStatus;
    event: string;
    details?: string;
  }>;
}

/**
 * Configurable thresholds and safety rules for fault management
 */
export interface FaultPolicyConfig {
  lowBatteryWarningThresholdPercent: number;    // e.g. 30%
  criticalBatteryThresholdPercent: number;      // e.g. 20%
  staleTelemetryTimeoutSeconds: number;         // e.g. 15.0s
  lostCommunicationTimeoutSeconds: number;      // e.g. 30.0s
  maxRecoveryRetries: number;                   // e.g. 3
  autoReturnOnLowBattery: boolean;              // true: trigger RTB automatically
  autoEscalateOnRescueFailure: boolean;         // true: alert surface lifesavers on rescue drone fault
}

/**
 * Default conservative simulation safety policy
 */
export const DEFAULT_FAULT_POLICY_CONFIG: FaultPolicyConfig = {
  lowBatteryWarningThresholdPercent: 30.0,
  criticalBatteryThresholdPercent: 20.0,
  staleTelemetryTimeoutSeconds: 15.0,
  lostCommunicationTimeoutSeconds: 30.0,
  maxRecoveryRetries: 3,
  autoReturnOnLowBattery: true,
  autoEscalateOnRescueFailure: true,
};

/**
 * Immutable Life-Safety & Simulation Boundary Policy
 */
export const FAULT_LIFE_SAFETY_POLICY = {
  SIMULATED_RECOVERY_STATEMENT:
    'All drone fault handling, landing, and recovery procedures are simulated in the digital twin and must never be represented as real-world physical safety execution.',
  ANTI_TELEPORTATION_RULE:
    'A disconnected, stale, or faulted drone must NEVER be teleported artificially to its home base or target. Kinematic continuity and uncertainty preservation are mandatory.',
  ACTIVE_INCIDENT_PROTECTION_RULE:
    'Drone failure during an active emergency does NOT close the incident. The incident remains active, prioritized in the queue, and escalated to surface lifesavers (LG-01/RB-01).',
  OPERATOR_ACKNOWLEDGEMENT_RULE:
    'Operator acknowledgement logs human situational awareness; it does NOT clear or resolve an active physical telemetry or battery deficit.',
} as const;

/**
 * Metric summary for command-center fault monitoring
 */
export interface FaultMetricsSummary {
  totalFaultsDetected: number;
  activeFaultsCount: number;
  criticalFaultsCount: number;
  warningFaultsCount: number;
  communicationLostCount: number;
  lowBatteryCount: number;
  interruptedMissionsCount: number;
  replacementsDispatchedCount: number;
  escalatedToSurfaceCount: number;
  operatorReviewsPendingCount: number;
  resolvedFaultsCount: number;
}

