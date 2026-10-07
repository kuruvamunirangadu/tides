import { Environment } from '../models/Environment';
import { Beach } from '../models/Beach';
import { Visitor } from '../models/Visitor';
import { Hazard, HazardSeverity } from '../models/Hazard';
import { DEFAULT_HAZARD_THRESHOLDS, HazardThresholds } from '../data/hazardThresholds';

export class HazardEngine {
  private thresholds: HazardThresholds;
  private lastTideLevel: number = 1.2;
  private tideRateMph: number = 0;

  constructor(thresholds: HazardThresholds = DEFAULT_HAZARD_THRESHOLDS) {
    this.thresholds = thresholds;
  }

  public detectHazards(
    environment: Environment,
    beach: Beach,
    visitors: Visitor[],
    timeDisplay: string
  ): Hazard[] {
    const hazards: Hazard[] = [];

    // Track approximate tide rate of change (m/hr)
    this.tideRateMph = Math.abs(environment.tideLevel - this.lastTideLevel) * 60;
    this.lastTideLevel = environment.tideLevel;

    // 1. Detect High Waves Hazard
    const waveHazard = this.checkWaveHazard(environment, timeDisplay);
    if (waveHazard) hazards.push(waveHazard);

    // 2. Detect Strong Water Current Hazard
    const currentHazard = this.checkCurrentHazard(environment, timeDisplay);
    if (currentHazard) hazards.push(currentHazard);

    // 3. Detect Rip Current Probability
    const ripHazard = this.checkRipCurrentHazard(environment, timeDisplay);
    if (ripHazard) hazards.push(ripHazard);

    // 4. Detect Dangerous Shorebreak
    const shorebreakHazard = this.checkShorebreakHazard(environment, timeDisplay);
    if (shorebreakHazard) hazards.push(shorebreakHazard);

    // 5. Detect Rapid Tide Change
    const tideHazard = this.checkTideHazard(environment, timeDisplay);
    if (tideHazard) hazards.push(tideHazard);

    // 6. Detect Restricted Area Intruder Exposure
    const restrictedHazard = this.checkRestrictedAreaExposure(beach, visitors, timeDisplay);
    if (restrictedHazard) hazards.push(restrictedHazard);

    // 7. Detect Poor Visibility
    const visibilityHazard = this.checkVisibilityHazard(environment, timeDisplay);
    if (visibilityHazard) hazards.push(visibilityHazard);

    // 8. Detect Weather-Related Hazards (Storm, Rain, High Winds)
    const weatherHazard = this.checkWeatherHazard(environment, timeDisplay);
    if (weatherHazard) hazards.push(weatherHazard);

    // 9. Detect Dangerous Marine Wildlife / Stingers
    const marineHazard = this.checkMarineWildlifeHazard(environment, timeDisplay);
    if (marineHazard) hazards.push(marineHazard);

    // 10. Detect Water Temperature / Hypothermia Hazard
    const tempHazard = this.checkWaterTemperatureHazard(environment, timeDisplay);
    if (tempHazard) hazards.push(tempHazard);

    return hazards;
  }

  private checkWaveHazard(env: Environment, timeDisplay: string): Hazard | null {
    const hs = env.waveHeight;
    const t = this.thresholds;

    if (hs >= t.waveCriticalM) {
      return {
        id: 'HAZ-WAVE-01',
        type: 'HIGH_WAVES',
        name: 'Extreme High Surf Waves',
        severity: 'CRITICAL',
        affectedZoneIds: ['SZ-01', 'SZ-02', 'WA-01', 'RZ-01'],
        description: `Extreme breaker height (${hs.toFixed(2)}m) exceeds critical safety limit.`,
        reason: `Wave height of ${hs.toFixed(2)}m exceeds critical safety threshold (${t.waveCriticalM}m).`,
        detectedAt: timeDisplay,
        confidence: 0.98,
        active: true,
      };
    } else if (hs >= t.waveDangerM) {
      return {
        id: 'HAZ-WAVE-01',
        type: 'HIGH_WAVES',
        name: 'Dangerous Surf Waves',
        severity: 'HIGH',
        affectedZoneIds: ['SZ-01', 'SZ-02', 'WA-01'],
        description: `Rough surf with wave heights of ${hs.toFixed(2)}m.`,
        reason: `Wave height (${hs.toFixed(2)}m) exceeds high danger threshold (${t.waveDangerM}m).`,
        detectedAt: timeDisplay,
        confidence: 0.95,
        active: true,
      };
    } else if (hs >= t.waveCautionM) {
      return {
        id: 'HAZ-WAVE-01',
        type: 'HIGH_WAVES',
        name: 'Elevated Wave Height',
        severity: 'MODERATE',
        affectedZoneIds: ['SZ-01', 'SZ-02'],
        description: `Moderate swell energy (${hs.toFixed(2)}m) present in swimming zones.`,
        reason: `Wave height (${hs.toFixed(2)}m) exceeds caution threshold (${t.waveCautionM}m).`,
        detectedAt: timeDisplay,
        confidence: 0.90,
        active: true,
      };
    }
    return null;
  }

