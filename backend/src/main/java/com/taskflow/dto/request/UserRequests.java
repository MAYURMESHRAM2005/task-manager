package com.taskflow.dto.request;

import jakarta.validation.constraints.Size;

/** Request DTOs for /api/v1/users endpoints. */
public final class UserRequests {

    private UserRequests() {
    }

    public record UpdateProfileRequest(
            @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
            String name,

            @Size(max = 500, message = "Avatar cannot exceed 500 characters")
            String avatar) {
    }
}
