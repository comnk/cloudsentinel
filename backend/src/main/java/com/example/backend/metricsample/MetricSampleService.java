package com.example.backend.metricsample;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

@Service
public class MetricSampleService {
    private final MetricSampleRepository metricSampleRepository;

    public MetricSampleService(MetricSampleRepository metricSampleRepository) {
        this.metricSampleRepository = metricSampleRepository;
    }

    public Optional<MetricSampleEntity> getLatestMetric() {
        return metricSampleRepository.findTopByOrderByTimestampDesc();
    }

    public List<MetricSampleEntity> getMetricHistory() {
        return metricSampleRepository.findAllByOrderByTimestampDesc();
    }
}
