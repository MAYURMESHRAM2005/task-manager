package com.taskflow.config;

import com.taskflow.socket.NotificationSocketHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.Arrays;

/** Exposes the raw WebSocket endpoint at {@code /ws}. */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final NotificationSocketHandler notificationSocketHandler;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    public WebSocketConfig(NotificationSocketHandler notificationSocketHandler) {
        this.notificationSocketHandler = notificationSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        String[] origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .toArray(String[]::new);
        registry.addHandler(notificationSocketHandler, "/ws").setAllowedOrigins(origins);
    }
}
