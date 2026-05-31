package com.example.backend.kafka;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class KafkaController {
    private final KafkaProducerService kafkaProducerService;

    public KafkaController(KafkaProducerService kafkaProducerService) {
        this.kafkaProducerService = kafkaProducerService;
    }

    @GetMapping("/send-raw-logs")
    public ResponseEntity<String> sendRawLogs(@RequestParam String message) {
        kafkaProducerService.sendRawLogs(message);
        return ResponseEntity.ok("Message sent to Kafka: " + message);
    }
}
