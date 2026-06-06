package com.example.backend.investigation;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface InvestigationEvidenceRepository extends JpaRepository<InvestigationEvidenceEntity, UUID> {
    List<InvestigationEvidenceEntity> findByInvestigationId(UUID investigationId);
}
