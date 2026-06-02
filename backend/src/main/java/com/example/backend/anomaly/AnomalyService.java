package com.example.backend.anomaly;

import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class AnomalyService {
    private final AnomalyRepository anomalyRepository;

    public AnomalyService(AnomalyRepository anomalyRepository) {
        this.anomalyRepository = anomalyRepository;
    }

    public List<AnomalyEntity> getAnomalies() {
        return anomalyRepository.findAll();
    }
}
