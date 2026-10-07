import { SensorReading } from '../models/SensorReading';

export class ReadingNormalizer {
  /**
   * Convert any legacy or imperial units into standard SI coastal metrics (meters, m/s, km/h, degrees, celsius)
   */
  public static normalize(reading: SensorReading): SensorReading {
    const clone = JSON.parse(JSON.stringify(reading)) as SensorReading;

    if (typeof clone.value === 'number') {
      const u = clone.unit.toLowerCase();
      // Feet to meters
      if (u === 'ft' || u === 'feet') {
        clone.value = Number((clone.value * 0.3048).toFixed(2));
        clone.unit = 'm';
      }
      // Knots to m/s
      else if (u === 'knots' || u === 'kts') {
        clone.value = Number((clone.value * 0.514444).toFixed(2));
        clone.unit = 'm/s';
      }
      // Fahrenheit to Celsius
      else if (u === '°f' || u === 'f') {
        clone.value = Number((((clone.value - 32) * 5) / 9).toFixed(1));
        clone.unit = '°C';
      }
    }

    return clone;
  }
}
