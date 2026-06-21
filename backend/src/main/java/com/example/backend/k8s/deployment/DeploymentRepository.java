package com.example.backend.k8s.deployment;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DeploymentRepository extends JpaRepository<DeploymentEntity, Long> {
    Optional<DeploymentEntity> findByDeploymentNameAndNamespace(String deploymentName, String namespace);

    List<DeploymentEntity> findByTimestampBetween(Instant from, Instant to);
}
