package com.example.backend.investigation;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface InvestigationRepository extends JpaRepository<InvestigationEntity, UUID> {
}
