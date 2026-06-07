package com.example.backend.k8s.node;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class NodeService {
    private final NodeRepository nodeRepository;

    public NodeService(NodeRepository nodeRepository) {
        this.nodeRepository = nodeRepository;
    }

    public void save(NodeDTO dto) {
        NodeEntity entity = new NodeEntity();
        entity.setNodeName(dto.getNodeName());
        entity.setStatus(dto.getStatus());
        entity.setTimestamp(Instant.now());
        nodeRepository.save(entity);
    }

    public List<NodeEntity> getAll() {
        return nodeRepository.findAll();
    }
}
