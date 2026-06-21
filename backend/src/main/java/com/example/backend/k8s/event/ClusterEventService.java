package com.example.backend.k8s.event;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class ClusterEventService {
    private final ClusterEventRepository clusterEventRepository;

    public ClusterEventService(ClusterEventRepository clusterEventRepository) {
        this.clusterEventRepository = clusterEventRepository;
    }

    public ClusterEventEntity save(ClusterEventDTO dto) {
        ClusterEventEntity entity = new ClusterEventEntity();
        entity.setReason(dto.getReason());
        entity.setMessage(dto.getMessage());
        entity.setNamespace(dto.getNamespace());
        entity.setResource(dto.getResource());
        entity.setTimestamp(dto.getTimestamp() != null ? Instant.parse(dto.getTimestamp()) : Instant.now());
        return clusterEventRepository.save(entity);
    }

    public List<ClusterEventEntity> getAll() {
        return clusterEventRepository.findAllByOrderByTimestampDesc();
    }
}
