package com.example.backend.investigation;

import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "investigation_evidence")
@Data
@NoArgsConstructor
public class InvestigationEvidenceEntity {
    @Id
    @GeneratedValue
    private UUID id;

    private UUID investigationId;

    private String evidenceType;

    private String content;
}