  private checkCurrentHazard(env: Environment, timeDisplay: string): Hazard | null {
    const cur = env.waterCurrent;
    const t = this.thresholds;

    if (cur >= t.currentCriticalMps) {
      return {
        id: 'HAZ-CURR-01',
        type: 'STRONG_CURRENTS',
        name: 'Critical Seaward Current',
        severity: 'CRITICAL',
        affectedZoneIds: ['SZ-01', 'SZ-02', 'WA-01'],
        description: `Extremely swift coastal flow (${cur.toFixed(2)} m/s) capable of sweeping bathers offshore.`,
        reason: `Current speed (${cur.toFixed(2)} m/s) exceeds critical limit (${t.currentCriticalMps} m/s).`,
        detectedAt: timeDisplay,
        confidence: 0.96,
        active: true,
      };
    } else if (cur >= t.currentDangerMps) {
      return {
        id: 'HAZ-CURR-01',
        type: 'STRONG_CURRENTS',
        name: 'Strong Alongshore Current',
        severity: 'HIGH',
        affectedZoneIds: ['SZ-01', 'SZ-02'],
        description: `Strong current flow (${cur.toFixed(2)} m/s) difficult for average swimmers.`,
        reason: `Current velocity (${cur.toFixed(2)} m/s) exceeds danger threshold (${t.currentDangerMps} m/s).`,
        detectedAt: timeDisplay,
        confidence: 0.92,
        active: true,
      };
    } else if (cur >= t.currentCautionMps) {
      return {
        id: 'HAZ-CURR-01',
        type: 'STRONG_CURRENTS',
        name: 'Moderate Water Current',
        severity: 'MODERATE',
        affectedZoneIds: ['SZ-02'],
        description: `Noticeable drift current (${cur.toFixed(2)} m/s) detected.`,
        reason: `Current speed (${cur.toFixed(2)} m/s) exceeds caution threshold (${t.currentCautionMps} m/s).`,
        detectedAt: timeDisplay,
        confidence: 0.88,
        active: true,
      };
    }
    return null;
  }

  private checkRipCurrentHazard(env: Environment, timeDisplay: string): Hazard | null {
    // Rip current formation is triggered by higher current + wave energy
    const ripScore = (env.waterCurrent * 0.6) + (env.waveHeight * 0.3) + (env.wavePeriod >= 9.0 ? 0.2 : 0);

    if (ripScore >= 0.75 || env.waterCurrent >= this.thresholds.ripThresholdMps) {
      const severity: HazardSeverity = ripScore >= 1.0 ? 'HIGH' : 'MODERATE';
      return {
        id: 'HAZ-RIP-01',
        type: 'RIP_CURRENT',
        name: 'Rip Current Channel Formation',
        severity,
        affectedZoneIds: ['SZ-02', 'RZ-01'],
        description: `Hydrodynamic rip neck channel identified pulling seaward between Zone 2 and Reef.`,
        reason: `Combined current (${env.waterCurrent.toFixed(2)} m/s) and wave energy produce high rip probability (Index: ${ripScore.toFixed(2)}).`,
        detectedAt: timeDisplay,
        confidence: 0.91,
        active: true,
      };
    }
    return null;
  }

