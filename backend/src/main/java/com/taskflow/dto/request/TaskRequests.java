package com.taskflow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Request DTOs for /api/v1/tasks endpoints. */
public final class TaskRequests {

    private TaskRequests() {
    }

    public record RecurrenceRequest(String frequency, Integer interval, LocalDate endDate) {
    }

    public record CreateTaskRequest(
            @NotBlank(message = "Title must be at least 2 characters long")
            @Size(min = 2, max = 200, message = "Title must be between 2 and 200 characters")
            String title,

            @Size(max = 2000, message = "Description cannot exceed 2000 characters")
            String description,

            String status,
            String priority,

            @Size(max = 50, message = "Category cannot exceed 50 characters")
            String category,

            List<String> labels,
            LocalDate dueDate,
            Long assignedTo,
            Long project,
            LocalDateTime reminderAt,
            Integer position,
            List<Long> dependsOn,
            RecurrenceRequest recurrence,
            List<Long> mentions) {
    }

    public record UpdateTaskRequest(
            @Size(min = 2, max = 200, message = "Title must be between 2 and 200 characters")
            String title,

            @Size(max = 2000, message = "Description cannot exceed 2000 characters")
            String description,

            String status,
            String priority,

            @Size(max = 50, message = "Category cannot exceed 50 characters")
            String category,

            List<String> labels,
            LocalDate dueDate,
            Long assignedTo,
            Long project,
            LocalDateTime reminderAt,
            Integer position,
            List<Long> dependsOn,
            RecurrenceRequest recurrence,
            List<Long> mentions) {
    }

    public record StatusUpdateRequest(@NotBlank(message = "Status is required") String status) {
    }

    public record AssignRequest(Long assignedTo) {
    }

    public record ReorderItem(@NotNull(message = "Each update must have a valid taskId") Long taskId,
                              String status,
                              Integer position) {
    }

    public record ReorderRequest(@NotNull(message = "updates must be an array of { taskId, status, position }")
                                 List<ReorderItem> updates) {
    }

    public record CreateSubtaskRequest(
            @NotBlank(message = "Subtask title is required")
            @Size(max = 200, message = "Subtask title cannot exceed 200 characters")
            String title) {
    }

    public record UpdateSubtaskRequest(String title, Boolean completed, Integer position) {
    }
}
