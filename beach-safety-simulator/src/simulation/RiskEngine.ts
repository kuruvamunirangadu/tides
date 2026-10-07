import { Beach } from '../models/Beach';
import { Environment } from '../models/Environment';
import { Visitor } from '../models/Visitor';
import { Hazard } from '../models/Hazard';
import { ZoneRiskAssessment, BeachRiskOverview, RiskCategory, LevelGrade } from '../models/Risk';

export class RiskEngine {
  public evaluateBeachRisk(
    beach: Beach,
    environment: Environment,
    visitors: Visitor[],
    hazards: Hazard[],
    timeDisplay: string
  ): BeachRiskOverview {
    const zoneAssessments: Record<string, ZoneRiskAssessment> = {};
    let highestScore = 0;
    let highestRiskZoneId = beach.zones[0]?.id || '';

    // Calculate total and available lifeguards across the beach
    const totalLifeguards = beach.lifeguardStations.length;
    const availableLifeguards = beach.lifeguardStations.filter(
      (lg) => lg.status === 'ACTIVE'
    ).length;

    for (const zone of beach.zones) {
      // 1. Calculate Hazard Pillar for this zone
      const zoneHazards = hazards.filter((h) => h.affectedZoneIds.includes(zone.id));
      const { hazardScore, hazardGrade, primaryHazard, hazardConfidence } =
        this.computeHazardScore(zoneHazards, environment);

      // 2. Calculate Exposure Pillar (Human presence in zone)
      const zoneVisitors = visitors.filter(
        (v) =>
          v.active &&
          ((v.currentZone && v.currentZone === zone.id) ||
            (v.position.x >= zone.x &&
              v.position.x <= zone.x + zone.width &&
              v.position.y >= zone.y &&
              v.position.y <= zone.y + zone.height))
      );

      const { exposureScore, exposureGrade, crowdDensity } = this.computeExposureScore(
        zoneVisitors.length,
        zone.type
      );

      // 3. Calculate Vulnerability Pillar using human demographic and behavioral traits
      let avgVulnerability = 0.5;
      if (zoneVisitors.length > 0) {
        const totalVuln = zoneVisitors.reduce((sum, v) => {
          let vScore = v.vulnerability ?? (1.0 - (v.swimmingAbility ?? 0.5));
          if (v.state === 'DISTRESS' || v.state === 'STRUGGLING') vScore = Math.max(vScore, 0.95);
          if (v.fatigue) vScore = Math.min(1.0, vScore + v.fatigue * 0.3);
          return sum + vScore;
        }, 0);
        avgVulnerability = totalVuln / zoneVisitors.length;
      }

      const vulnerabilityScore = Math.min(
        100,
        Math.round(
          avgVulnerability * 60 +
            exposureScore * 0.25 +
            (environment.waveHeight > 1.8 ? 15 : 0)
        )
      );
      const vulnerabilityGrade: LevelGrade =
        vulnerabilityScore >= 75 ? 'HIGH' : vulnerabilityScore >= 45 ? 'MODERATE' : 'LOW';

      // 4. Calculate Response Capacity Pillar (Local to zone)
      const coveringStations = beach.lifeguardStations.filter((lg) => {
        const dist = Math.hypot(
          lg.position.x - (zone.x + zone.width / 2),
          lg.position.y - (zone.y + zone.height / 2)
        );
        return dist <= lg.coverageRadius + 50;
      });
      const localTotal = Math.max(1, coveringStations.length);
      const localActive = coveringStations.filter((lg) => lg.status === 'ACTIVE').length;

      const responseScore = Math.round((localActive / localTotal) * 100);
      const responseGrade: LevelGrade =
        responseScore >= 75 ? 'HIGH' : responseScore >= 40 ? 'MODERATE' : 'LOW';

      // 5. Synthesize Combined Operational Risk Score (0 - 100)
      // Weighted formula: Base Risk = (0.50 * Hazard) + (0.35 * Exposure) + (0.15 * Vulnerability)
      const baseWeightedRisk =
        hazardScore * 0.5 + exposureScore * 0.35 + vulnerabilityScore * 0.15;

      // If response capacity is low, amplify operational risk
      const responseDeficitMultiplier = 1.0 + (100 - responseScore) / 500;
      let rawRiskScore = Math.round(baseWeightedRisk * responseDeficitMultiplier);

      // Critical override conditions
      const hasDistressInZone = zoneVisitors.some((v) => v.state === 'DISTRESS');
      if (hasDistressInZone) {
        rawRiskScore = Math.max(88, rawRiskScore);
      } else if (zoneHazards.some((h) => h.severity === 'CRITICAL') && zoneVisitors.length > 0) {
        rawRiskScore = Math.max(82, rawRiskScore);
      } else if (zone.type === 'RESTRICTED' && zoneVisitors.length > 0) {
        rawRiskScore = Math.max(85, rawRiskScore);
      }

      const finalScore = Math.min(100, Math.max(0, rawRiskScore));
      const category: RiskCategory = this.classifyRiskCategory(finalScore);

      // 6. Generate Explainable Primary Reason & Contributing Factors
      const { reason, contributingFactors } = this.generateReason(
        primaryHazard,
        crowdDensity,
        zoneVisitors.length,
        environment,
        responseGrade,
        category,
        hasDistressInZone
      );

      const confidence = Math.round(hazardConfidence * 100) / 100;

      const assessment: ZoneRiskAssessment = {
        zoneId: zone.id,
        zoneName: zone.name,
        hazardGrade,
        hazardScore,
        primaryHazard,
        exposureGrade,
        exposureScore,
        swimmerCount: zoneVisitors.length,
        crowdDensity,
        vulnerabilityGrade,
        vulnerabilityScore,
        responseGrade,
        responseScore,
        lifeguardsAvailable: availableLifeguards,
        lifeguardsTotal: totalLifeguards,
        overallScore: finalScore,
        category,
        confidence,
        reason,
        contributingFactors,
      };

      zoneAssessments[zone.id] = assessment;

      if (finalScore > highestScore) {
        highestScore = finalScore;
        highestRiskZoneId = zone.id;
      }
    }

    return {
      overallBeachRiskScore: highestScore,
      overallCategory: this.classifyRiskCategory(highestScore),
      highestRiskZoneId,
      zoneAssessments,
      timestamp: timeDisplay,
    };
  }

