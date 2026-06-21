package com.example.backend.simulation;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

import org.springframework.beans.factory.annotation.Value;
import com.fasterxml.jackson.databind.JsonNode;

@RestController
@RequestMapping("/simulations")
public class SimulationController {

    private final RestClient restClient;

    public SimulationController(@Value("${agent.service.url:http://localhost:8000}") String agentUrl) {
        this.restClient = RestClient.builder().baseUrl(agentUrl).build();
    }

    @GetMapping("/scenarios")
    public ResponseEntity<JsonNode> getScenarios() {
        JsonNode result = restClient.get()
                .uri("/simulations/scenarios")
                .retrieve()
                .body(JsonNode.class);
        return ResponseEntity.ok(result);
    }

    @GetMapping
    public ResponseEntity<JsonNode> listSimulations() {
        JsonNode result = restClient.get()
                .uri("/simulations")
                .retrieve()
                .body(JsonNode.class);
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<JsonNode> startSimulation(@RequestBody Map<String, String> body) {
        JsonNode result = restClient.post()
                .uri("/simulations")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping("/{runId}")
    public ResponseEntity<JsonNode> getSimulation(@PathVariable String runId) {
        JsonNode result = restClient.get()
                .uri("/simulations/" + runId)
                .retrieve()
                .body(JsonNode.class);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{runId}")
    public ResponseEntity<JsonNode> stopSimulation(@PathVariable String runId) {
        JsonNode result = restClient.delete()
                .uri("/simulations/" + runId)
                .retrieve()
                .body(JsonNode.class);
        return ResponseEntity.ok(result);
    }
}
