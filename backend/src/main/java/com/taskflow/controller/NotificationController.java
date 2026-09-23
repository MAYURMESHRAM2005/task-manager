package com.taskflow.controller;

import com.taskflow.dto.response.ServiceResults;
import com.taskflow.entity.Notification;
import com.taskflow.entity.User;
import com.taskflow.service.NotificationService;
import com.taskflow.util.ApiResponse;
import com.taskflow.util.PaginationUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Notification>>> getNotifications(
            @RequestParam(required = false) String unread,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @AuthenticationPrincipal User currentUser) {
        ServiceResults.NotificationPage result = notificationService.getNotifications(currentUser.getId(),
                PaginationUtils.resolve(page, limit), "true".equals(unread));
        return ResponseEntity.ok(ApiResponse.ok("Notifications retrieved successfully", result.data(),
                        result.pagination())
                .unread(result.unreadCount()));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Map<String, Object>>> markAllAsRead(
            @AuthenticationPrincipal User currentUser) {
        int modified = notificationService.markAllAsRead(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("All notifications marked as read",
                Map.of("modifiedCount", modified)));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Map<String, Object>>> markAsRead(@PathVariable Long id,
                                                                      @AuthenticationPrincipal User currentUser) {
        Notification notification = notificationService.markAsRead(id, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Notification marked as read",
                Map.of("notification", notification)));
    }
}
