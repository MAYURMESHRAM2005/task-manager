package com.taskflow.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request DTOs for /api/v1/auth endpoints. */
public final class AuthRequests {

    private AuthRequests() {
    }

    public record RegisterRequest(
            @NotBlank(message = "Name is required")
            @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
            String name,

            @NotBlank(message = "Please provide a valid email address")
            @Email(message = "Please provide a valid email address")
            @Size(max = 255, message = "Email cannot exceed 255 characters")
            String email,

            @NotBlank(message = "Password is required")
            @Size(min = 6, max = 128, message = "Password must be between 6 and 128 characters")
            String password) {
    }

    public record LoginRequest(
            @NotBlank(message = "Email is required") String email,
            @NotBlank(message = "Password is required") String password) {
    }

    public record RefreshRequest(String refreshToken) {
    }

    public record LogoutRequest(String refreshToken) {
    }

    public record ChangePasswordRequest(
            @NotBlank(message = "Current password is required") String currentPassword,
            @NotBlank(message = "New password must be at least 6 characters long")
            @Size(min = 6, max = 128, message = "New password must be at least 6 characters long")
            String newPassword) {
    }
}
