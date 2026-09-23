package com.taskflow.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskflow.entity.User;
import com.taskflow.exception.ApiErrorResponse;
import com.taskflow.repository.UserRepository;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Authenticates requests carrying a Bearer access token (or an {@code accessToken}
 * cookie) and reports the same error codes the frontend expects
 * ({@code TOKEN_EXPIRED}, {@code INVALID_TOKEN}, {@code NO_TOKEN}, ...).
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository, ObjectMapper objectMapper) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {

        String token = extractToken(request);
        if (token == null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            Long userId = jwtService.parseAccessToken(token);
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                writeError(response, HttpStatus.UNAUTHORIZED, "User no longer exists.", "USER_NOT_FOUND");
                return;
            }
            if (!user.isActive()) {
                writeError(response, HttpStatus.FORBIDDEN, "Account is deactivated.", "ACCOUNT_DEACTIVATED");
                return;
            }

            var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
            var authentication = new UsernamePasswordAuthenticationToken(user, null, authorities);
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (ExpiredJwtException ex) {
            writeError(response, HttpStatus.UNAUTHORIZED, "Token expired.", "TOKEN_EXPIRED");
            return;
        } catch (JwtException | IllegalArgumentException ex) {
            writeError(response, HttpStatus.UNAUTHORIZED, "Invalid token.", "INVALID_TOKEN");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith("Bearer ")) {
            String value = header.substring(7).trim();
            return value.isEmpty() ? null : value;
        }
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("accessToken".equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }

    private void writeError(HttpServletResponse response, HttpStatus status, String message, String code)
            throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(new ApiErrorResponse(message, code)));
    }
}
