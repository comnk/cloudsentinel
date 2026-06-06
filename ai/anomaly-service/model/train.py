import os
from datetime import datetime, timezone

import joblib
import numpy as np
import psycopg2
import torch
import torch.nn as nn
from sklearn.ensemble import IsolationForest
from autoencoder import Autoencoder

IF_MODEL_PATH = os.path.join(os.path.dirname(__file__), "isolation_forest.pkl")
AE_MODEL_PATH = os.path.join(os.path.dirname(__file__), "autoencoder.pt")
AE_THRESHOLD_PATH = os.path.join(os.path.dirname(__file__), "threshold.npy")


def _get_conn():
    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=os.environ.get("DB_PORT", 5432),
        dbname=os.environ.get("DB_NAME", "astraquant-db"),
        user=os.environ.get("DB_USERNAME", "astraquant"),
        password=os.environ.get("DB_PASSWORD", "astraquant"),
    )


def fetch_metrics() -> np.ndarray:
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT cpu_usage, memory_usage, disk_usage FROM metric_samples "
                "ORDER BY timestamp DESC LIMIT 5000"
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    if not rows:
        raise RuntimeError("No metric_samples rows found — collect data before training")

    return np.array(rows, dtype=np.float32)


def record_model_version(model_name: str, version: str, samples: int, threshold: float | None) -> None:
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO model_versions (model_name, version, trained_at, training_samples, threshold) "
                "VALUES (%s, %s, %s, %s, %s)",
                (model_name, version, datetime.now(timezone.utc), samples, threshold),
            )
        conn.commit()
        print(f"Recorded {model_name} {version} in model_versions")
    finally:
        conn.close()


def train_isolation_forest(X: np.ndarray) -> None:
    print("Training Isolation Forest...")
    model = IsolationForest(contamination=0.05, random_state=42)
    model.fit(X)
    joblib.dump(model, IF_MODEL_PATH)
    print(f"Isolation Forest saved to {IF_MODEL_PATH}")
    record_model_version("IsolationForest", "v1", len(X), threshold=None)


def train_autoencoder(X: np.ndarray, epochs: int = 100) -> None:
    print("Training Autoencoder...")
    X_tensor = torch.tensor(X, dtype=torch.float32)

    model = Autoencoder(input_dim=X.shape[1])
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.MSELoss()

    model.train()
    for epoch in range(epochs):
        optimizer.zero_grad()
        reconstructed = model(X_tensor)
        loss = loss_fn(reconstructed, X_tensor)
        loss.backward()
        optimizer.step()
        if (epoch + 1) % 20 == 0:
            print(f"  Epoch {epoch + 1}/{epochs} — loss: {loss.item():.6f}")

    # threshold = mean reconstruction error + 2 standard deviations
    model.eval()
    with torch.no_grad():
        reconstructed = model(X_tensor)
    errors = torch.mean((X_tensor - reconstructed) ** 2, dim=1).numpy()
    threshold = float(errors.mean() + 2 * errors.std())
    print(f"  Threshold set to {threshold:.6f} (mean + 2*std of training errors)")

    torch.save(model.state_dict(), AE_MODEL_PATH)
    np.save(AE_THRESHOLD_PATH, np.array(threshold))
    print(f"Autoencoder saved to {AE_MODEL_PATH}")
    record_model_version("Autoencoder", "v1", len(X), threshold)


def train() -> None:
    print("Fetching metrics from Postgres...")
    X = fetch_metrics()
    print(f"Training on {len(X)} samples...")

    train_isolation_forest(X)
    train_autoencoder(X)
    print("Training complete.")


if __name__ == "__main__":
    train()
