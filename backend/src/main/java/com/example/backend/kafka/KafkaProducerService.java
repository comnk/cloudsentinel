package com.example.backend.kafka;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class KafkaProducerService {

    private static final String raw_metrics = "metrics.raw";
    private static final String raw_logs = "logs.raw";
    private static final String features_processed = "features.processed";
    private static final String anomalies_detected = "anomalies.detected";
    private final KafkaTemplate<String, String> kafkaTemplate;

    public KafkaProducerService(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void sendRawMetrics(String message) {
        kafkaTemplate.send(raw_metrics, message);
        System.out.println("Sent raw metrics: " + message);
    }

    public void sendRawLogs(String message) {
        kafkaTemplate.send(raw_logs, message);
        System.out.println("Sent raw logs: " + message);
    }

    public void sendProcessedFeatures(String message) {
        kafkaTemplate.send(features_processed, message);
        System.out.println("Sent processed features: " + message);
    }

    public void sendDetectedAnomalies(String message) {
        kafkaTemplate.send(anomalies_detected, message);
        System.out.println("Sent detected anomalies: " + message);
    }
}
