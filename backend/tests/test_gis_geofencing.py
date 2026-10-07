import math
import pytest

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000  # meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (math.sin(delta_phi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2) ** 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def point_in_polygon(x, y, polygon):
    inside = False
    n = len(polygon)
    for i in range(n):
        j = (i - 1) % n
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        intersect = ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
        if intersect:
            inside = not inside
    return inside

def test_haversine_rk_beach():
    # Kali Temple to Submarine Museum ~ 450m
    dist = haversine_distance(17.7115, 83.3165, 17.7114, 83.3205)
    assert 400 < dist < 500

def test_point_in_restricted_geofence():
    # Restricted Zone Polygon coordinates [lon, lat]
    restricted_poly = [
        (83.3226, 17.7115),
        (83.3245, 17.7115),
        (83.3245, 17.7080),
        (83.3226, 17.7080),
    ]
    # Inside visitor
    assert point_in_polygon(83.3235, 17.7100, restricted_poly) is True
    # Outside visitor
    assert point_in_polygon(83.3170, 17.7100, restricted_poly) is False

def test_evacuation_route_selection():
    routes = [
        {"id": "EVAC-A", "status": "BLOCKED", "eta": 180},
        {"id": "EVAC-B", "status": "OPEN", "eta": 210},
    ]
    open_routes = [r for r in routes if r["status"] == "OPEN"]
    selected = min(open_routes, key=lambda r: r["eta"])
    assert selected["id"] == "EVAC-B"
