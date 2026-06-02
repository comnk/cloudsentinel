package com.example.backend.anomaly;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/anomalies")
public class AnomalyController {
    private final AnomalyService anomalyService;

    public AnomalyController(AnomalyService anomalyService) {
        this.anomalyService = anomalyService;
    }

    @GetMapping("/")
    public ResponseEntity<List<AnomalyEntity>> getAnomalies() {
        return ResponseEntity.ok(anomalyService.getAnomalies());
    }
}
