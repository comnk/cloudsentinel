package com.example.backend.model;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/models")
public class ModelVersionController {
    private final ModelVersionService modelVersionService;

    public ModelVersionController(ModelVersionService modelVersionService) {
        this.modelVersionService = modelVersionService;
    }

    @GetMapping
    public ResponseEntity<List<ModelVersionEntity>> getModelVersions() {
        return ResponseEntity.ok(modelVersionService.getAllVersions());
    }
}
