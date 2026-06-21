package com.example.backend.k8s.pod;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PodRepository extends JpaRepository<PodEntity, Long> {
    Optional<PodEntity> findByPodNameAndNamespace(String podName, String namespace);
}
