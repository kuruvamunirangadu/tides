"""
Response Engine
Coordinates and executes simulated safety responses:
- Dispatches nearest available Lifeguards and Drone units
- Triggers PA audio broadcasts and siren alerts
- Updates digital warning signage and beach warning flags
- Tracks execution latencies and operational state machine
"""

import math
from typing import Dict, List, Optional
import uuid

from app.config.thresholds import SafetyConfig, DEFAULT_SAFETY_CONFIG
from app.models.beach import (
    BeachLayout,
    BeachZone,
    FlagStatus,
    Lifeguard,
    Drone,
    WarningBoard,
    PASystem,
    ResourceStatus,
)
from app.models.incident import Incident, IncidentStatus, IncidentType, IncidentSeverity
from app.models.visitor import Visitor, DistressState
from app.models.response import (
    Decision,
    DecisionActionType,
    SafetyResponse,
    ResponseStatus,
)


class ResponseEngine:
    def __init__(self, config: Optional[SafetyConfig] = None):
        self.config = config or DEFAULT_SAFETY_CONFIG
        self.active_responses: Dict[str, SafetyResponse] = {}

    def execute_decisions(
        self,
        current_time: float,
        decisions: List[Decision],
        beach: BeachLayout,
        visitors: List[Visitor],
        active_incidents: List[Incident]
    ) -> tuple[List[SafetyResponse], List[Incident], List[str]]:
        """
        Executes decisions by allocating resources, updating flags/boards/PA, and logging responses.
        Returns:
            (newly_triggered_responses, updated_incidents, event_log_messages)
        """
        responses: List[SafetyResponse] = []
        event_logs: List[str] = []

        for decision in decisions:
            for action in decision.recommended_actions:
                response = self._process_action(
                    current_time,
                    decision,
                    action,
                    beach,
                    visitors,
                    active_incidents,
                    event_logs
                )
                if response:
                    responses.append(response)
                    self.active_responses[response.response_id] = response

        # Update ongoing resource movements and incident progression
        self._update_active_operations(current_time, beach, visitors, active_incidents, event_logs)

        return responses, active_incidents, event_logs

    def _process_action(
        self,
        current_time: float,
        decision: Decision,
        action: DecisionActionType,
        beach: BeachLayout,
        visitors: List[Visitor],
        active_incidents: List[Incident],
        event_logs: List[str]
    ) -> Optional[SafetyResponse]:
        target_zone_id = decision.affected_zone

        # 1. Flag Updates
        if action in [DecisionActionType.SET_FLAG_RED, DecisionActionType.SET_FLAG_YELLOW, DecisionActionType.SET_FLAG_DOUBLE_RED, DecisionActionType.MAINTAIN_NORMAL_WATCH]:
            flag_map = {
                DecisionActionType.SET_FLAG_RED: FlagStatus.RED,
                DecisionActionType.SET_FLAG_YELLOW: FlagStatus.YELLOW,
                DecisionActionType.SET_FLAG_DOUBLE_RED: FlagStatus.DOUBLE_RED,
                DecisionActionType.MAINTAIN_NORMAL_WATCH: FlagStatus.GREEN,
            }
            new_flag = flag_map[action]
            for zone in beach.zones:
                if target_zone_id in ["ALL_ZONES", zone.id]:
                    if zone.flag_status != new_flag:
                        zone.flag_status = new_flag
                        event_logs.append(f"🚩 Zone {zone.name} flag changed to {new_flag.value}")

            return SafetyResponse(
                response_id=f"RESP-FLAG-{uuid.uuid4().hex[:6]}",
                source_decision_id=decision.decision_id,
                action_type=action,
                target_id=target_zone_id,
                target_zone=target_zone_id,
                timestamp=current_time,
                status=ResponseStatus.COMPLETED,
                details={"new_flag": new_flag.value}
            )

        # 2. Digital Warning Board Updates
        elif action == DecisionActionType.UPDATE_WARNING_BOARD:
            for board in beach.warning_boards:
                if target_zone_id in ["ALL_ZONES", board.zone_id]:
                    msg = "CAUTION: HIGH RIP CURRENT / SURF DANGER" if decision.severity in ["HIGH", "CRITICAL"] else "ADVISORY: MODERATE SURF"
                    board.display_text = msg
                    board.flag_color = FlagStatus.RED if decision.severity in ["HIGH", "CRITICAL"] else FlagStatus.YELLOW
                    board.strobe_active = decision.severity == "CRITICAL"
            
            return SafetyResponse(
                response_id=f"RESP-BOARD-{uuid.uuid4().hex[:6]}",
                source_decision_id=decision.decision_id,
                action_type=action,
                target_id="WARNING_BOARDS",
                target_zone=target_zone_id,
                timestamp=current_time,
                status=ResponseStatus.COMPLETED,
                details={"message": msg}
            )

        # 3. Public Announcement (PA) Broadcasts
        elif action == DecisionActionType.BROADCAST_PA_ALERT:
            cooldown = self.config.response.pa_broadcast_cooldown_seconds
            for pa in beach.pa_systems:
                if target_zone_id in ["ALL_ZONES", pa.zone_id]:
                    if current_time - pa.last_broadcast_timestamp >= cooldown:
                        pa.is_broadcasting = True
                        pa.last_broadcast_timestamp = current_time
                        pa.current_message = f"SAFETY ALERT: Severe hazards in {target_zone_id}. Please exit water immediately."
                        event_logs.append(f"📢 PA Alert Broadcasted in {pa.zone_id}: '{pa.current_message}'")
                        
                        return SafetyResponse(
                            response_id=f"RESP-PA-{uuid.uuid4().hex[:6]}",
                            source_decision_id=decision.decision_id,
                            action_type=action,
                            target_id=pa.id,
                            target_zone=target_zone_id,
                            timestamp=current_time,
                            status=ResponseStatus.COMPLETED,
                            details={"pa_id": pa.id, "broadcast": pa.current_message}
                        )

        # 4. Lifeguard Rescue / Patrol Dispatch
        elif action == DecisionActionType.DISPATCH_LIFEGUARD_RESCUE:
            visitor_id = decision.metadata.get("visitor_id")
            target_v = next((v for v in visitors if v.id == visitor_id), None) if visitor_id else None
            
            # Find nearest available lifeguard
            available_lg = [lg for lg in beach.lifeguards if lg.status in [ResourceStatus.AVAILABLE, ResourceStatus.ON_PATROL]]
            if available_lg and target_v:
                # Calculate distance
                nearest_lg = min(
                    available_lg,
                    key=lambda lg: math.hypot(lg.current_x - target_v.x, lg.current_y - target_v.y)
                )
                nearest_lg.status = ResourceStatus.DISPATCHED
                nearest_lg.target_x = target_v.x
                nearest_lg.target_y = target_v.y
                
                # Check or create Incident
                incident = self._get_or_create_incident(
                    current_time, target_v, active_incidents, nearest_lg.id
                )
                nearest_lg.target_incident_id = incident.id
                incident.dispatched_resource_ids.append(nearest_lg.id)
                incident.response_dispatch_time = current_time
                incident.response_latency_s = round(current_time - (incident.start_time or current_time), 2)
                incident.status = IncidentStatus.DISPATCHED

                event_logs.append(f"🚨 Lifeguard {nearest_lg.name} dispatched to {target_v.id} in {target_zone_id}")

                return SafetyResponse(
                    response_id=f"RESP-LG-{uuid.uuid4().hex[:6]}",
                    source_decision_id=decision.decision_id,
                    action_type=action,
                    target_id=nearest_lg.id,
                    target_zone=target_zone_id,
                    timestamp=current_time,
                    status=ResponseStatus.EXECUTING,
                    details={"lifeguard_id": nearest_lg.id, "target_visitor": target_v.id}
                )

        # 5. Drone Aerial Patrol / Flotation Drop Dispatch
        elif action in [DecisionActionType.DISPATCH_DRONE_PATROL, DecisionActionType.DISPATCH_DRONE_RESCUE]:
            available_drones = [d for d in beach.drones if d.status == ResourceStatus.AVAILABLE and d.battery_pct > 20.0]
            if available_drones:
                drone = available_drones[0]
                target_x = decision.metadata.get("location_x", 400.0)
                target_y = decision.metadata.get("location_y", 60.0)
                
                drone.status = ResourceStatus.DISPATCHED
                drone.target_x = target_x
                drone.target_y = target_y
                
                event_logs.append(f"🛸 Autonomous Drone {drone.id} dispatched to {target_zone_id} ({action.value})")

                return SafetyResponse(
                    response_id=f"RESP-DRONE-{uuid.uuid4().hex[:6]}",
                    source_decision_id=decision.decision_id,
                    action_type=action,
                    target_id=drone.id,
                    target_zone=target_zone_id,
                    timestamp=current_time,
                    status=ResponseStatus.EXECUTING,
                    details={"drone_id": drone.id, "target_x": target_x, "target_y": target_y}
                )

        return None

    def _get_or_create_incident(
        self,
        current_time: float,
        visitor: Visitor,
        active_incidents: List[Incident],
        dispatched_id: str
    ) -> Incident:
        for inc in active_incidents:
            if visitor.id in inc.involved_visitor_ids and inc.status != IncidentStatus.CLOSED:
                return inc

        inc = Incident(
            id=f"INC-{uuid.uuid4().hex[:6].upper()}",
            incident_type=IncidentType.SWIMMER_DISTRESS,
            severity=IncidentSeverity.CRITICAL if visitor.distress_state == DistressState.DROWNING_ACTIVE else IncidentSeverity.HIGH,
            status=IncidentStatus.DETECTED,
            zone_id=visitor.current_zone_id,
            location_x=visitor.x,
            location_y=visitor.y,
            involved_visitor_ids=[visitor.id],
            start_time=visitor.last_action_timestamp or current_time,
            detection_time=current_time,
            detection_latency_s=max(0.0, round(current_time - (visitor.last_action_timestamp or current_time), 2)),
            dispatched_resource_ids=[],
            description=f"Swimmer {visitor.id} in {visitor.distress_state.value} distress condition"
        )
        active_incidents.append(inc)
        return inc

    def _update_active_operations(
        self,
        current_time: float,
        beach: BeachLayout,
        visitors: List[Visitor],
        active_incidents: List[Incident],
        event_logs: List[str]
    ):
        dt = 1.0  # nominal 1 second update step

        # Update Lifeguard movements
        for lg in beach.lifeguards:
            if lg.status == ResourceStatus.DISPATCHED and lg.target_x is not None and lg.target_y is not None:
                dx = lg.target_x - lg.current_x
                dy = lg.target_y - lg.current_y
                dist = math.hypot(dx, dy)
                step = lg.speed_mps * dt

                if dist <= step or dist < 2.0:
                    lg.current_x = lg.target_x
                    lg.current_y = lg.target_y
                    lg.status = ResourceStatus.ON_SCENE
                    
                    # Resolve incident or rescue visitor
                    if lg.target_incident_id:
                        inc = next((i for i in active_incidents if i.id == lg.target_incident_id), None)
                        if inc:
                            inc.on_scene_time = current_time
                            inc.status = IncidentStatus.ON_SCENE
                            event_logs.append(f"🏊 Lifeguard {lg.name} reached victim on scene ({lg.target_incident_id})")
                else:
                    lg.current_x += (dx / dist) * step
                    lg.current_y += (dy / dist) * step

            elif lg.status == ResourceStatus.ON_SCENE:
                # Perform rescue stabilization
                if lg.target_incident_id:
                    inc = next((i for i in active_incidents if i.id == lg.target_incident_id), None)
                    if inc and inc.status == IncidentStatus.ON_SCENE:
                        # Find victim
                        for v_id in inc.involved_visitor_ids:
                            v = next((vis for vis in visitors if vis.id == v_id), None)
                            if v:
                                v.distress_state = DistressState.RESCUED
                                v.swimming_status = SwimmingStatus.ON_BEACH
                                v.y = -10.0  # bring back to safe sand
                                v.stamina = 100.0

                        inc.status = IncidentStatus.RESOLVED
                        inc.resolution_time = current_time
                        inc.resolution_duration_s = round(current_time - inc.start_time, 2)
                        inc.outcome = "SUCCESSFUL_RESCUE"
                        event_logs.append(f"✅ Incident {inc.id} RESOLVED: Swimmer rescued safely to shore")
                        
                        # Set lifeguard returning
                        lg.status = ResourceStatus.AVAILABLE
                        lg.target_incident_id = None

        # Update Drone movements & battery
        for drone in beach.drones:
            if drone.status == ResourceStatus.DISPATCHED and drone.target_x is not None:
                dx = drone.target_x - drone.current_x
                dy = drone.target_y - drone.current_y
                dist = math.hypot(dx, dy)
                step = drone.speed_mps * dt

                if dist <= step or dist < 5.0:
                    drone.current_x = drone.target_x
                    drone.current_y = drone.target_y
                    drone.status = ResourceStatus.ON_PATROL
                    event_logs.append(f"🛸 Drone {drone.id} holding aerial surveillance station over target")
                else:
                    drone.current_x += (dx / dist) * step
                    drone.current_y += (dy / dist) * step

            drone.battery_pct = max(0.0, drone.battery_pct - 0.01 * dt)
