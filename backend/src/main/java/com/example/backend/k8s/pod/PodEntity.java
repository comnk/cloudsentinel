package com.example.backend.k8s.pod;

import java.time.Instant;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "pods")
@Data
@NoArgsConstructor
public class PodEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String podName;
    private String namespace;
    private String status;
    private String node;
    private int restarts;
    private Instant timestamp;
}