  private checkShorebreakHazard(env: Environment, timeDisplay: string): Hazard | null {
    if (env.waveHeight >= 1.1 && env.wavePeriod >= this.thresholds.swellPeriodWarningS) {
      return {
        id: 'HAZ-SHORE-01',
        type: 'DANGEROUS_SHOREBREAK',
        name: 'Dangerous Heavy Shorebreak',
        severity: env.waveHeight >= 1.6 ? 'HIGH' : 'MODERATE',
        affectedZoneIds: ['SL-01', 'SZ-01', 'SZ-02'],
        description: `Long-period swell (${env.wavePeriod.toFixed(1)}s) causing plunging wave impacts at shoreline.`,
        reason: `Wave period of ${env.wavePeriod.toFixed(1)}s with ${env.waveHeight.toFixed(2)}m waves produces heavy shoreline breakers.`,
        detectedAt: timeDisplay,
        confidence: 0.89,
        active: true,
      };
    }
    return null;
  }

  private checkTideHazard(env: Environment, timeDisplay: string): Hazard | null {
    if (env.tideLevel >= 1.85) {
      return {
        id: 'HAZ-TIDE-01',
        type: 'RAPID_TIDE_CHANGE',
        name: 'High Spring Tide Inundation',
        severity: env.tideLevel >= 2.1 ? 'HIGH' : 'MODERATE',
        affectedZoneIds: ['SL-01', 'BZ-01', 'BZ-02', 'BZ-03'],
        description: `High astronomical tide (${env.tideLevel.toFixed(2)}m) narrowing safe dry beach area.`,
        reason: `Tide level (${env.tideLevel.toFixed(2)}m) significantly encroaching onto beach promenade buffer.`,
        detectedAt: timeDisplay,
        confidence: 0.99,
        active: true,
      };
    }
    return null;
  }

  private checkRestrictedAreaExposure(beach: Beach, visitors: Visitor[], timeDisplay: string): Hazard | null {
    const restrictedZone = beach.zones.find((z) => z.type === 'RESTRICTED');
    if (!restrictedZone) return null;

    const intruders = visitors.filter(
      (v) =>
        v.position.x >= restrictedZone.x &&
        v.position.x <= restrictedZone.x + restrictedZone.width &&
        v.position.y >= restrictedZone.y &&
        v.position.y <= restrictedZone.y + restrictedZone.height
    );

    if (intruders.length > 0) {
      return {
        id: 'HAZ-RESTR-01',
        type: 'RESTRICTED_AREA_EXPOSURE',
        name: 'Restricted Reef Area Intrusion',
        severity: intruders.length >= 3 ? 'CRITICAL' : 'HIGH',
        affectedZoneIds: [restrictedZone.id],
        description: `${intruders.length} visitor(s) detected inside prohibited hazardous reef boundary.`,
        reason: `${intruders.length} unauthorized visitor(s) (${intruders.map((i) => i.id).join(', ')}) identified in restricted zone ${restrictedZone.id}.`,
        detectedAt: timeDisplay,
        confidence: 1.0,
        active: true,
      };
    }
    return null;
  }

  private checkVisibilityHazard(env: Environment, timeDisplay: string): Hazard | null {
    if (env.visibility <= this.thresholds.visibilityCriticalKm) {
      return {
        id: 'HAZ-VIS-01',
        type: 'POOR_VISIBILITY',
        name: 'Severe Visibility Reduction',
        severity: 'CRITICAL',
        affectedZoneIds: ['SZ-01', 'SZ-02', 'WA-01', 'RZ-01'],
        description: `Extreme low visibility (${env.visibility} km) due to ${env.weather.toLowerCase()}.`,
        reason: `Visibility (${env.visibility} km) below critical threshold (${this.thresholds.visibilityCriticalKm} km).`,
        detectedAt: timeDisplay,
        confidence: 0.97,
        active: true,
      };
    } else if (env.visibility <= this.thresholds.visibilityCautionKm) {
      return {
        id: 'HAZ-VIS-01',
        type: 'POOR_VISIBILITY',
        name: 'Reduced Coastal Visibility',
        severity: 'MODERATE',
        affectedZoneIds: ['WA-01', 'SZ-01', 'SZ-02'],
        description: `Moderate visibility reduction (${env.visibility} km).`,
        reason: `Visibility (${env.visibility} km) below caution threshold (${this.thresholds.visibilityCautionKm} km).`,
        detectedAt: timeDisplay,
        confidence: 0.93,
        active: true,
      };
    }
    return null;
  }

