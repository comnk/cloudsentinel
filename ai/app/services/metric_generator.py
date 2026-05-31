import json
import logging
import os
import socket
import time
from datetime import datetime, timezone

import psutil
from confluent_kafka import Producer

log = logging.getLogger(__name__)

KAFKA_TOPIC = "metrics.raw"


def _get_producer() -> Producer:
    bootstrap = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    return Producer({"bootstrap.servers": bootstrap})


def collect() -> dict:
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "host": socket.gethostname(),
        "cpuUsage": psutil.cpu_percent(interval=1),
        "memoryUsage": psutil.virtual_memory().percent,
        "diskUsage": psutil.disk_usage("/").percent,
    }


def run(interval_seconds: int = 5):
    producer = _get_producer()
    log.info("Collector started, publishing to %s every %ds", KAFKA_TOPIC, interval_seconds)
    while True:
        metric = collect()
        producer.produce(KAFKA_TOPIC, json.dumps(metric))
        producer.flush()
        log.info("Published: %s", metric)
        time.sleep(interval_seconds)
