package com.example.backend.investigation;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.example.backend.anomaly.AnomalyEntity;
import com.example.backend.k8s.deployment.DeploymentEntity;
import com.example.backend.k8s.deployment.DeploymentRepository;
import com.example.backend.k8s.event.ClusterEventEntity;
import com.example.backend.k8s.event.ClusterEventRepository;
import com.example.backend.metricsample.MetricSampleEntity;
import com.example.backend.metricsample.MetricSampleRepository;

@Service
public class IncidentCorrelationService {

    private static final int LOOKBACK_MINUTES = 10;
    private static final double METRIC_SPIKE_THRESHOLD = 75.0;

    private final MetricSampleRepository metricRepo;
    private final ClusterEventRepository eventRepo;
    private final DeploymentRepository deploymentRepo;
    private final InvestigationEventRepository investigationEventRepo;

    public IncidentCorrelationService(
            MetricSampleRepository metricRepo,
            ClusterEventRepository eventRepo,
            DeploymentRepository deploymentRepo,
            InvestigationEventRepository investigationEventRepo) {
        this.metricRepo = metricRepo;
        this.eventRepo = eventRepo;
        this.deploymentRepo = deploymentRepo;
        this.investigationEventRepo = investigationEventRepo;
    }

    public void correlate(UUID investigationId, AnomalyEntity anomaly) {
        Instant anomalyTime = anomaly.getTimestamp();
        Instant windowStart = anomalyTime.minusSeconds(LOOKBACK_MINUTES * 60L);

        correlateMetrics(investigationId, anomaly.getHost(), windowStart, anomalyTime);
        correlateDeployments(investigationId, windowStart, anomalyTime);
        correlateK8sEvents(investigationId, windowStart, anomalyTime);
    }

    private void correlateMetrics(UUID invId, String host, Instant from, Instant to) {
        if (host == null || host.isBlank()) return;

        List<MetricSampleEntity> samples = metricRepo.findByHostAndTimestampBetween(host, from, to);
        if (samples.isEmpty()) return;

        MetricSampleEntity firstSpike = null;
        for (MetricSampleEntity s : samples) {
            boolean spiking = (s.getCpuUsage() != null && s.getCpuUsage() >= METRIC_SPIKE_THRESHOLD)
                    || (s.getMemoryUsage() != null && s.getMemoryUsage() >= METRIC_SPIKE_THRESHOLD);
            if (spiking && firstSpike == null) {
                firstSpike = s;
            }
        }

        MetricSampleEntity last = samples.get(samples.size() - 1);
        String peakDesc = buildMetricDesc(last);

        if (firstSpike != null) {
            save(invId, firstSpike.getTimestamp(), "METRIC_SPIKE",
                    "Metrics began spiking on " + host + ": " + buildMetricDesc(firstSpike));
        }

        if (firstSpike == null || !last.getTimestamp().equals(firstSpike.getTimestamp())) {
            save(invId, last.getTimestamp(), "METRIC_READING",
                    "Last metric reading before anomaly on " + host + ": " + peakDesc);
        }
    }

    private void correlateDeployments(UUID invId, Instant from, Instant to) {
        List<DeploymentEntity> deployments = deploymentRepo.findByTimestampBetween(from, to);
        for (DeploymentEntity d : deployments) {
            String desc = String.format("Deployment %s/%s updated — replicas: %d available / %d desired",
                    d.getNamespace(), d.getDeploymentName(),
                    d.getAvailableReplicas() != null ? d.getAvailableReplicas() : 0,
                    d.getReplicas() != null ? d.getReplicas() : 0);
            save(invId, d.getTimestamp(), "DEPLOYMENT_CHANGE", desc);
        }
    }

    private void correlateK8sEvents(UUID invId, Instant from, Instant to) {
        List<ClusterEventEntity> events = eventRepo.findByTimestampBetween(from, to);
        for (ClusterEventEntity e : events) {
            String desc = e.getReason() + " on " + e.getResource()
                    + (e.getMessage() != null ? ": " + truncate(e.getMessage(), 120) : "");
            save(invId, e.getTimestamp(), "K8S_EVENT", desc);
        }
    }

    private void save(UUID invId, Instant timestamp, String eventType, String description) {
        InvestigationEventEntity e = new InvestigationEventEntity();
        e.setInvestigationId(invId);
        e.setEventType(eventType);
        e.setDescription(description);
        e.setTimestamp(timestamp);
        investigationEventRepo.save(e);
    }

    private String buildMetricDesc(MetricSampleEntity s) {
        return String.format("CPU %.1f%% | Mem %.1f%% | Disk %.1f%%",
                orZero(s.getCpuUsage()), orZero(s.getMemoryUsage()), orZero(s.getDiskUsage()));
    }

    private double orZero(Double v) {
        return v != null ? v : 0.0;
    }

    private String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
