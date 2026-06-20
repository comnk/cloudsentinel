package com.example.backend.investigation;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "investigations")
@Data
@NoArgsConstructor
public class InvestigationEntity {
    @Id
    @GeneratedValue
    private UUID id;

    private Long anomalyId;

    @Enumerated(EnumType.STRING)
    private InvestigationStatus status;

    private String severity;

    private Instant createdAt;

    private Instant updatedAt;

    private String summary;

    private String rootCause;

    private Double confidence;
}
