from dataclasses import dataclass


@dataclass
class AnomalyEvent:
    timestamp: str
    host: str
    type: str
    severity: str
    score: float
    message: str
