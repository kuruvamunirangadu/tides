import { SensorReading } from '../models/SensorReading';
import { ReadingValidator, ValidationResult } from './ReadingValidator';
import { ReadingNormalizer } from './ReadingNormalizer';

export interface IngestionResult {
  accepted: boolean;
  reading?: SensorReading;
  validation: ValidationResult;
  processedAt: number;
}

export class SensorIngestionService {
  private latestReadingsBySensor: Map<string, SensorReading> = new Map();
  private ingestionHistory: SensorReading[] = [];
  private totalIngestedCount: number = 0;
  private rejectedCount: number = 0;

  /**
   * Process raw incoming sensor reading from Gateway/Adapter
   */
  public ingest(rawReading: SensorReading, currentTime: number): IngestionResult {
    this.totalIngestedCount++;

    // 1. Validation
    const validation = ReadingValidator.validate(rawReading, currentTime);
    if (!validation.isValid) {
      this.rejectedCount++;
      return {
        accepted: false,
        validation,
        processedAt: currentTime,
      };
    }

    // 2. Normalization
    const normalized = ReadingNormalizer.normalize(rawReading);

    // 3. Store in latest state map
    this.latestReadingsBySensor.set(normalized.sensorId, normalized);
    this.ingestionHistory.push(normalized);

    if (this.ingestionHistory.length > 500) {
      this.ingestionHistory = this.ingestionHistory.slice(-500);
    }

    return {
      accepted: true,
      reading: normalized,
      validation,
      processedAt: currentTime,
    };
  }

  public getLatestReading(sensorId: string): SensorReading | undefined {
    return this.latestReadingsBySensor.get(sensorId);
  }

  public getAllLatestReadings(): SensorReading[] {
    return Array.from(this.latestReadingsBySensor.values());
  }

  public getIngestionStats() {
    return {
      total: this.totalIngestedCount,
      rejected: this.rejectedCount,
      activeSensors: this.latestReadingsBySensor.size,
      successRatePct: this.totalIngestedCount > 0 ? ((this.totalIngestedCount - this.rejectedCount) / this.totalIngestedCount) * 100 : 100,
    };
  }

  public reset(): void {
    this.latestReadingsBySensor.clear();
    this.ingestionHistory = [];
    this.totalIngestedCount = 0;
    this.rejectedCount = 0;
  }
}
