package com.example.backend.kafka;

import com.example.backend.metricsample.MetricSampleDTO;
import com.example.backend.metricsample.MetricSampleEntity;
import com.example.backend.metricsample.MetricSampleRepository;

import com.example.backend.anomaly.AnomalyDTO;
import com.example.backend.anomaly.AnomalyEntity;
import com.example.backend.anomaly.AnomalyRepository;
import com.example.backend.investigation.InvestigationService;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class KafkaConsumerService {

    public static final String LATEST_METRIC_KEY = "metric:latest";

    private static final Logger log = LoggerFactory.getLogger(KafkaConsumerService.class);
    private final MetricSampleRepository metricSampleRepository;
    private final AnomalyRepository anomalyRepository;
    private final InvestigationService investigationService;
    private final RedisTemplate<String, MetricSampleEntity> redisTemplate;
    private final ObjectMapper objectMapper;

    public KafkaConsumerService(MetricSampleRepository metricSampleRepository,
            AnomalyRepository anomalyRepository,
            InvestigationService investigationService,
            RedisTemplate<String, MetricSampleEntity> redisTemplate) {
        this.metricSampleRepository = metricSampleRepository;
        this.anomalyRepository = anomalyRepository;
        this.investigationService = investigationService;
        this.redisTemplate = redisTemplate;
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
            metricSampleRepository.save(entity);
            redisTemplate.opsForValue().set(LATEST_METRIC_KEY, entity);
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

    @Transactional
    @KafkaListener(topics = "anomalies.detected", groupId = "backend-group")
    public void consumeDetectedAnomalies(String message) {
        try {
            AnomalyDTO dto = objectMapper.readValue(message, AnomalyDTO.class);
            AnomalyEntity entity = new AnomalyEntity();
            entity.setTimestamp(dto.getTimestamp());
            entity.setHost(dto.getHost());
            entity.setType(dto.getType());
            entity.setSeverity(dto.getSeverity());
            entity.setScore(dto.getScore());
            entity.setMessage(dto.getMessage());
            if (dto.getExplanation() != null && !dto.getExplanation().isEmpty()) {
                entity.setExplanation(String.join(" | ", dto.getExplanation()));
            }
            anomalyRepository.save(entity);
            investigationService.createFromAnomaly(entity);
            log.info("Saved anomaly and opened investigation: type={} severity={}", dto.getType(), dto.getSeverity());
        } catch (Exception e) {
            log.error("Failed to process anomaly event: {}", e.getMessage());
        }
    }
}
