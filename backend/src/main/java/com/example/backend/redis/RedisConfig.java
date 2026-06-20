package com.example.backend.redis;

import com.example.backend.metricsample.MetricSampleEntity;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.SerializationException;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, MetricSampleEntity> redisTemplate(RedisConnectionFactory factory) {
        ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
        RedisTemplate<String, MetricSampleEntity> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new RedisSerializer<MetricSampleEntity>() {
            @Override
            public byte[] serialize(MetricSampleEntity t) throws SerializationException {
                if (t == null) return null;
                try {
                    return objectMapper.writeValueAsBytes(t);
                } catch (Exception e) {
                    throw new SerializationException("Serialization error", e);
                }
            }

            @Override
            public MetricSampleEntity deserialize(byte[] bytes) throws SerializationException {
                if (bytes == null) return null;
                try {
                    return objectMapper.readValue(bytes, MetricSampleEntity.class);
                } catch (Exception e) {
                    throw new SerializationException("Deserialization error", e);
                }
            }
        });
        return template;
    }
}
