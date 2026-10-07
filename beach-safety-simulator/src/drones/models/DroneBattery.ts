export interface DroneBattery {
  droneId: string;
  currentPercent: number; // 0-100%
  consumptionRatePercentPerMin: number; // e.g. 3.0% per min during active flight
  minimumReturnPercent: number; // e.g. 25% (RTH failsafe trigger)
  criticalPercent: number; // e.g. 10% (Emergency auto-land)
  charging: boolean;
  chargingRatePercentPerMin: number; // e.g. 10% per min on pad
  estimatedFlightTimeRemainingSec: number;
}
