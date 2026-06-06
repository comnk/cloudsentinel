package com.example.backend.investigation;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "investigation_events")
@Data
@NoArgsConstructor
public class InvestigationEventEntity {

    @Id
    @GeneratedValue
    private UUID id;
    private UUID investigationId;
    private String eventType;
    private String description;
    private Instant timestamp;
}
