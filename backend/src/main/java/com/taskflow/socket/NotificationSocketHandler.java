package com.taskflow.socket;

import com.taskflow.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

/** Authenticates {@code /ws?token=...} connections and registers them per user. */
@Component
public class NotificationSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(NotificationSocketHandler.class);

    private final JwtService jwtService;
    private final SocketService socketService;

    public NotificationSocketHandler(JwtService jwtService, SocketService socketService) {
        this.jwtService = jwtService;
        this.socketService = socketService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        Long userId = resolveUserId(session);
        if (userId == null) {
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Authentication required"));
            return;
        }
        session.getAttributes().put("userId", userId);
        socketService.register(userId, session);
        log.debug("WebSocket connected for user {}", userId);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Object userId = session.getAttributes().get("userId");
        if (userId instanceof Long id) {
            socketService.unregister(id, session);
        }
    }

    private Long resolveUserId(WebSocketSession session) {
        if (session.getUri() == null || session.getUri().getQuery() == null) {
            return null;
        }
        String token = null;
        for (String part : session.getUri().getQuery().split("&")) {
            String[] pair = part.split("=", 2);
            if (pair.length == 2 && "token".equals(pair[0])) {
                token = java.net.URLDecoder.decode(pair[1], java.nio.charset.StandardCharsets.UTF_8);
                break;
            }
        }
        if (token == null || token.isBlank()) {
            return null;
        }
        try {
            return jwtService.parseAccessToken(token);
        } catch (Exception ex) {
            log.debug("Rejected websocket connection: {}", ex.getMessage());
            return null;
        }
    }
}
