package com.example.backend.k8s.deployment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DeploymentServiceTest {

    @Mock
    private DeploymentRepository deploymentRepository;

    private DeploymentService deploymentService;

    @BeforeEach
    void setUp() {
        deploymentService = new DeploymentService(deploymentRepository);
    }

    @Test
    void save_createsNewEntityWhenNoneExists() {
        when(deploymentRepository.findByDeploymentNameAndNamespace("dep-1", "default"))
                .thenReturn(Optional.empty());
        when(deploymentRepository.save(any(DeploymentEntity.class))).thenAnswer(invocation -> {
            DeploymentEntity e = invocation.getArgument(0);
            e.setId(42L);
            return e;
        });

        DeploymentDTO dto = new DeploymentDTO();
        dto.setDeploymentName("dep-1");
        dto.setNamespace("default");
        dto.setReplicas(3);
        dto.setAvailableReplicas(3);

        DeploymentEntity result = deploymentService.save(dto);

        assertThat(result.getId()).isEqualTo(42L);
        assertThat(result.getDeploymentName()).isEqualTo("dep-1");
        assertThat(result.getReplicas()).isEqualTo(3);
        assertThat(result.getTimestamp()).isNotNull();
    }

    @Test
    void save_updatesExistingEntityInPlace() {
        DeploymentEntity existing = new DeploymentEntity();
        existing.setId(7L);
        existing.setDeploymentName("dep-1");
        existing.setNamespace("default");
        existing.setReplicas(3);
        existing.setAvailableReplicas(1);

        when(deploymentRepository.findByDeploymentNameAndNamespace("dep-1", "default"))
                .thenReturn(Optional.of(existing));
        when(deploymentRepository.save(any(DeploymentEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DeploymentDTO dto = new DeploymentDTO();
        dto.setDeploymentName("dep-1");
        dto.setNamespace("default");
        dto.setReplicas(3);
        dto.setAvailableReplicas(3);

        DeploymentEntity result = deploymentService.save(dto);

        ArgumentCaptor<DeploymentEntity> captor = ArgumentCaptor.forClass(DeploymentEntity.class);
        verify(deploymentRepository).save(captor.capture());

        assertThat(captor.getValue().getId()).isEqualTo(7L);
        assertThat(result.getId()).isEqualTo(7L);
        assertThat(result.getAvailableReplicas()).isEqualTo(3);
    }
}
