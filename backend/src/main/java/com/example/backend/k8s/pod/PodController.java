package com.example.backend.k8s.pod;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/k8s/pods")
public class PodController {
    private final PodService podService;

    public PodController(PodService podService) {
        this.podService = podService;
    }

    @GetMapping
    public ResponseEntity<List<PodEntity>> getPods() {
        return ResponseEntity.ok(podService.getAll());
    }
}
