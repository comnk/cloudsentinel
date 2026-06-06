package com.example.backend.anomaly;

import java.time.Instant;
import java.util.List;

import lombok.Data;

@Data
public class AnomalyDTO {
    private Instant timestamp;
    private String host;
    private String type;
    private String severity;
    private Double score;
    private String message;
    private List<String> explanation;
}
