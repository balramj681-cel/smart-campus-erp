package com.smartcampus.erp.infrastructure.security.websocket;

import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.smartcampus.erp.infrastructure.security.jwt.JwtService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Authenticates the STOMP {@code CONNECT} frame the same way
 * {@code JwtAuthenticationFilter} authenticates a plain HTTP request — by
 * reading a Bearer JWT and resolving it to a {@link UserDetails} principal.
 *
 * <p>WebSocket handshakes happen once per connection, not once per message,
 * so this can't reuse the HTTP filter directly. Instead, the frontend STOMP
 * client sends the token as a native STOMP header on the initial
 * {@code CONNECT} frame; this interceptor validates it and attaches the
 * resulting principal to the STOMP session. Every subsequent frame on that
 * session (subscribe, send) inherits the same principal — which is what
 * lets {@code SimpMessagingTemplate#convertAndSendToUser(email, ...)}
 * resolve "email" back to the correct live session.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (!StringUtils.hasText(authHeader) || !authHeader.startsWith(BEARER_PREFIX)) {
                log.warn("[WS] CONNECT rejected — missing/invalid Authorization header");
                throw new IllegalArgumentException("Missing or invalid Authorization header on WebSocket CONNECT");
            }

            String token = authHeader.substring(BEARER_PREFIX.length());
            String username = jwtService.extractUsername(token);

            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            if (!jwtService.isTokenValid(token, userDetails)) {
                log.warn("[WS] CONNECT rejected — token failed validation for '{}'", username);
                throw new IllegalArgumentException("Invalid or expired token on WebSocket CONNECT");
            }

            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());
            accessor.setUser(authToken);

            log.debug("[WS] Authenticated STOMP session for principal: '{}'", username);
        }

        return message;
    }
}