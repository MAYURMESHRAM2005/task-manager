package com.taskflow.controller;

import com.taskflow.entity.Attachment;
import com.taskflow.entity.User;
import com.taskflow.service.AttachmentService;
import com.taskflow.util.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/attachments")
public class AttachmentController {

    private final AttachmentService attachmentService;

    public AttachmentController(AttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    @PostMapping("/{entityType}/{entityId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> upload(
            @PathVariable String entityType, @PathVariable Long entityId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User currentUser, HttpServletRequest http) {
        Attachment attachment = attachmentService.upload(file, entityType, entityId, currentUser,
                http.getRemoteAddr(), http.getHeader("User-Agent"));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("File uploaded successfully", Map.of("attachment", attachment)));
    }

    @GetMapping("/{entityType}/{entityId}")
    public ResponseEntity<ApiResponse<List<Attachment>>> list(@PathVariable String entityType,
                                                             @PathVariable Long entityId) {
        return ResponseEntity.ok(ApiResponse.ok("Attachments retrieved successfully",
                attachmentService.getAttachments(entityType, entityId)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        attachmentService.deleteAttachment(id);
        return ResponseEntity.ok(ApiResponse.ok("Attachment deleted successfully", null));
    }
}
