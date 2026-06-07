package com.example.backend.k8s.deployment;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class DeploymentDTO {
    private String type;

    @JsonProperty("deployment")
    private String deploymentName;

    private String namespace;
    private Integer replicas;

    @JsonProperty("available_replicas")
    private Integer availableReplicas;
}
