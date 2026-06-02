package com.example.backend.anomaly;

import java.util.List;

public class AnomalyService {
    private final AnomalyRepository anomalyRepository;

    public AnomalyService(AnomalyRepository anomalyRepository) {
        this.anomalyRepository = anomalyRepository;
    }

    public List<AnomalyEntity> getAnomalies() {
        return anomalyRepository.findAll();
    }
}
