/**
 * src/calibration/EnvironmentalDataProvider.ts
 * Ingress manager, validation, unit normalization, and freshness tracking
 * for real-world coastal sensors, external forecasts, and synthetic fixtures.
 */

import {
  EnvironmentalVariableType,
  EnvironmentalObservation,
  QualityStatus,
  DataProvenance,
} from './types';
import { GeoCoordinateMapper } from './GeoCoordinateMapper';

export class EnvironmentalDataProvider {
  private static instance: EnvironmentalDataProvider | null = null;

  // Freshness horizons in seconds
  public static readonly FRESHNESS_HORIZONS: Record<EnvironmentalVariableType, number> = {
    WAVE_HEIGHT: 1800,       // 30m
    WAVE_PERIOD: 1800,       // 30m
    WAVE_DIRECTION: 1800,    // 30m
    WIND_SPEED: 600,         // 10m
    WIND_DIRECTION: 600,     // 10m
    TIDE_LEVEL: 900,         // 15m
    WATER_CURRENT: 1200,     // 20m
    CURRENT_DIRECTION: 1200, // 20m
    WATER_TEMPERATURE: 3600, // 60m
    VISIBILITY: 1200,        // 20m
  };

  // Physical limits [min, max]
  public static readonly PHYSICAL_RANGES: Record<EnvironmentalVariableType, [number, number]> = {
    WAVE_HEIGHT: [0.0, 12.0],
    WAVE_PERIOD: [2.0, 30.0],
    WAVE_DIRECTION: [0.0, 360.0],
    WIND_SPEED: [0.0, 180.0],
    WIND_DIRECTION: [0.0, 360.0],
    TIDE_LEVEL: [-2.0, 6.0],
    WATER_CURRENT: [0.0, 4.5],
    CURRENT_DIRECTION: [0.0, 360.0],
    WATER_TEMPERATURE: [5.0, 45.0],
    VISIBILITY: [0.05, 50.0],
  };

  public static readonly STANDARD_UNITS: Record<EnvironmentalVariableType, string> = {
    WAVE_HEIGHT: 'm',
    WAVE_PERIOD: 's',
    WAVE_DIRECTION: 'deg',
    WIND_SPEED: 'km/h',
    WIND_DIRECTION: 'deg',
    TIDE_LEVEL: 'm',
    WATER_CURRENT: 'm/s',
    CURRENT_DIRECTION: 'deg',
    WATER_TEMPERATURE: 'C',
    VISIBILITY: 'km',
  };

  private latestObservations: Map<string, EnvironmentalObservation> = new Map();
  private seenKeys: Map<string, number> = new Map();

  public static getInstance(): EnvironmentalDataProvider {
    if (!this.instance) {
      this.instance = new EnvironmentalDataProvider();
    }
    return this.instance;
  }

  /**
   * Normalizes raw units to standard SI / operational units.
   */
  public normalizeUnits(
    variable: EnvironmentalVariableType,
    rawValue: number,
    rawUnit: string
  ): { value: number; unit: string; warnings: string[] } {
    const warnings: string[] = [];
    let val = rawValue;
    const cleanUnit = rawUnit.trim().toLowerCase();

    if (variable === 'WIND_SPEED') {
      if (['knots', 'knot', 'kt', 'kts'].includes(cleanUnit)) {
        val = rawValue * 1.852;
        warnings.push(`Converted wind speed from ${rawUnit} to km/h`);
      } else if (['m/s', 'mps'].includes(cleanUnit)) {
        val = rawValue * 3.6;
        warnings.push(`Converted wind speed from ${rawUnit} to km/h`);
      } else if (cleanUnit === 'mph') {
        val = rawValue * 1.60934;
        warnings.push(`Converted wind speed from mph to km/h`);
      }
    } else if (variable === 'WAVE_HEIGHT' || variable === 'TIDE_LEVEL') {
      if (['ft', 'feet', 'foot'].includes(cleanUnit)) {
        val = rawValue * 0.3048;
        warnings.push(`Converted ${variable} from ${rawUnit} to meters`);
      } else if (cleanUnit === 'cm') {
        val = rawValue / 100.0;
        warnings.push(`Converted ${variable} from cm to meters`);
      }
    } else if (variable === 'VISIBILITY') {
      if (['m', 'meter', 'meters'].includes(cleanUnit)) {
        val = rawValue / 1000.0;
        warnings.push('Converted visibility from meters to km');
      } else if (['miles', 'mile', 'mi'].includes(cleanUnit)) {
        val = rawValue * 1.60934;
        warnings.push('Converted visibility from miles to km');
      }
    } else if (variable === 'WATER_TEMPERATURE') {
      if (['f', 'fahrenheit', 'degf'].includes(cleanUnit)) {
        val = (rawValue - 32.0) * (5.0 / 9.0);
        warnings.push('Converted temperature from Fahrenheit to Celsius');
      }
    }

    return {
      value: Number(val.toFixed(3)),
      unit: EnvironmentalDataProvider.STANDARD_UNITS[variable],
      warnings,
    };
  }

