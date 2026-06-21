import json
import logging
import os
import threading
import time

from confluent_kafka import Producer

log = logging.getLogger(__name__)

POLL_INTERVAL = int(os.environ.get("K8S_POLL_INTERVAL", "30"))


def _make_producer() -> Producer:
    bootstrap = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    return Producer({"bootstrap.servers": bootstrap})


def _collect(v1, apps_v1, producer: Producer) -> None:
    from kubernetes import client as k8s_client

    # Pods
    try:
        pods = v1.list_pod_for_all_namespaces(watch=False)
        for pod in pods.items:
            producer.produce("k8s.pods", json.dumps({
                "type": "pod_status",
                "pod": pod.metadata.name,
                "namespace": pod.metadata.namespace,
                "status": pod.status.phase or "Unknown",
                "node": pod.spec.node_name,
                "restarts": sum(cs.restart_count for cs in (pod.status.container_statuses or [])),
            }))
        producer.flush()
        log.info("K8s: published %d pods", len(pods.items))
    except Exception:
        log.exception("K8s: failed to collect pods")

    # Events
    try:
        events = v1.list_event_for_all_namespaces(watch=False)
        count = 0
        for e in events.items:
            if not e.reason:
                continue
            producer.produce("k8s.events", json.dumps({
                "type": "k8s_event",
                "reason": e.reason,
                "message": e.message,
                "namespace": e.metadata.namespace,
                "resource": f"{e.involved_object.kind}/{e.involved_object.name}",
                "timestamp": e.last_timestamp.isoformat() if e.last_timestamp else None,
            }))
            count += 1
        producer.flush()
        log.info("K8s: published %d events", count)
    except Exception:
        log.exception("K8s: failed to collect events")

    # Deployments
    try:
        deploys = apps_v1.list_deployment_for_all_namespaces(watch=False)
        for d in deploys.items:
            producer.produce("k8s.deployments", json.dumps({
                "type": "deployment_status",
                "deployment": d.metadata.name,
                "namespace": d.metadata.namespace,
                "replicas": d.status.replicas or 0,
                "available_replicas": d.status.available_replicas or 0,
            }))
        producer.flush()
        log.info("K8s: published %d deployments", len(deploys.items))
    except Exception:
        log.exception("K8s: failed to collect deployments")

    # Nodes
    try:
        nodes = v1.list_node(watch=False)
        for node in nodes.items:
            conditions = node.status.conditions or []
            ready = next((c for c in conditions if c.type == "Ready"), None)
            producer.produce("k8s.nodes", json.dumps({
                "type": "node_status",
                "node": node.metadata.name,
                "status": "Ready" if (ready and ready.status == "True") else "NotReady",
            }))
        producer.flush()
        log.info("K8s: published %d nodes", len(nodes.items))
    except Exception:
        log.exception("K8s: failed to collect nodes")


def _run():
    from kubernetes import client as k8s_client
    v1 = k8s_client.CoreV1Api()
    apps_v1 = k8s_client.AppsV1Api()
    producer = _make_producer()
    log.info("K8s collector polling every %ds", POLL_INTERVAL)
    while True:
        _collect(v1, apps_v1, producer)
        time.sleep(POLL_INTERVAL)


def start() -> threading.Thread | None:
    try:
        from kubernetes import config as k8s_config
        try:
            k8s_config.load_incluster_config()
            log.info("K8s: using in-cluster config")
        except k8s_config.ConfigException:
            k8s_config.load_kube_config()
            log.info("K8s: using local kubeconfig")
    except Exception as e:
        log.warning("K8s collector disabled — kubeconfig unavailable: %s", e)
        return None

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    return t
