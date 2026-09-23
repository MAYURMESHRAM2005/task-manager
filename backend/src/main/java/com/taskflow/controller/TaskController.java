package com.taskflow.controller;

import com.taskflow.dto.request.TaskRequests;
import com.taskflow.dto.response.ServiceResults;
import com.taskflow.entity.Subtask;
import com.taskflow.entity.Task;
import com.taskflow.entity.User;
import com.taskflow.service.TaskService;
import com.taskflow.util.ApiResponse;
import com.taskflow.util.PaginationUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
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
@RequestMapping("/api/v1/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    // ─── Dashboard / kanban / calendar (declared before /{id}) ───────────────

    @GetMapping("/dashboard/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardStats(
            @AuthenticationPrincipal User currentUser) {
        Map<String, Object> stats = taskService.getDashboardStats(currentUser);
        return ResponseEntity.ok(ApiResponse.ok("Dashboard statistics retrieved successfully",
                Map.of("stats", stats)));
    }

    @GetMapping("/kanban")
    public ResponseEntity<ApiResponse<Map<String, List<Task>>>> getKanbanBoard(
            @RequestParam(required = false) String project,
            @RequestParam(required = false) String assignedTo,
            @AuthenticationPrincipal User currentUser) {
        Map<String, List<Task>> board = taskService.getKanbanBoard(project, assignedTo, currentUser);
        return ResponseEntity.ok(ApiResponse.ok("Kanban board retrieved successfully", board));
    }

    @GetMapping("/calendar")
    public ResponseEntity<ApiResponse<List<Task>>> getCalendarData(
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) String project,
            @AuthenticationPrincipal User currentUser) {
        List<Task> tasks = taskService.getCalendarData(dateFrom, dateTo, project, currentUser);
        return ResponseEntity.ok(ApiResponse.ok("Calendar data retrieved successfully", tasks));
    }

    @PatchMapping("/reorder")
    public ResponseEntity<ApiResponse<Map<String, Object>>> reorderTasks(
            @Valid @RequestBody TaskRequests.ReorderRequest request) {
        int count = taskService.reorderTasks(request.updates());
        return ResponseEntity.ok(ApiResponse.ok("Tasks reordered successfully", Map.of("count", count)));
    }

    // ─── CRUD ────────────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<ApiResponse<List<Task>>> getTasks(@RequestParam Map<String, String> params,
                                                            @AuthenticationPrincipal User currentUser) {
        PaginationUtils.PageRequest page = PaginationUtils.resolve(
                parseInt(params.get("page")), parseInt(params.get("limit")));
        ServiceResults.PageResult<Task> result = taskService.getTasks(params, page, currentUser);
        return ResponseEntity.ok(ApiResponse.ok("Tasks retrieved successfully", result.data(),
                result.pagination()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createTask(
            @Valid @RequestBody TaskRequests.CreateTaskRequest request,
            @AuthenticationPrincipal User currentUser, HttpServletRequest http) {
        Task task = taskService.createTask(request, currentUser, http.getRemoteAddr(), http.getHeader("User-Agent"));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Task created successfully", Map.of("task", task)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTask(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Task retrieved successfully",
                Map.of("task", taskService.getTaskById(id))));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateTask(
            @PathVariable Long id, @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User currentUser, HttpServletRequest http) {
        Task task = taskService.updateTask(id, body, currentUser, http.getRemoteAddr(), http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.ok("Task updated successfully", Map.of("task", task)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTask(@PathVariable Long id,
                                                        @AuthenticationPrincipal User currentUser,
                                                        HttpServletRequest http) {
        taskService.deleteTask(id, currentUser, http.getRemoteAddr(), http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.ok("Task deleted successfully", null));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateStatus(
            @PathVariable Long id, @Valid @RequestBody TaskRequests.StatusUpdateRequest request,
            @AuthenticationPrincipal User currentUser, HttpServletRequest http) {
        Task task = taskService.updateStatus(id, request.status(), currentUser, http.getRemoteAddr(),
                http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.ok("Task status updated successfully", Map.of("task", task)));
    }

    @PatchMapping("/{id}/assign")
    public ResponseEntity<ApiResponse<Map<String, Object>>> assignTask(
            @PathVariable Long id, @RequestBody(required = false) TaskRequests.AssignRequest request,
            @AuthenticationPrincipal User currentUser, HttpServletRequest http) {
        Task task = taskService.assignTask(id, request == null ? null : request.assignedTo(), currentUser,
                http.getRemoteAddr(), http.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.ok("Task assigned successfully", Map.of("task", task)));
    }

    // ─── Subtasks ────────────────────────────────────────────────────────────

    @GetMapping("/{id}/subtasks")
    public ResponseEntity<ApiResponse<List<Subtask>>> getSubtasks(@PathVariable Long id) {
        ServiceResults.SubtaskProgress progress = taskService.getSubtasks(id);
        return ResponseEntity.ok(ApiResponse.ok("Subtasks retrieved successfully", progress.data())
                .subtaskProgress(progress.total(), progress.completed(), progress.percentage()));
    }

    @PostMapping("/{id}/subtasks")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createSubtask(
            @PathVariable Long id, @Valid @RequestBody TaskRequests.CreateSubtaskRequest request,
            @AuthenticationPrincipal User currentUser) {
        Subtask subtask = taskService.createSubtask(id, request.title(), currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Subtask created successfully", Map.of("subtask", subtask)));
    }

    @PutMapping("/subtasks/{subtaskId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateSubtask(
            @PathVariable Long subtaskId, @RequestBody Map<String, Object> body) {
        Subtask subtask = taskService.updateSubtask(subtaskId, body);
        return ResponseEntity.ok(ApiResponse.ok("Subtask updated successfully", Map.of("subtask", subtask)));
    }

    @DeleteMapping("/subtasks/{subtaskId}")
    public ResponseEntity<ApiResponse<Void>> deleteSubtask(@PathVariable Long subtaskId) {
        taskService.deleteSubtask(subtaskId);
        return ResponseEntity.ok(ApiResponse.ok("Subtask deleted successfully", null));
    }

    private Integer parseInt(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Integer.valueOf(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