  private computeHazardScore(
    hazards: Hazard[],
    env: Environment
  ): {
    hazardScore: number;
    hazardGrade: LevelGrade;
    primaryHazard: string;
    hazardConfidence: number;
  } {
    if (hazards.length === 0) {
      const base = Math.min(25, Math.round(env.waveHeight * 15 + env.waterCurrent * 10));
      return {
        hazardScore: base,
        hazardGrade: 'LOW',
        primaryHazard: 'NORMAL_SURF',
        hazardConfidence: 0.95,
      };
    }

    let maxScore = 0;
    let primaryHazard = hazards[0].type;
    let confidenceSum = 0;

    for (const h of hazards) {
      let score = 35;
      if (h.severity === 'CRITICAL') score = 95;
      else if (h.severity === 'HIGH') score = 80;
      else if (h.severity === 'MODERATE') score = 55;
      else if (h.severity === 'LOW') score = 35;

      if (score > maxScore) {
        maxScore = score;
        primaryHazard = h.type;
      }
      confidenceSum += h.confidence;
    }

    const hazardConfidence = confidenceSum / hazards.length;
    const hazardGrade: LevelGrade =
      maxScore >= 80 ? 'CRITICAL' : maxScore >= 65 ? 'HIGH' : maxScore >= 45 ? 'MODERATE' : 'LOW';

    return {
      hazardScore: maxScore,
      hazardGrade,
      primaryHazard,
      hazardConfidence,
    };
  }

  private computeExposureScore(
    visitorCount: number,
    zoneType: string
  ): {
    exposureScore: number;
    exposureGrade: LevelGrade;
    crowdDensity: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  } {
    let crowdDensity: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' = 'LOW';
    let exposureScore = 0;

    if (zoneType === 'RESTRICTED') {
      if (visitorCount > 0) {
        crowdDensity = visitorCount >= 3 ? 'HIGH' : 'MEDIUM';
        exposureScore = Math.min(100, 60 + visitorCount * 15);
      }
    } else {
      if (visitorCount >= 70) {
        crowdDensity = 'EXTREME';
        exposureScore = 95;
      } else if (visitorCount >= 40) {
        crowdDensity = 'HIGH';
        exposureScore = 80;
      } else if (visitorCount >= 15) {
        crowdDensity = 'MEDIUM';
        exposureScore = 50;
      } else if (visitorCount > 0) {
        crowdDensity = 'LOW';
        exposureScore = 25;
      } else {
        crowdDensity = 'LOW';
        exposureScore = 0;
      }
    }

    const exposureGrade: LevelGrade =
      exposureScore >= 80 ? 'HIGH' : exposureScore >= 50 ? 'MODERATE' : 'LOW';

    return { exposureScore, exposureGrade, crowdDensity };
  }

  private classifyRiskCategory(score: number): RiskCategory {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 35) return 'MODERATE';
    return 'LOW';
  }

  private generateReason(
    primaryHazard: string,
    crowdDensity: string,
    swimmerCount: number,
    env: Environment,
    responseGrade: LevelGrade,
    category: RiskCategory,
    hasDistressInZone: boolean = false
  ): { reason: string; contributingFactors: string[] } {
    const factors: string[] = [];

    let hazardDesc = 'Moderate surf conditions';
    if (hasDistressInZone) {
      hazardDesc = 'Active swimmer in life distress';
      factors.push('Bather in water experiencing distress / struggling');
    } else if (primaryHazard === 'RIP_CURRENT') {
      hazardDesc = 'Strong offshore current';
      factors.push(`Seaward current velocity ${env.waterCurrent.toFixed(2)} m/s`);
    } else if (primaryHazard === 'HIGH_WAVES') {
      hazardDesc = `Heavy wave energy (${env.waveHeight.toFixed(1)}m)`;
      factors.push(`Significant wave height Hs: ${env.waveHeight.toFixed(2)}m`);
    } else if (primaryHazard === 'RESTRICTED_AREA_EXPOSURE') {
      hazardDesc = 'Intrusion into prohibited reef';
      factors.push('Unauthorized bathers in restricted rocks');
    } else if (primaryHazard === 'WEATHER_HAZARD') {
      hazardDesc = 'Severe squall & high wind gusts';
      factors.push(`Wind speed: ${env.windSpeed.toFixed(1)} km/h`);
    }

    if (swimmerCount > 0) {
      factors.push(`Swimmer exposure: ${swimmerCount} bathers (${crowdDensity} density)`);
    }

    if (responseGrade === 'LOW') {
      factors.push('Reduced lifeguard coverage on active sector');
    }

    let reason = `${hazardDesc}`;
    if (crowdDensity === 'HIGH' || crowdDensity === 'EXTREME') {
      reason += ` with high swimmer density`;
    } else if (swimmerCount > 0) {
      reason += ` with active bathers in zone`;
    } else {
      reason += ` in unpopulated sector`;
    }

    if (category === 'CRITICAL' && responseGrade === 'LOW') {
      reason += ' and limited lifeguard coverage';
    }

    return { reason, contributingFactors: factors };
  }
}
