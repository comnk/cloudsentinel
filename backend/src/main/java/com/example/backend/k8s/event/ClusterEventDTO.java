package com.example.backend.k8s.event;

import lombok.Data;

@Data
public class ClusterEventDTO {
    private String type;
    private String reason;
    private String message;
    private String namespace;
    private String resource;
    private String timestamp;
}
