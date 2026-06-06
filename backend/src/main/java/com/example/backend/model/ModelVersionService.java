package com.example.backend.model;

import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class ModelVersionService {
    private final ModelVersionRepository repository;

    public ModelVersionService(ModelVersionRepository repository) {
        this.repository = repository;
    }

    public List<ModelVersionEntity> getAllVersions() {
        return repository.findAllByOrderByTrainedAtDesc();
    }
}
