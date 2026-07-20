package com.example.backend.kafka;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.ValueOperations;

import com.example.backend.anomaly.AnomalyEntity;
import com.example.backend.anomaly.AnomalyRepository;
import com.example.backend.investigation.AgentTriggerService;
import com.example.backend.investigation.InvestigationEntity;
import com.example.backend.investigation.InvestigationService;
import com.example.backend.k8s.deployment.DeploymentDTO;
import com.example.backend.k8s.deployment.DeploymentEntity;
import com.example.backend.k8s.deployment.DeploymentService;
import com.example.backend.k8s.event.ClusterEventDTO;
import com.example.backend.k8s.event.ClusterEventEntity;
import com.example.backend.k8s.event.ClusterEventService;
import com.example.backend.k8s.node.NodeDTO;
import com.example.backend.k8s.node.NodeService;
import com.example.backend.k8s.pod.PodDTO;
import com.example.backend.k8s.pod.PodEntity;
import com.example.backend.k8s.pod.PodService;
import com.example.backend.metricsample.MetricSampleEntity;
import com.example.backend.metricsample.MetricSampleRepository;
import com.example.backend.websocket.WebSocketBroadcastService;

@ExtendWith(MockitoExtension.class)
class KafkaConsumerServiceTest {

    @Mock
    private MetricSampleRepository metricSampleRepository;
    @Mock
    private AnomalyRepository anomalyRepository;
    @Mock
    private InvestigationService investigationService;
    @Mock
    private AgentTriggerService agentTriggerService;
    @Mock
    private PodService podService;
    @Mock
    private ClusterEventService clusterEventService;
    @Mock
    private DeploymentService deploymentService;
    @Mock
    private NodeService nodeService;
    @Mock
    private org.springframework.data.redis.core.RedisTemplate<String, MetricSampleEntity> redisTemplate;
    @Mock
    private ValueOperations<String, MetricSampleEntity> valueOperations;
    @Mock
    private WebSocketBroadcastService broadcastService;

    private KafkaConsumerService service;

    @BeforeEach
    void setUp() {
        service = new KafkaConsumerService(metricSampleRepository, anomalyRepository, investigationService,
                agentTriggerService, podService, clusterEventService, deploymentService, nodeService, redisTemplate,
                broadcastService);
    }

    @Test
    void consumeRawMetrics_savesCachesAndBroadcasts() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        MetricSampleEntity saved = new MetricSampleEntity();
        saved.setId(1L);
        when(metricSampleRepository.save(any(MetricSampleEntity.class))).thenReturn(saved);

        String message = """
                {"timestamp":"2026-01-01T00:00:00Z","host":"laptop-1","cpuUsage":47.2,"memoryUsage":62.8,"diskUsage":51.4}
                """;

        service.consumeRawMetrics(message);

        ArgumentCaptor<MetricSampleEntity> captor = ArgumentCaptor.forClass(MetricSampleEntity.class);
        verify(metricSampleRepository).save(captor.capture());
        MetricSampleEntity toSave = captor.getValue();
        assertThat(toSave.getHost()).isEqualTo("laptop-1");
        assertThat(toSave.getCpuUsage()).isEqualTo(47.2);
        assertThat(toSave.getMemoryUsage()).isEqualTo(62.8);
        assertThat(toSave.getDiskUsage()).isEqualTo(51.4);

