"""
backend/tests/test_milestone8_calibration.py
Unit tests for TIDES Milestone 8:
Digital Twin Calibration, Real-Time Data & Field Validation.
"""

import time
import math
from app.calibration.types import (
    DataProvenance,
    QualityStatus,
    EnvironmentalVariableType,
    EnvironmentalObservation,
    GeoCoordinate,
    LocalCoordinate,
    DatasetSplit,
)
from app.calibration.environmental_provider import (
    EnvironmentalDataValidator,
    EnvironmentalFreshnessMonitor,
    EnvironmentalSourceRegistry,
)
from app.calibration.geo_calibration import GeographicCalibrationEngine
from app.calibration.experiment_framework import CalibrationExperimentEngine


def test_01_valid_environmental_observation():
    """Test 1: Ingestion of valid environmental observation with correct SI units and provenance."""
    obs_dict = {
        "id": "OBS-WB-001",
        "source_id": "INCOIS-WAVE-BUOY-01",
        "source_name": "INCOIS Rushikonda Coastal Wave Buoy",
        "variable": "WAVE_HEIGHT",
        "value": 1.25,
        "units": "m",
        "observation_timestamp": time.time() - 30.0,
        "provenance": "MEASURED",
    }
    obs = EnvironmentalDataValidator.validate_observation(obs_dict)
    assert obs.quality_status == QualityStatus.VALID
    assert obs.value == 1.25
    assert obs.units == "m"
    assert obs.provenance == DataProvenance.MEASURED
    assert len(obs.validation_warnings) == 0


def test_02_missing_and_malformed_observations():
    """Test 2: Reject missing fields, NaN/Inf values, and ensure zero-fill is prohibited."""
    # A. Missing fields
    corrupt_dict = {"id": "OBS-CORRUPT", "variable": "WAVE_HEIGHT"}
    obs1 = EnvironmentalDataValidator.validate_observation(corrupt_dict)
    assert obs1.quality_status == QualityStatus.MALFORMED
    assert any("Missing essential fields" in w for w in obs1.validation_warnings)

    # B. NaN value rejected (prohibits silent zero-fill)
    nan_dict = {
        "id": "OBS-NAN",
        "source_id": "IMD-AWS-VIZAG",
        "variable": "WIND_SPEED",
        "value": float("nan"),
        "units": "km/h",
        "observation_timestamp": time.time(),
    }
    obs2 = EnvironmentalDataValidator.validate_observation(nan_dict)
    assert obs2.quality_status == QualityStatus.MALFORMED
    assert any("zero-fill prohibited" in w for w in obs2.validation_warnings)
    assert obs2.value == -999.0  # Explicit invalid marker, not 0.0


def test_03_unit_conversion():
    """Test 3: Normalizes knots to km/h, feet to meters, Fahrenheit to Celsius."""
    # Wind speed: 20 knots -> 37.04 km/h
    wind_dict = {
        "id": "OBS-WIND-KT",
        "source_id": "IMD-AWS-VIZAG",
        "variable": "WIND_SPEED",
        "value": 20.0,
        "units": "knots",
        "observation_timestamp": time.time(),
    }
    obs_wind = EnvironmentalDataValidator.validate_observation(wind_dict)
    assert obs_wind.quality_status == QualityStatus.VALID
    assert math.isclose(obs_wind.value, 37.04, abs_tol=0.01)
    assert obs_wind.units == "km/h"

    # Wave height: 6.56168 feet -> ~2.0 meters
    wave_dict = {
        "id": "OBS-WAVE-FT",
        "source_id": "NOAA-BUOY",
        "variable": "WAVE_HEIGHT",
        "value": 6.56168,
        "units": "ft",
        "observation_timestamp": time.time(),
    }
    obs_wave = EnvironmentalDataValidator.validate_observation(wave_dict)
    assert math.isclose(obs_wave.value, 2.0, abs_tol=0.01)
    assert obs_wave.units == "m"

    # Temperature: 86 F -> 30 C
    temp_dict = {
        "id": "OBS-TEMP-F",
        "source_id": "SURF-SENSOR",
        "variable": "WATER_TEMPERATURE",
        "value": 86.0,
        "units": "F",
        "observation_timestamp": time.time(),
    }
    obs_temp = EnvironmentalDataValidator.validate_observation(temp_dict)
    assert math.isclose(obs_temp.value, 30.0, abs_tol=0.1)
    assert obs_temp.units == "C"


def test_04_out_of_range_detection():
    """Test 4: Values outside physical plausibility flagged as OUT_OF_RANGE."""
    impossible_wave = {
        "id": "OBS-TSUNAMI-ERR",
        "source_id": "BUOY-ERR",
        "variable": "WAVE_HEIGHT",
        "value": 35.0,  # 35 meters Hs
        "units": "m",
        "observation_timestamp": time.time(),
    }
    obs = EnvironmentalDataValidator.validate_observation(impossible_wave)
    assert obs.quality_status == QualityStatus.OUT_OF_RANGE
    assert any("outside physical plausibility bounds" in w for w in obs.validation_warnings)


