package com.example.backend.investigation;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface InvestigationEventRepository extends JpaRepository<InvestigationEventEntity, UUID> {
    List<InvestigationEventEntity> findByInvestigationIdOrderByTimestampAsc(UUID investigationId);
}
