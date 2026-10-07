"""
Beach Layout Configuration and Spatial Zone Geometry.
Models a 1000m x 300m coastal stretch (representative of Andhra Pradesh coast, e.g. RK Beach / Rushikonda).
"""

from typing import List
from app.models.beach import (
    BeachLayout,
    BeachZone,
    ZoneType,
    FlagStatus,
    Lifeguard,
    Drone,
    WarningBoard,
    PASystem,
    CameraStation,
    ResourceStatus,
)


def create_default_beach_layout() -> BeachLayout:
    """
    Constructs the canonical 4-zone beach environment:
    - Zone A (0m - 300m): Safe Swimming Zone (patrolled by Tower 1)
    - Zone B (300m - 550m): Caution / Sandbar & Rip Channel Zone
    - Zone C (550m - 800m): General Bathing Zone (patrolled by Tower 2)
    - Zone D (800m - 1000m): Rocky Outcrop / Restricted Danger Zone
    """
    zones: List[BeachZone] = [
        BeachZone(
            id="ZONE_A",
            name="Zone A - Main Swimming Area",
            zone_type=ZoneType.SWIMMING,
            description="Designated patrolled swimming area with gentle slope bathymetry.",
            flag_status=FlagStatus.GREEN,
            x_min=0.0,
            x_max=300.0,
            y_min=-30.0,
            y_max=120.0,
            swimmer_capacity=200,
        ),
        BeachZone(
            id="ZONE_B",
            name="Zone B - Sandbar & Rip Channel",
            zone_type=ZoneType.RIP_CHANNEL,
            description="Dynamic sandbar channel prone to offshore rip current formation.",
            flag_status=FlagStatus.YELLOW,
            x_min=300.0,
            x_max=550.0,
            y_min=-30.0,
            y_max=160.0,
            swimmer_capacity=80,
        ),
        BeachZone(
            id="ZONE_C",
            name="Zone C - General Bathing Zone",
            zone_type=ZoneType.CAUTION,
            description="Recreational beach with moderate shore-break waves.",
            flag_status=FlagStatus.GREEN,
            x_min=550.0,
            x_max=800.0,
            y_min=-30.0,
            y_max=130.0,
            swimmer_capacity=150,
        ),
        BeachZone(
            id="ZONE_D",
            name="Zone D - Rocky Restricted Headland",
            zone_type=ZoneType.RESTRICTED,
            description="Submerged rock formations, sudden drop-offs, swimming strictly prohibited.",
            flag_status=FlagStatus.RED,
            x_min=800.0,
            x_max=1000.0,
            y_min=-30.0,
            y_max=200.0,
            swimmer_capacity=10,
        ),
    ]

    lifeguards: List[Lifeguard] = [
        Lifeguard(
            id="LG-01",
            name="Raju (Tower 1 Lead)",
            assigned_tower_id="TOWER-A",
            current_x=150.0,
            current_y=-10.0,
            status=ResourceStatus.AVAILABLE,
            speed_mps=3.8,
        ),
        Lifeguard(
            id="LG-02",
            name="Suresh (Tower 2 Lead)",
            assigned_tower_id="TOWER-B",
            current_x=425.0,
            current_y=-10.0,
            status=ResourceStatus.AVAILABLE,
            speed_mps=3.6,
        ),
        Lifeguard(
            id="LG-03",
            name="Kiran (Mobile Patrol)",
            assigned_tower_id="TOWER-C",
            current_x=680.0,
            current_y=-10.0,
            status=ResourceStatus.AVAILABLE,
            speed_mps=3.7,
        ),
    ]

    drones: List[Drone] = [
        Drone(
            id="DRONE-ALPHA",
            model="AeroGuard-Apex Mark II",
            current_x=100.0,
            current_y=-25.0,
            status=ResourceStatus.AVAILABLE,
            battery_pct=98.0,
            has_flotation_payload=True,
            speed_mps=14.0,
        ),
        Drone(
            id="DRONE-BRAVO",
            model="AeroGuard-Apex Mark II",
            current_x=750.0,
            current_y=-25.0,
            status=ResourceStatus.AVAILABLE,
            battery_pct=95.0,
            has_flotation_payload=True,
            speed_mps=14.0,
        ),
    ]

    warning_boards: List[WarningBoard] = [
        WarningBoard(
            id="BOARD-A",
            location_x=150.0,
            location_y=-15.0,
            zone_id="ZONE_A",
            display_text="SAFE SWIMMING - PATROLLED AREA",
            flag_color=FlagStatus.GREEN,
        ),
        WarningBoard(
            id="BOARD-B",
            location_x=425.0,
            location_y=-15.0,
            zone_id="ZONE_B",
            display_text="CAUTION: SANDBAR & RIP CHANNEL",
            flag_color=FlagStatus.YELLOW,
        ),
        WarningBoard(
            id="BOARD-C",
            location_x=680.0,
            location_y=-15.0,
            zone_id="ZONE_C",
            display_text="SAFE RECREATIONAL BATHING",
            flag_color=FlagStatus.GREEN,
        ),
        WarningBoard(
            id="BOARD-D",
            location_x=900.0,
            location_y=-15.0,
            zone_id="ZONE_D",
            display_text="DANGER: RESTRICTED ZONE - NO SWIMMING",
            flag_color=FlagStatus.RED,
        ),
    ]

    pa_systems: List[PASystem] = [
        PASystem(id="PA-01", location_x=150.0, location_y=-20.0, zone_id="ZONE_A"),
        PASystem(id="PA-02", location_x=425.0, location_y=-20.0, zone_id="ZONE_B"),
        PASystem(id="PA-03", location_x=680.0, location_y=-20.0, zone_id="ZONE_C"),
        PASystem(id="PA-04", location_x=900.0, location_y=-20.0, zone_id="ZONE_D"),
    ]

    cameras: List[CameraStation] = [
        CameraStation(id="CAM-PTZ-01", location_x=150.0, location_y=-25.0, coverage_zone_id="ZONE_A"),
        CameraStation(id="CAM-PTZ-02", location_x=425.0, location_y=-25.0, coverage_zone_id="ZONE_B"),
        CameraStation(id="CAM-PTZ-03", location_x=680.0, location_y=-25.0, coverage_zone_id="ZONE_C"),
        CameraStation(id="CAM-PTZ-04", location_x=900.0, location_y=-25.0, coverage_zone_id="ZONE_D"),
    ]

    return BeachLayout(
        beach_id="AP-VSP-RUSHIKONDA-01",
        beach_name="Rushikonda Blue Flag Beach (Visakhapatnam)",
        length_meters=1000.0,
        width_meters=300.0,
        zones=zones,
        lifeguards=lifeguards,
        drones=drones,
        warning_boards=warning_boards,
        pa_systems=pa_systems,
        cameras=cameras,
    )


