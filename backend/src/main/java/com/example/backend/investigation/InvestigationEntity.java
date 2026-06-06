package com.example.backend.investigation;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import lombok.Data;

@Entity
@Data
public class InvestigationEntity {
    @Id
    @GeneratedValue
    private UUID id;

    private UUID anomalyId;

    private String status;

    private String severity;

    private Instant createdAt;

    private Instant updatedAt;

    private String summary;
}
