package com.example.backend.metricsample;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MetricSampleRepository extends JpaRepository<MetricSampleEntity, Long> {
    Optional<MetricSampleEntity> findTopByOrderByTimestampDesc();

    List<MetricSampleEntity> findAllByOrderByTimestampDesc();

    List<MetricSampleEntity> findByHostAndTimestampBetween(String host, Instant from, Instant to);
}
