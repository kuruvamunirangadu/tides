/**
 * EnvironmentalValidationManager.ts
 * 
 * TIDES Phase 5: Controlled Field Pilot & Real-World Validation Framework
 * 
 * Manages structured records for controlled physical, radio, and environmental tests:
 * - Radio range at measured distances
 * - Line-of-sight vs obstructed communication
 * - Wet-device operation & saltwater exposure
 * - Enclosure ingress testing (IP68)
 * - Battery endurance & signal reconnection
 * - Enforces documented limitations, equipment specs, and safety disclaimers
 */

import { EnvironmentalValidationRecord } from '../pilot.types';

export class EnvironmentalValidationManager {
  private static instance: EnvironmentalValidationManager | null = null;
  private records: Map<string, EnvironmentalValidationRecord> = new Map();
  private recordCounter: number = 500;
  private changeListeners: Set<() => void> = new Set();

  public static getInstance(): EnvironmentalValidationManager {
    if (!EnvironmentalValidationManager.instance) {
      EnvironmentalValidationManager.instance = new EnvironmentalValidationManager();
    }
    return EnvironmentalValidationManager.instance;
  }

  constructor() {
    this.initializeDefaultRecords();
  }

  public reset(): void {
    this.records.clear();
    this.recordCounter = 500;
    this.initializeDefaultRecords();
    this.notifyChange();
  }

