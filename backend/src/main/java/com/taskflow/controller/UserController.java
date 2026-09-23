package com.taskflow.controller;

import com.taskflow.dto.request.AuthRequests;
import com.taskflow.dto.request.UserRequests;
import com.taskflow.dto.response.ServiceResults;
import com.taskflow.entity.User;
import com.taskflow.service.AuthService;
import com.taskflow.service.UserService;
import com.taskflow.util.ApiResponse;
import com.taskflow.util.PaginationUtils;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;
    private final AuthService authService;

    public UserController(UserService userService, AuthService authService) {
        this.userService = userService;
        this.authService = authService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<java.util.List<User>>> getUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit) {
        ServiceResults.PageResult<User> result = userService.getUsers(search, PaginationUtils.resolve(page, limit));
        return ResponseEntity.ok(ApiResponse.ok("Users retrieved successfully", result.data(), result.pagination()));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getProfile(@AuthenticationPrincipal User currentUser) {
        User user = userService.getUser(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Profile retrieved successfully", Map.of("user", user)));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateProfile(
            @Valid @RequestBody UserRequests.UpdateProfileRequest request,
            @AuthenticationPrincipal User currentUser) {
        User user = userService.updateProfile(currentUser.getId(), request);
        return ResponseEntity.ok(ApiResponse.ok("Profile updated successfully", Map.of("user", user)));
    }

    @PutMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody AuthRequests.ChangePasswordRequest request,
            @AuthenticationPrincipal User currentUser) {
        String message = authService.changePassword(currentUser.getId(), request.currentPassword(),
                request.newPassword());
        return ResponseEntity.ok(ApiResponse.ok(message, null));
    }
}
