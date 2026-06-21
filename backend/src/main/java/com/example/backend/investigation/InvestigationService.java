package com.example.backend.investigation;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.example.backend.anomaly.AnomalyEntity;
import com.example.backend.websocket.WebSocketBroadcastService;

@Service
public class InvestigationService {

    private final InvestigationRepository investigationRepository;
    private final InvestigationEventRepository eventRepository;
    private final InvestigationEvidenceRepository evidenceRepository;
    private final WebSocketBroadcastService broadcastService;

    public InvestigationService(InvestigationRepository investigationRepository,
            InvestigationEventRepository eventRepository,
            InvestigationEvidenceRepository evidenceRepository,
            WebSocketBroadcastService broadcastService) {
        this.investigationRepository = investigationRepository;
        this.eventRepository = eventRepository;
        this.evidenceRepository = evidenceRepository;
        this.broadcastService = broadcastService;
    }

    public List<InvestigationEntity> getAll() {
        return investigationRepository.findAll();
    }

    public InvestigationDetailResponse getDetail(UUID id) {
        InvestigationEntity inv = investigationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Investigation not found: " + id));
        List<InvestigationEventEntity> timeline = eventRepository
                .findByInvestigationIdOrderByTimestampAsc(id);
        List<InvestigationEvidenceEntity> evidence = evidenceRepository
                .findByInvestigationId(id);
        return new InvestigationDetailResponse(inv, timeline, evidence);
    }

    public InvestigationEntity updateStatus(UUID id, InvestigationStatus status) {
        InvestigationEntity inv = investigationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Investigation not found: " + id));
        inv.setStatus(status);
        inv.setUpdatedAt(Instant.now());
        InvestigationEntity saved = investigationRepository.save(inv);
        broadcastService.broadcast("/topic/investigations/" + id, getDetail(id));
        broadcastService.broadcast("/topic/investigations", saved);
        return saved;
    }

    public InvestigationEntity updateFindings(UUID id, String rootCause, Double confidence, String summary) {
        InvestigationEntity inv = investigationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Investigation not found: " + id));
        inv.setRootCause(rootCause);
        inv.setConfidence(confidence);
        if (summary != null) inv.setSummary(summary);
        inv.setStatus(InvestigationStatus.RESOLVED);
        inv.setUpdatedAt(Instant.now());
        InvestigationEntity saved = investigationRepository.save(inv);
        broadcastService.broadcast("/topic/investigations/" + id, getDetail(id));
        broadcastService.broadcast("/topic/investigations", saved);
        return saved;
    }

    public InvestigationEntity createFromAnomaly(AnomalyEntity anomaly) {
        Instant now = Instant.now();

        InvestigationEntity inv = new InvestigationEntity();
        inv.setAnomalyId(anomaly.getId());
        inv.setStatus(InvestigationStatus.OPEN);
        inv.setSeverity(anomaly.getSeverity());
        inv.setSummary(anomaly.getMessage());
        inv.setCreatedAt(now);
        inv.setUpdatedAt(now);
        investigationRepository.save(inv);
        broadcastService.broadcast("/topic/investigations", inv);

        UUID invId = inv.getId();

        addEvidence(invId, "ANOMALY_TYPE", "Anomaly type: " + anomaly.getType());
        addEvidence(invId, "ANOMALY_SCORE", "Anomaly score: " + anomaly.getScore());
        if (anomaly.getExplanation() != null && !anomaly.getExplanation().isBlank()) {
            for (String factor : anomaly.getExplanation().split(" \\| ")) {
                addEvidence(invId, "METRIC_DEVIATION", factor);
            }
        }

        addTimelineEvent(invId, now, "ANOMALY_DETECTED",
                "Anomaly detected: " + anomaly.getType() + " on " + anomaly.getHost());
        addTimelineEvent(invId, now, "INVESTIGATION_OPENED",
                "Investigation automatically opened (severity=" + anomaly.getSeverity() + ")");
        addTimelineEvent(invId, now, "EVIDENCE_ATTACHED",
                "Initial evidence attached from anomaly data");

        return inv;
    }

    private void addEvidence(UUID invId, String type, String content) {
        InvestigationEvidenceEntity e = new InvestigationEvidenceEntity();
        e.setInvestigationId(invId);
        e.setEvidenceType(type);
        e.setContent(content);
        evidenceRepository.save(e);
    }

    private void addTimelineEvent(UUID invId, Instant timestamp, String eventType, String description) {
        InvestigationEventEntity e = new InvestigationEventEntity();
        e.setInvestigationId(invId);
        e.setEventType(eventType);
        e.setDescription(description);
        e.setTimestamp(timestamp);
        eventRepository.save(e);
    }
}
