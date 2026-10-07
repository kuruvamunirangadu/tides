import { Incident } from '../../models/Incident';
import { ZoneRiskAssessment } from '../../models/Risk';

export interface IncidentPriorityScore {
  incidentId: string;
  incidentType: string;
  zoneId: string;
  priority: number; // 0 - 100
  urgency: number; // 0 - 100
  severity: number; // 0 - 100
  exposure: number; // 0 - 100
  responseTimeEstimate: number; // in seconds
}

export class PriorityCalculator {
  public static calculatePriority(
    incident: Incident,
    zoneRisk?: ZoneRiskAssessment
  ): IncidentPriorityScore {
    // 1. Severity weight
    let severity = 25;
    if (incident.severity === 'CRITICAL') severity = 100;
    else if (incident.severity === 'HIGH') severity = 75;
    else if (incident.severity === 'MEDIUM') severity = 50;

    // 2. Urgency based on incident nature
    let urgency = 30;
    if (incident.type === 'DISTRESS') urgency = 100;
    else if (incident.type === 'DRIFT') urgency = 80;
    else if (incident.type === 'RESTRICTED_ENTRY') urgency = 60;
    else if (incident.type === 'CROWD') urgency = 45;

    // 3. Exposure
    const visitorCount = incident.visitorIds.length;
    const zoneExposure = zoneRisk ? zoneRisk.exposureScore : Math.min(100, visitorCount * 20);
    const exposure = zoneExposure;

    // 4. Combined Priority
    const priority = Math.min(
      100,
      Math.round(severity * 0.40 + urgency * 0.35 + exposure * 0.25)
    );

    return {
      incidentId: incident.id,
      incidentType: incident.type,
      zoneId: incident.zoneId,
      priority,
      urgency,
      severity,
      exposure,
      responseTimeEstimate: 15,
    };
  }
}
