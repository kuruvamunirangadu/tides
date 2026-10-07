export type FailureType =
  | 'SENSOR_FAILURE'
  | 'CAMERA_FAILURE'
  | 'GPS_ERROR'
  | 'NETWORK_FAILURE'
  | 'DRONE_FAILURE'
  | 'LIFEGUARD_UNAVAILABLE'
  | 'BOAT_FAILURE'
  | 'FALSE_DISTRESS'
  | 'MISSED_DISTRESS'
  | 'CONFLICTING_SENSORS'
  | 'WEATHER_CHANGE'
  | 'CROWD_SURGE'
  | 'LOW_VISIBILITY'
  | 'NIGHT_MODE';

export type FailureSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface FailureEvent {
  id: string;
  type: FailureType;
  targetId?: string;
  severity: FailureSeverity;
  startTime: number;
  duration?: number; // in seconds (undefined = permanent until toggled off)
  active: boolean;
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

export type DegradationLevel =
  | 'FULL_CAPABILITY'
  | 'DEGRADED'
  | 'LIMITED'
  | 'FAILSAFE'
  | 'ESCALATED';
