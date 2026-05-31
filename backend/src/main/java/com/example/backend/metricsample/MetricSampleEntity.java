package com.example.backend.metricsample;

import java.time.Instant;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "metric_samples")
@Data
@NoArgsConstructor
public class MetricSampleEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Instant timestamp;
    private String host;

    private Double cpuUsage;
    private Double memoryUsage;
    private Double diskUsage;
}
