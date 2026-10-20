"""
backend/app/calibration/types.py
Data structures and contracts for TIDES Milestone 8:
Digital Twin Calibration, Real-Time Data & Field Validation.
"""

from enum import Enum
from typing import Dict, List, Optional, Any, Tuple
from pydantic import BaseModel, Field
import time


class DataProvenance(str, Enum):
    """
    Explicit provenance tracking for all coastal safety data.
    Ensures clear separation between real physical sensors, forecasts, and synthetic models.
    """
    MEASURED = "MEASURED"                    # Direct in-situ physical sensor (ADCP, buoy, AWS weather station)
    PROVIDER_FORECAST = "PROVIDER_FORECAST"  # External numerical forecast (e.g., INCOIS, NOAA, ECMWF)
    SYNTHETIC = "SYNTHETIC"                  # Deterministic test fixture / simulation model for validation
    DERIVED = "DERIVED"                      # Computed or fused from multiple raw measurements


class QualityStatus(str, Enum):
    """Validation quality assessment for incoming observations."""
    VALID = "VALID"                          # Passes range, unit, timestamp, and schema verification
    STALE = "STALE"                          # Exceeds configured freshness horizon for variable
    OUT_OF_RANGE = "OUT_OF_RANGE"            # Outside physically plausible thresholds
    MALFORMED = "MALFORMED"                  # Corrupt payload, missing essential fields, non-numeric
    DUPLICATE = "DUPLICATE"                  # Repeated observation from same source and timestamp
    OUTAGE = "OUTAGE"                        # Sensor provider unreachable or timeout exceeded


class EnvironmentalVariableType(str, Enum):
    """Environmental parameters supported for coastal safety simulation and calibration."""
    WAVE_HEIGHT = "WAVE_HEIGHT"              # Significant wave height (Hs) in meters
    WAVE_PERIOD = "WAVE_PERIOD"              # Peak spectral wave period (Tp) in seconds
    WAVE_DIRECTION = "WAVE_DIRECTION"        # Wave approach direction in degrees (0-360)
    WIND_SPEED = "WIND_SPEED"                # Sustained wind velocity in km/h
    WIND_DIRECTION = "WIND_DIRECTION"        # Wind heading in degrees (0-360)
    TIDE_LEVEL = "TIDE_LEVEL"                # Tidal height above chart datum in meters
    WATER_CURRENT = "WATER_CURRENT"          # Seaward / alongshore current velocity in m/s
    CURRENT_DIRECTION = "CURRENT_DIRECTION"  # Current vector heading in degrees (0-360)
    WATER_TEMPERATURE = "WATER_TEMPERATURE"  # Sea surface temperature in Celsius
    VISIBILITY = "VISIBILITY"                # Atmospheric visibility in kilometers


class GeoCoordinate(BaseModel):
    """WGS84 Geodetic Coordinate."""
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees")
    altitude_m: Optional[float] = Field(default=0.0, description="Altitude/depth in meters")


class LocalCoordinate(BaseModel):
    """Local Cartesian coordinate space."""
    x: float = Field(..., description="Alongshore axis (East/West)")
    y: float = Field(..., description="Cross-shore axis (North/South seaward)")
    z: Optional[float] = Field(default=0.0, description="Elevation relative to sea datum")


class EnvironmentalObservation(BaseModel):
    """
    Standardized atomic environmental observation adhering to strict provenance,
    unit traceability, and validation tagging.
    """
    id: str = Field(..., description="Unique observation ID")
    source_id: str = Field(..., description="Hardware or provider identifier (e.g., INCOIS-BUOY-01)")
    source_name: str = Field(..., description="Human readable provider/instrument name")
    variable: EnvironmentalVariableType
    value: float = Field(..., description="Normalized numeric value in standard SI/operational units")
    units: str = Field(..., description="Standard unit (m, s, deg, km/h, m/s, C, km)")
    raw_value: Optional[float] = Field(default=None, description="Original un-normalized reading")
    raw_units: Optional[str] = Field(default=None, description="Original unit prior to conversion")
    observation_timestamp: float = Field(..., description="Epoch seconds when measurement was made")
    ingestion_timestamp: float = Field(default_factory=time.time, description="Epoch seconds when ingested by TIDES")
    location: Optional[GeoCoordinate] = None
    provenance: DataProvenance = DataProvenance.MEASURED
    quality_status: QualityStatus = QualityStatus.VALID
    validation_warnings: List[str] = Field(default_factory=list)


class CalibrationMetric(BaseModel):
    """Continuous statistical error metrics comparing simulation against field ground truth."""
    variable: EnvironmentalVariableType
    mae: Optional[float] = Field(default=None, description="Mean Absolute Error")
    rmse: Optional[float] = Field(default=None, description="Root Mean Squared Error")
    bias: Optional[float] = Field(default=None, description="Mean Error (Simulation - Observed)")
    sample_count: int = Field(default=0, ge=0)
    unvalidated_reason: Optional[str] = Field(
        default=None, description="Reason if error cannot yet be calculated (e.g. N/A - Insufficient holdout samples)"
    )


class DatasetSplit(str, Enum):
    CALIBRATION = "CALIBRATION"
    EVALUATION_HOLDOUT = "EVALUATION_HOLDOUT"


class DatasetManifest(BaseModel):
    """
    Provenance manifest recording dataset provenance, boundaries, missing rates,
    and validation role.
    """
    dataset_id: str
    name: str
    source: str
    collection_method: str
    time_range_start: float
    time_range_end: float
    geographic_bounds: Dict[str, float] = Field(
        ..., description="min_lat, max_lat, min_lon, max_lon"
    )
    variables: List[EnvironmentalVariableType]
    missing_data_rate: float = Field(..., ge=0.0, le=1.0)
    provenance: DataProvenance
    split: DatasetSplit
    checksum_sha256: str
    limitations: List[str] = Field(default_factory=list)


class CalibrationExperiment(BaseModel):
    """
    Controlled simulation parameter calibration experiment record.
    Preserves baseline configuration and documents before-and-after results.
    """
    experiment_id: str
    created_at: float = Field(default_factory=time.time)
    baseline_config: Dict[str, Any]
    candidate_parameters: Dict[str, Any]
    calibration_metrics: Dict[str, CalibrationMetric]
    evaluation_metrics: Dict[str, CalibrationMetric]  # Evaluated on independent holdout
    status: str = "PROPOSED"  # PROPOSED | APPLIED_BY_OPERATOR | REJECTED
    approved_by: Optional[str] = None
    approved_at: Optional[float] = None
    provenance_manifest_id: str


class GeographicBenchmarkPoint(BaseModel):
    """Known surveyed physical benchmark for Rushikonda Beach coordinate calibration."""
    point_id: str
    name: str
    wgs84: GeoCoordinate
    expected_local: LocalCoordinate
    measured_residual_error_m: float = 0.0
    status: str = "VERIFIED"  # VERIFIED | PENDING | UNCERTAIN
