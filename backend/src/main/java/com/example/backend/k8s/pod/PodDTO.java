package com.example.backend.k8s.pod;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class PodDTO {
    private String type;

    @JsonProperty("pod")
    private String podName;

    private String namespace;
    private String status;
    private String node;
    private int restarts;
}
