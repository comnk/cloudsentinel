package com.example.backend.k8s.node;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class NodeDTO {
    private String type;

    @JsonProperty("node")
    private String nodeName;

    private String status;
}