COASTAL_PRESETS = {
    "RUSHIKONDA_VIZAG": {
        "id": "RUSHIKONDA_VIZAG",
        "name": "Rushikonda Blue Flag Beach (Visakhapatnam)",
        "coordinates": {"lat": 17.7795, "lng": 83.3885},
        "bathymetry_type": "EMBEDDED_TRENCH_REEF",
        "trench_depth_meters": 3.8,
        "rip_channels": [(120, 300), (380, 520)],
        "safe_zones": [{"id": "ZONE_A", "x_min": 140, "x_max": 360, "max_depth": 1.2}],
        "tide_amplitude": 1.45,
        "geofence_type": "CRESCENT_COVE",
    },
    "SURYALANKA_BAPATLA": {
        "id": "SURYALANKA_BAPATLA",
        "name": "Suryalanka Beach (Bapatla Coast)",
        "coordinates": {"lat": 15.8345, "lng": 80.5051},
        "bathymetry_type": "WIDE_FLAT_SHELF",
        "trench_depth_meters": 1.8,
        "rip_channels": [(220, 260)],
        "safe_zones": [{"id": "ZONE_A", "x_min": 50, "x_max": 450, "max_depth": 1.0}],
        "tide_amplitude": 2.10,
        "geofence_type": "WIDE_FLAT_RUNUP",
    },
}


def create_beach_layout_by_preset(preset_id: str = "RUSHIKONDA_VIZAG") -> BeachLayout:
    layout = create_default_beach_layout()
    preset = COASTAL_PRESETS.get(preset_id, COASTAL_PRESETS["RUSHIKONDA_VIZAG"])
    layout.beach_id = f"AP-{preset_id}"
    layout.beach_name = preset["name"]
    return layout


def get_beach_preset(preset_id: str) -> dict:
    """Returns normalized coastal preset geometry and bathymetry corridors."""
    p = COASTAL_PRESETS.get(preset_id, COASTAL_PRESETS["RUSHIKONDA_VIZAG"])
    return {
        "id": p["id"],
        "name": p["name"],
        "coordinates": p["coordinates"],
        "zones": [
            {"id": "ZONE_A", "x_min": 0.0, "x_max": 300.0, "y_seaward_limit": 40.0},
            {"id": "ZONE_B", "x_min": 300.0, "x_max": 550.0, "y_seaward_limit": 35.0},
            {"id": "ZONE_C", "x_min": 550.0, "x_max": 800.0, "y_seaward_limit": 40.0},
            {"id": "ZONE_D", "x_min": 800.0, "x_max": 1000.0, "y_seaward_limit": 10.0},
        ],
        "bathymetry": {
            "type": p.get("bathymetry_type", "EMBEDDED_TRENCH_REEF"),
            "rip_channel_corridors": [
                {"x_min": float(rc[0]), "x_max": float(rc[1])} for rc in p.get("rip_channels", [(120, 300)])
            ]
        }
    }


