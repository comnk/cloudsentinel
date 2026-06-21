import json
import logging
import os
import time

from confluent_kafka import Producer
from kubernetes import client, config

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

POD_TOPIC = "k8s.pods"
EVENT_TOPIC = "k8s.events"
DEPLOYMENT_TOPIC = "k8s.deployments"
NODE_TOPIC = "k8s.nodes"
POLL_INTERVAL = int(os.environ.get("K8S_POLL_INTERVAL", "30"))


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
            "status": pod.status.phase or "Unknown",
            "node": pod.spec.node_name,
            "restarts": sum(
                cs.restart_count for cs in (pod.status.container_statuses or [])
            ),
        }
        producer.produce(POD_TOPIC, json.dumps(event))
    producer.flush()
    log.info("Published %d pods", len(pods.items))


def collect_events(v1: client.CoreV1Api, producer: Producer) -> None:
    events = v1.list_event_for_all_namespaces(watch=False)
    count = 0
    for e in events.items:
        if not e.reason:
            continue
        payload = {
            "type": "k8s_event",
            "reason": e.reason,
            "message": e.message,
            "namespace": e.metadata.namespace,
            "resource": f"{e.involved_object.kind}/{e.involved_object.name}",
            "timestamp": e.last_timestamp.isoformat() if e.last_timestamp else None,
        }
        producer.produce(EVENT_TOPIC, json.dumps(payload))
        count += 1
    producer.flush()
    log.info("Published %d events", count)


def collect_deployments(apps_v1: client.AppsV1Api, producer: Producer) -> None:
    deployments = apps_v1.list_deployment_for_all_namespaces(watch=False)
    for deploy in deployments.items:
        event = {
            "type": "deployment_status",
            "deployment": deploy.metadata.name,
            "namespace": deploy.metadata.namespace,
            "replicas": deploy.status.replicas or 0,
            "available_replicas": deploy.status.available_replicas or 0,
        }
        producer.produce(DEPLOYMENT_TOPIC, json.dumps(event))
    producer.flush()
    log.info("Published %d deployments", len(deployments.items))


def collect_nodes(v1: client.CoreV1Api, producer: Producer) -> None:
    nodes = v1.list_node(watch=False)
    for node in nodes.items:
        conditions = node.status.conditions or []
        ready = next((c for c in conditions if c.type == "Ready"), None)
        event = {
            "type": "node_status",
            "node": node.metadata.name,
            "status": "Ready" if (ready and ready.status == "True") else "NotReady",
        }
        producer.produce(NODE_TOPIC, json.dumps(event))
    producer.flush()
    log.info("Published %d nodes", len(nodes.items))


def collect_once(v1: client.CoreV1Api, apps_v1: client.AppsV1Api, producer: Producer) -> None:
    try:
        collect_pods(v1, producer)
    except Exception:
        log.exception("Failed to collect pods")
    try:
        collect_events(v1, producer)
    except Exception:
        log.exception("Failed to collect events")
    try:
        collect_deployments(apps_v1, producer)
    except Exception:
        log.exception("Failed to collect deployments")
    try:
        collect_nodes(v1, producer)
    except Exception:
        log.exception("Failed to collect nodes")


def run(interval: int = POLL_INTERVAL) -> None:
    try:
        config.load_incluster_config()
        log.info("Using in-cluster kubeconfig")
    except config.ConfigException:
        config.load_kube_config()
        log.info("Using local kubeconfig")

    v1 = client.CoreV1Api()
    apps_v1 = client.AppsV1Api()
    producer = make_producer()

    log.info("K8s collector started — polling every %ds", interval)
    while True:
        collect_once(v1, apps_v1, producer)
        time.sleep(interval)


if __name__ == "__main__":
    run()
