import json
import logging
import os

from confluent_kafka import Producer
from kubernetes import client, config

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

POD_TOPIC = "k8s.pods"
EVENT_TOPIC = "k8s.events"


def make_producer() -> Producer:
    bootstrap = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    return Producer({"bootstrap.servers": bootstrap})


def collect_pods(v1: client.CoreV1Api, producer: Producer) -> None:
    pods = v1.list_pod_for_all_namespaces(watch=False)
    for pod in pods.items:
        event = {
            "type": "pod_status",
            "pod": pod.metadata.name,
            "namespace": pod.metadata.namespace,
            "status": pod.status.phase,
            "node": pod.spec.node_name,
            "restarts": sum(
                cs.restart_count for cs in (pod.status.container_statuses or [])
            ),
        }
        producer.produce(POD_TOPIC, json.dumps(event))
        log.info("Published pod: %s", event["pod"])
    producer.flush()


def collect_events(v1: client.CoreV1Api, producer: Producer) -> None:
    events = v1.list_event_for_all_namespaces(watch=False)
    for e in events.items:
        payload = {
            "type": "k8s_event",
            "reason": e.reason,
            "message": e.message,
            "namespace": e.metadata.namespace,
            "resource": f"{e.involved_object.kind}/{e.involved_object.name}",
            "timestamp": e.last_timestamp.isoformat() if e.last_timestamp else None,
        }
        producer.produce(EVENT_TOPIC, json.dumps(payload))
        log.info("Published event: reason=%s resource=%s", payload["reason"], payload["resource"])
    producer.flush()


def collect_deployments(apps_v1: client.AppsV1Api, producer: Producer) -> None:
    deployments = apps_v1.list_deployment_for_all_namespaces(watch=False)
    for deploy in deployments.items:
        event = {
            "type": "deployment_status",
            "deployment": deploy.metadata.name,
            "namespace": deploy.metadata.namespace,
            "replicas": deploy.status.replicas,
            "available_replicas": deploy.status.available_replicas,
        }
        producer.produce("k8s.deployments", json.dumps(event))
        log.info("Published deployment: %s", event["deployment"])
    producer.flush()


def collect_nodes(v1: client.CoreV1Api, producer: Producer) -> None:
    nodes = v1.list_node(watch=False)
    for node in nodes.items:
        event = {
            "type": "node_status",
            "node": node.metadata.name,
            "status": node.status.conditions[-1].type if node.status.conditions else "Unknown",
        }
        producer.produce("k8s.nodes", json.dumps(event))
        log.info("Published node: %s", event["node"])
    producer.flush()

if __name__ == "__main__":
    config.load_kube_config()
    v1 = client.CoreV1Api()
    apps_v1 = client.AppsV1Api()
    producer = make_producer()
    collect_pods(v1, producer)
    collect_events(v1, producer)
    collect_deployments(apps_v1, producer)
    collect_nodes(v1, producer)