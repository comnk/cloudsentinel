package com.example.backend.k8s.pod;

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
class PodServiceTest {

    @Mock
    private PodRepository podRepository;

    private PodService podService;

    @BeforeEach
    void setUp() {
        podService = new PodService(podRepository);
    }

    @Test
    void save_createsNewEntityWhenNoneExists() {
        when(podRepository.findByPodNameAndNamespace("pod-1", "default")).thenReturn(Optional.empty());
        when(podRepository.save(any(PodEntity.class))).thenAnswer(invocation -> {
            PodEntity e = invocation.getArgument(0);
            e.setId(42L);
            return e;
        });

        PodDTO dto = new PodDTO();
        dto.setPodName("pod-1");
        dto.setNamespace("default");
        dto.setStatus("Running");
        dto.setNode("node-1");
        dto.setRestarts(0);

        PodEntity result = podService.save(dto);

        assertThat(result.getId()).isEqualTo(42L);
        assertThat(result.getPodName()).isEqualTo("pod-1");
        assertThat(result.getStatus()).isEqualTo("Running");
        assertThat(result.getTimestamp()).isNotNull();
    }

    @Test
    void save_updatesExistingEntityInPlace() {
        PodEntity existing = new PodEntity();
        existing.setId(7L);
        existing.setPodName("pod-1");
        existing.setNamespace("default");
        existing.setStatus("Pending");
        existing.setRestarts(1);

        when(podRepository.findByPodNameAndNamespace("pod-1", "default")).thenReturn(Optional.of(existing));
        when(podRepository.save(any(PodEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PodDTO dto = new PodDTO();
        dto.setPodName("pod-1");
        dto.setNamespace("default");
        dto.setStatus("Running");
        dto.setNode("node-2");
        dto.setRestarts(2);

        PodEntity result = podService.save(dto);

        ArgumentCaptor<PodEntity> captor = ArgumentCaptor.forClass(PodEntity.class);
        verify(podRepository).save(captor.capture());

        assertThat(captor.getValue().getId()).isEqualTo(7L);
        assertThat(result.getId()).isEqualTo(7L);
        assertThat(result.getStatus()).isEqualTo("Running");
        assertThat(result.getRestarts()).isEqualTo(2);
    }
}
