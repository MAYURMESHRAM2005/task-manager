package com.taskflow.controller;

import com.taskflow.dto.request.CommentRequests;
import com.taskflow.entity.Comment;
import com.taskflow.entity.User;
import com.taskflow.service.CommentService;
import com.taskflow.util.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** Comments live under both {@code /tasks/:id/comments} and {@code /comments/:id}. */
@RestController
@RequestMapping("/api/v1")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @GetMapping("/tasks/{taskId}/comments")
    public ResponseEntity<ApiResponse<Map<String, List<Comment>>>> getComments(@PathVariable Long taskId) {
        return ResponseEntity.ok(ApiResponse.ok("Comments retrieved successfully",
                Map.of("comments", commentService.getComments(taskId))));
    }

    @PostMapping("/tasks/{taskId}/comments")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createComment(
            @PathVariable Long taskId, @Valid @RequestBody CommentRequests.CreateCommentRequest request,
            @AuthenticationPrincipal User currentUser) {
        Comment comment = commentService.createComment(taskId, request.content(), currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Comment added successfully", Map.of("comment", comment)));
    }

    @PutMapping("/comments/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateComment(
            @PathVariable Long id, @Valid @RequestBody CommentRequests.UpdateCommentRequest request,
            @AuthenticationPrincipal User currentUser) {
        Comment comment = commentService.updateComment(id, request.content(), currentUser);
        return ResponseEntity.ok(ApiResponse.ok("Comment updated successfully", Map.of("comment", comment)));
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(@PathVariable Long id,
                                                           @AuthenticationPrincipal User currentUser) {
        commentService.deleteComment(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok("Comment deleted successfully", null));
    }
}
