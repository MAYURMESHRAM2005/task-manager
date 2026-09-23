package com.taskflow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request DTOs for comment endpoints. */
public final class CommentRequests {

    private CommentRequests() {
    }

    public record CreateCommentRequest(
            @NotBlank(message = "Comment content is required")
            @Size(max = 2000, message = "Comment cannot exceed 2000 characters")
            String content) {
    }

    public record UpdateCommentRequest(
            @NotBlank(message = "Comment content is required")
            @Size(max = 2000, message = "Comment cannot exceed 2000 characters")
            String content) {
    }
}
