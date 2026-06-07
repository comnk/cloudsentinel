from kubernetes import client, config

config.load_kube_config()

v1 = client.CoreV1Api()
pods = v1.list_pod_for_all_namespaces(watch=False)

for pod in pods.items:
    print({
          "type": "pod_status",
          "pod": pod.metadata.name,
          "namespace": pod.metadata.namespace,
          "status": pod.status.phase,
          "node": pod.spec.node_name,
          "restarts": sum(
              cs.restart_count for cs in (pod.status.container_statuses or [])
          ),
    })