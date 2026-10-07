import math
import pytest

def calculate_drone_coverage_radius(altitude_m, fov_deg=70):
    fov_rad = math.radians(fov_deg)
    return altitude_m * math.tan(fov_rad / 2)

def cross_modal_bayesian_fusion(conf_cctv, conf_drone):
    """
    Computes fused detection confidence from two independent perception streams.
    """
    return 1.0 - (1.0 - conf_cctv) * (1.0 - conf_drone)

def allocate_drone(drones, target_x, target_y, required_capability):
    """
    Selects best available drone matching capability with highest composite score.
    """
    candidates = []
    for d in drones:
        if required_capability not in d.get("capabilities", []):
            continue
        if d.get("status") not in ["AVAILABLE", "PATROLLING"]:
            continue
        
        dx = target_x - d["x"]
        dy = target_y - d["y"]
        dist = math.hypot(dx, dy)
        eta_sec = dist / d.get("speed", 12.0)
        
        # Battery check
        battery = d.get("battery", 100)
        if battery < 25:
            continue
            
        score = (100 - min(100, dist / 10)) * 0.5 + battery * 0.5
        candidates.append((d, score, eta_sec))
        
    if not candidates:
        return None
    candidates.sort(key=lambda c: c[1], reverse=True)
    return candidates[0][0]

def test_coverage_radius_geometry():
    # At 35m altitude with 70° FOV: r = 35 * tan(35°) ≈ 35 * 0.7002 = 24.5m
    radius = calculate_drone_coverage_radius(35, 70)
    assert 24.0 < radius < 25.0

def test_cross_modal_bayesian_confidence_fusion():
    # CCTV detects possible distress with 0.65 conf
    # Drone arrives on station and confirms with 0.90 conf
    fused = cross_modal_bayesian_fusion(0.65, 0.90)
    # 1 - (0.35 * 0.10) = 0.965
    assert fused == pytest.approx(0.965, 0.001)

def test_drone_allocation_priority():
    drones = [
        {
            "id": "UAV-01",
            "x": 150,
            "y": 70,
            "status": "AVAILABLE",
            "battery": 85,
            "capabilities": ["SURVEILLANCE", "DISTRESS_DETECTION"],
        },
        {
            "id": "UAV-02",
            "x": 700,
            "y": 70,
            "status": "AVAILABLE",
            "battery": 95,
            "capabilities": ["SURVEILLANCE", "DISTRESS_DETECTION"],
        },
        {
            "id": "UAV-03",
            "x": 160,
            "y": 70,
            "status": "AVAILABLE",
            "battery": 15, # Below 25% RTH margin
            "capabilities": ["SURVEILLANCE", "DISTRESS_DETECTION"],
        },
    ]
    # Incident at (200, 250) - near UAV-01
    assigned = allocate_drone(drones, 200, 250, "DISTRESS_DETECTION")
    assert assigned is not None
    assert assigned["id"] == "UAV-01"
