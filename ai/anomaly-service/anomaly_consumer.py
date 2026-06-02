import json
import logging
import os

from confluent_kafka import Consumer, KafkaError
from anomaly_producer import make_producer, publish
from threshold_detector import detect

log = logging.getLogger(__name__)

TOPIC = "metrics.raw"


def run() -> None:
    bootstrap = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    consumer = Consumer({
        "bootstrap.servers": bootstrap,
        "group.id": "anomaly-service",
        "auto.offset.reset": "latest",
    })
    producer = make_producer()
    consumer.subscribe([TOPIC])
    log.info("Anomaly service started, consuming from %s", TOPIC)

    try:
        while True:
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() != KafkaError._PARTITION_EOF:
                    log.error("Kafka error: %s", msg.error())
                continue

            try:
                metric = json.loads(msg.value().decode("utf-8"))
                anomaly = detect(metric)
                if anomaly:
                    publish(producer, anomaly)
            except Exception as e:
                log.error("Failed to process message: %s", e)
    finally:
        consumer.close()
