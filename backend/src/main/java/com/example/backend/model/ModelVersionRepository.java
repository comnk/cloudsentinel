package com.example.backend.model;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ModelVersionRepository extends JpaRepository<ModelVersionEntity, Long> {
    List<ModelVersionEntity> findAllByOrderByTrainedAtDesc();
}
