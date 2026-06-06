import os
import logging

import numpy as np
import torch
import torch.nn as nn

logger = logging.getLogger(__name__)

_MODEL_PATH = os.path.join(os.path.dirname(__file__), 'autoencoder.pt')
_THRESHOLD_PATH = os.path.join(os.path.dirname(__file__), 'threshold.npy')

_THRESHOLD = 0.6
_MODEL: "Autoencoder | None" = None

class Autoencoder(nn.Module):
    def __init__(self, input_dim = 3):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 16),
            nn.ReLU(),
            nn.Linear(16, 8),
            nn.ReLU()
        )
        self.decoder = nn.Sequential(
            nn.Linear(8, 16),
            nn.ReLU(),
            nn.Linear(16, input_dim),
        )

    def forward(self, x):
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded

def is_loaded() -> bool:
    return _MODEL is not None

def detect(metric: dict, features: np.ndarray) -> dict | None:
    if _MODEL is None:
        return None

    x = torch.tensor(features, dtype=torch.float32)
    with torch.no_grad():
        reconstructed = _MODEL(x)

    errors = torch.mean((x - reconstructed) ** 2, dim=1).numpy()
    latest_error = float(errors[-1])
    is_anomaly = latest_error > _THRESHOLD

    if not is_anomaly:
        return None

    score = float(np.clip(latest_error / (_THRESHOLD * 2), 0, 1))

    return {
        "type": classify(metric),
        "severity": "CRITICAL" if score > 0.8 else "WARNING",
        "score": round(score, 3),
        "message": f"Anomaly detected with reconstruction error {latest_error:.4f} that exceeds the threshold {_THRESHOLD:.4f}."
    }

def classify(metric: dict) -> str:
    cpu = metric.get("cpuUsage", 0)
    memory = metric.get("memoryUsage", 0)
    disk = metric.get("diskUsage", 0)

    if cpu >= max(memory, disk):
        return "HIGH_CPU"
    if memory >= max(cpu, disk):
        return "HIGH_MEMORY"
    return "HIGH_DISK"

def load_model() -> None:
    global _MODEL, _THRESHOLD
    if os.path.exists(_MODEL_PATH) and os.path.exists(_THRESHOLD_PATH):
        try:
            _MODEL = Autoencoder()
            _MODEL.load_state_dict(torch.load(_MODEL_PATH, weights_only=True))
            _MODEL.eval()
            _THRESHOLD = np.load(_THRESHOLD_PATH).item()
            logger.info(f"Autoencoder model loaded successfully with threshold {_THRESHOLD:.4f}.")
        except Exception as e:
            logger.error(f"Failed to load autoencoder model: {e}")
            _MODEL = None
    else:
        logger.warning("Autoencoder model or threshold file not found. Anomaly detection will be disabled.")
        _MODEL = None

load_model()