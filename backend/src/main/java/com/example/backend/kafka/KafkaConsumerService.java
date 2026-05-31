package com.example.backend.kafka;

import com.example.backend.metricsample.MetricSampleDTO;
import com.example.backend.metricsample.MetricSampleEntity;
import com.example.backend.metricsample.MetricSampleRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class KafkaConsumerService {

    private static final Logger log = LoggerFactory.getLogger(KafkaConsumerService.class);
    private final MetricSampleRepository repository;
    private final ObjectMapper objectMapper;

    public KafkaConsumerService(MetricSampleRepository repository) {
        this.repository = repository;
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    @KafkaListener(topics = "metrics.raw", groupId = "backend-group")
    public void consumeRawMetrics(String message) {
        try {
            MetricSampleDTO dto = objectMapper.readValue(message, MetricSampleDTO.class);
            MetricSampleEntity entity = new MetricSampleEntity();
            entity.setTimestamp(dto.getTimestamp());
            entity.setHost(dto.getHost());
            entity.setCpuUsage(dto.getCpuUsage());
            entity.setMemoryUsage(dto.getMemoryUsage());
            entity.setDiskUsage(dto.getDiskUsage());
            repository.save(entity);
            log.info("Saved metric: host={} cpu={}", dto.getHost(), dto.getCpuUsage());
        } catch (Exception e) {
            log.error("Failed to process metric event: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "logs.raw", groupId = "backend-group")
    public void consumeRawLogs(String message) {
        System.out.println("Consumed raw logs: " + message);
        // Add logic to process raw logs if needed
    }

    @KafkaListener(topics = "features.processed", groupId = "backend-group")
    public void consumeProcessedFeatures(String message) {
        System.out.println("Consumed processed features: " + message);
        // Add logic to process features if needed
    }

    @KafkaListener(topics = "anomalies.detected", groupId = "backend-group")
    public void consumeDetectedAnomalies(String message) {
        System.out.println("Consumed detected anomalies: " + message);
        // Add logic to process anomalies if needed
    }
}
