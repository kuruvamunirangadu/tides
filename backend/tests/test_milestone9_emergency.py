"""
backend/tests/test_milestone9_emergency.py
Unit tests for TIDES Milestone 9:
Intelligent Emergency Coordination & Evacuation.
"""

import time
from app.emergency.types import (
    EvacuationZoneState,
    EmergencyActionType,
    RecommendationStatus,
    IncidentStatus,
)
from app.emergency.emergency_coordinator import MultiIncidentCoordinator
from app.emergency.evacuation_manager import EvacuationManager


def test_01_multiple_simultaneous_incidents():
    """Test 1: Multiple incidents registered concurrently with preserved unique IDs."""
    coordinator = MultiIncidentCoordinator()
    inc1, d1, msg1 = coordinator.register_distress_incident("INC-001", "VIS-101", 500.0, 350.0, 0.8)
    inc2, d2, msg2 = coordinator.register_distress_incident("INC-002", "VIS-102", 520.0, 360.0, 0.9)

    incidents = coordinator.get_incidents()
    assert len(incidents) == 2
    ids = {i.incident_id for i in incidents}
    assert "INC-001" in ids and "INC-002" in ids
    assert inc2.priority_score >= inc1.priority_score  # Higher distress level yields higher priority


def test_02_duplicate_incident_suppression():
    """Test 2: Duplicate events for same incident ID are suppressed without duplicate dispatch."""
    coordinator = MultiIncidentCoordinator()
    inc1, d1, _ = coordinator.register_distress_incident("INC-001", "VIS-101", 500.0, 350.0, 0.8)
    assert d1 is True

    # Duplicate call with same ID
    inc2, d2, msg2 = coordinator.register_distress_incident("INC-001", "VIS-101", 500.0, 350.0, 0.8)
    assert d2 is False
    assert "Duplicate" in msg2
    assert len(coordinator.get_incidents()) == 1


def test_03_resource_assignment_conflicts():
    """Test 3: Resources cannot be assigned to conflicting concurrent incidents."""
    coordinator = MultiIncidentCoordinator()
    inc1, d1, _ = coordinator.register_distress_incident("INC-001", "VIS-101", 500.0, 380.0, 0.9)
    inc2, d2, _ = coordinator.register_distress_incident("INC-002", "VIS-102", 520.0, 390.0, 0.85)

    assert inc1.assigned_resource_id is not None
    assert inc2.assigned_resource_id is not None
    # Crucial conflict check: neither resource is double-booked
    assert inc1.assigned_resource_id != inc2.assigned_resource_id
    assert len(coordinator._resource_locks) == 2


def test_04_resource_unavailability_and_exhaustion():
    """Test 4: When all suitable resources are occupied, incident is marked UNRESOLVED_RESOURCE_EXHAUSTION."""
    coordinator = MultiIncidentCoordinator()
    # Incident 1 uses BOAT-01
    coordinator.register_distress_incident("INC-001", "VIS-101", 500.0, 400.0, 0.9)
    # Incident 2 uses DRONE-01
    coordinator.register_distress_incident("INC-002", "VIS-102", 520.0, 410.0, 0.9)
    # Incident 3 in deep water has no remaining deep-water craft! (Lifeguards cannot swim 150m offshore)
    inc3, d3, msg3 = coordinator.register_distress_incident("INC-003", "VIS-103", 540.0, 420.0, 0.9)

    assert d3 is False
    assert inc3.status == IncidentStatus.UNRESOLVED_RESOURCE_EXHAUSTION
    assert coordinator.get_unresolved_count() == 1


def test_05_valid_and_invalid_evacuation_routes():
    """Test 5: Route planner finds valid route and returns None for unreachable zones."""
    mgr = EvacuationManager()
    route = mgr.find_best_route(500.0, 240.0, "ZONE-CENTRAL-SWIM")
    assert route is not None
    assert route.origin_zone_id == "ZONE-CENTRAL-SWIM"
    assert len(route.waypoints) >= 2

    # Invalid zone has no route
    no_route = mgr.find_best_route(100.0, 100.0, "ZONE-NON-EXISTENT")
    assert no_route is None


def test_06_blocked_and_reopened_routes():
    """Test 6: Blocking a route redirects visitors to clear alternate routes."""
    mgr = EvacuationManager()
    # Block primary route
    mgr.set_route_blocked("ROUTE-CENTRAL-TO-PAVILION", True, "Debris on boardwalk")

    # Path search selects alternate route to North Ramp
    alternate = mgr.find_best_route(500.0, 240.0, "ZONE-CENTRAL-SWIM")
    assert alternate is not None
    assert alternate.route_id == "ROUTE-CENTRAL-TO-NORTH"
    assert alternate.exit_id == "EXIT-NORTH-RAMP"

    # Reopen primary route
    mgr.set_route_blocked("ROUTE-CENTRAL-TO-PAVILION", False)
    reopened = mgr.find_best_route(500.0, 240.0, "ZONE-CENTRAL-SWIM")
    assert reopened.route_id == "ROUTE-CENTRAL-TO-PAVILION"