  public subscribeChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private notifyChange(): void {
    this.changeListeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('Error in EnvironmentalValidationManager listener:', err);
      }
    });
  }

  public getAllRecords(): EnvironmentalValidationRecord[] {
    return Array.from(this.records.values());
  }

  public getRecord(id: string): EnvironmentalValidationRecord | undefined {
    return this.records.get(id);
  }

  private initializeDefaultRecords(): void {
    const now = Date.now();

    // 1. Radio Range at Measured Distance
    this.addRecord({
      testCategory: 'RADIO_RANGE_MEASURED',
      procedureDocumented: 'SOP-RF-001: Step-and-measure radial LoRa packet loss test at 100m intervals along shoreline.',
      equipmentUsed: 'Keysight N9918B FieldFox Spectrum Analyzer + calibrated 2 dBi dipole antenna.',
      environmentalConditions: {
        ambientTempC: 31.5,
        humidityPercent: 78,
        salinityPpt: 35,
        weatherCondition: 'Sunny, clear atmospheric propagation.',
      },
      measuredValue: 450,
      measurementUnit: 'meters',
      resultStatus: 'PASS',
      evidenceReferences: ['LOG-RF-865MHZ-TOWERA.csv', 'SPECTROGRAM-RUSHIKONDA-01.png'],
      qualifiedAssessor: 'RF-ENG-SUBBARAO',
      testLimitations: 'Conducted under direct line-of-sight across open water. Performance reduces behind dune berms.',
      disclaimer: 'Radio range near or underwater is non-viable at 865 MHz without floating or body-worn antenna elevation.',
      timestampMs: now - 86400000,
    });

    // 2. Enclosure Ingress Testing (IP68 Bench)
    this.addRecord({
      testCategory: 'ENCLOSURE_INGRESS_IP68',
      procedureDocumented: 'ISO 20653 / IEC 60529 controlled hydrostatic water immersion chamber test.',
      equipmentUsed: 'Fluke 700G31 Precision Calibrator + Acrylic Hydrostatic Pressure Chamber.',
      environmentalConditions: {
        ambientTempC: 24.0,
        humidityPercent: 55,
        salinityPpt: 0,
        weatherCondition: 'Laboratory bench test chamber.',
      },
      measuredValue: 1.5,
      measurementUnit: 'meters depth equivalent (0.15 bar, 60 mins)',
      resultStatus: 'PASS',
      evidenceReferences: ['DOC-IP68-LAB-CHAMBER-RUN4.pdf'],
      qualifiedAssessor: 'MECH-ENG-KUMARI',
      testLimitations: 'Prototype custom silicone seal; requires certified third-party NABL/UL lab testing prior to mass swimmer deployment.',
      disclaimer: 'This bench test does not constitute formal commercial IP68 regulatory certification.',
      timestampMs: now - 172800000,
    });

    // 3. Saltwater & Corrosion Exposure Inspection
    this.addRecord({
      testCategory: 'SALTWATER_CORROSION_INSPECTION',
      procedureDocumented: 'ASTM B117 modified: 48-hour synthetic saltwater soak (35 ppt NaCl) followed by optical contact inspection.',
      equipmentUsed: 'Stereo Inspection Microscope 40x + digital micrometer.',
      environmentalConditions: {
        ambientTempC: 28.0,
        humidityPercent: 82,
        salinityPpt: 35,
        weatherCondition: 'Controlled immersion tank.',
      },
      measuredValue: 48,
      measurementUnit: 'hours exposure',
      resultStatus: 'PASS',
      evidenceReferences: ['IMG-MICROSCOPE-POGO-PINS-AFTER48H.jpg'],
      qualifiedAssessor: 'MATERIALS-SPEC-RAO',
      testLimitations: 'Gold-plated magnetic pogo pins showed zero galvanic oxidation; rubber band elasticity intact.',
      disclaimer: 'Long-term 6-month UV and saltwater fatigue evaluation remains ongoing.',
      timestampMs: now - 259200000,
    });

    // 4. Wet-Device Operation & Capacitive Button Push
    this.addRecord({
      testCategory: 'WET_DEVICE_OPERATION',
      procedureDocumented: 'SOP-WET-002: Repeated 1.2s physical button activation under dripping water and wet palm contact.',
      equipmentUsed: 'Direct force gauge + high-speed camera verification.',
      environmentalConditions: {
        ambientTempC: 30.0,
        humidityPercent: 85,
        salinityPpt: 35,
        weatherCondition: 'Simulated surf wave wash.',
      },
      measuredValue: 100,
      measurementUnit: '% reliable trigger across 50 wet activations',
      resultStatus: 'PASS',
      evidenceReferences: ['LOG-WET-ACTIVATION-50RUNS.csv'],
      qualifiedAssessor: 'QA-INSPECTOR-02',
      testLimitations: 'Physical tactile microswitch functions reliably when wet; touchscreens strictly avoided by design.',
      disclaimer: 'Swimmer must maintain deliberate hold for 1.2 seconds to prevent wave-slap false triggers.',
      timestampMs: now - 345600000,
    });

    // 5. Battery Endurance
    this.addRecord({
      testCategory: 'BATTERY_ENDURANCE_HOURS',
      procedureDocumented: 'SOP-PWR-001: Continuous periodic LoRa heartbeat telemetry (every 10s) on 450 mAh LiPo.',
      equipmentUsed: 'Keysight 34465A Digital Multimeter data logger.',
      environmentalConditions: {
        ambientTempC: 29.0,
        humidityPercent: 70,
        weatherCondition: 'Ambient room test.',
      },
      measuredValue: 18.4,
      measurementUnit: 'hours continuous operation',
      resultStatus: 'PASS',
      evidenceReferences: ['BATTERY-DISCHARGE-CURVE-RUN3.csv'],
      qualifiedAssessor: 'EE-DESIGNER-PATEL',
      testLimitations: 'Standard beach duty cycle is 8 hours; 18.4h exceeds operational single-shift requirement.',
      disclaimer: 'Excessive continuous vibration alarm mode reduces battery lifetime to 3.2 hours.',
      timestampMs: now - 432000000,
    });
  }

  public addRecord(
    recordInput: Omit<EnvironmentalValidationRecord, 'recordId'>
  ): EnvironmentalValidationRecord {
    this.recordCounter++;
    const record: EnvironmentalValidationRecord = {
      recordId: `ENV-VAL-${this.recordCounter}`,
      ...recordInput,
    };
    this.records.set(record.recordId, record);
    this.notifyChange();
    return record;
  }
}

