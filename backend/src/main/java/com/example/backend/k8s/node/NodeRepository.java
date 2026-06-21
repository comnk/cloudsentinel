package com.example.backend.k8s.node;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface NodeRepository extends JpaRepository<NodeEntity, Long> {
    Optional<NodeEntity> findByNodeName(String nodeName);
}
