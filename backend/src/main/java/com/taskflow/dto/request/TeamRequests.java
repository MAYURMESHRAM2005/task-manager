package com.taskflow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request DTOs for /api/v1/teams endpoints. */
public final class TeamRequests {

    private TeamRequests() {
    }

    public record CreateTeamRequest(
            @NotBlank(message = "Team name must be at least 2 characters long")
            @Size(min = 2, max = 100, message = "Team name must be between 2 and 100 characters")
            String name,

            @Size(max = 500, message = "Description cannot exceed 500 characters")
            String description) {
    }

    public record UpdateTeamRequest(
            @Size(min = 2, max = 100, message = "Team name must be between 2 and 100 characters")
            String name,

            @Size(max = 500, message = "Description cannot exceed 500 characters")
            String description) {
    }
}
