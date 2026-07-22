package com.smartcampus.erp.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import com.smartcampus.erp.infrastructure.security.websocket.StompAuthChannelInterceptor;

import lombok.RequiredArgsConstructor;

/**
 * Wires up STOMP-over-WebSocket messaging for real-time push notifications.
 *
 * <h2>Endpoint</h2>
 * Clients connect to {@code /ws} (with a SockJS fallback for browsers/proxies
 * that block raw WebSocket upgrades).
 *
 * <h2>Destinations</h2>
 * <ul>
 *   <li>{@code /topic/notices} — broadcast channel every connected client
 *       receives (campus-wide notice board updates).</li>
 *   <li>{@code /user/queue/notifications} — per-user private channel. Spring
 *       resolves the {@code /user} prefix against the authenticated
 *       STOMP principal set by {@link StompAuthChannelInterceptor}, so a
 *       message sent to "jane@campus.edu" only reaches Jane's own session.</li>
 * </ul>
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompAuthChannelInterceptor stompAuthChannelInterceptor;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // In-memory broker — sufficient for a single-instance deployment.
        // Swap for a STOMP relay (RabbitMQ) if this ever runs multi-instance.
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompAuthChannelInterceptor);
    }
}