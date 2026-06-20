package com.example.backend.investigation;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.example.backend.anomaly.AnomalyEntity;

@Service
public class AgentTriggerService {

    private static final Logger log = LoggerFactory.getLogger(AgentTriggerService.class);

    private final RestClient restClient;

    public AgentTriggerService(@Value("${agent.service.url:http://localhost:8000}") String agentUrl) {
        this.restClient = RestClient.builder().baseUrl(agentUrl).build();
    }

    @Async
    public void triggerInvestigation(InvestigationEntity inv, AnomalyEntity anomaly) {
        try {
            Map<String, Object> body = Map.of(
                    "investigationId", inv.getId().toString(),
                    "anomalyId", anomaly.getId(),
                    "type", anomaly.getType(),
                    "host", anomaly.getHost(),
                    "severity", anomaly.getSeverity());

            restClient.post()
                    .uri("/investigate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();

            log.info("Triggered agent investigation {} for anomaly type={} host={}",
                    inv.getId(), anomaly.getType(), anomaly.getHost());
        } catch (Exception e) {
            log.error("Failed to trigger agent for investigation {}: {}", inv.getId(), e.getMessage());
        }
    }
}
