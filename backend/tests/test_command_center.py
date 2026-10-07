import pytest

ROLE_PERMISSIONS = {
    "SYSTEM_ADMIN": {"can_dispatch": True, "can_close_zone": True, "can_evacuate": True},
    "COMMAND_OPERATOR": {"can_dispatch": True, "can_close_zone": True, "can_evacuate": True},
    "BEACH_SUPERVISOR": {"can_dispatch": True, "can_close_zone": True, "can_evacuate": False},
    "ANALYST": {"can_dispatch": False, "can_close_zone": False, "can_evacuate": False},
    "VIEW_ONLY": {"can_dispatch": False, "can_close_zone": False, "can_evacuate": False},
}

def can_execute_action(role: str, action: str) -> bool:
    perms = ROLE_PERMISSIONS.get(role, {})
    if action == "DISPATCH_RESOURCE":
        return perms.get("can_dispatch", False)
    elif action == "CLOSE_ZONE":
        return perms.get("can_close_zone", False)
    elif action == "INITIATE_EVACUATION":
        return perms.get("can_evacuate", False)
    return False

def aggregate_multi_beach_metrics(beaches):
    total_beaches = len(beaches)
    critical_count = sum(1 for b in beaches if b["risk_level"] == "CRITICAL")
    total_exposed = sum(b["exposed"] for b in beaches)
    total_incidents = sum(b["incidents"] for b in beaches)
    total_lifeguards_avail = sum(b["lifeguards_avail"] for b in beaches)
    total_lifeguards_fleet = sum(b["lifeguards_fleet"] for b in beaches)
    
    return {
        "total_beaches": total_beaches,
        "critical_count": critical_count,
        "total_exposed": total_exposed,
        "total_incidents": total_incidents,
        "lifeguards_avail": total_lifeguards_avail,
        "lifeguards_fleet": total_lifeguards_fleet,
    }

def test_rbac_permissions():
    assert can_execute_action("COMMAND_OPERATOR", "DISPATCH_RESOURCE") is True
    assert can_execute_action("COMMAND_OPERATOR", "CLOSE_ZONE") is True
    assert can_execute_action("BEACH_SUPERVISOR", "INITIATE_EVACUATION") is False
    assert can_execute_action("ANALYST", "DISPATCH_RESOURCE") is False
    assert can_execute_action("VIEW_ONLY", "CLOSE_ZONE") is False

def test_multi_beach_aggregation():
    beaches = [
        {"id": "RK-BEACH", "risk_level": "HIGH", "exposed": 87, "incidents": 1, "lifeguards_avail": 5, "lifeguards_fleet": 8},
        {"id": "RUSHIKONDA", "risk_level": "MODERATE", "exposed": 142, "incidents": 0, "lifeguards_avail": 6, "lifeguards_fleet": 8},
        {"id": "BHEEMILI", "risk_level": "CRITICAL", "exposed": 65, "incidents": 2, "lifeguards_avail": 2, "lifeguards_fleet": 6},
    ]
    agg = aggregate_multi_beach_metrics(beaches)
    assert agg["total_beaches"] == 3
    assert agg["critical_count"] == 1
    assert agg["total_exposed"] == 294
    assert agg["total_incidents"] == 3
    assert agg["lifeguards_avail"] == 13
    assert agg["lifeguards_fleet"] == 22

def test_causal_audit_trail_append():
    audit_trail = []
    
    # Event 1: Hazard
    audit_trail.append({
        "seq": 1,
        "actor": "HAZARD_ENGINE",
        "event": "Rip current detected",
        "chain": ["ADCP spike", "Threshold exceeded"],
    })
    # Event 2: Operator Action
    audit_trail.append({
        "seq": 2,
        "actor": "OPERATOR_01",
        "event": "Dispatched UAV-01",
        "chain": ["Rip current detected", "Risk CRITICAL", "Operator authorization"],
    })
    
    assert len(audit_trail) == 2
    assert audit_trail[-1]["actor"] == "OPERATOR_01"
    assert "Risk CRITICAL" in audit_trail[-1]["chain"]
