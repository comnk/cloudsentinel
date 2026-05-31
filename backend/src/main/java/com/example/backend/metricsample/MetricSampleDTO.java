package com.example.backend.metricsample;

import java.time.Instant;

import lombok.Data;

@Data
public class MetricSampleDTO {
    private Instant timestamp;

    private String host;

    private Double cpuUsage;

    private Double memoryUsage;

    private Double diskUsage;
}
