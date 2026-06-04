import logging
import os

import joblib
import numpy as np

log = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "isolation_forest.pkl")

_model = None


def _load_model():
    global _model
    if not os.path.exists(MODEL_PATH):
        log.warning("No trained model found at %s — run train.py first", MODEL_PATH)
        return False
    _model = joblib.load(MODEL_PATH)
    log.info("Isolation Forest model loaded from %s", MODEL_PATH)
    return True


def is_loaded() -> bool:
    return _model is not None


def detect(metric: dict, features: np.ndarray) -> dict | None:
    if _model is None:
        return None

    # use the full window for scoring context, but label with current metric values
    prediction = _model.predict(features)
    score = _model.decision_function(features)

    # prediction[-1] is the label for the most recent sample
    is_anomaly = prediction[-1] == -1
    # decision_function: more negative = more anomalous, normalize to 0-1
    anomaly_score = float(np.clip(1.0 - (score[-1] + 0.5), 0.0, 1.0))

    if not is_anomaly:
        return None

    return {
        "type": _classify(metric),
        "severity": "CRITICAL" if anomaly_score > 0.8 else "WARNING",
        "score": round(anomaly_score, 3),
        "message": f"Isolation Forest detected anomaly (score={anomaly_score:.3f})",
    }


def _classify(metric: dict) -> str:
    cpu = metric.get("cpuUsage", 0)
    memory = metric.get("memoryUsage", 0)
    disk = metric.get("diskUsage", 0)
    if cpu >= max(memory, disk):
        return "HIGH_CPU"
    if memory >= max(cpu, disk):
        return "HIGH_MEMORY"
    return "HIGH_DISK"


# load on import
_load_model()