def test_07_priority_score_calculation():
    """Test 7: Documented priority formula properly ranks high distress and offshore distance."""
    coordinator = MultiIncidentCoordinator()
    # Nearshore mild distress
    score_low = coordinator.calculate_priority_score(distress_level=0.3, y_pos=290.0, wait_time_sec=5.0)
    # Deep offshore severe distress
    score_high = coordinator.calculate_priority_score(distress_level=0.95, y_pos=450.0, wait_time_sec=40.0)

    assert score_high > score_low
    assert 0.0 <= score_low <= 1.0
    assert 0.0 <= score_high <= 1.0


def test_08_congestion_and_queues():
    """Test 8: Exit queues penalize route cost to distribute crowd flow."""
    mgr = EvacuationManager()
    # Artificially inflate queue on Central Pavilion
    mgr._exits["EXIT-CENTRAL-PAVILION"].current_queue_count = 50

    # Route cost should shift preference to alternate uncrowded exit
    alt = mgr.find_best_route(550.0, 240.0, "ZONE-CENTRAL-SWIM")
    assert alt.exit_id == "EXIT-NORTH-RAMP"


def test_09_operator_approval_and_rejection():
    """Test 9: High-impact actions require explicit operator confirmation."""
    mgr = EvacuationManager()
    # Trigger rule recommendations
    recs = mgr.evaluate_emergency_rules(
        active_incidents_count=2,
        rip_current_speed_mps=0.72,
        affected_visitors_count=25,
        occupied_resources_count=2,
    )
    evac_rec = next(r for r in recs if r.action_type == EmergencyActionType.EVACUATE_ZONE)
    assert evac_rec.status == RecommendationStatus.RECOMMENDED

    # Zone is NOT in EVACUATION state yet
    central_zone = mgr._zones["ZONE-CENTRAL-SWIM"]
    assert central_zone.state == EvacuationZoneState.NORMAL

    # Operator approves
    ok, msg = mgr.review_recommendation(evac_rec.recommendation_id, approve=True, operator_id="COMMAND-01")
    assert ok is True
    assert evac_rec.status == RecommendationStatus.OPERATOR_APPROVED
    assert central_zone.state == EvacuationZoneState.EVACUATION
    assert central_zone.is_operator_confirmed is True


def test_10_duplicate_warnings_and_zone_transitions():
    """Test 10: Repeated rule evaluations do not flood duplicate recommendations."""
    mgr = EvacuationManager()
    r1 = mgr.evaluate_emergency_rules(2, 0.72, 25, 2)
    count1 = len(mgr.get_recommendations())

    # Call again immediately with same conditions
    r2 = mgr.evaluate_emergency_rules(2, 0.72, 25, 2)
    count2 = len(mgr.get_recommendations())
    assert count1 == count2


def test_11_missing_timestamps_and_unavailable_metrics():
    """Test 11: Inactive evacuation returns N/A (None) without zero-filling."""
    mgr = EvacuationManager()
    metrics = mgr.get_performance_metrics()
    assert metrics.evacuation_completion_pct is None
    assert metrics.warning_to_movement_delay_sec is None
    assert metrics.scenario_duration_sec is None


def test_12_scenario_reset_and_cancellation():
    """Test 12: Scenario reset cleanly clears locks and restores baseline states."""
    coordinator = MultiIncidentCoordinator()
    mgr = EvacuationManager()

    coordinator.register_distress_incident("INC-001", "VIS-101", 500.0, 350.0, 0.8)
    mgr.evaluate_emergency_rules(2, 0.72, 25, 2)

    coordinator.reset()
    mgr.reset()

    assert len(coordinator.get_incidents()) == 0
    assert len(coordinator._resource_locks) == 0
    assert len(mgr.get_recommendations()) == 0
    assert mgr._zones["ZONE-CENTRAL-SWIM"].state == EvacuationZoneState.NORMAL


def test_13_preservation_of_normal_visitor_behavior():
    """Test 13: Normal zones maintain standard states and reasons."""
    mgr = EvacuationManager()
    south_zone = mgr._zones["ZONE-SOUTH-SURF"]
    assert south_zone.state == EvacuationZoneState.NORMAL
    assert not south_zone.is_operator_confirmed


def test_14_incident_resolution_releases_resource():
    """Test 14: Resolving an incident releases the resource back to AVAILABLE."""
    coordinator = MultiIncidentCoordinator()
    inc, _, _ = coordinator.register_distress_incident("INC-RES-01", "VIS-101", 500.0, 350.0, 0.8)
    res_id = inc.assigned_resource_id
    assert res_id is not None
    assert coordinator._resources[res_id]["status"] == "EN_ROUTE"

    # Resolve incident
    ok = coordinator.resolve_incident("INC-RES-01")
    assert ok is True
    assert coordinator._resources[res_id]["status"] == "AVAILABLE"
    assert res_id not in coordinator._resource_locks


def test_15_metrics_calculation_with_active_evacuation():
    """Test 15: Active evacuation properly calculates completion and movement delay."""
    mgr = EvacuationManager()
    recs = mgr.evaluate_emergency_rules(2, 0.72, 10, 2)
    evac_rec = next(r for r in recs if r.action_type == EmergencyActionType.EVACUATE_ZONE)
    mgr.review_recommendation(evac_rec.recommendation_id, approve=True)

    mgr._total_evacuees = 10
    mgr.record_visitor_evacuated()
    mgr.record_visitor_evacuated()

    metrics = mgr.get_performance_metrics()
    assert metrics.evacuation_completion_pct == 20.0
    assert metrics.visitors_remaining_in_hazard_zones == 8
    assert metrics.scenario_duration_sec is not None
