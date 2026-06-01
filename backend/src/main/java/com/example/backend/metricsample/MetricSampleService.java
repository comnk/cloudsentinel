package com.example.backend.metricsample;

import java.util.List;
import java.util.Optional;

import com.example.backend.kafka.KafkaConsumerService;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class MetricSampleService {
    private final MetricSampleRepository metricSampleRepository;
    private final RedisTemplate<String, MetricSampleEntity> redisTemplate;

    public MetricSampleService(MetricSampleRepository metricSampleRepository,
                               RedisTemplate<String, MetricSampleEntity> redisTemplate) {
        this.metricSampleRepository = metricSampleRepository;
        this.redisTemplate = redisTemplate;
    }

    public Optional<MetricSampleEntity> getLatestMetric() {
        MetricSampleEntity cached = redisTemplate.opsForValue().get(KafkaConsumerService.LATEST_METRIC_KEY);
        if (cached != null) return Optional.of(cached);
        return metricSampleRepository.findTopByOrderByTimestampDesc();
    }

    public List<MetricSampleEntity> getMetricHistory() {
        return metricSampleRepository.findAllByOrderByTimestampDesc();
    }
}
