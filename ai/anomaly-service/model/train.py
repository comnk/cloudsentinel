import os
import joblib
import numpy as np
import psycopg2
from sklearn.ensemble import IsolationForest

MODEL_PATH = os.path.join(os.path.dirname(__file__), "isolation_forest.pkl")


def fetch_metrics() -> np.ndarray:
    conn = psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=os.environ.get("DB_PORT", 5432),
        dbname=os.environ.get("DB_NAME", "astraquant-db"),
        user=os.environ.get("DB_USERNAME", "astraquant"),
        password=os.environ.get("DB_PASSWORD", "astraquant"),
    )
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT cpu_usage, memory_usage, disk_usage FROM metric_samples ORDER BY timestamp DESC LIMIT 5000")
            rows = cur.fetchall()
    finally:
        conn.close()

    if not rows:
        raise RuntimeError("No metric_samples rows found — collect data before training")

    return np.array(rows, dtype=np.float32)


def train() -> None:
    print("Fetching metrics from Postgres...")
    X = fetch_metrics()
    print(f"Training on {len(X)} samples...")

    model = IsolationForest(contamination=0.05, random_state=42)
    model.fit(X)

    joblib.dump(model, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")


if __name__ == "__main__":
    train()
