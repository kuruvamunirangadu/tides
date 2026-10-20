"""
backend/app/calibration/environmental_provider.py
Modular typed environmental data integration, validation, freshness monitoring,
and source registry for TIDES coastal safety digital twin.
"""

import math
import time
from typing import Dict, List, Optional, Tuple, Any
from app.calibration.types import (
    DataProvenance,
    QualityStatus,
    EnvironmentalVariableType,
    EnvironmentalObservation,
    GeoCoordinate,
)
from app.calibration.geo_calibration import GeographicCalibrationEngine


class EnvironmentalDataValidator:
    """
    Validates physical plausibility, unit conversions, timestamp integrity,
    and schema completeness for incoming environmental telemetry.
    """

    # Physical validity ranges per variable [min, max]
    PHYSICAL_RANGES = {
        EnvironmentalVariableType.WAVE_HEIGHT: (0.0, 12.0),       # meters (Hs)
        EnvironmentalVariableType.WAVE_PERIOD: (2.0, 30.0),       # seconds (Tp)
        EnvironmentalVariableType.WAVE_DIRECTION: (0.0, 360.0),   # degrees
        EnvironmentalVariableType.WIND_SPEED: (0.0, 180.0),       # km/h
        EnvironmentalVariableType.WIND_DIRECTION: (0.0, 360.0),   # degrees
        EnvironmentalVariableType.TIDE_LEVEL: (-2.0, 6.0),        # meters relative to chart datum
        EnvironmentalVariableType.WATER_CURRENT: (0.0, 4.5),      # m/s
        EnvironmentalVariableType.CURRENT_DIRECTION: (0.0, 360.0),# degrees
        EnvironmentalVariableType.WATER_TEMPERATURE: (5.0, 45.0), # Celsius
        EnvironmentalVariableType.VISIBILITY: (0.05, 50.0),       # kilometers
    }

    # Standard expected SI / operational unit per variable
    STANDARD_UNITS = {
        EnvironmentalVariableType.WAVE_HEIGHT: "m",
        EnvironmentalVariableType.WAVE_PERIOD: "s",
        EnvironmentalVariableType.WAVE_DIRECTION: "deg",
        EnvironmentalVariableType.WIND_SPEED: "km/h",
        EnvironmentalVariableType.WIND_DIRECTION: "deg",
        EnvironmentalVariableType.TIDE_LEVEL: "m",
        EnvironmentalVariableType.WATER_CURRENT: "m/s",
        EnvironmentalVariableType.CURRENT_DIRECTION: "deg",
        EnvironmentalVariableType.WATER_TEMPERATURE: "C",
        EnvironmentalVariableType.VISIBILITY: "km",
    }

    @classmethod
    def convert_and_normalize(
        cls,
        variable: EnvironmentalVariableType,
        raw_val: float,
        raw_unit: str,
    ) -> Tuple[float, str, List[str]]:
        """
        Normalizes raw values to standard units. Returns (normalized_value, standard_unit, warnings).
        """
        warnings = []
        val = raw_val
        unit_clean = raw_unit.strip().lower()

        if variable == EnvironmentalVariableType.WIND_SPEED:
            if unit_clean in ["knots", "knot", "kt", "kts"]:
                val = raw_val * 1.852
                warnings.append(f"Converted wind speed from {raw_unit} to km/h")
            elif unit_clean in ["m/s", "mps"]:
                val = raw_val * 3.6
                warnings.append(f"Converted wind speed from {raw_unit} to km/h")
            elif unit_clean in ["mph"]:
                val = raw_val * 1.60934
                warnings.append(f"Converted wind speed from {raw_unit} to km/h")
            elif unit_clean in ["km/h", "kmh", "kph"]:
                val = raw_val
            else:
                warnings.append(f"Unrecognized wind unit '{raw_unit}', treating as km/h")

        elif variable in [EnvironmentalVariableType.WAVE_HEIGHT, EnvironmentalVariableType.TIDE_LEVEL]:
            if unit_clean in ["ft", "feet", "foot"]:
                val = raw_val * 0.3048
                warnings.append(f"Converted {variable.value} from {raw_unit} to meters")
            elif unit_clean in ["cm"]:
                val = raw_val / 100.0
                warnings.append(f"Converted {variable.value} from cm to meters")
            elif unit_clean in ["m", "meter", "meters"]:
                val = raw_val

        elif variable == EnvironmentalVariableType.VISIBILITY:
            if unit_clean in ["m", "meter", "meters"]:
                val = raw_val / 1000.0
                warnings.append("Converted visibility from meters to kilometers")
            elif unit_clean in ["miles", "mile", "mi"]:
                val = raw_val * 1.60934
                warnings.append("Converted visibility from miles to kilometers")
            elif unit_clean in ["km"]:
                val = raw_val

        elif variable == EnvironmentalVariableType.WATER_TEMPERATURE:
            if unit_clean in ["f", "fahrenheit", "degf"]:
                val = (raw_val - 32.0) * (5.0 / 9.0)
                warnings.append("Converted temperature from Fahrenheit to Celsius")
            elif unit_clean in ["k", "kelvin"]:
                val = raw_val - 273.15
                warnings.append("Converted temperature from Kelvin to Celsius")

        return round(val, 3), cls.STANDARD_UNITS[variable], warnings

    @classmethod
    def validate_observation(
        cls,
        obs_dict: Dict[str, Any],
        seen_cache: Optional[Dict[str, float]] = None,
    ) -> EnvironmentalObservation:
        """
        Validates raw dictionary into an EnvironmentalObservation.
        Strictly enforces:
          - No silent zero replacement
          - Range bounds
          - Malformed/duplicate timestamps
          - Provenance labels
        """
        warnings: List[str] = []
        quality = QualityStatus.VALID

        # 1. Essential Fields
        req_fields = ["id", "source_id", "variable", "value", "units", "observation_timestamp"]
        missing = [f for f in req_fields if f not in obs_dict or obs_dict[f] is None]
        if missing:
            return EnvironmentalObservation(
                id=obs_dict.get("id", f"malformed-{int(time.time()*1000)}"),
                source_id=obs_dict.get("source_id", "UNKNOWN"),
                source_name=obs_dict.get("source_name", "Unknown Provider"),
                variable=EnvironmentalVariableType.WAVE_HEIGHT,
                value=-999.0,
                units="invalid",
                observation_timestamp=0.0,
                quality_status=QualityStatus.MALFORMED,
                validation_warnings=[f"Missing essential fields: {', '.join(missing)}"],
            )

        # 2. Variable Parsing
        raw_var = obs_dict["variable"]
        try:
            var_type = (
                EnvironmentalVariableType(raw_var)
                if isinstance(raw_var, str)
                else raw_var
            )
        except ValueError:
            return EnvironmentalObservation(
                id=obs_dict["id"],
                source_id=obs_dict["source_id"],
                source_name=obs_dict.get("source_name", "Unknown"),
                variable=EnvironmentalVariableType.WAVE_HEIGHT,
                value=-999.0,
                units="invalid",
                observation_timestamp=obs_dict["observation_timestamp"],
                quality_status=QualityStatus.MALFORMED,
                validation_warnings=[f"Unsupported environmental variable: '{raw_var}'"],
            )

        # 3. Numeric Validity (Prevent silent NaN/zero conversions)
        raw_val = obs_dict["value"]
        if not isinstance(raw_val, (int, float)) or math.isnan(raw_val) or math.isinf(raw_val):
            return EnvironmentalObservation(
                id=obs_dict["id"],
                source_id=obs_dict["source_id"],
                source_name=obs_dict.get("source_name", "Unknown"),
                variable=var_type,
                value=-999.0,
                units=obs_dict.get("units", "unknown"),
                observation_timestamp=obs_dict["observation_timestamp"],
                quality_status=QualityStatus.MALFORMED,
                validation_warnings=[f"Value '{raw_val}' is non-numeric, NaN, or Infinite. Replaced with invalid marker; zero-fill prohibited."],
            )

        # 4. Unit Conversion & Normalization
        norm_val, std_unit, unit_warnings = cls.convert_and_normalize(
            var_type, float(raw_val), str(obs_dict["units"])
        )
        warnings.extend(unit_warnings)

        # 5. Physical Range Checking
        min_v, max_v = cls.PHYSICAL_RANGES[var_type]
        if norm_val < min_v or norm_val > max_v:
            quality = QualityStatus.OUT_OF_RANGE
            warnings.append(
                f"Value {norm_val} {std_unit} outside physical plausibility bounds [{min_v}, {max_v}]"
            )

        # 6. Timestamp Sanity
        obs_time = float(obs_dict["observation_timestamp"])
        now = time.time()
        if obs_time <= 0:
            quality = QualityStatus.MALFORMED
            warnings.append(f"Invalid non-positive timestamp: {obs_time}")
        elif obs_time > now + 300.0:  # More than 5 mins in future
            quality = QualityStatus.MALFORMED
            warnings.append(f"Future timestamp rejected: {obs_time} > now ({now:.1f})")

        # 7. Duplicate Detection
        dup_key = f"{obs_dict['source_id']}_{var_type.value}"
        if seen_cache is not None:
            last_time = seen_cache.get(dup_key)
            if last_time is not None and abs(obs_time - last_time) < 1.0:
                quality = QualityStatus.DUPLICATE
                warnings.append(f"Duplicate observation detected for {dup_key} at t={obs_time}")
            else:
                seen_cache[dup_key] = obs_time

        # 8. Geographic Bounds Check (if location supplied)
        loc = None
        if "location" in obs_dict and obs_dict["location"] is not None:
            loc_dict = obs_dict["location"]
            if isinstance(loc_dict, dict):
                loc = GeoCoordinate(**loc_dict)
            elif isinstance(loc_dict, GeoCoordinate):
                loc = loc_dict
            if loc and not GeographicCalibrationEngine.is_within_calibrated_bounds(loc):
                warnings.append(
                    f"Sensor location ({loc.latitude:.4f}, {loc.longitude:.4f}) outside calibrated Rushikonda coverage"
                )

        # 9. Provenance Assignment
        raw_prov = obs_dict.get("provenance", "MEASURED")
        try:
            provenance = DataProvenance(raw_prov) if isinstance(raw_prov, str) else raw_prov
        except ValueError:
            provenance = DataProvenance.SYNTHETIC
            warnings.append(f"Unknown provenance '{raw_prov}', defaulting to SYNTHETIC")

        return EnvironmentalObservation(
            id=obs_dict["id"],
            source_id=obs_dict["source_id"],
            source_name=obs_dict.get("source_name", obs_dict["source_id"]),
            variable=var_type,
            value=norm_val,
            units=std_unit,
            raw_value=float(raw_val),
            raw_units=str(obs_dict["units"]),
            observation_timestamp=obs_time,
            ingestion_timestamp=now,
            location=loc,
            provenance=provenance,
            quality_status=quality,
            validation_warnings=warnings,
        )


