/**
 * src/operations/scenarios/ScenarioCatalog.ts
 * Predefined catalog of 10 repeatable safety scenarios for TIDES Milestone 11.
 * Standardizes test specifications, inputs, expected outcomes, and assertion criteria.
 */

export interface ScenarioDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  category: 'ENVIRONMENT' | 'PERCEPTION' | 'RESCUE' | 'SYSTEM' | 'TELEMETRY';
  expectedDurationMs: number;
  assertionCount: number;
}

export const SCENARIO_CATALOG: ScenarioDefinition[] = [
  {
    id: 'SCENARIO-01-STABLE-ENV',
    name: 'Stable Oceanographic Environment',
    version: '1.0',
    description: 'Verifies that nominal wave conditions (1.2m) do not trigger false hazard alerts.',
    category: 'ENVIRONMENT',
    expectedDurationMs: 40,
    assertionCount: 2,
  },
  {
    id: 'SCENARIO-02-RIP-INTENSIFICATION',
    name: 'Rip Current Escalation & Hazard Trigger',
    version: '1.0',
    description: 'Evaluates detection latency as rip current intensifies from 0.4 m/s to 1.6 m/s.',
    category: 'ENVIRONMENT',
    expectedDurationMs: 45,
    assertionCount: 2,
  },
  {
    id: 'SCENARIO-03-SWIMMER-DISTRESS',
    name: 'Swimmer Distress Detection & Priority Triage',
    version: '1.0',
    description: 'Tests multi-camera CV detection and alert latency for struggling swimmer in surf zone.',
    category: 'PERCEPTION',
    expectedDurationMs: 50,
    assertionCount: 2,
  },
  {
    id: 'SCENARIO-04-CAMERA-OUTAGE',
    name: 'Optical Camera Stream Blackout',
    version: '1.0',
    description: 'Tests graceful fallback to radar/buoy telemetry when primary CCTV goes offline.',
    category: 'PERCEPTION',
    expectedDurationMs: 45,
    assertionCount: 2,
  },
  {
    id: 'SCENARIO-05-SENSOR-DELAY-ANOMALY',
    name: 'Delayed & Out-of-Order Telemetry Injection',
    version: '1.0',
    description: 'Verifies timestamp ordering buffer and rejection of corrupt packets.',
    category: 'TELEMETRY',
    expectedDurationMs: 40,
    assertionCount: 2,
  },
  {
    id: 'SCENARIO-06-RESOURCE-EXHAUSTION',
    name: 'Rescue Craft Exhaustion & Escalation',
    version: '1.0',
    description: 'Tests unresolved incident queue handling when all rescue craft (RB-01/02) are engaged.',
    category: 'RESCUE',
    expectedDurationMs: 45,
    assertionCount: 2,
  },
  {
    id: 'SCENARIO-07-MULTI-INCIDENT-COORD',
    name: 'Multi-Incident Priority Allocation & Non-Reentrant Locking',
    version: '1.0',
    description: 'Validates deterministic priority scoring across simultaneous offshore incidents.',
    category: 'RESCUE',
    expectedDurationMs: 45,
    assertionCount: 2,
  },
  {
    id: 'SCENARIO-08-BACKEND-INTERRUPT',
    name: 'Central Server Telemetry Disconnection',
    version: '1.0',
    description: 'Verifies client-side safety HUD enters DEGRADED mode on backend comms interruption.',
    category: 'SYSTEM',
    expectedDurationMs: 40,
    assertionCount: 2,
  },
  {
    id: 'SCENARIO-09-POST-OUTAGE-RECOVERY',
    name: 'Telemetry Reconnection & State Resynchronization',
    version: '1.0',
    description: 'Measures sensor recovery duration after temporary link restoration.',
    category: 'SYSTEM',
    expectedDurationMs: 45,
    assertionCount: 2,
  },
  {
    id: 'SCENARIO-10-OUT-OF-ORDER-EVENTS',
    name: 'Delayed Event Deduplication & Timeline Reconstruction',
    version: '1.0',
    description: 'Ensures earliest creation timestamps are preserved when events arrive out of order.',
    category: 'TELEMETRY',
    expectedDurationMs: 40,
    assertionCount: 2,
  },
];

