export type TideDirection = 'rising' | 'falling' | 'slack';
export type WeatherCondition = 'clear' | 'partly_cloudy' | 'overcast' | 'rain' | 'squall' | 'thunderstorm';
export type SensorHealth = 'operational' | 'degraded' | 'failed' | 'packet_loss';
export type FlagStatus = 'GREEN' | 'YELLOW' | 'RED' | 'DOUBLE_RED';
export type ZoneType = 'SWIMMING' | 'CAUTION' | 'RESTRICTED' | 'RIP_CHANNEL' | 'DUNE_BUFFER' | 'PATROL_STATION';
export type ResourceStatus = 'AVAILABLE' | 'DISPATCHED' | 'ON_PATROL' | 'ON_SCENE' | 'RETURNING' | 'UNAVAILABLE' | 'FAILED';
export type SwimmingStatus = 'ON_BEACH' | 'WADING' | 'SHALLOW_WATER' | 'DEEP_SWIMMING' | 'RESTRICTED_OFFSHORE';
export type DistressState = 'NONE' | 'TIRED' | 'STRUGGLING' | 'DROWNING_ACTIVE' | 'DROWNING_PASSIVE' | 'RESCUED';
export type HazardSeverity = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface SensorStatus {
  sensor_id: string;
  sensor_type: string;
  status: SensorHealth;
  confidence: number;
  last_reading_timestamp: number;
  error_message?: string;
}

export interface EnvironmentalState {
  timestamp: number;
  tide_level_m: number;
  tide_direction: TideDirection;
  tide_rate_of_change_m_hr: number;
  wave_height_m: number;
  wave_period_s: number;
  wave_direction_deg: number;
  wind_speed_knots: number;
  wind_direction_deg: number;
  weather: WeatherCondition;
  visibility_m: number;
  temperature_c: number;
  water_temperature_c: number;
  current_speed_mps: number;
  current_direction_deg: number;
  rip_current_speed_mps: number;
  rip_current_active: boolean;
  rip_current_channel_zone: string;
  sensor_statuses: Record<string, SensorStatus>;
}

export interface BeachZone {
  id: string;
  name: string;
  zone_type: ZoneType;
  description: string;
  flag_status: FlagStatus;
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  current_risk_score: number;
  swimmer_capacity: number;
  active_hazard_ids: string[];
}

export interface Lifeguard {
  id: string;
  name: string;
  assigned_tower_id: string;
  current_x: number;
  current_y: number;
  status: ResourceStatus;
  target_incident_id?: string;
  target_x?: number;
  target_y?: number;
  speed_mps: number;
}

export interface Drone {
  id: string;
  model: string;
  current_x: number;
  current_y: number;
  altitude_m: number;
  status: ResourceStatus;
  battery_pct: number;
  has_flotation_payload: boolean;
  payload_deployed: boolean;
  target_incident_id?: string;
  target_x?: number;
  target_y?: number;
  speed_mps: number;
}

export interface WarningBoard {
  id: string;
  location_x: number;
  location_y: number;
  zone_id: string;
  is_active: boolean;
  display_text: string;
  flag_color: FlagStatus;
  strobe_active: boolean;
}

export interface PASystem {
  id: string;
  location_x: number;
  location_y: number;
  zone_id: string;
  is_broadcasting: boolean;
  current_message?: string;
  last_broadcast_timestamp: number;
  volume_db: number;
}

export interface CameraStation {
  id: string;
  location_x: number;
  location_y: number;
  coverage_zone_id: string;
  is_operational: boolean;
  ptz_pan_deg: number;
  is_tracking_target: boolean;
  tracked_visitor_id?: string;
}

export interface BeachLayout {
  beach_id: string;
  beach_name: string;
  length_meters: number;
  width_meters: number;
  zones: BeachZone[];
  lifeguards: Lifeguard[];
  drones: Drone[];
  warning_boards: WarningBoard[];
  pa_systems: PASystem[];
  cameras: CameraStation[];
}

export interface Visitor {
  id: string;
  group_id?: string;
  skill: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  target_x?: number;
  target_y?: number;
  swimming_status: SwimmingStatus;
  distress_state: DistressState;
  risk_exposure: string;
  current_zone_id: string;
  time_in_water_seconds: number;
  stamina: number;
  panic_level: number;
  has_lifejacket: boolean;
  last_action_timestamp: number;
}

export interface HazardDetection {
  id: string;
  hazard_type: string;
  severity: HazardSeverity;
  affected_zones: string[];
  confidence: number;
  reason: string;
  detected_at: number;
  raw_telemetry: Record<string, unknown>;
}

export interface ZoneRiskAssessment {
  zone_id: string;
  hazard_score: number;
  exposure_score: number;
  vulnerability_score: number;
  total_risk_score: number;
  risk_level: HazardSeverity;
  recommended_flag: string;
  visitor_count: number;
  swimmer_count: number;
  distressed_count: number;
  primary_risk_factors: string[];
}

export interface Decision {
  decision_id: string;
  hazard_id?: string;
  hazard_type: string;
  severity: HazardSeverity;
  affected_zone: string;
  confidence: number;
  reason: string;
  recommended_actions: string[];
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface SafetyResponse {
  response_id: string;
  source_decision_id: string;
  action_type: string;
  target_id: string;
  target_zone: string;
  timestamp: number;
  status: string;
  details: Record<string, unknown>;
}

export interface Incident {
  id: string;
  incident_type: string;
  severity: string;
  status: string;
  zone_id: string;
  location_x: number;
  location_y: number;
  involved_visitor_ids: string[];
  start_time: number;
  detection_time?: number;
  decision_time?: number;
  response_dispatch_time?: number;
  on_scene_time?: number;
  resolution_time?: number;
  detection_latency_s?: number;
  decision_latency_s?: number;
  response_latency_s?: number;
  resolution_duration_s?: number;
  dispatched_resource_ids: string[];
  description: string;
  outcome?: string;
}

export interface EvaluationMetrics {
  avg_detection_latency_s: number;
  avg_decision_latency_s: number;
  avg_warning_latency_s: number;
  avg_dispatch_latency_s: number;
  avg_resolution_time_s: number;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  missed_incidents: number;
  total_incidents_logged: number;
  resolved_incidents_count: number;
  detection_accuracy_pct: number;
  false_positive_rate_pct: number;
  total_unique_visitors: number;
  people_exposed_to_hazard: number;
  people_warned: number;
  people_safely_evacuated: number;
  people_rescued: number;
  people_remaining_in_danger: number;
  lifeguard_utilization_pct: number;
  drone_utilization_pct: number;
  warning_board_active_pct: number;
  sensor_availability_pct: number;
  system_uptime_pct: number;
  active_incidents_count: number;
  active_hazards_count: number;
  active_warnings_count: number;
}

export interface SimulationState {
  tick: number;
  sim_time_seconds: number;
  sim_clock_display: string;
  is_running: boolean;
  is_paused: boolean;
  speed_multiplier: number;
  scenario_id: string;
  scenario_name: string;
  seed: number;
  environment: EnvironmentalState;
  beach: BeachLayout;
  visitors: Visitor[];
  hazards: HazardDetection[];
  risk_assessments: Record<string, ZoneRiskAssessment>;
  decisions: Decision[];
  responses: SafetyResponse[];
  active_incidents: Incident[];
  recent_incidents: Incident[];
  metrics: EvaluationMetrics;
  recent_events: string[];
  chaos_mode_active: boolean;
}

export interface ScenarioMeta {
  id: string;
  name: string;
  category: string;
  description: string;
  initial_visitor_count: number;
  duration_s: number;
  events_count: number;
}
