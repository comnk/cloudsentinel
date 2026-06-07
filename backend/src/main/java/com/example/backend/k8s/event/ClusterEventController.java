package com.example.backend.k8s.event;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/k8s/events")
public class ClusterEventController {
    private final ClusterEventService clusterEventService;

    public ClusterEventController(ClusterEventService clusterEventService) {
        this.clusterEventService = clusterEventService;
    }

    @GetMapping
    public ResponseEntity<List<ClusterEventEntity>> getEvents() {
        return ResponseEntity.ok(clusterEventService.getAll());
    }
}
