"""
Risk Assessment Engine
Distinguishes between Environmental Hazard (the physical threat), Exposure (human presence in hazard zone),
and Operational Risk (the combined probability & consequence of harm).
"""

from typing import Dict, List, Optional
from app.config.thresholds import SafetyConfig, DEFAULT_SAFETY_CONFIG
from app.models.beach import BeachLayout, BeachZone, ZoneType
from app.models.visitor import Visitor, SwimmingStatus, DistressState
from app.models.response import HazardDetection, HazardSeverity, ZoneRiskAssessment


class RiskEngine:
    def __init__(self, config: Optional[SafetyConfig] = None):
        self.config = config or DEFAULT_SAFETY_CONFIG

    def assess_risk(
        self,
        zones: List[BeachZone],
        hazards: List[HazardDetection],
        visitors: List[Visitor]
    ) -> Dict[str, ZoneRiskAssessment]:
        """
        Computes zone-by-zone risk assessment separating Hazard, Exposure, and Vulnerability.
        """
        risk_assessments: Dict[str, ZoneRiskAssessment] = {}

        for zone in zones:
            # 1. Calculate Zone Hazard Score (0.0 to 1.0)
            hazard_score, hazard_reasons = self._calculate_zone_hazard(zone, hazards)

            # 2. Calculate Zone Exposure Score (0.0 to 1.0)
            zone_visitors = [v for v in visitors if v.current_zone_id == zone.id]
            exposure_score, swimmer_count, bather_count, distressed_count, exposure_reasons = (
                self._calculate_zone_exposure(zone, zone_visitors)
            )

            # 3. Calculate Vulnerability / Distress Score (0.0 to 1.0)
            vulnerability_score = min(1.0, distressed_count * 0.40 + (swimmer_count * 0.05))

            # 4. Synthesize Combined Operational Risk
            weights = self.config.risk
            total_risk = (
                (hazard_score * weights.hazard_weight) +
                (exposure_score * weights.exposure_weight) +
                (vulnerability_score * weights.vulnerability_weight)
            )
            total_risk = max(0.0, min(1.0, total_risk))

            # Determine Risk Level Category & Recommended Flag
            risk_level, recommended_flag = self._categorize_risk(total_risk, zone.zone_type, distressed_count)

            factors = hazard_reasons + exposure_reasons
            if distressed_count > 0:
                factors.append(f"{distressed_count} swimmer(s) in active/struggling distress")

            risk_assessments[zone.id] = ZoneRiskAssessment(
                zone_id=zone.id,
                hazard_score=round(hazard_score, 3),
                exposure_score=round(exposure_score, 3),
                vulnerability_score=round(vulnerability_score, 3),
                total_risk_score=round(total_risk, 3),
                risk_level=risk_level,
                recommended_flag=recommended_flag,
                visitor_count=len(zone_visitors),
                swimmer_count=swimmer_count,
                distressed_count=distressed_count,
                primary_risk_factors=factors
            )

        return risk_assessments

    def _calculate_zone_hazard(self, zone: BeachZone, hazards: List[HazardDetection]) -> tuple[float, List[str]]:
        zone_hazards = [h for h in hazards if zone.id in h.affected_zones]
        if not zone_hazards:
            return 0.05, []

        max_hazard_val = 0.0
        reasons = []
        severity_map = {
            HazardSeverity.NONE: 0.0,
            HazardSeverity.LOW: 0.25,
            HazardSeverity.MODERATE: 0.50,
            HazardSeverity.HIGH: 0.80,
            HazardSeverity.CRITICAL: 1.00,
        }

        for h in zone_hazards:
            val = severity_map.get(h.severity, 0.0) * h.confidence
            if val > max_hazard_val:
                max_hazard_val = val
            reasons.append(f"{h.hazard_type} ({h.severity.value}): {h.reason}")

        # Inherent baseline risk for restricted zones
        if zone.zone_type == ZoneType.RESTRICTED:
            max_hazard_val = max(max_hazard_val, 0.70)
            reasons.append("Zone designated as naturally hazardous / rocky cliffs")
        elif zone.zone_type == ZoneType.RIP_CHANNEL:
            max_hazard_val = max(max_hazard_val, 0.45)

        return min(1.0, max_hazard_val), reasons

    def _calculate_zone_exposure(
        self,
        zone: BeachZone,
        zone_visitors: List[Visitor]
    ) -> tuple[float, int, int, int, List[str]]:
        swimmers = 0
        waders = 0
        distressed = 0

        for v in zone_visitors:
            if v.distress_state not in [DistressState.NONE, DistressState.RESCUED]:
                distressed += 1
            if v.swimming_status in [SwimmingStatus.DEEP_SWIMMING, SwimmingStatus.RESTRICTED_OFFSHORE]:
                swimmers += 1
            elif v.swimming_status in [SwimmingStatus.SHALLOW_WATER, SwimmingStatus.WADING]:
                waders += 1

        total_in_water = swimmers + waders
        capacity = max(1, zone.swimmer_capacity)
        
        # Exposure formula: weighted by water immersion depth
        exposure_raw = (len(zone_visitors) * 0.1 + waders * 0.4 + swimmers * 1.0) / capacity
        exposure_score = min(1.0, exposure_raw)

        reasons = []
        if total_in_water > 0:
            reasons.append(f"{total_in_water} bathers in water ({swimmers} in deep surf, {waders} wading)")
        if len(zone_visitors) > 0 and zone.zone_type == ZoneType.RESTRICTED:
            reasons.append(f"{len(zone_visitors)} unauthorized visitors inside restricted boundary")

        return exposure_score, swimmers, total_in_water, distressed, reasons

    def _categorize_risk(self, total_risk: float, zone_type: ZoneType, distressed_count: int) -> tuple[HazardSeverity, str]:
        cfg = self.config.risk

        if distressed_count > 0 or total_risk >= cfg.risk_red_threshold:
            return HazardSeverity.CRITICAL if distressed_count > 0 else HazardSeverity.HIGH, "RED"
        elif total_risk >= cfg.risk_orange_threshold:
            return HazardSeverity.HIGH, "RED"
        elif total_risk >= cfg.risk_yellow_threshold:
            return HazardSeverity.MODERATE, "YELLOW"
        else:
            return HazardSeverity.LOW, "GREEN"