  /**
   * Validates and ingests an incoming environmental observation.
   */
  public ingestObservation(raw: {
    id: string;
    sourceId: string;
    sourceName: string;
    variable: EnvironmentalVariableType;
    value: any;
    units: string;
    observationTimestamp: number;
    provenance?: DataProvenance;
    location?: { latitude: number; longitude: number; altitudeM?: number };
  }): EnvironmentalObservation {
    const warnings: string[] = [];
    let quality: QualityStatus = 'VALID';
    const now = Date.now() / 1000;

    // 1. Missing fields check
    if (!raw.id || !raw.sourceId || !raw.variable || raw.value === undefined || raw.observationTimestamp === undefined) {
      return {
        id: raw.id || `malformed-${Date.now()}`,
        sourceId: raw.sourceId || 'UNKNOWN',
        sourceName: raw.sourceName || 'Unknown',
        variable: raw.variable || 'WAVE_HEIGHT',
        value: -999.0,
        units: 'invalid',
        observationTimestamp: 0,
        ingestionTimestamp: now,
        provenance: raw.provenance || 'SYNTHETIC',
        qualityStatus: 'MALFORMED',
        validationWarnings: ['Missing essential fields for observation'],
      };
    }

    // 2. Numeric integrity (prohibit silent NaN / zero-fill)
    const numVal = Number(raw.value);
    if (isNaN(numVal) || !isFinite(numVal)) {
      return {
        id: raw.id,
        sourceId: raw.sourceId,
        sourceName: raw.sourceName,
        variable: raw.variable,
        value: -999.0,
        units: raw.units,
        observationTimestamp: raw.observationTimestamp,
        ingestionTimestamp: now,
        provenance: raw.provenance || 'SYNTHETIC',
        qualityStatus: 'MALFORMED',
        validationWarnings: ['Non-numeric or NaN value rejected; silent zero-fill prohibited.'],
      };
    }

    // 3. Unit normalization
    const norm = this.normalizeUnits(raw.variable, numVal, raw.units || '');
    warnings.push(...norm.warnings);

    // 4. Physical range verification
    const [minRange, maxRange] = EnvironmentalDataProvider.PHYSICAL_RANGES[raw.variable];
    if (norm.value < minRange || norm.value > maxRange) {
      quality = 'OUT_OF_RANGE';
      warnings.push(`Value ${norm.value} ${norm.unit} exceeds physical limits [${minRange}, ${maxRange}]`);
    }

    // 5. Timestamp sanity
    if (raw.observationTimestamp <= 0) {
      quality = 'MALFORMED';
      warnings.push(`Non-positive timestamp: ${raw.observationTimestamp}`);
    } else if (raw.observationTimestamp > now + 300) {
      quality = 'MALFORMED';
      warnings.push(`Future timestamp rejected: ${raw.observationTimestamp} > ${now.toFixed(0)}`);
    }

    // 6. Duplicate detection
    const dupKey = `${raw.sourceId}_${raw.variable}`;
    const lastSeen = this.seenKeys.get(dupKey);
    if (lastSeen !== undefined && Math.abs(raw.observationTimestamp - lastSeen) < 1.0) {
      quality = 'DUPLICATE';
      warnings.push(`Duplicate observation detected at t=${raw.observationTimestamp}`);
    } else {
      this.seenKeys.set(dupKey, raw.observationTimestamp);
    }

    // 7. Freshness assessment
    const horizon = EnvironmentalDataProvider.FRESHNESS_HORIZONS[raw.variable] || 1800;
    const ageSec = Math.max(0, now - raw.observationTimestamp);
    if (quality === 'VALID') {
      if (ageSec > horizon * 2.5) {
        quality = 'OUTAGE';
        warnings.push(`Source observation age (${ageSec.toFixed(0)}s) exceeds outage threshold`);
      } else if (ageSec > horizon) {
        quality = 'STALE';
        warnings.push(`Source observation is stale (age: ${ageSec.toFixed(0)}s)`);
      }
    }

    // 8. Geographic validation
    if (raw.location) {
      const inBounds = GeoCoordinateMapper.isWithinCalibratedBounds(raw.location);
      if (!inBounds) {
        warnings.push(`Sensor location outside calibrated Rushikonda boundary`);
      }
    }

    const obs: EnvironmentalObservation = {
      id: raw.id,
      sourceId: raw.sourceId,
      sourceName: raw.sourceName,
      variable: raw.variable,
      value: norm.value,
      units: norm.unit,
      rawValue: numVal,
      rawUnits: raw.units,
      observationTimestamp: raw.observationTimestamp,
      ingestionTimestamp: now,
      location: raw.location,
      provenance: raw.provenance || 'MEASURED',
      qualityStatus: quality,
      validationWarnings: warnings,
    };

    if (quality !== 'MALFORMED') {
      this.latestObservations.set(dupKey, obs);
    }

    return obs;
  }

