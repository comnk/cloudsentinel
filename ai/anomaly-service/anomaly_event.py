from dataclasses import dataclass, field


@dataclass
class AnomalyEvent:
    timestamp: str
    host: str
    type: str
    severity: str
    score: float
    message: str
    explanation: list[str] = field(default_factory=list)
