package com.taskflow.controller;

import com.taskflow.dto.request.AdminRequests;
import com.taskflow.dto.response.ServiceResults;
import com.taskflow.entity.ActivityLog;
import com.taskflow.entity.User;
import com.taskflow.service.ActivityService;
import com.taskflow.service.AdminService;
import com.taskflow.util.ApiResponse;
import com.taskflow.util.PaginationUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** Admin-only endpoints — secured by Spring Security ({@code /api/v1/admin/**} requires ADMIN). */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    private final AdminService adminService;
    private final ActivityService activityService;

    public AdminController(AdminService adminService, ActivityService activityService) {
        this.adminService = adminService;
        this.activityService = activityService;
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<User>>> getUsers(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit) {
        ServiceResults.PageResult<User> result = adminService.getUsers(PaginationUtils.resolve(page, limit));
        return ResponseEntity.ok(ApiResponse.ok("Users retrieved successfully", result.data(), result.pagination()));
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateUserStatus(
            @PathVariable Long id, @RequestBody AdminRequests.UpdateUserStatusRequest request,
            @AuthenticationPrincipal User currentUser, HttpServletRequest http) {
        User user = adminService.updateUserStatus(id, request.isActive(), currentUser, http.getRemoteAddr(),
                http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.ok(
                "User " + (Boolean.TRUE.equals(request.isActive()) ? "activated" : "deactivated")
                        + " successfully",
                Map.of("user", user)));
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateUserRole(
            @PathVariable Long id, @RequestBody AdminRequests.UpdateUserRoleRequest request,
            @AuthenticationPrincipal User currentUser, HttpServletRequest http) {
        User user = adminService.updateUserRole(id, request.role(), currentUser, http.getRemoteAddr(),
                http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.ok("User role updated successfully", Map.of("user", user)));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<List<ActivityLog>>> getAuditLogs(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Long user,
            @RequestParam(required = false) String entity,
            @RequestParam(required = false) String action) {
        ServiceResults.PageResult<ActivityLog> result = activityService.getAuditLogs(
                PaginationUtils.resolve(page, limit), user, entity, action);
        return ResponseEntity.ok(ApiResponse.ok("Audit logs retrieved successfully", result.data(),
                result.pagination()));
    }

    @GetMapping("/statistics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStatistics() {
        return ResponseEntity.ok(ApiResponse.ok("Statistics retrieved successfully", adminService.getStatistics()));
    }
}