        verify(valueOperations).set(KafkaConsumerService.LATEST_METRIC_KEY, saved);
        verify(broadcastService).broadcast("/topic/metrics", saved);
    }

    @Test
    void consumeRawMetrics_malformedMessage_doesNotThrowOrTouchDependencies() {
        service.consumeRawMetrics("not-json");

        verify(metricSampleRepository, never()).save(any());
        verify(broadcastService, never()).broadcast(anyString(), any());
        verifyNoInteractions(redisTemplate);
    }

    @Test
    void consumePodStatus_savesAndBroadcastsToPodsTopic() {
        PodEntity saved = new PodEntity();
        saved.setId(1L);
        when(podService.save(any(PodDTO.class))).thenReturn(saved);

        String message = """
                {"type":"pod","pod":"pod-1","namespace":"default","status":"Running","node":"node-1","restarts":0}
                """;

        service.consumePodStatus(message);

        ArgumentCaptor<PodDTO> captor = ArgumentCaptor.forClass(PodDTO.class);
        verify(podService).save(captor.capture());
        assertThat(captor.getValue().getPodName()).isEqualTo("pod-1");
        assertThat(captor.getValue().getNamespace()).isEqualTo("default");
        assertThat(captor.getValue().getStatus()).isEqualTo("Running");

        verify(broadcastService).broadcast("/topic/pods", saved);
    }

    @Test
    void consumePodStatus_malformedMessage_doesNotThrowOrTouchDependencies() {
        service.consumePodStatus("not-json");

        verify(podService, never()).save(any());
        verify(broadcastService, never()).broadcast(eq("/topic/pods"), any());
    }

    @Test
    void consumeClusterEvent_savesAndBroadcastsToEventsTopic() {
        ClusterEventEntity saved = new ClusterEventEntity();
        saved.setId(1L);
        when(clusterEventService.save(any(ClusterEventDTO.class))).thenReturn(saved);

        String message = """
                {"type":"event","reason":"BackOff","message":"container restarting","namespace":"default","resource":"pod/x","timestamp":"2026-01-01T00:00:00Z"}
                """;

        service.consumeClusterEvent(message);

        ArgumentCaptor<ClusterEventDTO> captor = ArgumentCaptor.forClass(ClusterEventDTO.class);
        verify(clusterEventService).save(captor.capture());
        assertThat(captor.getValue().getReason()).isEqualTo("BackOff");
        assertThat(captor.getValue().getResource()).isEqualTo("pod/x");

        verify(broadcastService).broadcast("/topic/events", saved);
    }

    @Test
    void consumeDeploymentEvent_savesAndBroadcastsToDeploymentsTopic() {
        DeploymentEntity saved = new DeploymentEntity();
        saved.setId(1L);
        when(deploymentService.save(any(DeploymentDTO.class))).thenReturn(saved);

        String message = """
                {"type":"deployment","deployment":"dep-1","namespace":"default","replicas":3,"available_replicas":2}
                """;

        service.consumeDeploymentEvent(message);

        ArgumentCaptor<DeploymentDTO> captor = ArgumentCaptor.forClass(DeploymentDTO.class);
        verify(deploymentService).save(captor.capture());
        assertThat(captor.getValue().getDeploymentName()).isEqualTo("dep-1");
        assertThat(captor.getValue().getReplicas()).isEqualTo(3);
        assertThat(captor.getValue().getAvailableReplicas()).isEqualTo(2);

        verify(broadcastService).broadcast("/topic/deployments", saved);
    }

    @Test
    void consumeDeploymentEvent_malformedMessage_doesNotThrowOrTouchDependencies() {
        service.consumeDeploymentEvent("not-json");

        verify(deploymentService, never()).save(any());
        verify(broadcastService, never()).broadcast(eq("/topic/deployments"), any());
    }

    @Test
    void consumeNodeStatus_savesButDoesNotBroadcast() {
        String message = """
                {"type":"node","node":"node-1","status":"Ready"}
                """;

        service.consumeNodeStatus(message);

        ArgumentCaptor<NodeDTO> captor = ArgumentCaptor.forClass(NodeDTO.class);
        verify(nodeService).save(captor.capture());
        assertThat(captor.getValue().getNodeName()).isEqualTo("node-1");
        assertThat(captor.getValue().getStatus()).isEqualTo("Ready");

        verifyNoInteractions(broadcastService);
    }

    @Test
    void consumeDetectedAnomalies_savesJoinsExplanationBroadcastsAndOpensInvestigation() {
        AnomalyEntity savedAnomaly = new AnomalyEntity();
        savedAnomaly.setId(1L);
        when(anomalyRepository.save(any(AnomalyEntity.class))).thenReturn(savedAnomaly);

        InvestigationEntity investigation = new InvestigationEntity();
        when(investigationService.createFromAnomaly(any(AnomalyEntity.class))).thenReturn(investigation);

        String message = """
                {"timestamp":"2026-01-01T00:00:00Z","host":"laptop-1","type":"HIGH_CPU","severity":"CRITICAL","score":0.97,"message":"CPU spike","explanation":["cpu high","load high"]}
                """;

        service.consumeDetectedAnomalies(message);

        ArgumentCaptor<AnomalyEntity> captor = ArgumentCaptor.forClass(AnomalyEntity.class);
        verify(anomalyRepository).save(captor.capture());
        AnomalyEntity toSave = captor.getValue();
        assertThat(toSave.getType()).isEqualTo("HIGH_CPU");
        assertThat(toSave.getSeverity()).isEqualTo("CRITICAL");
        assertThat(toSave.getExplanation()).isEqualTo("cpu high | load high");

        verify(broadcastService).broadcast("/topic/anomalies", savedAnomaly);
        verify(investigationService).createFromAnomaly(toSave);
        verify(agentTriggerService).triggerInvestigation(investigation, toSave);
    }

    @Test
    void consumeDetectedAnomalies_malformedMessage_doesNotThrowOrOpenInvestigation() {
        service.consumeDetectedAnomalies("not-json");

        verify(anomalyRepository, never()).save(any());
        verifyNoInteractions(investigationService, agentTriggerService);
        verify(broadcastService, never()).broadcast(eq("/topic/anomalies"), any());
    }
}
