package com.example.backend.kafka;

import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class KafkaControllerTest {

    @Mock
    private KafkaProducerService kafkaProducerService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new KafkaController(kafkaProducerService)).build();
    }

    @Test
    void sendRawLogs_forwardsMessageToProducerAndReturnsConfirmation() throws Exception {
        mockMvc.perform(get("/send-raw-logs").param("message", "hello"))
                .andExpect(status().isOk())
                .andExpect(content().string("Message sent to Kafka: hello"));

        verify(kafkaProducerService).sendRawLogs("hello");
    }
}
