"""
Scenario Definitions and Initial Conditions Catalog.
Supports progressive multi-stage scenarios, failure modes, and chaos testing.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ScenarioEvent(BaseModel):
    time_offset_s: float = Field(description="Simulation seconds after start when event triggers")
    event_type: str        # e.g., "SET_RIP_TARGET", "SET_WAVE_TARGET", "INJECT_DISTRESS", "SENSOR_FAULT", "SPAWN_CROWD"
    params: Dict[str, Any] = Field(default_factory=dict)
    description: str = ""


class ScenarioConfig(BaseModel):
    id: str
    name: str
    category: str = "Standard" # "Standard", "Progressive", "Emergency", "Failure_Edge"
    description: str
    initial_visitor_count: int = 40
    duration_s: float = 300.0 # 5 minutes default
    initial_env_overrides: Dict[str, Any] = Field(default_factory=dict)
    events: List[ScenarioEvent] = Field(default_factory=list)


SCENARIOS_CATALOG: Dict[str, ScenarioConfig] = {
    "normal": ScenarioConfig(
        id="normal",
        name="1. Normal Beach",
        category="Standard",
        description="Calm sunny morning at RK Beach. Waves 0.7m, gentle tide (+0.15 m/hr), rip current minimal (0.15 m/s). Safe bathing in Zone A.",
        initial_visitor_count=35,
        duration_s=300.0,
        initial_env_overrides={
            "wave_height_m": 0.7,
            "wave_period_s": 8.0,
            "rip_current_speed_mps": 0.15,
            "tide_level_m": 1.0,
            "wind_speed_knots": 10.0,
        },
        events=[]
    ),

    "rising_tide": ScenarioConfig(
        id="rising_tide",
        name="2. Rising Tide Surge",
        category="Progressive",
        description="Spring tidal cycle with rapid water rise (+0.85 m/hr). Shoreline encroaches into dry sand zones, isolating waders near sandbar.",
        initial_visitor_count=45,
        duration_s=360.0,
        initial_env_overrides={
            "tide_level_m": 1.4,
            "tide_rate_of_change_m_hr": 0.85,
            "tide_direction": "rising",
            "wave_height_m": 1.1,
        },
        events=[
            ScenarioEvent(
                time_offset_s=15.0,
                event_type="SET_TIDE_SURGE",
                params={"tide_rate_m_hr": 1.1, "target_level_m": 2.2},
                description="Tidal influx accelerates across RK Beach sandbar"
            )
        ]
    ),

    "increasing_waves": ScenarioConfig(
        id="increasing_waves",
        name="3. Increasing Wave Energy",
        category="Progressive",
        description="Monsoonal swell arrives. Significant wave height ramps progressively from 0.9m to 2.6m with 14s period.",
        initial_visitor_count=50,
        duration_s=360.0,
        initial_env_overrides={
            "wave_height_m": 0.9,
            "wave_period_s": 13.5,
        },
        events=[
            ScenarioEvent(
                time_offset_s=10.0,
                event_type="SET_WAVE_TARGET",
                params={"target_height_m": 2.6, "ramp_s": 60.0},
                description="Heavy swell sets commence breaking heavily in Zone B and C"
            )
        ]
    ),

    "rip_current_formation": ScenarioConfig(
        id="rip_current_formation",
        name="4. Rip Current Formation",
        category="Progressive",
        description="Progressive channelized rip current develops in Zone B (0.18 m/s -> 0.65 m/s). System detects hazard threshold and issues warnings before incidents occur.",
        initial_visitor_count=40,
        duration_s=360.0,
        initial_env_overrides={
            "rip_current_speed_mps": 0.18,
            "wave_height_m": 1.3,
            "wave_period_s": 11.0,
        },
        events=[
            ScenarioEvent(
                time_offset_s=5.0,
                event_type="SET_RIP_TARGET",
                params={"target_mps": 0.68, "ramp_s": 45.0},
                description="Sandbar breach channels seaward rip flow in Zone B"
            )
        ]
    ),

    "rip_current_high_crowd": ScenarioConfig(
        id="rip_current_high_crowd",
        name="5. Rip Current + High Crowd",
        category="Emergency",
        description="100+ visitors on weekend. High crowd density in water during rip current acceleration. Tests exposure weighting and early evacuation.",
        initial_visitor_count=110,
        duration_s=400.0,
        initial_env_overrides={
            "rip_current_speed_mps": 0.22,
            "wave_height_m": 1.4,
        },
        events=[
            ScenarioEvent(
                time_offset_s=8.0,
                event_type="SET_RIP_TARGET",
                params={"target_mps": 0.72, "ramp_s": 40.0},
                description="Rapid rip acceleration in Zone B with high swimmer exposure"
            ),
            ScenarioEvent(
                time_offset_s=35.0,
                event_type="INJECT_DISTRESS",
                params={"zone_id": "ZONE_B"},
                description="Bather pulled 40m offshore begins struggling"
            )
        ]
    ),

    "restricted_zone_entry": ScenarioConfig(
        id="restricted_zone_entry",
        name="6. Restricted Zone Entry",
        category="Emergency",
        description="Visitors stray into Zone D (rocky cliffs & underwater boulders). System detects exposure violation and dispatches drone/PA warnings.",
        initial_visitor_count=35,
        duration_s=300.0,
        events=[
            ScenarioEvent(
                time_offset_s=10.0,
                event_type="SPAWN_RESTRICTED_INTRUDERS",
                params={"count": 3, "zone_id": "ZONE_D"},
                description="3 visitors climb onto slippery rocks in Zone D"
            )
        ]
    ),

    "swimmer_distress": ScenarioConfig(
        id="swimmer_distress",
        name="7. Swimmer Distress & Rescue",
        category="Emergency",
        description="A swimmer in Zone B gets fatigued in moderate surf, signaling distress. Measures detection, decision, dispatch, and rescue latency.",
        initial_visitor_count=30,
        duration_s=300.0,
        events=[
            ScenarioEvent(
                time_offset_s=12.0,
                event_type="INJECT_DISTRESS",
                params={"zone_id": "ZONE_B"},
                description="Swimmer in Zone B enters STRUGGLING state"
            )
        ]
    ),

    "multiple_swimmer_distress": ScenarioConfig(
        id="multiple_swimmer_distress",
        name="8. Multiple Simultaneous Distress",
        category="Emergency",
        description="3 simultaneous distress situations in Zone A, B, and C. Tests multi-resource prioritization across Lifeguards and Drones.",
        initial_visitor_count=60,
        duration_s=400.0,
        events=[
            ScenarioEvent(time_offset_s=10.0, event_type="INJECT_DISTRESS", params={"zone_id": "ZONE_B"}, description="Distress in Zone B"),
            ScenarioEvent(time_offset_s=18.0, event_type="INJECT_DISTRESS", params={"zone_id": "ZONE_C"}, description="Distress in Zone C"),
            ScenarioEvent(time_offset_s=25.0, event_type="INJECT_DISTRESS", params={"zone_id": "ZONE_A"}, description="Distress in Zone A"),
        ]
    ),

    "sudden_weather_deterioration": ScenarioConfig(
        id="sudden_weather_deterioration",
        name="9. Sudden Weather Deterioration",
        category="Progressive",
        description="Severe squall strikes with wind gusts > 34 knots and visibility dropping to 300m. Tests automated beach evacuation protocol.",
        initial_visitor_count=50,
        duration_s=360.0,
        events=[
            ScenarioEvent(
                time_offset_s=10.0,
                event_type="SET_WEATHER_SQUALL",
                params={"wind_knots": 36.0, "visibility_m": 350.0, "weather": "squall"},
                description="Pre-monsoonal squall line crosses RK Beach"
            )
        ]
    ),

    "sensor_failure": ScenarioConfig(
        id="sensor_failure",
        name="10. Sensor Failure & Telemetry Loss",
        category="Failure_Edge",
        description="Acoustic wave gauge and rip current profiler fail simultaneously. Tests fallback risk assessment and confidence degradation.",
        initial_visitor_count=35,
        duration_s=300.0,
        events=[
            ScenarioEvent(
                time_offset_s=8.0,
                event_type="SENSOR_FAULT",
                params={"sensor_id": "rip_sensor_01", "fault": "failed"},
                description="Rip current ADCP telemetry offline"
            ),
            ScenarioEvent(
                time_offset_s=15.0,
                event_type="SENSOR_FAULT",
                params={"sensor_id": "wave_sensor_01", "fault": "failed"},
                description="Wave gauge data stream lost"
            )
        ]
    ),

    "chaos_mode": ScenarioConfig(
        id="chaos_mode",
        name="14. Chaos / Edge Case Stress Test",
        category="Failure_Edge",
        description="Maximum stress test: Sudden rip formation + Monsoonal waves + Swimmer distress + Sensor dropouts + Crowded beach.",
        initial_visitor_count=90,
        duration_s=500.0,
        events=[
            ScenarioEvent(time_offset_s=5.0, event_type="SET_RIP_TARGET", params={"target_mps": 0.85, "ramp_s": 25.0}, description="Extreme rip spike"),
            ScenarioEvent(time_offset_s=10.0, event_type="SET_WAVE_TARGET", params={"target_height_m": 2.7, "ramp_s": 30.0}, description="High surf energy"),
            ScenarioEvent(time_offset_s=15.0, event_type="SENSOR_FAULT", params={"sensor_id": "wave_sensor_01", "fault": "failed"}, description="Wave sensor offline"),
            ScenarioEvent(time_offset_s=20.0, event_type="INJECT_DISTRESS", params={"zone_id": "ZONE_B"}, description="Multiple bather distress"),
            ScenarioEvent(time_offset_s=25.0, event_type="INJECT_DISTRESS", params={"zone_id": "ZONE_C"}, description="Second bather distress"),
        ]
    )
}
