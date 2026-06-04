import json
import logging
import os

from confluent_kafka import Consumer, KafkaError
from anomaly_producer import make_producer, publish
from threshold_detector import detect as threshold_detect
from anomaly_event import AnomalyEvent
import feature_window
from model import isolation_forest

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
                feature_window.add_metric(metric)

                if feature_window.is_ready() and isolation_forest.is_loaded():
                    features = feature_window.get_features()
                    result = isolation_forest.detect(metric, features)
                    if result:
                        anomaly = AnomalyEvent(
                            timestamp=metric.get("timestamp", ""),
                            host=metric.get("host", "unknown"),
                            type=result["type"],
                            severity=result["severity"],
                            score=result["score"],
                            message=result["message"],
                        )
                        publish(producer, anomaly)
                else:
                    # window still warming up or model not trained yet — use rules
                    anomaly = threshold_detect(metric)
                    if anomaly:
                        publish(producer, anomaly)
            except Exception as e:
                log.error("Failed to process message: %s", e)
    finally:
        consumer.close()
