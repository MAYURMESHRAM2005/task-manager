package com.taskflow.service;

import com.taskflow.dto.request.AuthRequests;
import com.taskflow.dto.response.ServiceResults;
import com.taskflow.entity.RefreshToken;
import com.taskflow.entity.User;
import com.taskflow.entity.enums.Role;
import com.taskflow.exception.ConflictException;
import com.taskflow.exception.ForbiddenException;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.exception.UnauthorizedException;
import com.taskflow.exception.BadRequestException;
import com.taskflow.repository.RefreshTokenRepository;
import com.taskflow.repository.UserRepository;
import com.taskflow.security.JwtService;
import io.jsonwebtoken.JwtException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Locale;

/** Registration, login, refresh-token rotation, logout and password change. */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, RefreshTokenRepository refreshTokenRepository,
                       JwtService jwtService, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public ServiceResults.AuthResult register(AuthRequests.RegisterRequest request, String ip, String userAgent) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("An account with this email already exists.", "EMAIL_EXISTS");
        }

        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(Role.USER);
        user.setActive(true);
        user.setAvatar("");
        userRepository.save(user);

        return issueTokens(user, ip, userAgent);
    }

    @Transactional
    public ServiceResults.AuthResult login(String email, String password, String ip, String userAgent) {
        User user = userRepository.findByEmailIgnoreCase(email == null ? "" : email.trim())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password.", "INVALID_CREDENTIALS"));

        if (!user.isActive()) {
            throw new ForbiddenException("Your account has been deactivated. Contact an administrator.",
                    "ACCOUNT_DEACTIVATED");
        }

        if (user.getPasswordHash() == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password.", "INVALID_CREDENTIALS");
        }

        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        return issueTokens(user, ip, userAgent);
    }

    @Transactional
    public ServiceResults.TokenPair refreshAccessToken(String refreshTokenValue) {
        if (refreshTokenValue == null || refreshTokenValue.isBlank()) {
            throw new BadRequestException("Refresh token is required.", "NO_REFRESH_TOKEN");
        }

        Long userId;
        try {
            userId = jwtService.parseRefreshToken(refreshTokenValue);
        } catch (JwtException | IllegalArgumentException ex) {
            throw new UnauthorizedException("Invalid or expired refresh token.", "INVALID_REFRESH_TOKEN");
        }

        RefreshToken stored = refreshTokenRepository
                .findByTokenAndUserIdAndRevokedFalse(refreshTokenValue, userId)
                .orElseThrow(() -> new UnauthorizedException("Refresh token has been revoked or not found.",
                        "REVOKED_REFRESH_TOKEN"));

        if (stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException("Refresh token has expired.", "EXPIRED_REFRESH_TOKEN");
        }

        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        User user = userRepository.findById(userId)
                .filter(User::isActive)
                .orElseThrow(() -> new UnauthorizedException("User not found or deactivated.", "USER_UNAVAILABLE"));

        String accessToken = jwtService.generateAccessToken(user.getId());
        String newRefreshToken = jwtService.generateRefreshToken(user.getId());
        persistRefreshToken(user, newRefreshToken, null, null);

        return new ServiceResults.TokenPair(accessToken, newRefreshToken);
    }

    @Transactional
    public String logout(String refreshTokenValue) {
        if (refreshTokenValue != null && !refreshTokenValue.isBlank()) {
            refreshTokenRepository.findByToken(refreshTokenValue).ifPresent(token -> {
                token.setRevoked(true);
                refreshTokenRepository.save(token);
            });
        }
        return "Logged out successfully";
    }

    @Transactional
    public String changePassword(Long userId, String currentPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found.", "USER_NOT_FOUND"));

        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new UnauthorizedException("Current password is incorrect.", "INVALID_PASSWORD");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        refreshTokenRepository.revokeAllForUser(userId);

        return "Password changed successfully. Please log in again.";
    }

    private ServiceResults.AuthResult issueTokens(User user, String ip, String userAgent) {
        String accessToken = jwtService.generateAccessToken(user.getId());
        String refreshToken = jwtService.generateRefreshToken(user.getId());
        persistRefreshToken(user, refreshToken, ip, userAgent);
        return new ServiceResults.AuthResult(user, accessToken, refreshToken);
    }

    private void persistRefreshToken(User user, String token, String ip, String userAgent) {
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken(token);
        refreshToken.setExpiresAt(LocalDateTime.now().plus(Duration.ofMillis(jwtService.getRefreshExpirationMs())));
        refreshToken.setRevoked(false);
        refreshToken.setIpAddress(ip == null ? "" : ip);
        refreshToken.setUserAgent(userAgent == null ? "" : truncate(userAgent));
        refreshTokenRepository.save(refreshToken);
    }

    private String truncate(String value) {
        return value.length() > 500 ? value.substring(0, 500) : value;
    }
}
