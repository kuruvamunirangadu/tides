import pytest

def weighted_average_fusion(readings):
    """
    Weighted average fusion algorithm using confidence weights.
    readings: list of tuples (value, confidence)
    """
    total_weight = sum(conf for _, conf in readings)
    if total_weight == 0:
        return 0, 0
    weighted_sum = sum(val * conf for val, conf in readings)
    fused_val = weighted_sum / total_weight
    avg_conf = total_weight / len(readings)
    return fused_val, avg_conf

def detect_sensor_conflict(readings, threshold=0.35):
    """
    Detects if divergence between any pair of overlapping sensor readings exceeds threshold.
    """
    if len(readings) < 2:
        return False, 0
    vals = [r[0] for r in readings]
    max_diff = max(vals) - min(vals)
    return max_diff > threshold, max_diff

def test_confidence_weighted_fusion():
    # Acoustic tide gauge (1.2m, 0.95 conf), Radar water level (1.1m, 0.85 conf)
    readings = [(1.2, 0.95), (1.1, 0.85)]
    fused_val, avg_conf = weighted_average_fusion(readings)
    assert 1.14 < fused_val < 1.16
    assert avg_conf == pytest.approx(0.9)

def test_sensor_conflict_detection():
    # Normal readings (diff 0.1m <= 0.35m)
    normal_readings = [(1.2, 0.95), (1.1, 0.85)]
    conflict, diff = detect_sensor_conflict(normal_readings, threshold=0.35)
    assert conflict is False
    assert diff == pytest.approx(0.1, 0.01)

    # Anomaly readings (diff 0.6m > 0.35m threshold)
    divergent_readings = [(1.8, 0.95), (1.2, 0.85)]
    conflict, diff = detect_sensor_conflict(divergent_readings, threshold=0.35)
    assert conflict is True
    assert diff == pytest.approx(0.6, 0.01)

def test_offline_edge_buffer():
    buffer = []
    is_network_online = False
    max_size = 5

    # Simulate store-and-forward telemetry ingest
    for i in range(7):
        if not is_network_online:
            buffer.append({"seq": i, "val": 1.0 + i * 0.1})
            if len(buffer) > max_size:
                buffer.pop(0)

    assert len(buffer) == max_size
    assert buffer[0]["seq"] == 2  # Oldest evicted
    assert buffer[-1]["seq"] == 6

    # Flush on reconnection
    is_network_online = True
    drained = list(buffer)
    buffer.clear()
    assert len(drained) == 5
    assert len(buffer) == 0
