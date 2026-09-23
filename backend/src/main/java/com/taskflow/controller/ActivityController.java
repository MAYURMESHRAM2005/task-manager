package com.taskflow.controller;

import com.taskflow.dto.response.ServiceResults;
import com.taskflow.entity.ActivityLog;
import com.taskflow.entity.User;
import com.taskflow.service.ActivityService;
import com.taskflow.util.ApiResponse;
import com.taskflow.util.PaginationUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/activity")
public class ActivityController {

    private final ActivityService activityService;

    public ActivityController(ActivityService activityService) {
        this.activityService = activityService;
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<ApiResponse<List<ActivityLog>>> getProjectActivity(
            @PathVariable Long projectId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit) {
        ServiceResults.PageResult<ActivityLog> result = activityService.getProjectActivity(projectId,
                PaginationUtils.resolve(page, limit));
        return ResponseEntity.ok(ApiResponse.ok("Activity feed retrieved successfully", result.data(),
                result.pagination()));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<ActivityLog>>> getMyActivity(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @AuthenticationPrincipal User currentUser) {
        ServiceResults.PageResult<ActivityLog> result = activityService.getUserActivity(currentUser.getId(),
                PaginationUtils.resolve(page, limit));
        return ResponseEntity.ok(ApiResponse.ok("Activity feed retrieved successfully", result.data(),
                result.pagination()));
    }
}