def test_05_duplicate_suppression():
    """Test 5: Repeated observations with identical timestamp flagged as DUPLICATE."""
    seen_cache = {}
    now = time.time()
    dict1 = {
        "id": "OBS-DUP-1",
        "source_id": "AWS-01",
        "variable": "WIND_SPEED",
        "value": 15.0,
        "units": "km/h",
        "observation_timestamp": now,
    }
    obs1 = EnvironmentalDataValidator.validate_observation(dict1, seen_cache)
    assert obs1.quality_status == QualityStatus.VALID

    dict2 = {
        "id": "OBS-DUP-2",
        "source_id": "AWS-01",
        "variable": "WIND_SPEED",
        "value": 15.0,
        "units": "km/h",
        "observation_timestamp": now,  # Duplicate time
    }
    obs2 = EnvironmentalDataValidator.validate_observation(dict2, seen_cache)
    assert obs2.quality_status == QualityStatus.DUPLICATE
    assert any("Duplicate observation detected" in w for w in obs2.validation_warnings)


def test_06_data_freshness_and_outages():
    """Test 6: Transitions from VALID -> STALE -> OUTAGE and recovers on fresh observation."""
    monitor = EnvironmentalFreshnessMonitor()
    now = time.time()

    # 1. Fresh observation (age = 60s)
    status_fresh, age = monitor.assess_freshness(
        EnvironmentalVariableType.WIND_SPEED, now - 60.0, current_time=now
    )
    assert status_fresh == QualityStatus.VALID
    assert math.isclose(age, 60.0, abs_tol=1.0)

    # 2. Stale observation (age = 900s for wind with 600s horizon)
    status_stale, _ = monitor.assess_freshness(
        EnvironmentalVariableType.WIND_SPEED, now - 900.0, current_time=now
    )
    assert status_stale == QualityStatus.STALE

    # 3. Outage (age = 3600s)
    status_outage, _ = monitor.assess_freshness(
        EnvironmentalVariableType.WIND_SPEED, now - 3600.0, current_time=now
    )
    assert status_outage == QualityStatus.OUTAGE

    # 4. Recovery: Fresh payload arrives
    status_recovered, _ = monitor.assess_freshness(
        EnvironmentalVariableType.WIND_SPEED, now - 10.0, current_time=now
    )
    assert status_recovered == QualityStatus.VALID


def test_07_provider_future_timestamp_rejected():
    """Test 7: Unsynchronized clock or future timestamp rejected."""
    future_time = time.time() + 1000.0
    future_dict = {
        "id": "OBS-FUTURE",
        "source_id": "BUOY-TIME-FAIL",
        "variable": "TIDE_LEVEL",
        "value": 1.2,
        "units": "m",
        "observation_timestamp": future_time,
    }
    obs = EnvironmentalDataValidator.validate_observation(future_dict)
    assert obs.quality_status == QualityStatus.MALFORMED
    assert any("Future timestamp rejected" in w for w in obs.validation_warnings)


def test_08_geographic_bidirectional_transformations():
    """Test 8: Rushikonda Beach coordinate transformation forward & inverse precision."""
    # Test origin: 17.7818 N, 83.3854 E
    origin_geo = GeoCoordinate(latitude=17.7818, longitude=83.3854)
    local_sim, in_bounds, uncertainty = GeographicCalibrationEngine.wgs84_to_simulation(origin_geo)
    assert in_bounds is True
    assert uncertainty < 5.0
    # Center origin maps to ~500m alongshore, 280m shoreline
    assert math.isclose(local_sim.x, 500.0, abs_tol=1.0)
    assert math.isclose(local_sim.y, 280.0, abs_tol=1.0)

    # Inverse transformation back to WGS84
    reconstructed_geo, inv_bounds, _ = GeographicCalibrationEngine.simulation_to_wgs84(local_sim)
    assert inv_bounds is True
    assert math.isclose(reconstructed_geo.latitude, origin_geo.latitude, abs_tol=0.0001)
    assert math.isclose(reconstructed_geo.longitude, origin_geo.longitude, abs_tol=0.0001)


def test_09_surveyed_benchmarks_and_residual_rmse():
    """Test 9: Verified physical benchmarks have measured residual error <= 5 meters."""
    benchmarks = GeographicCalibrationEngine.get_benchmarks()
    assert len(benchmarks) >= 5
    for bm in benchmarks:
        assert bm.status == "VERIFIED"
        assert bm.measured_residual_error_m < 5.0

    rmse = GeographicCalibrationEngine.calculate_benchmark_residual_rmse()
    assert 0.5 <= rmse <= 5.0


