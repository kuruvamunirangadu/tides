import { GeofenceRule, GeofenceType } from '../models/Geofence';

export const DEFAULT_GEOFENCE_RULES: Record<GeofenceType, GeofenceRule[]> = {
  RESTRICTED: [
    {
      id: 'RULE-RESTRICTED-ENTER',
      triggerOn: 'ENTER',
      action: 'TRIGGER_SIREN',
      severity: 'CRITICAL',
      description: 'Unauthorized incursion into rocky cliff/deep drop restricted zone',
    },
    {
      id: 'RULE-RESTRICTED-DWELL',
      triggerOn: 'DWELL',
      dwellThresholdSeconds: 15,
      action: 'DISPATCH_LIFEGUARD',
      severity: 'CRITICAL',
      description: 'Persistent presence in high-hazard restricted zone exceeding safety threshold',
    },
  ],
  HIGH_RISK: [
    {
      id: 'RULE-HIGH-RISK-ENTER',
      triggerOn: 'ENTER',
      action: 'SEND_MOBILE_SMS',
      severity: 'HIGH',
      description: 'Visitor exposed to active rip current or high swell zone',
    },
    {
      id: 'RULE-HIGH-RISK-DWELL',
      triggerOn: 'DWELL',
      dwellThresholdSeconds: 30,
      action: 'ESCALATE_ZONE_RISK',
      severity: 'HIGH',
      description: 'Prolonged exposure in hazardous current formation area',
    },
  ],
  SWIMMING: [
    {
      id: 'RULE-SWIMMING-ENTER',
      triggerOn: 'ENTER',
      action: 'LOG_EVENT',
      severity: 'LOW',
      description: 'Visitor entered patrolled safe swimming zone',
    },
  ],
  EVACUATION: [
    {
      id: 'RULE-EVACUATION-ENTER',
      triggerOn: 'ENTER',
      action: 'TRIGGER_SIREN',
      severity: 'CRITICAL',
      description: 'Emergency evacuation boundary breach - immediate egress mandated',
    },
  ],
  SAFE_ASSEMBLY: [
    {
      id: 'RULE-ASSEMBLY-ENTER',
      triggerOn: 'ENTER',
      action: 'LOG_EVENT',
      severity: 'LOW',
      description: 'Visitor safely reached muster assembly point',
    },
  ],
  DYNAMIC_HAZARD: [
    {
      id: 'RULE-DYNAMIC-HAZARD-ENTER',
      triggerOn: 'ENTER',
      action: 'DISPATCH_LIFEGUARD',
      severity: 'HIGH',
      description: 'Visitor entered newly formed AI predicted rip/wave hazard geofence',
    },
  ],
};
