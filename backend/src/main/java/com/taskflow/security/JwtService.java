package com.taskflow.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

/** Issues and verifies access/refresh JWTs (Access: JWT_SECRET, Refresh: JWT_REFRESH_SECRET). */
@Service
public class JwtService {

    private final SecretKey accessKey;
    private final SecretKey refreshKey;
    private final long accessExpirationMs;
    private final long refreshExpirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.refresh-secret}") String refreshSecret,
            @Value("${app.jwt.expiration}") long accessExpirationMs,
            @Value("${app.jwt.refresh-expiration}") long refreshExpirationMs) {
        this.accessKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.refreshKey = Keys.hmacShaKeyFor(refreshSecret.getBytes(StandardCharsets.UTF_8));
        this.accessExpirationMs = accessExpirationMs;
        this.refreshExpirationMs = refreshExpirationMs;
    }

    public String generateAccessToken(Long userId) {
        return build(userId, accessKey, accessExpirationMs, null);
    }

    public String generateRefreshToken(Long userId) {
        return build(userId, refreshKey, refreshExpirationMs, UUID.randomUUID().toString());
    }

    public Long parseAccessToken(String token) throws JwtException {
        return parseUserId(token, accessKey);
    }

    public Long parseRefreshToken(String token) throws JwtException {
        return parseUserId(token, refreshKey);
    }

    public long getRefreshExpirationMs() {
        return refreshExpirationMs;
    }

    public long getAccessExpirationMs() {
        return accessExpirationMs;
    }

    private String build(Long userId, SecretKey key, long ttlMs, String jti) {
        Date now = new Date();
        var builder = Jwts.builder()
                .subject(String.valueOf(userId))
                .issuedAt(now)
                .expiration(new Date(now.getTime() + ttlMs));
        if (jti != null) {
            builder.id(jti);
        }
        return builder.signWith(key).compact();
    }

    private Long parseUserId(String token, SecretKey key) throws JwtException {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return Long.valueOf(claims.getSubject());
    }
}
