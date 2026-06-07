package com.example.backend.k8s.pod;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class PodService {
    private final PodRepository podRepository;

    public PodService(PodRepository podRepository) {
        this.podRepository = podRepository;
    }

    public void save(PodDTO dto) {
        PodEntity entity = new PodEntity();
        entity.setPodName(dto.getPodName());
        entity.setNamespace(dto.getNamespace());
        entity.setStatus(dto.getStatus());
        entity.setNode(dto.getNode());
        entity.setRestarts(dto.getRestarts());
        entity.setTimestamp(Instant.now());
        podRepository.save(entity);
    }

    public List<PodEntity> getAll() {
        return podRepository.findAll();
    }
}
