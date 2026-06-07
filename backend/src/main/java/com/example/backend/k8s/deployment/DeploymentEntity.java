package com.example.backend.k8s.deployment;

import java.time.Instant;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "deployments")
@Data
@NoArgsConstructor
public class DeploymentEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String deploymentName;
    private String namespace;
    private Integer replicas;
    private Integer availableReplicas;
    private Instant timestamp;
}