  /**
   * Returns latest observations with updated live freshness status.
   */
  public getLatestObservations(): EnvironmentalObservation[] {
    const now = Date.now() / 1000;
    const results: EnvironmentalObservation[] = [];

    for (const obs of this.latestObservations.values()) {
      const horizon = EnvironmentalDataProvider.FRESHNESS_HORIZONS[obs.variable] || 1800;
      const ageSec = Math.max(0, now - obs.observationTimestamp);
      let currentStatus = obs.qualityStatus;

      if (obs.qualityStatus === 'VALID' || obs.qualityStatus === 'STALE') {
        if (ageSec > horizon * 2.5) {
          currentStatus = 'OUTAGE';
        } else if (ageSec > horizon) {
          currentStatus = 'STALE';
        }
      }

      results.push({
        ...obs,
        qualityStatus: currentStatus,
      });
    }

    return results;
  }

  /**
   * Safe read-only data-to-simulation mapping helper.
   * Does NOT mutate live simulation state!
   */
  public getSimulationMapping(): {
    mapped: Record<string, { value: number; units: string; status: QualityStatus; provenance: DataProvenance; source: string }>;
    missing: EnvironmentalVariableType[];
    stale: EnvironmentalVariableType[];
    isReadyForInjection: boolean;
  } {
    const latest = this.getLatestObservations();
    const mapped: Record<string, any> = {};
    const missing: EnvironmentalVariableType[] = [];
    const stale: EnvironmentalVariableType[] = [];

    const varMap: Map<EnvironmentalVariableType, EnvironmentalObservation> = new Map();
    for (const obs of latest) {
      const existing = varMap.get(obs.variable);
      if (!existing || (obs.provenance === 'MEASURED' && existing.provenance !== 'MEASURED')) {
        varMap.set(obs.variable, obs);
      }
    }

    const allVars: EnvironmentalVariableType[] = [
      'WAVE_HEIGHT',
      'WAVE_PERIOD',
      'WIND_SPEED',
      'WIND_DIRECTION',
      'TIDE_LEVEL',
      'WATER_CURRENT',
      'CURRENT_DIRECTION',
      'WATER_TEMPERATURE',
      'VISIBILITY',
    ];

    for (const v of allVars) {
      const obs = varMap.get(v);
      if (!obs) {
        missing.push(v);
      } else {
        if (obs.qualityStatus === 'STALE') {
          stale.push(v);
        }
        mapped[v] = {
          value: obs.value,
          units: obs.units,
          status: obs.qualityStatus,
          provenance: obs.provenance,
          source: obs.sourceId,
        };
      }
    }

    const coreReady =
      mapped['WAVE_HEIGHT']?.status === 'VALID' &&
      mapped['WIND_SPEED']?.status === 'VALID' &&
      mapped['TIDE_LEVEL']?.status === 'VALID';

    return {
      mapped,
      missing,
      stale,
      isReadyForInjection: coreReady,
    };
  }
}

