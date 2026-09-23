package com.taskflow.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/** Public health/readiness probes (unauthenticated). */
@RestController
@RequestMapping("/api/v1")
public class HealthController {

    private final DataSource dataSource;

    @Value("${app.env:development}")
    private String environment;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", true);
        body.put("status", "ok");
        body.put("service", "taskflow");
        body.put("environment", environment);
        body.put("timestamp", OffsetDateTime.now().toString());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/ready")
    public ResponseEntity<Map<String, Object>> ready() {
        boolean connected = databaseConnected();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", connected);
        body.put("status", connected ? "ready" : "not ready");
        body.put("service", "taskflow");
        body.put("database", connected ? "connected" : "disconnected");
        body.put("timestamp", OffsetDateTime.now().toString());
        return ResponseEntity.status(connected ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }

    private boolean databaseConnected() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.isValid(2);
        } catch (Exception ex) {
            return false;
        }
    }
}
