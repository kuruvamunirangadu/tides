"""
Visitor Simulator & Crowd Dynamics Engine
Simulates beachgoers, waders, swimmers, and distress kinetics under hydrodynamic forces.
"""

import math
import random
from typing import List, Optional
import uuid

from app.models.beach import BeachZone
from app.models.environment import EnvironmentalState
from app.models.visitor import (
    Visitor,
    SwimmingStatus,
    DistressState,
    RiskExposure,
    SwimmingSkill,
    AwarenessState,
)


class VisitorSimulator:
    def __init__(self, seed: int = 42):
        self.rng = random.Random(seed)
        self.visitors: List[Visitor] = []

    def reset(self, count: int = 40, seed: Optional[int] = None):
        if seed is not None:
            self.rng = random.Random(seed)
        self.visitors = self.generate_population(count)

    def generate_population(self, count: int = 40) -> List[Visitor]:
        """
        Generates realistic heterogeneous distribution of beach visitors across zones.
        """
        population: List[Visitor] = []
        
        # Distribution: 60% Zone A (safe swimming), 20% Zone B (rip channel), 15% Zone C (general), 5% Zone D (restricted edge)
        zone_weights = [
            ("ZONE_A", 0.0, 280.0, 0.60),
            ("ZONE_B", 310.0, 530.0, 0.20),
            ("ZONE_C", 560.0, 780.0, 0.15),
            ("ZONE_D", 810.0, 950.0, 0.05),
        ]

        skills = [SwimmingSkill.NON_SWIMMER, SwimmingSkill.BEGINNER, SwimmingSkill.INTERMEDIATE, SwimmingSkill.ADVANCED]
        skill_weights = [0.35, 0.40, 0.20, 0.05]

        for i in range(count):
            # Select zone
            r = self.rng.random()
            cum = 0.0
            chosen_zone = zone_weights[0]
            for zw in zone_weights:
                cum += zw[3]
                if r <= cum:
                    chosen_zone = zw
                    break

            zone_id, x_min, x_max, _ = chosen_zone
            x = self.rng.uniform(x_min, x_max)
            
            # Position Y: 50% dry sand (y: -25m to 0m), 30% wading (y: 0m to 20m), 20% swimming (y: 20m to 60m)
            y_r = self.rng.random()
            if y_r < 0.50:
                y = self.rng.uniform(-25.0, -2.0)
                status = SwimmingStatus.ON_BEACH
            elif y_r < 0.80:
                y = self.rng.uniform(0.0, 20.0)
                status = SwimmingStatus.WADING
            else:
                y = self.rng.uniform(20.0, 55.0)
                status = SwimmingStatus.SHALLOW_WATER if y < 35.0 else SwimmingStatus.DEEP_SWIMMING

            skill = self.rng.choices(skills, weights=skill_weights)[0]

            population.append(Visitor(
                id=f"VIS-{i+1:03d}",
                group_id=f"GRP-{self.rng.randint(1, max(1, count // 4)):02d}",
                skill=skill,
                x=x,
                y=y,
                swimming_status=status,
                distress_state=DistressState.NONE,
                risk_exposure=RiskExposure.SAFE if y < 0 else RiskExposure.LOW,
                current_zone_id=zone_id,
                awareness_state=AwarenessState.UNAWARE,
                reaction_delay_seconds=self.rng.uniform(0.8, 2.0),
                local_water_depth=max(0.0, y * 0.02),
                stamina=self.rng.uniform(85.0, 100.0),
                has_lifejacket=self.rng.random() < 0.05,
            ))

        return population

    def step(self, dt: float, env: EnvironmentalState, zones: List[BeachZone]) -> List[Visitor]:
        """
        Updates kinematic positions, sensory cues, escape vectors, hydrodynamic drift, fatigue, and distress states.
        """
        for v in self.visitors:
            if v.distress_state == DistressState.RESCUED:
                continue

            # 1. Calculate local water depth column & swimming status
            if v.y < 0.0:
                v.local_water_depth = 0.0
                v.swimming_status = SwimmingStatus.ON_BEACH
            elif v.y < 15.0:
                v.local_water_depth = 0.2 + (v.y / 15.0) * 0.5
                v.swimming_status = SwimmingStatus.WADING
            elif v.y < 40.0:
                v.local_water_depth = 0.7 + (v.y / 40.0) * 0.8
                v.swimming_status = SwimmingStatus.SHALLOW_WATER
            elif v.y < 100.0:
                v.local_water_depth = 1.5 + (v.y / 100.0) * 1.5
                v.swimming_status = SwimmingStatus.DEEP_SWIMMING
            else:
                v.local_water_depth = 3.5
                v.swimming_status = SwimmingStatus.RESTRICTED_OFFSHORE

            # In rip channel (Zone B), trench deepens
            in_rip_channel = (300.0 <= v.x <= 540.0 and v.y > 5.0)
            if in_rip_channel:
                v.local_water_depth += 0.45

            # Update current zone
            for zone in zones:
                if zone.x_min <= v.x <= zone.x_max:
                    v.current_zone_id = zone.id
                    break

            # 2. Local Person-to-Shore Tactile Sensory Cues & Perception
            tactile_undertow = (in_rip_channel and env.rip_current_speed_mps > 0.6 and v.local_water_depth < 0.9)
            sudden_surge = (env.wave_height_m > 2.0 and v.local_water_depth > 0.2)
            v.tactile_undertow_detected = tactile_undertow
            v.sudden_surge_detected = sudden_surge

            if v.awareness_state == AwarenessState.UNAWARE:
                if tactile_undertow or sudden_surge or in_rip_channel:
                    v.awareness_state = AwarenessState.SUSPICIOUS
                    v.reaction_timer = v.reaction_delay_seconds
            elif v.awareness_state == AwarenessState.SUSPICIOUS:
                if v.reaction_timer is not None:
                    v.reaction_timer -= dt
                    if v.reaction_timer <= 0:
                        v.awareness_state = AwarenessState.FLEEING
            elif v.awareness_state == AwarenessState.FLEEING:
                if v.y < 0.0:
                    v.awareness_state = AwarenessState.UNAWARE
                elif in_rip_channel and v.local_water_depth > 1.8 and v.stamina < 20.0:
                    v.awareness_state = AwarenessState.TRAPPED

            # 3. Compute Escape Vector
            if v.awareness_state in [AwarenessState.FLEEING, AwarenessState.TRAPPED]:
                if in_rip_channel and v.local_water_depth > 1.0:
                    # Escape parallel to shore: Lateral exit along X-axis out of the rip trench
                    lateral_sign = 1.0 if v.x >= 420.0 else -1.0
                    v.escape_vector_dx = lateral_sign
                    v.escape_vector_dy = -0.2
                else:
                    # Move to dry dunes (y <= -10m)
                    v.escape_vector_dx = 0.0
                    v.escape_vector_dy = -1.0

            # 4. Hydrodynamic Forces & Kinematics
            if in_rip_channel and env.rip_current_speed_mps > 0.20:
                # Rip current pulls seaward (+Y) and converges to channel center
                seaward_pull = env.rip_current_speed_mps * dt * (0.8 + 0.4 * (v.y / 50.0))
                v.y += seaward_pull
                dx_center = (420.0 - v.x) * 0.02 * dt
                v.x += dx_center

                # Stamina drain against rip current
                if v.swimming_status in [SwimmingStatus.SHALLOW_WATER, SwimmingStatus.DEEP_SWIMMING]:
                    stamina_drain = (env.rip_current_speed_mps * 2.5) * dt
                    if v.skill in [SwimmingSkill.NON_SWIMMER, SwimmingSkill.BEGINNER]:
                        stamina_drain *= 1.8
                    v.stamina = max(0.0, v.stamina - stamina_drain)

                    # Trigger distress if stamina depleted
                    if v.stamina < 30.0 and v.distress_state == DistressState.NONE:
                        v.distress_state = DistressState.TIRED
                        v.last_action_timestamp = env.timestamp
                    elif v.stamina < 10.0 and v.distress_state in [DistressState.NONE, DistressState.TIRED]:
                        v.distress_state = DistressState.STRUGGLING
                        v.last_action_timestamp = env.timestamp
                    elif v.stamina <= 0.0 and v.distress_state == DistressState.STRUGGLING:
                        v.distress_state = DistressState.DROWNING_ACTIVE
                        v.last_action_timestamp = env.timestamp

            # Apply Autonomous Fleeing Propulsion
            if v.awareness_state == AwarenessState.FLEEING and v.distress_state not in [DistressState.STRUGGLING, DistressState.DROWNING_ACTIVE]:
                flee_speed = 1.6  # m/s
                v.x += v.escape_vector_dx * flee_speed * dt
                v.y += v.escape_vector_dy * flee_speed * dt
            elif v.distress_state == DistressState.NONE:
                # Normal bather gentle wandering
                vx_rand = (self.rng.random() - 0.5) * 0.4
                vy_rand = (self.rng.random() - 0.5) * 0.2
                v.x = max(10.0, min(990.0, v.x + vx_rand * dt))
                v.y = max(-30.0, min(80.0, v.y + vy_rand * dt))

            # 5. High Wave Energy knockdown risk
            if env.wave_height_m > 1.8 and v.swimming_status == SwimmingStatus.SHALLOW_WATER:
                if v.skill == SwimmingSkill.NON_SWIMMER and self.rng.random() < 0.005:
                    v.distress_state = DistressState.STRUGGLING
                    v.last_action_timestamp = env.timestamp

        return self.visitors

    def inject_distress(self, visitor_id: Optional[str] = None, zone_id: str = "ZONE_B") -> Optional[Visitor]:
        """
        Manually injects distress on a specific visitor or a random swimmer in the target zone.
        """
        candidates = [v for v in self.visitors if v.current_zone_id == zone_id and v.y > 0]
        if not candidates:
            candidates = self.visitors

        if not candidates:
            return None

        target = None
        if visitor_id:
            target = next((v for v in candidates if v.id == visitor_id), None)
        if not target:
            target = self.rng.choice(candidates)

        target.distress_state = DistressState.STRUGGLING
        target.stamina = 15.0
        target.y = max(25.0, target.y) # push into water
        return target