def test_10_out_of_bounds_coordinate_uncertainty():
    """Test 10: Points outside Rushikonda bounds flagged as UNCERTAIN."""
    far_away = GeoCoordinate(latitude=12.9716, longitude=77.5946)  # Bangalore
    _, in_bounds, uncertainty = GeographicCalibrationEngine.wgs84_to_simulation(far_away)
    assert in_bounds is False
    assert uncertainty >= 30.0  # High uncertainty flagged


def test_11_dataset_provenance_and_manifests():
    """Test 11: Dataset manifests track provenance, SHA256 checksums, and holdout splits."""
    engine = CalibrationExperimentEngine()
    manifests = engine.get_manifests()
    assert len(manifests) >= 2

    cal_split = next(m for m in manifests if m.split == DatasetSplit.CALIBRATION)
    eval_split = next(m for m in manifests if m.split == DatasetSplit.EVALUATION_HOLDOUT)

    assert cal_split.checksum_sha256 is not None
    assert eval_split.checksum_sha256 is not None
    assert cal_split.provenance == DataProvenance.MEASURED
    assert len(cal_split.limitations) > 0
    assert cal_split.time_range_end <= eval_split.time_range_start  # Chronological separation


def test_12_repeatable_calibration_experiments_and_metrics():
    """Test 12: Controlled calibration experiment calculates MAE, RMSE, Bias and is deterministic."""
    engine = CalibrationExperimentEngine()
    candidate = {"rip_drift_multiplier": 1.15, "wave_breaking_factor": 0.82}

    # Run twice with same input
    exp1 = engine.run_calibration_experiment("EXP-001", candidate)
    exp2 = engine.run_calibration_experiment("EXP-002", candidate)

    # Determinism check
    m1 = exp1.calibration_metrics[EnvironmentalVariableType.WAVE_HEIGHT.value]
    m2 = exp2.calibration_metrics[EnvironmentalVariableType.WAVE_HEIGHT.value]
    assert m1.mae == m2.mae
    assert m1.rmse == m2.rmse
    assert m1.bias == m2.bias
    assert m1.sample_count > 0


def test_13_missing_data_metric_handling():
    """Test 13: Error metric calculator returns None/reason without zero-filling on empty sets."""
    metric = CalibrationExperimentEngine.calculate_continuous_metrics(
        EnvironmentalVariableType.WATER_CURRENT, [], []
    )
    assert metric.mae is None
    assert metric.rmse is None
    assert metric.bias is None
    assert metric.sample_count == 0
    assert "N/A" in metric.unvalidated_reason


def test_14_preservation_rule_no_unauthorized_state_mutation():
    """Test 14: Baseline configuration strictly preserved until operator explicitly approves."""
    engine = CalibrationExperimentEngine()
    initial_baseline = engine.get_baseline_config()
    candidate = {"rip_drift_multiplier": 1.45}

    # Running experiment does NOT change baseline
    exp = engine.run_calibration_experiment("EXP-PRESERVE-01", candidate)
    assert exp.status == "PROPOSED"
    assert engine.get_baseline_config()["rip_drift_multiplier"] == initial_baseline["rip_drift_multiplier"]

    # Explicit approval applies parameter
    success, msg = engine.apply_experiment_parameters("EXP-PRESERVE-01", "OPERATOR-COMM-01")
    assert success is True
    assert engine.get_baseline_config()["rip_drift_multiplier"] == 1.45


def test_15_read_only_data_to_simulation_mapping():
    """Test 15: Simulation mapping operates in safe read-only mode and reports core readiness."""
    registry = EnvironmentalSourceRegistry()

    # Ingest wave, wind, and tide
    now = time.time()
    registry.ingest_observation({
        "id": "OBS-MAP-1",
        "source_id": "INCOIS-WAVE-BUOY-01",
        "variable": "WAVE_HEIGHT",
        "value": 1.1,
        "units": "m",
        "observation_timestamp": now - 10.0,
        "provenance": "MEASURED",
    })
    registry.ingest_observation({
        "id": "OBS-MAP-2",
        "source_id": "IMD-AWS-VIZAG-COAST",
        "variable": "WIND_SPEED",
        "value": 22.0,
        "units": "km/h",
        "observation_timestamp": now - 10.0,
        "provenance": "MEASURED",
    })
    registry.ingest_observation({
        "id": "OBS-MAP-3",
        "source_id": "NIOT-TIDE-GAUGE-01",
        "variable": "TIDE_LEVEL",
        "value": 1.4,
        "units": "m",
        "observation_timestamp": now - 10.0,
        "provenance": "MEASURED",
    })

    mapping = registry.get_mapped_simulation_state()
    assert mapping["is_ready_for_simulation_injection"] is True
    assert mapping["mapped_variables"]["WAVE_HEIGHT"]["status"] == "VALID"
    assert mapping["mapped_variables"]["WIND_SPEED"]["status"] == "VALID"
    assert mapping["provenance_breakdown"]["MEASURED"] >= 3

