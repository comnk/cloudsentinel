package com.example.backend.k8s.deployment;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class DeploymentService {
    private final DeploymentRepository deploymentRepository;

    public DeploymentService(DeploymentRepository deploymentRepository) {
        this.deploymentRepository = deploymentRepository;
    }

    public void save(DeploymentDTO dto) {
        DeploymentEntity entity = new DeploymentEntity();
        entity.setDeploymentName(dto.getDeploymentName());
        entity.setNamespace(dto.getNamespace());
        entity.setReplicas(dto.getReplicas());
        entity.setAvailableReplicas(dto.getAvailableReplicas());
        entity.setTimestamp(Instant.now());
        deploymentRepository.save(entity);
    }

    public List<DeploymentEntity> getAll() {
        return deploymentRepository.findAll();
    }
}
