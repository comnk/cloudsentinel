import numpy as np
from collections import deque

MIN_SAMPLES = 10
window: deque = deque(maxlen=20)


def add_metric(metric: dict) -> None:
    window.append([
        metric.get("cpuUsage", 0.0),
        metric.get("memoryUsage", 0.0),
        metric.get("diskUsage", 0.0),
    ])


def is_ready() -> bool:
    return len(window) >= MIN_SAMPLES


def get_features() -> np.ndarray:
    # shape: (n_samples, 3) — one row per metric, columns are [cpu, memory, disk]
    return np.array(window, dtype=np.float32)


def get_averages() -> dict:
    arr = get_features()
    means = arr.mean(axis=0)
    return {
        "cpuUsage": float(means[0]),
        "memoryUsage": float(means[1]),
        "diskUsage": float(means[2]),
    }