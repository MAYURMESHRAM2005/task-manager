package com.taskflow.socket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tracks connected WebSocket sessions per user and pushes real-time events.
 * Replaces the original Socket.IO server (Node-only) with a plain WebSocket
 * transport that the frontend connects to at {@code /ws}.
 */
@Service
public class SocketService {

    private static final Logger log = LoggerFactory.getLogger(SocketService.class);

    private final ObjectMapper objectMapper;
    private final Map<Long, Set<WebSocketSession>> sessionsByUser = new ConcurrentHashMap<>();

    public SocketService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void register(Long userId, WebSocketSession session) {
        sessionsByUser.computeIfAbsent(userId, key -> ConcurrentHashMap.newKeySet()).add(session);
    }

    public void unregister(Long userId, WebSocketSession session) {
        Set<WebSocketSession> sessions = sessionsByUser.get(userId);
        if (sessions != null) {
            sessions.remove(session);
            if (sessions.isEmpty()) {
                sessionsByUser.remove(userId);
            }
        }
    }

    /** Push an event to a single user (used for notifications and task updates). */
    public void emitToUser(Long userId, String event, Object data) {
        if (userId == null) {
            return;
        }
        Set<WebSocketSession> sessions = sessionsByUser.get(userId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }
        String payload = serialize(event, data);
        for (WebSocketSession session : sessions) {
            send(session, payload);
        }
    }

    /** Broadcast an event to every connected client. */
    public void broadcast(String event, Object data) {
        String payload = serialize(event, data);
        sessionsByUser.values().forEach(sessions -> sessions.forEach(session -> send(session, payload)));
    }

    /**
     * Project-scoped events were no-ops in the original app (clients never joined
     * the project room), so this is kept for parity and future room support.
     */
    public void emitToProject(Long projectId, String event, Object data) {
        // no-op for parity with the original room-based implementation
    }

    /** Task-scoped events were no-ops in the original app (clients never joined the task room). */
    public void emitToTask(Long taskId, String event, Object data) {
        broadcast(event, data);
    }

    private String serialize(String event, Object data) {
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("event", event);
        envelope.put("data", data);
        try {
            return objectMapper.writeValueAsString(envelope);
        } catch (Exception ex) {
            log.warn("Failed to serialize socket payload for event {}", event);
            return "{\"event\":\"" + event + "\",\"data\":null}";
        }
    }

    private void send(WebSocketSession session, String payload) {
        try {
            if (session.isOpen()) {
                synchronized (session) {
                    session.sendMessage(new TextMessage(payload));
                }
            }
        } catch (Exception ex) {
            log.debug("Failed to send websocket message: {}", ex.getMessage());
        }
    }
}
