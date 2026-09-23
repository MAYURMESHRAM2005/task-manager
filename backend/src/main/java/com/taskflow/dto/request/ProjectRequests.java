package com.taskflow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** Request DTOs for /api/v1/projects endpoints. */
public final class ProjectRequests {

    private ProjectRequests() {
    }

    public record CreateProjectRequest(
            @NotBlank(message = "Project name must be at least 2 characters long")
            @Size(min = 2, max = 100, message = "Project name must be between 2 and 100 characters")
            String name,

            @Size(max = 1000, message = "Description cannot exceed 1000 characters")
            String description,

            String status,
            LocalDate startDate,
            LocalDate endDate) {
    }

    public record UpdateProjectRequest(
            @Size(min = 2, max = 100, message = "Project name must be between 2 and 100 characters")
            String name,

            @Size(max = 1000, message = "Description cannot exceed 1000 characters")
            String description,

            String status,
            LocalDate startDate,
            LocalDate endDate) {
    }

    public record AddMemberRequest(Long userId, String role) {
    }
}
