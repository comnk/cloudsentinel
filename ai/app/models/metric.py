from dataclasses import dataclass

@dataclass
class Metric:
    service: str
    cpu: float
    memory: float
    request_rate: float
    error_rate: float
    latency_ms: float
    timestamp: int