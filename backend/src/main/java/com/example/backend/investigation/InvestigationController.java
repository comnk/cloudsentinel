package com.example.backend.investigation;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/investigations")
public class InvestigationController {

    private final InvestigationService investigationService;

    public InvestigationController(InvestigationService investigationService) {
        this.investigationService = investigationService;
    }

    @GetMapping
    public ResponseEntity<List<InvestigationEntity>> getAll() {
        return ResponseEntity.ok(investigationService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvestigationDetailResponse> getDetail(@PathVariable UUID id) {
        return ResponseEntity.ok(investigationService.getDetail(id));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<InvestigationEntity> updateStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        InvestigationStatus status = InvestigationStatus.valueOf(body.get("status"));
        return ResponseEntity.ok(investigationService.updateStatus(id, status));
    }

    @PatchMapping("/{id}/findings")
    public ResponseEntity<InvestigationEntity> updateFindings(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        String rootCause = body.get("rootCause");
        String confidenceStr = body.get("confidence");
        Double confidence = confidenceStr != null ? Double.parseDouble(confidenceStr) : null;
        String summary = body.get("summary");
        return ResponseEntity.ok(investigationService.updateFindings(id, rootCause, confidence, summary));
    }
}
