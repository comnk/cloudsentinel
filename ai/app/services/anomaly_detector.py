import dataclasses
import json
import logging
import os
import threading
from datetime import datetime, timezone

from confluent_kafka import Consumer, KafkaError, Producer

log = logging.getLogger(__name__)

CPU_THRESHOLD = 90.0
MEMORY_THRESHOLD = 90.0
DISK_THRESHOLD = 95.0

_stop_event = threading.Event()


def _bootstrap() -> str:
    return os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")


def _detect(metric: dict) -> dict | None:
    cpu = metric.get("cpuUsage", 0)
    memory = metric.get("memoryUsage", 0)
    disk = metric.get("diskUsage", 0)
    host = metric.get("host", "unknown")
    ts = metric.get("timestamp", datetime.now(timezone.utc).isoformat())

    if cpu > CPU_THRESHOLD:
        return dict(timestamp=ts, host=host, type="HIGH_CPU", severity="WARNING",
                    score=round(cpu / 100, 3),
                    message=f"CPU usage {cpu:.1f}% exceeded threshold {CPU_THRESHOLD}%",
                    explanation=[f"CPU spike detected: {cpu:.1f}% (threshold {CPU_THRESHOLD}%)"])
    if memory > MEMORY_THRESHOLD:
        return dict(timestamp=ts, host=host, type="HIGH_MEMORY", severity="WARNING",
                    score=round(memory / 100, 3),
                    message=f"Memory usage {memory:.1f}% exceeded threshold {MEMORY_THRESHOLD}%",
                    explanation=[f"Memory spike detected: {memory:.1f}% (threshold {MEMORY_THRESHOLD}%)"])
    if disk > DISK_THRESHOLD:
        return dict(timestamp=ts, host=host, type="HIGH_DISK", severity="CRITICAL",
                    score=round(disk / 100, 3),
                    message=f"Disk usage {disk:.1f}% exceeded threshold {DISK_THRESHOLD}%",
                    explanation=[f"Disk spike detected: {disk:.1f}% (threshold {DISK_THRESHOLD}%)"])
    return None


def _run():
    consumer = Consumer({
        "bootstrap.servers": _bootstrap(),
        "group.id": "anomaly-detector-embedded",
        "auto.offset.reset": "latest",
    })
    producer = Producer({"bootstrap.servers": _bootstrap()})
    consumer.subscribe(["metrics.raw"])
    log.info("Embedded anomaly detector started")

    # Deduplicate: track last anomaly type per host so we don't spam identical events
    last_anomaly: dict[str, str] = {}

    try:
        while not _stop_event.is_set():
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() != KafkaError._PARTITION_EOF:
                    log.error("Kafka error: %s", msg.error())
                continue

            try:
                metric = json.loads(msg.value().decode())
                anomaly = _detect(metric)
                if anomaly:
                    host = anomaly["host"]
                    atype = anomaly["type"]
                    # suppress repeat: only re-fire if host+type changes or clears
                    if last_anomaly.get(host) != atype:
                        last_anomaly[host] = atype
                        producer.produce("anomalies.detected", json.dumps(anomaly))
                        producer.flush()
                        log.info("Anomaly published: host=%s type=%s", host, atype)
                else:
                    host = metric.get("host", "unknown")
                    last_anomaly.pop(host, None)
            except Exception:
                log.exception("Error processing metric")
    finally:
        consumer.close()


def start():
    t = threading.Thread(target=_run, daemon=True)
    t.start()
    return t
