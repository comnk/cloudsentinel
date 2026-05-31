package com.example.backend.metricsample;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/metrics")
public class MetricSampleController {
    private final MetricSampleService metricSampleService;

    public MetricSampleController(MetricSampleService metricSampleService) {
        this.metricSampleService = metricSampleService;
    }

    @GetMapping("/latest")
    public ResponseEntity<MetricSampleEntity> getLatestMetric() {
        return metricSampleService.getLatestMetric()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/history")
    public ResponseEntity<List<MetricSampleEntity>> getMetricHistory() {
        return ResponseEntity.ok(metricSampleService.getMetricHistory());
    }
}