class EnvironmentalFreshnessMonitor:
    """
    Monitors data freshness and detects provider outages and recovery.
    Applies domain-appropriate horizons (e.g., ADCP current: 30m, wind: 10m).
    """

    DEFAULT_FRESHNESS_HORIZONS_SEC = {
        EnvironmentalVariableType.WAVE_HEIGHT: 1800.0,       # 30 mins
        EnvironmentalVariableType.WAVE_PERIOD: 1800.0,       # 30 mins
        EnvironmentalVariableType.WAVE_DIRECTION: 1800.0,    # 30 mins
        EnvironmentalVariableType.WIND_SPEED: 600.0,         # 10 mins
        EnvironmentalVariableType.WIND_DIRECTION: 600.0,     # 10 mins
        EnvironmentalVariableType.TIDE_LEVEL: 900.0,         # 15 mins
        EnvironmentalVariableType.WATER_CURRENT: 1200.0,     # 20 mins
        EnvironmentalVariableType.CURRENT_DIRECTION: 1200.0, # 20 mins
        EnvironmentalVariableType.WATER_TEMPERATURE: 3600.0, # 60 mins
        EnvironmentalVariableType.VISIBILITY: 1200.0,        # 20 mins
    }

    def __init__(self, custom_horizons: Optional[Dict[EnvironmentalVariableType, float]] = None):
        self.horizons = dict(self.DEFAULT_FRESHNESS_HORIZONS_SEC)
        if custom_horizons:
            self.horizons.update(custom_horizons)

    def assess_freshness(
        self,
        variable: EnvironmentalVariableType,
        observation_timestamp: float,
        current_time: Optional[float] = None,
    ) -> Tuple[QualityStatus, float]:
        """
        Calculates age and assesses whether observation is FRESH, STALE, or OUTAGE.
        Returns (status, age_seconds).
        """
        now = current_time if current_time is not None else time.time()
        age_sec = max(0.0, now - observation_timestamp)
        max_horizon = self.horizons.get(variable, 1800.0)

        if age_sec <= max_horizon:
            return QualityStatus.VALID, age_sec
        elif age_sec <= max_horizon * 2.5:
            return QualityStatus.STALE, age_sec
        else:
            return QualityStatus.OUTAGE, age_sec


