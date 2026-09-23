package com.taskflow.controller;

import com.taskflow.dto.request.AuthRequests;
import com.taskflow.dto.response.ServiceResults;
import com.taskflow.entity.User;
import com.taskflow.entity.enums.ActivityEntityType;
import com.taskflow.service.ActivityService;
import com.taskflow.service.AuthService;
import com.taskflow.util.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final ActivityService activityService;

    public AuthController(AuthService authService, ActivityService activityService) {
        this.authService = authService;
        this.activityService = activityService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Map<String, Object>>> register(
            @Valid @RequestBody AuthRequests.RegisterRequest request, HttpServletRequest http) {
        ServiceResults.AuthResult result = authService.register(request, http.getRemoteAddr(),
                http.getHeader("User-Agent"));
        activityService.logActivity(result.user(), "USER_REGISTERED", ActivityEntityType.Auth,
                result.user().getId(), "New user registered: " + result.user().getEmail(),
                null, http.getRemoteAddr(), http.getHeader("User-Agent"));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Registration successful", authPayload(result)));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> login(
            @Valid @RequestBody AuthRequests.LoginRequest request, HttpServletRequest http) {
        ServiceResults.AuthResult result = authService.login(request.email(), request.password(),
                http.getRemoteAddr(), http.getHeader("User-Agent"));
        activityService.logActivity(result.user(), "USER_LOGGED_IN", ActivityEntityType.Auth,
                result.user().getId(), "User logged in: " + result.user().getEmail(),
                null, http.getRemoteAddr(), http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.ok("Login successful", authPayload(result)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<Map<String, Object>>> refresh(
            @RequestBody(required = false) AuthRequests.RefreshRequest request) {
        ServiceResults.TokenPair tokens = authService
                .refreshAccessToken(request == null ? null : request.refreshToken());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("accessToken", tokens.accessToken());
        data.put("refreshToken", tokens.refreshToken());
        return ResponseEntity.ok(ApiResponse.ok("Token refreshed successfully", data));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@RequestBody(required = false) AuthRequests.LogoutRequest request,
                                                    @AuthenticationPrincipal User currentUser,
                                                    HttpServletRequest http) {
        if (currentUser != null) {
            activityService.logActivity(currentUser, "USER_LOGGED_OUT", ActivityEntityType.Auth,
                    currentUser.getId(), "User logged out: " + currentUser.getEmail(),
                    null, http.getRemoteAddr(), http.getHeader("User-Agent"));
        }
        String message = authService.logout(request == null ? null : request.refreshToken());
        return ResponseEntity.ok(ApiResponse.ok(message, null));
    }

    private Map<String, Object> authPayload(ServiceResults.AuthResult result) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("user", result.user());
        data.put("accessToken", result.accessToken());
        data.put("refreshToken", result.refreshToken());
        return data;
    }
}
