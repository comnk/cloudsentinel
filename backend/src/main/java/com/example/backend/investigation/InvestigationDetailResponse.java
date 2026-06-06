package com.example.backend.investigation;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class InvestigationDetailResponse {
    private InvestigationEntity investigation;
    private List<InvestigationEventEntity> timeline;
    private List<InvestigationEvidenceEntity> evidence;
}
