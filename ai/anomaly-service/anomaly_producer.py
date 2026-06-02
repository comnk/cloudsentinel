import dataclasses
import json
import logging
import os

from confluent_kafka import Producer
from anomaly_event import AnomalyEvent

log = logging.getLogger(__name__)

TOPIC = "anomalies.detected"


def make_producer() -> Producer:
    bootstrap = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    return Producer({"bootstrap.servers": bootstrap})


def publish(producer: Producer, event: AnomalyEvent) -> None:
    payload = json.dumps(dataclasses.asdict(event))
    producer.produce(TOPIC, payload)
    producer.flush()
    log.info("Published anomaly: type=%s host=%s", event.type, event.host)