class EnvironmentalSourceRegistry:
    """
    Registry of all physical sensors, external numerical forecast feeds,
    and synthetic test providers connected to Rushikonda Beach Digital Twin.
    """

    def __init__(self):
        self._sources: Dict[str, Dict[str, Any]] = {
            "INCOIS-WAVE-BUOY-01": {
                "source_id": "INCOIS-WAVE-BUOY-01",
                "name": "INCOIS Rushikonda Coastal Wave Buoy",
                "type": "OCEANOGRAPHIC_BUOY",
                "provenance": DataProvenance.MEASURED,
                "location": GeoCoordinate(latitude=17.7800, longitude=83.3980, altitude_m=-18.0),
                "supported_variables": [
                    EnvironmentalVariableType.WAVE_HEIGHT,
                    EnvironmentalVariableType.WAVE_PERIOD,
                    EnvironmentalVariableType.WAVE_DIRECTION,
                    EnvironmentalVariableType.WATER_TEMPERATURE,
                ],
                "update_interval_sec": 900.0,
                "is_active": True,
            },
            "IMD-AWS-VIZAG-COAST": {
                "source_id": "IMD-AWS-VIZAG-COAST",
                "name": "IMD Visakhapatnam Coastal Automated Weather Station",
                "type": "WEATHER_STATION",
                "provenance": DataProvenance.MEASURED,
                "location": GeoCoordinate(latitude=17.7830, longitude=83.3835, altitude_m=8.5),
                "supported_variables": [
                    EnvironmentalVariableType.WIND_SPEED,
                    EnvironmentalVariableType.WIND_DIRECTION,
                    EnvironmentalVariableType.VISIBILITY,
                ],
                "update_interval_sec": 300.0,
                "is_active": True,
            },
            "NIOT-TIDE-GAUGE-01": {
                "source_id": "NIOT-TIDE-GAUGE-01",
                "name": "NIOT Acoustic Tide Gauge & ADCP Station",
                "type": "TIDE_STATION",
                "provenance": DataProvenance.MEASURED,
                "location": GeoCoordinate(latitude=17.7815, longitude=83.3920, altitude_m=-8.0),
                "supported_variables": [
                    EnvironmentalVariableType.TIDE_LEVEL,
                    EnvironmentalVariableType.WATER_CURRENT,
                    EnvironmentalVariableType.CURRENT_DIRECTION,
                ],
                "update_interval_sec": 600.0,
                "is_active": True,
            },
            "INCOIS-HOOFS-FORECAST": {
                "source_id": "INCOIS-HOOFS-FORECAST",
                "name": "INCOIS High-Resolution Coastal Ocean Forecast System",
                "type": "NUMERICAL_FORECAST_MODEL",
                "provenance": DataProvenance.PROVIDER_FORECAST,
                "location": GeoCoordinate(latitude=17.7818, longitude=83.3854, altitude_m=0.0),
                "supported_variables": [
                    EnvironmentalVariableType.WAVE_HEIGHT,
                    EnvironmentalVariableType.WATER_CURRENT,
                    EnvironmentalVariableType.TIDE_LEVEL,
                ],
                "update_interval_sec": 10800.0,  # 3 hours
                "is_active": True,
            },
            "SYNTH-FIXTURE-PILOT": {
                "source_id": "SYNTH-FIXTURE-PILOT",
                "name": "Rushikonda Field Validation Pilot Fixture (Deterministic)",
                "type": "VALIDATION_FIXTURE",
                "provenance": DataProvenance.SYNTHETIC,
                "location": GeoCoordinate(latitude=17.7818, longitude=83.3854, altitude_m=0.0),
                "supported_variables": list(EnvironmentalVariableType),
                "update_interval_sec": 60.0,
                "is_active": True,
            },
        }
        self._latest_observations: Dict[str, EnvironmentalObservation] = {}
        self._seen_cache: Dict[str, float] = {}
        self._freshness_monitor = EnvironmentalFreshnessMonitor()

    def get_sources(self) -> List[Dict[str, Any]]:
        return list(self._sources.values())

    def ingest_observation(self, raw_data: Dict[str, Any]) -> EnvironmentalObservation:
        """Ingests raw observation, validates, checks duplicates and updates registry cache."""
        obs = EnvironmentalDataValidator.validate_observation(raw_data, self._seen_cache)

        # Check freshness
        if obs.quality_status == QualityStatus.VALID:
            fresh_status, age = self._freshness_monitor.assess_freshness(
                obs.variable, obs.observation_timestamp
            )
            if fresh_status != QualityStatus.VALID:
                obs.quality_status = fresh_status
                obs.validation_warnings.append(f"Observation is {fresh_status.value} (age: {age:.0f}s)")

        # Store in latest cache if not corrupt
        if obs.quality_status != QualityStatus.MALFORMED:
            key = f"{obs.source_id}_{obs.variable.value}"
            self._latest_observations[key] = obs

        return obs

    def get_latest_observations(self) -> List[EnvironmentalObservation]:
        """Returns all cached latest observations with live freshness evaluation."""
        now = time.time()
        result = []
        for obs in self._latest_observations.values():
            # Dynamically update freshness
            fresh_status, age = self._freshness_monitor.assess_freshness(
                obs.variable, obs.observation_timestamp, current_time=now
            )
            # Clone with current freshness
            cloned = obs.model_copy()
            if obs.quality_status == QualityStatus.VALID and fresh_status != QualityStatus.VALID:
                cloned.quality_status = fresh_status
            result.append(cloned)
        return result

    def get_mapped_simulation_state(self) -> Dict[str, Any]:
        """
        Data-to-simulation mapping helper:
        Produces mapped simulation inputs with provenance and readiness.
        STRICT READ-ONLY: Does not mutate live simulator state!
        """
        latest = self.get_latest_observations()
        mapped: Dict[str, Any] = {
            "mapped_variables": {},
            "missing_variables": [],
            "stale_variables": [],
            "outage_variables": [],
            "provenance_breakdown": {
                DataProvenance.MEASURED.value: 0,
                DataProvenance.PROVIDER_FORECAST.value: 0,
                DataProvenance.SYNTHETIC.value: 0,
                DataProvenance.DERIVED.value: 0,
            },
            "is_ready_for_simulation_injection": False,
        }

        # Track which variables have fresh valid readings
        var_map: Dict[EnvironmentalVariableType, EnvironmentalObservation] = {}
        for obs in latest:
            # Prefer MEASURED over PROVIDER_FORECAST over SYNTHETIC
            curr = var_map.get(obs.variable)
            if curr is None:
                var_map[obs.variable] = obs
            elif obs.provenance == DataProvenance.MEASURED and curr.provenance != DataProvenance.MEASURED:
                var_map[obs.variable] = obs

        for var_type in EnvironmentalVariableType:
            obs = var_map.get(var_type)
            if obs is None:
                mapped["missing_variables"].append(var_type.value)
            elif obs.quality_status == QualityStatus.STALE:
                mapped["stale_variables"].append(var_type.value)
                mapped["mapped_variables"][var_type.value] = {
                    "value": obs.value,
                    "units": obs.units,
                    "status": "STALE",
                    "provenance": obs.provenance.value,
                    "source": obs.source_id,
                }
            elif obs.quality_status == QualityStatus.OUTAGE:
                mapped["outage_variables"].append(var_type.value)
            elif obs.quality_status == QualityStatus.VALID:
                mapped["mapped_variables"][var_type.value] = {
                    "value": obs.value,
                    "units": obs.units,
                    "status": "VALID",
                    "provenance": obs.provenance.value,
                    "source": obs.source_id,
                }
                mapped["provenance_breakdown"][obs.provenance.value] += 1

        # Injection is safe only if core coastal variables are valid and non-stale
        core_vars = [
            EnvironmentalVariableType.WAVE_HEIGHT.value,
            EnvironmentalVariableType.WIND_SPEED.value,
            EnvironmentalVariableType.TIDE_LEVEL.value,
        ]
        has_core = all(cv in mapped["mapped_variables"] and mapped["mapped_variables"][cv]["status"] == "VALID" for cv in core_vars)
        mapped["is_ready_for_simulation_injection"] = has_core

        return mapped
