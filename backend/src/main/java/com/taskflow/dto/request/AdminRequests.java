package com.taskflow.dto.request;

/** Request DTOs for /api/v1/admin endpoints. */
public final class AdminRequests {

    private AdminRequests() {
    }

    public record UpdateUserStatusRequest(Boolean isActive) {
    }

    public record UpdateUserRoleRequest(String role) {
    }
}
