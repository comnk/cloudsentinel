package com.example.backend.k8s.event;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ClusterEventRepository extends JpaRepository<ClusterEventEntity, Long> {
    List<ClusterEventEntity> findAllByOrderByTimestampDesc();

    List<ClusterEventEntity> findByTimestampBetween(Instant from, Instant to);
}
