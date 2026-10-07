import { Sensor, SensorHealth } from './models/Sensor';
import { SensorReading } from './models/SensorReading';
import { FusedEnvironmentState } from './models/FusedReading';
import { SensorIngestionService } from './ingestion/SensorIngestionService';
import { SensorFusion } from './fusion/SensorFusion';
import { OfflineBuffer } from './buffering/OfflineBuffer';
import { TideSensorAdapter } from './adapters/TideSensorAdapter';
import { WaveSensorAdapter } from './adapters/WaveSensorAdapter';
import { CurrentSensorAdapter } from './adapters/CurrentSensorAdapter';
import { WeatherSensorAdapter } from './adapters/WeatherSensorAdapter';
import { WaterLevelSensorAdapter, GPSAdapter } from './adapters/WaterLevelSensorAdapter';
import { Environment } from '../models/Environment';

export type DataSourceMode = 'SIMULATION' | 'HYBRID' | 'REAL';

export class IoTManager {
  private mode: DataSourceMode = 'HYBRID';
  private ingestionService: SensorIngestionService;
  private sensorFusion: SensorFusion;
  private offlineBuffer: OfflineBuffer;

  // Sensor fleet
  private tideSensor: TideSensorAdapter;
  private waveSensor: WaveSensorAdapter;
  private currentSensor: CurrentSensorAdapter;
  private weatherSensor: WeatherSensorAdapter;
  private waterLevelSensor: WaterLevelSensorAdapter;
  private gpsLifeguard: GPSAdapter;

  private latestFusedState: FusedEnvironmentState | null = null;

  constructor() {
    this.ingestionService = new SensorIngestionService();
    this.sensorFusion = new SensorFusion();
    this.offlineBuffer = new OfflineBuffer();

    // Instantiate sensor fleet
    this.tideSensor = new TideSensorAdapter();
    this.waveSensor = new WaveSensorAdapter();
    this.currentSensor = new CurrentSensorAdapter();
    this.weatherSensor = new WeatherSensorAdapter();
    this.waterLevelSensor = new WaterLevelSensorAdapter();
    this.gpsLifeguard = new GPSAdapter();
  }

  public getDataSourceMode(): DataSourceMode {
    return this.mode;
  }

  public setDataSourceMode(mode: DataSourceMode): void {
    this.mode = mode;
    // Update individual adapters
    const isReal = mode === 'REAL' || mode === 'HYBRID';
    this.tideSensor.sourceMode = isReal ? 'REAL_SENSOR' : 'SIMULATION';
    this.waveSensor.sourceMode = isReal ? 'REAL_SENSOR' : 'SIMULATION';
    this.currentSensor.sourceMode = mode === 'REAL' ? 'REAL_SENSOR' : 'SIMULATION';
    this.weatherSensor.sourceMode = isReal ? 'REAL_SENSOR' : 'SIMULATION';
    this.waterLevelSensor.sourceMode = isReal ? 'REAL_SENSOR' : 'SIMULATION';
    this.gpsLifeguard.sourceMode = isReal ? 'REAL_SENSOR' : 'SIMULATION';
  }

  public getAllSensors(): Sensor[] {
    return [
      this.tideSensor,
      this.waveSensor,
      this.currentSensor,
      this.weatherSensor,
      this.waterLevelSensor,
      this.gpsLifeguard,
    ];
  }

  public getIngestionService(): SensorIngestionService {
    return this.ingestionService;
  }

  public getOfflineBuffer(): OfflineBuffer {
    return this.offlineBuffer;
  }

  public getLatestFusedState(): FusedEnvironmentState | null {
    return this.latestFusedState;
  }

  public toggleSensorStatus(sensorId: string): void {
    const sensor = this.getAllSensors().find((s) => s.id === sensorId);
    if (sensor) {
      if (sensor.status === 'ONLINE') sensor.status = 'DEGRADED';
      else if (sensor.status === 'DEGRADED') sensor.status = 'OFFLINE';
      else sensor.status = 'ONLINE';
    }
  }

  /**
   * Main IoT cycle executed on each simulation tick
   */
  public tick(
    simEnv: Environment,
    currentTime: number,
    timeDisplay: string
  ): { fusedState: FusedEnvironmentState; environment: Environment } {
    // 1. Generate readings from adapters
    const rTide = this.tideSensor.generateReading(simEnv.tideLevel, currentTime, timeDisplay);
    const rWave = this.waveSensor.generateReading(simEnv.waveHeight, currentTime, timeDisplay);
    const rCurrent = this.currentSensor.generateReading(simEnv.waterCurrent, currentTime, timeDisplay);
    const rWeather = this.weatherSensor.generateReading(simEnv.windSpeed, simEnv.weather, currentTime, timeDisplay);
    const rWaterLevel = this.waterLevelSensor.generateReading(simEnv.tideLevel, currentTime, timeDisplay);

    const rawReadings: SensorReading[] = [rTide, rWave, rCurrent, rWeather, rWaterLevel];

    // 2. Ingest through validation & normalization (or buffer if network offline)
    const validReadings: SensorReading[] = [];
    rawReadings.forEach((reading) => {
      const isBuffered = this.offlineBuffer.push(reading, currentTime);
      if (!isBuffered) {
        const res = this.ingestionService.ingest(reading, currentTime);
        if (res.accepted && res.reading) {
          validReadings.push(res.reading);
        }
      }
    });

    // 3. Run Sensor Fusion
    const fusedState = this.sensorFusion.fuse(validReadings, currentTime, timeDisplay);
    this.latestFusedState = fusedState;

    // 4. Synthesize standard Environment object for the downstream Safety Engine
    const environment: Environment = {
      tideLevel: fusedState.tideLevelM,
      waveHeight: fusedState.waveHeightM,
      wavePeriod: fusedState.wavePeriodS,
      waveDirection: fusedState.waveDirectionDeg,
      windSpeed: fusedState.windSpeedKmh,
      windDirection: fusedState.windDirectionDeg,
      weather: fusedState.weatherCondition,
      visibility: fusedState.visibilityKm,
      waterCurrent: fusedState.currentSpeedMs,
      ripProbability: simEnv.ripProbability,
    };

    return { fusedState, environment };
  }
}
