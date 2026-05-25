package com.example.backend.kafka;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class KafkaConsumerService {

    @KafkaListener(topics = "metrics.raw", groupId = "backend-group")
    public void consumeRawMetrics(String message) {
        System.out.println("Consumed raw metrics: " + message);
        // Add logic to process raw metrics if needed
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
