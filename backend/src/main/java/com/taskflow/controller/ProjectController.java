package com.taskflow.controller;

import com.taskflow.dto.request.ProjectRequests;
import com.taskflow.dto.response.ServiceResults;
import com.taskflow.entity.Project;
import com.taskflow.entity.User;
import com.taskflow.service.ProjectService;
import com.taskflow.util.ApiResponse;
import com.taskflow.util.PaginationUtils;
import jakarta.servlet.http.HttpServletRequest;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Project>>> getProjects(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @AuthenticationPrincipal User currentUser) {
        ServiceResults.PageResult<Project> result = projectService.getProjects(
                PaginationUtils.resolve(page, limit), currentUser);
        return ResponseEntity.ok(ApiResponse.ok("Projects retrieved successfully", result.data(),
                result.pagination()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createProject(
            @Valid @RequestBody ProjectRequests.CreateProjectRequest request,
            @AuthenticationPrincipal User currentUser, HttpServletRequest http) {
        Project project = projectService.createProject(request, currentUser, http.getRemoteAddr(),
                http.getHeader("User-Agent"));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Project created successfully", Map.of("project", project)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getProject(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Project retrieved successfully",
                Map.of("project", projectService.getProjectById(id))));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateProject(
            @PathVariable Long id, @Valid @RequestBody ProjectRequests.UpdateProjectRequest request,
            @AuthenticationPrincipal User currentUser, HttpServletRequest http) {
        Project project = projectService.updateProject(id, request, currentUser, http.getRemoteAddr(),
                http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.ok("Project updated successfully", Map.of("project", project)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProject(@PathVariable Long id,
                                                           @AuthenticationPrincipal User currentUser,
                                                           HttpServletRequest http) {
        projectService.deleteProject(id, currentUser, http.getRemoteAddr(), http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.ok("Project deleted successfully", null));
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<ApiResponse<Map<String, Object>>> addMember(
            @PathVariable Long id, @RequestBody ProjectRequests.AddMemberRequest request,
            @AuthenticationPrincipal User currentUser, HttpServletRequest http) {
        Project project = projectService.addMember(id, request.userId(), request.role(), currentUser,
                http.getRemoteAddr(), http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.ok("Member added successfully", Map.of("project", project)));
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> removeMember(
            @PathVariable Long id, @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser, HttpServletRequest http) {
        Project project = projectService.removeMember(id, userId, currentUser, http.getRemoteAddr(),
                http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.ok("Member removed successfully", Map.of("project", project)));
    }
}
