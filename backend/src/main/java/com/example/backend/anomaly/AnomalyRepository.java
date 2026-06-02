package com.example.backend.anomaly;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AnomalyRepository extends JpaRepository<AnomalyEntity, Long> {

}
