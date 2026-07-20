package com.example.backend.kafka;

import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;

@ExtendWith(MockitoExtension.class)
class KafkaProducerServiceTest {

    @Mock
    private KafkaTemplate<String, String> kafkaTemplate;

    private KafkaProducerService producerService;

    @BeforeEach
    void setUp() {
        producerService = new KafkaProducerService(kafkaTemplate);
    }

    @Test
    void sendRawLogs_publishesToLogsRawTopic() {
        producerService.sendRawLogs("hello");

        verify(kafkaTemplate).send("logs.raw", "hello");
    }

    @Test
    void sendProcessedFeatures_publishesToFeaturesProcessedTopic() {
        producerService.sendProcessedFeatures("features");

        verify(kafkaTemplate).send("features.processed", "features");
    }

    @Test
    void sendDetectedAnomalies_publishesToAnomaliesDetectedTopic() {
        producerService.sendDetectedAnomalies("anomaly");

        verify(kafkaTemplate).send("anomalies.detected", "anomaly");
    }
}