  private checkWeatherHazard(env: Environment, timeDisplay: string): Hazard | null {
    if (env.weather === 'STORM' || env.windSpeed >= this.thresholds.windDangerKmh) {
      return {
        id: 'HAZ-WX-01',
        type: 'WEATHER_HAZARD',
        name: 'Severe Weather Squall & High Winds',
        severity: 'CRITICAL',
        affectedZoneIds: ['BZ-01', 'BZ-02', 'BZ-03', 'SZ-01', 'SZ-02', 'SL-01', 'RZ-01', 'WA-01'],
        description: `Severe meteorological condition (${env.weather}) with sustained winds of ${env.windSpeed.toFixed(1)} km/h.`,
        reason: `Squall/Storm event with wind speed ${env.windSpeed.toFixed(1)} km/h exceeding danger limit (${this.thresholds.windDangerKmh} km/h).`,
        detectedAt: timeDisplay,
        confidence: 0.98,
        active: true,
      };
    } else if (env.weather === 'RAIN' || env.windSpeed >= this.thresholds.windCautionKmh) {
      return {
        id: 'HAZ-WX-01',
        type: 'WEATHER_HAZARD',
        name: 'Adverse Wind & Precipitation',
        severity: 'MODERATE',
        affectedZoneIds: ['SZ-01', 'SZ-02', 'WA-01'],
        description: `Precipitation and elevated wind speeds (${env.windSpeed.toFixed(1)} km/h).`,
        reason: `Adverse weather (${env.weather}) and wind speeds exceeding ${this.thresholds.windCautionKmh} km/h.`,
        detectedAt: timeDisplay,
        confidence: 0.91,
        active: true,
      };
    }
    return null;
  }

  private checkMarineWildlifeHazard(env: Environment, timeDisplay: string): Hazard | null {
    const level = env.marineHazardLevel ?? 0;
    if (level >= 0.7) {
      return {
        id: 'HAZ-WILD-01',
        type: 'MARINE_WILDLIFE',
        name: 'Severe Marine Stinger / Jellyfish Swarm',
        severity: 'CRITICAL',
        affectedZoneIds: ['SZ-01', 'SZ-02', 'WA-01'],
        description: `High density of dangerous marine stingers/jellyfish detected in nearshore bathing zones.`,
        reason: `Marine hazard index (${(level * 100).toFixed(0)}%) indicates critical stinger envenomation risk.`,
        detectedAt: timeDisplay,
        confidence: 0.96,
        active: true,
      };
    } else if (level >= 0.35) {
      return {
        id: 'HAZ-WILD-01',
        type: 'MARINE_WILDLIFE',
        name: 'Elevated Marine Stinger Activity',
        severity: 'MODERATE',
        affectedZoneIds: ['SZ-01', 'WA-01'],
        description: `Active jellyfish/stinger sightings reported along swimming corridor.`,
        reason: `Marine hazard index (${(level * 100).toFixed(0)}%) above caution advisory threshold.`,
        detectedAt: timeDisplay,
        confidence: 0.88,
        active: true,
      };
    }
    return null;
  }

  private checkWaterTemperatureHazard(env: Environment, timeDisplay: string): Hazard | null {
    const temp = env.waterTemperature ?? 24;
    if (temp <= 16) {
      return {
        id: 'HAZ-TEMP-01',
        type: 'WATER_TEMPERATURE_HAZARD',
        name: 'Cold Water Shock & Hypothermia Risk',
        severity: 'HIGH',
        affectedZoneIds: ['SZ-01', 'SZ-02', 'WA-01'],
        description: `Low water temperature (${temp.toFixed(1)}°C) rapidly depletes swimmer stamina and induces involuntary gasping.`,
        reason: `Water temperature below cold-shock threshold (16°C).`,
        detectedAt: timeDisplay,
        confidence: 0.95,
        active: true,
      };
    }
    return null;
  }
}
