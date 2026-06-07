package com.example.backend.k8s.pod;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PodRepository extends JpaRepository<PodEntity, Long> {
}
