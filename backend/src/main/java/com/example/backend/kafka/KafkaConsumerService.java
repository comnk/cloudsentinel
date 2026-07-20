package com.example.backend.kafka;

import com.example.backend.metricsample.MetricSampleDTO;
import com.example.backend.metricsample.MetricSampleEntity;
import com.example.backend.metricsample.MetricSampleRepository;

import com.example.backend.anomaly.AnomalyDTO;
import com.example.backend.anomaly.AnomalyEntity;
import com.example.backend.anomaly.AnomalyRepository;
import com.example.backend.investigation.AgentTriggerService;
import com.example.backend.investigation.InvestigationEntity;
import com.example.backend.investigation.InvestigationService;
import com.example.backend.k8s.pod.PodDTO;
import com.example.backend.k8s.pod.PodEntity;
import com.example.backend.k8s.pod.PodService;
import com.example.backend.k8s.event.ClusterEventDTO;
import com.example.backend.k8s.event.ClusterEventEntity;
import com.example.backend.k8s.event.ClusterEventService;
import com.example.backend.k8s.deployment.DeploymentDTO;
import com.example.backend.k8s.deployment.DeploymentEntity;
import com.example.backend.k8s.deployment.DeploymentService;
import com.example.backend.k8s.node.NodeDTO;
import com.example.backend.k8s.node.NodeService;
import com.example.backend.websocket.WebSocketBroadcastService;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class KafkaConsumerService {

    public static final String LATEST_METRIC_KEY = "metric:latest";

    private static final Logger log = LoggerFactory.getLogger(KafkaConsumerService.class);
    private final MetricSampleRepository metricSampleRepository;
    private final AnomalyRepository anomalyRepository;
    private final InvestigationService investigationService;
    private final AgentTriggerService agentTriggerService;
    private final PodService podService;
    private final ClusterEventService clusterEventService;
    private final DeploymentService deploymentService;
    private final NodeService nodeService;
    private final RedisTemplate<String, MetricSampleEntity> redisTemplate;
    private final WebSocketBroadcastService broadcastService;
    private final ObjectMapper objectMapper;

    public KafkaConsumerService(MetricSampleRepository metricSampleRepository,
            AnomalyRepository anomalyRepository,
            InvestigationService investigationService,
            AgentTriggerService agentTriggerService,
            PodService podService,
            ClusterEventService clusterEventService,
            DeploymentService deploymentService,
            NodeService nodeService,
            RedisTemplate<String, MetricSampleEntity> redisTemplate,
            WebSocketBroadcastService broadcastService) {
        this.metricSampleRepository = metricSampleRepository;
        this.anomalyRepository = anomalyRepository;
        this.investigationService = investigationService;
        this.agentTriggerService = agentTriggerService;
        this.podService = podService;
        this.clusterEventService = clusterEventService;
        this.deploymentService = deploymentService;
        this.nodeService = nodeService;
        this.redisTemplate = redisTemplate;
        this.broadcastService = broadcastService;
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    @KafkaListener(topics = "metrics.raw", groupId = "backend-group")
    public void consumeRawMetrics(String message) {
        try {
            MetricSampleDTO dto = objectMapper.readValue(message, MetricSampleDTO.class);
            MetricSampleEntity entity = new MetricSampleEntity();
            entity.setTimestamp(dto.getTimestamp());
            entity.setHost(dto.getHost());
            entity.setCpuUsage(dto.getCpuUsage());
            entity.setMemoryUsage(dto.getMemoryUsage());
            entity.setDiskUsage(dto.getDiskUsage());
            MetricSampleEntity saved = metricSampleRepository.save(entity);
            redisTemplate.opsForValue().set(LATEST_METRIC_KEY, saved);
            broadcastService.broadcast("/topic/metrics", saved);
            log.info("Saved metric: host={} cpu={}", dto.getHost(), dto.getCpuUsage());
        } catch (Exception e) {
            log.error("Failed to process metric event", e);
        }
    }

    @KafkaListener(topics = "k8s.pods", groupId = "backend-group")
    public void consumePodStatus(String message) {
        try {
            PodDTO dto = objectMapper.readValue(message, PodDTO.class);
            PodEntity saved = podService.save(dto);
            broadcastService.broadcast("/topic/pods", saved);
            log.info("Saved pod: name={} namespace={} status={}", dto.getPodName(), dto.getNamespace(),
                    dto.getStatus());
        } catch (Exception e) {
            log.error("Failed to process pod event: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "k8s.events", groupId = "backend-group")
    public void consumeClusterEvent(String message) {
        try {
            ClusterEventDTO dto = objectMapper.readValue(message, ClusterEventDTO.class);
            ClusterEventEntity saved = clusterEventService.save(dto);
            broadcastService.broadcast("/topic/events", saved);
            log.info("Saved cluster event: reason={} resource={}", dto.getReason(), dto.getResource());
        } catch (Exception e) {
            log.error("Failed to process cluster event: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "k8s.deployments", groupId = "backend-group")
    public void consumeDeploymentEvent(String message) {
        try {
            DeploymentDTO dto = objectMapper.readValue(message, DeploymentDTO.class);
            DeploymentEntity saved = deploymentService.save(dto);
            broadcastService.broadcast("/topic/deployments", saved);
            log.info("Saved deployment: name={} namespace={} replicas={}", dto.getDeploymentName(), dto.getNamespace(),
                    dto.getReplicas());
        } catch (Exception e) {
            log.error("Failed to process deployment event: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "k8s.nodes", groupId = "backend-group")
    public void consumeNodeStatus(String message) {
        try {
            NodeDTO dto = objectMapper.readValue(message, NodeDTO.class);
            nodeService.save(dto);
            log.info("Saved node: name={} status={}", dto.getNodeName(), dto.getStatus());
        } catch (Exception e) {
            log.error("Failed to process node event: {}", e.getMessage());
        }
    }

    @Transactional
    @KafkaListener(topics = "anomalies.detected", groupId = "backend-group")
    public void consumeDetectedAnomalies(String message) {
        try {
            AnomalyDTO dto = objectMapper.readValue(message, AnomalyDTO.class);
            AnomalyEntity entity = new AnomalyEntity();
            entity.setTimestamp(dto.getTimestamp());
            entity.setHost(dto.getHost());
            entity.setType(dto.getType());
            entity.setSeverity(dto.getSeverity());
            entity.setScore(dto.getScore());
            entity.setMessage(dto.getMessage());
            if (dto.getExplanation() != null && !dto.getExplanation().isEmpty()) {
                entity.setExplanation(String.join(" | ", dto.getExplanation()));
            }
            AnomalyEntity savedAnomaly = anomalyRepository.save(entity);
            broadcastService.broadcast("/topic/anomalies", savedAnomaly);
            InvestigationEntity inv = investigationService.createFromAnomaly(entity);
            agentTriggerService.triggerInvestigation(inv, entity);
            log.info("Saved anomaly and opened investigation: type={} severity={}", dto.getType(), dto.getSeverity());
        } catch (Exception e) {
            log.error("Failed to process anomaly event: {}", e.getMessage());
        }
    }
}
