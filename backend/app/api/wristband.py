"""
wristband.py

TIDES Track B — Phase 3: Hardware Wristband & Coastal Gateway REST API
Provides endpoints for physical LoRa beach gateways to ingest device uplinks,
check gateway connectivity, and route localized warning downlinks to physical wristbands.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import time

router = APIRouter(prefix="/wristband", tags=["Track B — Physical Wristband & Gateways"])

# In-memory hardware registry and audit store for FastAPI backend
HARDWARE_REGISTRY: Dict[str, Dict[str, Any]] = {
    "HW-WB-001": {
        "id": "HW-WB-001",
        "provenance": "HARDWARE",
        "name": "Physical Prototype #1 (ESP32-S3/SX1262)",
        "zone": "SWIM_ZONE_NORTH",
        "battery_pct": 88,
        "battery_mv": 3920,
        "is_sos_active": False,
        "last_seen_ms": int(time.time() * 1000),
        "rssi_dbm": -78,
        "snr_db": 8.5,
        "gateway_id": "GW-TOWER-01"
    },
    "HW-WB-002": {
        "id": "HW-WB-002",
        "provenance": "HARDWARE",
        "name": "Bench Test Unit #2 (Laboratory Rig)",
        "zone": "CENTRAL_SURF",
        "battery_pct": 95,
        "battery_mv": 4050,
        "is_sos_active": False,
        "last_seen_ms": int(time.time() * 1000),
        "rssi_dbm": -65,
        "snr_db": 10.2,
        "gateway_id": "GW-COMMAND-02"
    }
}

GATEWAY_REGISTRY: Dict[str, Dict[str, Any]] = {
    "GW-TOWER-01": {
        "id": "GW-TOWER-01",
        "name": "North Watchtower Gateway",
        "status": "ONLINE",
        "frequency_hz": 865200000,
        "packets_forwarded": 142,
        "last_ping_ms": int(time.time() * 1000)
    },
    "GW-COMMAND-02": {
        "id": "GW-COMMAND-02",
        "name": "Central Lifeguard Base Station",
        "status": "ONLINE",
        "frequency_hz": 865200000,
        "packets_forwarded": 289,
        "last_ping_ms": int(time.time() * 1000)
    }
}

AUDIT_LOGS: List[Dict[str, Any]] = []

# Deduplication cache: dedup_key -> timestamp_ms
DEDUP_CACHE: Dict[str, float] = {}
DEDUP_WINDOW_SECONDS = 20.0


class HardwareEventPayload(BaseModel):
    device_id: str = Field(..., description="Unique physical device identifier e.g. HW-WB-001")
    event_type: str = Field(..., description="SOS_TRIGGER, HEARTBEAT, SOS_CANCEL, WARNING_ACK")
    sequence_number: int = Field(..., ge=1, description="Monotonically increasing sequence number")
    device_timestamp_ms: int = Field(..., description="Device RTC timestamp in milliseconds")
    battery_mv: int = Field(3900, description="Battery cell voltage in millivolts")
    battery_pct: int = Field(..., ge=0, le=100, description="Battery percentage")
    gateway_id: str = Field("GW-TOWER-01", description="Forwarding coastal gateway station ID")
    rssi_dbm: int = Field(-78, description="Received signal strength indicator in dBm")
    snr_db: float = Field(8.5, description="Signal to noise ratio in dB")
    status_flags: int = Field(0, description="Bitfield status flags")
    has_gps: bool = Field(False, description="Whether physical unit has GPS fix (Zero Fabrication Principle)")
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class DownlinkWarningPayload(BaseModel):
    target_device_id: str
    category: str = Field("CAUTION", description="ADVISORY, CAUTION, EVACUATE_ZONE, EMERGENCY")
    title: str
    message: str
    warning_id: Optional[str] = None


@router.post("/event")
async def ingest_hardware_event(payload: HardwareEventPayload):
    """
    Ingest validated hardware events forwarded by the Beach Gateway.
    Applies deduplication, device authorization, and incident bridge creation.
    """
    now = time.time()
    now_ms = int(now * 1000)

    # 1. Device Authorization
    if payload.device_id not in HARDWARE_REGISTRY:
        raise HTTPException(
            status_code=403,
            detail=f"UNAUTHORIZED_DEVICE: Device {payload.device_id} is not registered in TIDES hardware inventory."
        )

    # 2. Sliding Window Deduplication
    dedup_key = f"{payload.device_id}-{payload.event_type}-{payload.sequence_number}"
    if dedup_key in DEDUP_CACHE:
        if now - DEDUP_CACHE[dedup_key] < DEDUP_WINDOW_SECONDS:
            return {
                "accepted": False,
                "status": "DUPLICATE_SUPPRESSED",
                "message": f"Repeated transmission of sequence {payload.sequence_number} suppressed within 20s window.",
                "device_id": payload.device_id,
            }

    DEDUP_CACHE[dedup_key] = now

    # 3. Update Hardware Registry Record
    dev = HARDWARE_REGISTRY[payload.device_id]
    dev["last_seen_ms"] = now_ms
    dev["battery_pct"] = payload.battery_pct
    dev["battery_mv"] = payload.battery_mv
    dev["rssi_dbm"] = payload.rssi_dbm
    dev["snr_db"] = payload.snr_db
    dev["gateway_id"] = payload.gateway_id

    # 4. Process Event Type
    incident_created = None
    if payload.event_type == "SOS_TRIGGER":
        dev["is_sos_active"] = True
        incident_id = f"INC-HW-{payload.device_id}-{payload.sequence_number}"
        incident_created = {
            "id": incident_id,
            "type": "DISTRESS",
            "severity": "CRITICAL",
            "device_id": payload.device_id,
            "provenance": "HARDWARE",
            "zone": dev["zone"],
            "title": f"Physical Wristband SOS Distress ({payload.device_id})",
            "has_location": payload.has_gps,
            "spatial_uncertainty": not payload.has_gps,
            "created_at": now_ms
        }
    elif payload.event_type == "SOS_CANCEL":
        dev["is_sos_active"] = False

    # 5. Audit Record
    audit_entry = {
        "audit_id": f"AUDIT-API-{len(AUDIT_LOGS) + 1}",
        "timestamp_ms": now_ms,
        "device_id": payload.device_id,
        "event_type": payload.event_type,
        "gateway_id": payload.gateway_id,
        "rssi_dbm": payload.rssi_dbm,
        "snr_db": payload.snr_db,
        "battery_pct": payload.battery_pct,
        "incident_id": incident_created["id"] if incident_created else None
    }
    AUDIT_LOGS.append(audit_entry)

    # Update Gateway Forward Stats
    if payload.gateway_id in GATEWAY_REGISTRY:
        GATEWAY_REGISTRY[payload.gateway_id]["packets_forwarded"] += 1
        GATEWAY_REGISTRY[payload.gateway_id]["last_ping_ms"] = now_ms

    return {
        "accepted": True,
        "status": "ACCEPTED",
        "device_id": payload.device_id,
        "provenance": "HARDWARE",
        "incident": incident_created,
        "audit_id": audit_entry["audit_id"]
    }


@router.get("/devices")
async def list_hardware_devices():
    """Returns all registered physical hardware prototypes and their latest telemetry."""
    return list(HARDWARE_REGISTRY.values())


@router.get("/gateways")
async def list_gateways():
    """Returns all coastal gateway stations and health metrics."""
    return list(GATEWAY_REGISTRY.values())


@router.post("/warning")
async def dispatch_downlink_warning(payload: DownlinkWarningPayload):
    """
    Routes a localized warning downlink to a physical hardware wristband via the nearest Gateway.
    """
    if payload.target_device_id not in HARDWARE_REGISTRY:
        raise HTTPException(
            status_code=404,
            detail=f"Device {payload.target_device_id} not found."
        )

    warning_id = payload.warning_id or f"WARN-HW-{int(time.time() * 1000)}"
    return {
        "status": "QUEUED_FOR_DOWNLINK",
        "warning_id": warning_id,
        "target_device_id": payload.target_device_id,
        "category": payload.category,
        "gateway_id": HARDWARE_REGISTRY[payload.target_device_id]["gateway_id"],
        "queued_at_ms": int(time.time() * 1000)
    }

