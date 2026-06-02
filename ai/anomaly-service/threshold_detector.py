from anomaly_event import AnomalyEvent

CPU_THRESHOLD = 90.0
MEMORY_THRESHOLD = 90.0
DISK_THRESHOLD = 95.0


def detect(metric: dict) -> AnomalyEvent | None:
    host = metric.get("host", "unknown")
    timestamp = metric.get("timestamp", "")
    cpu = metric.get("cpuUsage", 0)
    memory = metric.get("memoryUsage", 0)
    disk = metric.get("diskUsage", 0)

    if cpu > CPU_THRESHOLD:
        return AnomalyEvent(
            timestamp=timestamp,
            host=host,
            type="HIGH_CPU",
            severity="WARNING",
            score=round(cpu / 100, 2),
            message=f"CPU usage {cpu}% exceeded threshold {CPU_THRESHOLD}%",
        )

    if memory > MEMORY_THRESHOLD:
        return AnomalyEvent(
            timestamp=timestamp,
            host=host,
            type="HIGH_MEMORY",
            severity="WARNING",
            score=round(memory / 100, 2),
            message=f"Memory usage {memory}% exceeded threshold {MEMORY_THRESHOLD}%",
        )

    if disk > DISK_THRESHOLD:
        return AnomalyEvent(
            timestamp=timestamp,
            host=host,
            type="HIGH_DISK",
            severity="CRITICAL",
            score=round(disk / 100, 2),
            message=f"Disk usage {disk}% exceeded threshold {DISK_THRESHOLD}%",
        )

    return None
