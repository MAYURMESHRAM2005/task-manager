package com.taskflow.service;

import com.taskflow.dto.request.TaskRequests;
import com.taskflow.dto.response.ServiceResults;
import com.taskflow.entity.Project;
import com.taskflow.entity.Subtask;
import com.taskflow.entity.Task;
import com.taskflow.entity.User;
import com.taskflow.entity.enums.ActivityEntityType;
import com.taskflow.entity.enums.NotificationType;
import com.taskflow.entity.enums.Role;
import com.taskflow.entity.enums.TaskPriority;
import com.taskflow.entity.enums.TaskStatus;
import com.taskflow.exception.BadRequestException;
import com.taskflow.exception.ForbiddenException;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.CommentRepository;
import com.taskflow.repository.ProjectRepository;
import com.taskflow.repository.SubtaskRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.UserRepository;
import com.taskflow.repository.spec.TaskSpecifications;
import com.taskflow.socket.SocketService;
import com.taskflow.util.DateParser;
import com.taskflow.util.Pagination;
import com.taskflow.util.PaginationUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/** Task CRUD, filtering, kanban/calendar data, dashboard statistics and subtasks. */
@Service
public class TaskService {

    private static final Set<String> SORTABLE_FIELDS = Set.of(
            "dueDate", "createdAt", "updatedAt", "priority", "title", "position", "status", "category");
    private static final List<TaskStatus> OPEN_STATUSES = List.of(TaskStatus.TODO, TaskStatus.IN_PROGRESS);
    private static final List<TaskStatus> NOT_DONE_STATUSES =
            List.of(TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW);

    private final TaskRepository taskRepository;
    private final SubtaskRepository subtaskRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final NotificationService notificationService;
    private final ActivityService activityService;
    private final MentionService mentionService;
    private final SocketService socketService;

    public TaskService(TaskRepository taskRepository, SubtaskRepository subtaskRepository,
                       CommentRepository commentRepository, UserRepository userRepository,
                       ProjectRepository projectRepository, NotificationService notificationService,
                       ActivityService activityService, MentionService mentionService,
                       SocketService socketService) {
        this.taskRepository = taskRepository;
        this.subtaskRepository = subtaskRepository;
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.notificationService = notificationService;
        this.activityService = activityService;
        this.mentionService = mentionService;
        this.socketService = socketService;
    }

    // ─── Create ──────────────────────────────────────────────────────────────

    @Transactional
    public Task createTask(TaskRequests.CreateTaskRequest request, User current, String ip, String userAgent) {
        TaskStatus status = parseStatus(request.status());
        TaskPriority priority = parsePriority(request.priority());
        if (status == null) {
            status = TaskStatus.TODO;
        }
        if (priority == null) {
            priority = TaskPriority.MEDIUM;
        }

        if (request.reminderAt() != null && request.reminderAt().isBefore(LocalDateTime.now())) {
            throw validationError("Reminder date must be in the future");
        }

        Task task = new Task();
        task.setTitle(request.title().trim());
        task.setDescription(request.description() == null ? "" : request.description());
        task.setStatus(status);
        task.setPriority(priority);
        task.setCategory(request.category() == null ? "" : request.category());
        task.setLabels(request.labels() == null ? new ArrayList<>() : new ArrayList<>(request.labels()));
        task.setDueDate(request.dueDate());
        task.setCreatedBy(current);
        task.setAssignedTo(resolveUser(request.assignedTo()));
        task.setProject(resolveProject(request.project()));
        task.setReminderAt(request.reminderAt());
        task.setReminderNotified(false);
        task.setMentions(new HashSet<>(resolveUsers(request.mentions())));
        task.setDependencies(resolveDependencies(request.dependsOn(), null));
        applyRecurrence(task, request.recurrence(), false);

        if (status == TaskStatus.COMPLETED) {
            task.setCompletedAt(LocalDateTime.now());
        }
        int position = request.position() != null
                ? request.position()
                : nextPosition(status, task.getProject());
        task.setPosition(position);

        taskRepository.save(task);

        if (task.getAssignedTo() != null && !task.getAssignedTo().getId().equals(current.getId())) {
            notificationService.createAndPush(task.getAssignedTo(), NotificationType.TASK_ASSIGNED,
                    "You have been assigned to task \"" + task.getTitle() + "\" by " + current.getName(),
                    "Task", task.getId());
        }
        socketService.emitToProject(task.getProject() == null ? null : task.getProject().getId(),
                "project:task:created", Map.of("taskId", task.getId()));

        notifyDescriptionMentions(task, current);

        activityService.logActivity(current, "TASK_CREATED", ActivityEntityType.Task, task.getId(),
                "Task created: \"" + task.getTitle() + "\"", null, ip, userAgent);

        return task;
    }

    // ─── Read / list ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ServiceResults.PageResult<Task> getTasks(Map<String, String> params, PaginationUtils.PageRequest page,
                                                    User current) {
        Specification<Task> specification = TaskSpecifications.allOf(
                TaskSpecifications.accessibleBy(current.getRole().name(), current.getId()),
                TaskSpecifications.statusIn(parseStatusList(params.get("status"))),
                TaskSpecifications.priorityIn(parsePriorityList(params.get("priority"))),
                TaskSpecifications.categoryEquals(params.get("category")),
                TaskSpecifications.labeledWith(parseCsv(params.get("label"))),
                TaskSpecifications.inProject(parseLong(params.get("project"))),
                TaskSpecifications.assignedTo(parseLong(params.get("assignedTo"))),
                TaskSpecifications.createdBy(parseLong(params.get("createdBy"))),
                TaskSpecifications.matchesSearch(params.get("search")),
                TaskSpecifications.dueBefore(parseDate(params.get("dueBefore"))),
                TaskSpecifications.dueAfter(parseDate(params.get("dueAfter"))),
                TaskSpecifications.dueBetween(parseDate(params.get("dateFrom")), parseDate(params.get("dateTo"))),
                "true".equals(params.get("overdue")) ? TaskSpecifications.overdue() : null,
                "true".equals(params.get("hasDependencies")) ? TaskSpecifications.hasDependencies() : null);

        long total = taskRepository.count(specification);
        Page<Task> result = taskRepository.findAll(specification,
                PageRequest.of(page.page() - 1, page.limit(),
                        resolveSort(params.get("sortBy"), params.get("sortOrder"))));

        return new ServiceResults.PageResult<>(result.getContent(),
                Pagination.of(page.page(), page.limit(), total));
    }

    @Transactional(readOnly = true)
    public Task getTaskById(Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found.", "TASK_NOT_FOUND"));
    }

    // ─── Update ──────────────────────────────────────────────────────────────

    /**
     * Applies only the fields actually present in the request body (matching the
     * original {@code if (field in updateData)} semantics), so PATCH-style partial
     * updates never wipe unrelated columns.
     */
    @Transactional
    public Task updateTask(Long id, Map<String, Object> body, User current, String ip, String userAgent) {
        Task task = getTaskById(id);
        assertCanModify(task, current);

        if (body.containsKey("title")) {
            String title = asString(body.get("title"));
            if (title == null || title.trim().length() < 2 || title.trim().length() > 200) {
                throw validationError("Title must be between 2 and 200 characters");
            }
            task.setTitle(title.trim());
        }
        if (body.containsKey("description")) {
            String description = asString(body.get("description"));
            if (description != null && description.length() > 2000) {
                throw validationError("Description cannot exceed 2000 characters");
            }
            task.setDescription(description == null ? "" : description);
        }
        if (body.containsKey("category")) {
            String category = asString(body.get("category"));
            if (category != null && category.length() > 50) {
                throw validationError("Category cannot exceed 50 characters");
            }
            task.setCategory(category == null ? "" : category);
        }
        if (body.containsKey("labels")) {
            task.setLabels(asStringList(body.get("labels"), "Labels must be an array"));
        }
        if (body.containsKey("dueDate")) {
            task.setDueDate(asDate(body.get("dueDate")));
        }
        if (body.containsKey("assignedTo")) {
            task.setAssignedTo(resolveUser(asLong(body.get("assignedTo"))));
        }
        if (body.containsKey("project")) {
            task.setProject(resolveProject(asLong(body.get("project"))));
        }
        if (body.containsKey("reminderAt")) {
            LocalDateTime reminderAt = asDateTime(body.get("reminderAt"));
            if (!Objects.equals(task.getReminderAt(), reminderAt)) {
                task.setReminderNotified(false);
            }
            task.setReminderAt(reminderAt);
        }
        if (body.containsKey("position")) {
            Integer position = asInteger(body.get("position"));
            if (position != null) {
                task.setPosition(position);
            }
        }
        if (body.containsKey("status")) {
            TaskStatus status = parseStatus(asString(body.get("status")));
            if (status == null) {
                throw validationError("Invalid status value");
            }
            task.setStatus(status);
            if (status == TaskStatus.COMPLETED) {
                if (task.getCompletedAt() == null) {
                    task.setCompletedAt(LocalDateTime.now());
                }
            } else {
                task.setCompletedAt(null);
            }
        }
        if (body.containsKey("priority")) {
            TaskPriority priority = parsePriority(asString(body.get("priority")));
            if (priority == null) {
                throw validationError("Invalid priority value");
            }
            task.setPriority(priority);
        }
        if (body.containsKey("dependsOn")) {
            task.setDependencies(resolveDependencies(asLongList(body.get("dependsOn"), "Dependencies must be an array"),
                    task.getId()));
        }
        if (body.containsKey("mentions")) {
            task.setMentions(new HashSet<>(resolveUsers(asLongList(body.get("mentions"), "Mentions must be an array"))));
        }
        if (body.containsKey("recurrence")) {
            applyRecurrence(task, asRecurrence(body.get("recurrence")), true);
        }

        taskRepository.save(task);
        activityService.logActivity(current, "TASK_UPDATED", ActivityEntityType.Task, task.getId(),
                "Task updated: \"" + task.getTitle() + "\"", null, ip, userAgent);
        socketService.emitToTask(task.getId(), "task:updated", Map.of("taskId", task.getId()));
        notifyDescriptionMentions(task, current);

        return task;
    }

    /** Used by PATCH /tasks/:id/status — also notifies the task creator. */
    @Transactional
    public Task updateStatus(Long id, String statusValue, User current, String ip, String userAgent) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", statusValue);
        Task task = updateTask(id, body, current, ip, userAgent);

        activityService.logActivity(current, "TASK_STATUS_CHANGED", ActivityEntityType.Task, task.getId(),
                "Task status changed to: " + task.getStatus(), null, ip, userAgent);
        socketService.emitToTask(task.getId(), "task:status",
                Map.of("taskId", task.getId(), "status", task.getStatus().name()));

        Long creatorId = task.getCreatedBy().getId();
        if (!creatorId.equals(current.getId())) {
            NotificationType type = task.getStatus() == TaskStatus.CANCELLED
                    ? NotificationType.TASK_OVERDUE
                    : NotificationType.TASK_COMPLETED;
            String message;
            if (task.getStatus() == TaskStatus.COMPLETED) {
                message = "Task \"" + task.getTitle() + "\" has been completed by " + current.getName();
            } else if (task.getStatus() == TaskStatus.CANCELLED) {
                message = "Task \"" + task.getTitle() + "\" has been cancelled by " + current.getName();
            } else {
                message = "Task \"" + task.getTitle() + "\" status changed to "
                        + task.getStatus().name().replace('_', ' ').toLowerCase(Locale.ROOT)
                        + " by " + current.getName();
            }
            notificationService.createAndPush(task.getCreatedBy(), type, message, "Task", task.getId());
        }
        return task;
    }

    @Transactional
    public Task assignTask(Long id, Long assignedToId, User current, String ip, String userAgent) {
        Task task = getTaskById(id);

        boolean isCreator = task.getCreatedBy().getId().equals(current.getId());
        boolean elevated = current.getRole() == Role.MANAGER || current.getRole() == Role.ADMIN;
        if (!isCreator && !elevated) {
            throw new ForbiddenException("You do not have permission to assign this task.", "NOT_AUTHORIZED");
        }

        Long previousAssigneeId = task.getAssignedTo() == null ? null : task.getAssignedTo().getId();
        User assignee = resolveUser(assignedToId);
        task.setAssignedTo(assignee);
        taskRepository.save(task);

        activityService.logActivity(current, "TASK_ASSIGNED", ActivityEntityType.Task, task.getId(),
                "Task assigned to user", null, ip, userAgent);

        if (assignee != null && !assignee.getId().equals(current.getId())) {
            NotificationType type = previousAssigneeId != null
                    ? NotificationType.TASK_REASSIGNED
                    : NotificationType.TASK_ASSIGNED;
            String verb = type == NotificationType.TASK_REASSIGNED ? "reassigned" : "assigned";
            notificationService.createAndPush(assignee, type,
                    "You have been " + verb + " to task \"" + task.getTitle() + "\" by " + current.getName(),
                    "Task", task.getId());
        }
        return task;
    }

    @Transactional
    public int reorderTasks(List<TaskRequests.ReorderItem> updates) {
        for (TaskRequests.ReorderItem item : updates) {
            if (item == null || item.taskId() == null) {
                throw validationError("Each update must have a valid taskId");
            }
            taskRepository.findById(item.taskId()).ifPresent(task -> {
                if (item.status() != null) {
                    TaskStatus status = parseStatus(item.status());
                    if (status != null) {
                        task.setStatus(status);
                    }
                }
                if (item.position() != null) {
                    task.setPosition(item.position());
                }
                taskRepository.save(task);
            });
        }
        return updates.size();
    }

    @Transactional
    public void deleteTask(Long id, User current, String ip, String userAgent) {
        Task task = getTaskById(id);

        boolean isCreator = task.getCreatedBy().getId().equals(current.getId());
        boolean elevated = current.getRole() == Role.MANAGER || current.getRole() == Role.ADMIN;
        if (!isCreator && !elevated) {
            throw new ForbiddenException("You do not have permission to delete this task.", "NOT_AUTHORIZED");
        }

        // Remove this task from other tasks' dependency lists, then delete the
        // child rows (subtasks and comments) before the task itself so the
        // relational foreign keys stay satisfied.
        for (Task dependent : taskRepository.findDependents(id)) {
            dependent.getDependencies().removeIf(dep -> dep.getId().equals(id));
            taskRepository.save(dependent);
        }
        subtaskRepository.deleteByTaskId(id);
        commentRepository.deleteAll(commentRepository.findByTaskIdOrderByCreatedAtDesc(id));
        taskRepository.delete(task);

        activityService.logActivity(current, "TASK_DELETED", ActivityEntityType.Task, id,
                "Task deleted successfully", null, ip, userAgent);
        socketService.emitToTask(id, "task:deleted", Map.of("taskId", id));
    }

    // ─── Kanban / calendar / dashboard ───────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, List<Task>> getKanbanBoard(String project, String assignedTo, User current) {
        Specification<Task> specification = TaskSpecifications.allOf(
                TaskSpecifications.accessibleBy(current.getRole().name(), current.getId()),
                TaskSpecifications.inProject(parseLong(project)),
                TaskSpecifications.assignedTo(parseLong(assignedTo)));

        List<Task> tasks = taskRepository.findAll(specification,
                Sort.by(Sort.Order.asc("position"), Sort.Order.desc("createdAt")));

        Map<String, List<Task>> board = new LinkedHashMap<>();
        board.put("TODO", filterByStatus(tasks, TaskStatus.TODO));
        board.put("IN_PROGRESS", filterByStatus(tasks, TaskStatus.IN_PROGRESS));
        board.put("REVIEW", filterByStatus(tasks, TaskStatus.REVIEW));
        board.put("COMPLETED", filterByStatus(tasks, TaskStatus.COMPLETED));
        return board;
    }

    @Transactional(readOnly = true)
    public List<Task> getCalendarData(String dateFrom, String dateTo, String project, User current) {
        LocalDate from = parseDate(dateFrom);
        LocalDate to = parseDate(dateTo);
        if (from == null || to == null) {
            return List.of();
        }
        Specification<Task> specification = TaskSpecifications.allOf(
                TaskSpecifications.accessibleBy(current.getRole().name(), current.getId()),
                TaskSpecifications.inProject(parseLong(project)),
                TaskSpecifications.dueBetween(from, to));

        return taskRepository.findAll(specification, Sort.by(Sort.Order.asc("dueDate")));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardStats(User current) {
        Specification<Task> accessible = TaskSpecifications.accessibleBy(current.getRole().name(), current.getId());
        List<Task> tasks = taskRepository.findAll(accessible == null ? TaskSpecifications.none() : accessible);

        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();

        Map<String, Long> statusBreakdown = new LinkedHashMap<>();
        Map<String, Long> priorityBreakdown = new LinkedHashMap<>();
        for (Task task : tasks) {
            statusBreakdown.merge(task.getStatus().name(), 1L, Long::sum);
            priorityBreakdown.merge(task.getPriority().name(), 1L, Long::sum);
        }

        long total = tasks.size();
        long completed = statusBreakdown.getOrDefault(TaskStatus.COMPLETED.name(), 0L);
        int completionPercentage = total > 0 ? (int) Math.round((completed * 100.0) / total) : 0;

        long overdue = tasks.stream()
                .filter(task -> task.getDueDate() != null && !task.getDueDate().isAfter(today))
                .filter(task -> OPEN_STATUSES.contains(task.getStatus()))
                .count();

        long todayTasks = tasks.stream()
                .filter(task -> task.getDueDate() != null && task.getDueDate().isEqual(today))
                .filter(task -> task.getStatus() != TaskStatus.COMPLETED && task.getStatus() != TaskStatus.CANCELLED)
                .count();

        long upcomingTasks = tasks.stream()
                .filter(task -> task.getDueDate() != null
                        && !task.getDueDate().isBefore(today)
                        && !task.getDueDate().isAfter(weekEnd(today)))
                .filter(task -> task.getStatus() != TaskStatus.COMPLETED && task.getStatus() != TaskStatus.CANCELLED)
                .count();

        LocalDateTime weekAgo = now.minusDays(7);
        LocalDateTime monthAgo = now.minusDays(30);

        Map<Integer, Long> weekly = new java.util.TreeMap<>();
        Map<Integer, Long> monthly = new java.util.TreeMap<>();
        for (Task task : tasks) {
            LocalDateTime completedAt = task.getCompletedAt();
            if (completedAt == null) {
                continue;
            }
            if (!completedAt.isBefore(weekAgo)) {
                weekly.merge(mongoDayOfWeek(completedAt.getDayOfWeek()), 1L, Long::sum);
            }
            if (!completedAt.isBefore(monthAgo)) {
                monthly.merge(completedAt.getDayOfMonth(), 1L, Long::sum);
            }
        }

        List<Map<String, Object>> weeklyCompleted = weekly.entrySet().stream()
                .map(entry -> Map.<String, Object>of("_id", entry.getKey(), "count", entry.getValue()))
                .collect(Collectors.toList());
        List<Map<String, Object>> monthlyCompleted = monthly.entrySet().stream()
                .map(entry -> Map.<String, Object>of("_id", entry.getKey(), "count", entry.getValue()))
                .collect(Collectors.toList());

        List<Task> recentActivity = tasks.stream()
                .sorted((a, b) -> nullSafeCompare(b.getUpdatedAt(), a.getUpdatedAt()))
                .limit(10)
                .collect(Collectors.toList());

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalTasks", total);
        stats.put("completedTasks", completed);
        stats.put("pendingTasks", statusBreakdown.getOrDefault(TaskStatus.TODO.name(), 0L));
        stats.put("inProgressTasks", statusBreakdown.getOrDefault(TaskStatus.IN_PROGRESS.name(), 0L));
        stats.put("reviewTasks", statusBreakdown.getOrDefault(TaskStatus.REVIEW.name(), 0L));
        stats.put("cancelledTasks", statusBreakdown.getOrDefault(TaskStatus.CANCELLED.name(), 0L));
        stats.put("overdueTasks", overdue);
        stats.put("urgentTasks", priorityBreakdown.getOrDefault(TaskPriority.URGENT.name(), 0L));
        stats.put("todayTasks", todayTasks);
        stats.put("upcomingTasks", upcomingTasks);
        stats.put("completionPercentage", completionPercentage);
        stats.put("productivityScore", completionPercentage);
        stats.put("pendingPercentage", total > 0
                ? (int) Math.round((statusBreakdown.getOrDefault(TaskStatus.TODO.name(), 0L) * 100.0) / total)
                : 0);
        stats.put("statusBreakdown", statusBreakdown);
        stats.put("priorityBreakdown", priorityBreakdown);
        stats.put("weeklyCompleted", weeklyCompleted);
        stats.put("monthlyCompleted", monthlyCompleted);
        stats.put("recentActivity", recentActivity);
        return stats;
    }

    // ─── Subtasks ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ServiceResults.SubtaskProgress getSubtasks(Long taskId) {
        List<Subtask> subtasks = subtaskRepository.findByTaskIdOrderByPositionAscCreatedAtAsc(taskId);
        int total = subtasks.size();
        int completed = (int) subtasks.stream().filter(Subtask::isCompleted).count();
        int percentage = total > 0 ? (int) Math.round((completed * 100.0) / total) : 0;
        return new ServiceResults.SubtaskProgress(subtasks, total, completed, percentage);
    }

    @Transactional
    public Subtask createSubtask(Long taskId, String title, User current) {
        Task task = getTaskById(taskId);
        if (title == null || title.isBlank() || title.length() > 200) {
            throw validationError("Subtask title is required and cannot exceed 200 characters");
        }
        Subtask subtask = new Subtask();
        subtask.setTask(task);
        subtask.setTitle(title.trim());
        subtask.setCreatedBy(current);
        subtask.setPosition(subtaskRepository.maxPosition(taskId) + 1);
        return subtaskRepository.save(subtask);
    }

    @Transactional
    public Subtask updateSubtask(Long subtaskId, Map<String, Object> body) {
        Subtask subtask = subtaskRepository.findById(subtaskId)
                .orElseThrow(() -> new ResourceNotFoundException("Subtask not found.", "SUBTASK_NOT_FOUND"));

        if (body.containsKey("title")) {
            String title = asString(body.get("title"));
            if (title == null || title.isBlank() || title.length() > 200) {
                throw validationError("Subtask title is required and cannot exceed 200 characters");
            }
            subtask.setTitle(title.trim());
        }
        if (body.containsKey("completed")) {
            boolean completed = Boolean.TRUE.equals(body.get("completed"));
            subtask.setCompleted(completed);
            subtask.setCompletedAt(completed ? LocalDateTime.now() : null);
        }
        if (body.containsKey("position")) {
            Integer position = asInteger(body.get("position"));
            if (position != null) {
                subtask.setPosition(position);
            }
        }
        return subtaskRepository.save(subtask);
    }

    @Transactional
    public void deleteSubtask(Long subtaskId) {
        Subtask subtask = subtaskRepository.findById(subtaskId)
                .orElseThrow(() -> new ResourceNotFoundException("Subtask not found.", "SUBTASK_NOT_FOUND"));
        subtaskRepository.delete(subtask);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private void assertCanModify(Task task, User current) {
        boolean isCreator = task.getCreatedBy().getId().equals(current.getId());
        boolean isAssignee = task.getAssignedTo() != null && task.getAssignedTo().getId().equals(current.getId());
        boolean elevated = current.getRole() == Role.MANAGER || current.getRole() == Role.ADMIN;
        if (!isCreator && !isAssignee && !elevated) {
            throw new ForbiddenException("You do not have permission to update this task.", "NOT_AUTHORIZED");
        }
    }

    private void notifyDescriptionMentions(Task task, User actor) {
        List<String> mentionNames = mentionService.parseMentions(task.getDescription());
        if (mentionNames.isEmpty()) {
            return;
        }
        List<User> mentioned = mentionService.resolveMentions(mentionNames);
        if (!mentioned.isEmpty()) {
            mentionService.notifyMentions(mentioned, actor.getId(), actor.getName(), "Task", task.getId(),
                    task.getTitle());
        }
    }

    private int nextPosition(TaskStatus status, Project project) {
        return project == null
                ? taskRepository.maxPositionWithoutProject(status) + 1
                : taskRepository.maxPositionInProject(status, project.getId()) + 1;
    }

    private void applyRecurrence(Task task, TaskRequests.RecurrenceRequest recurrence, boolean explicit) {
        if (recurrence == null) {
            if (!explicit) {
                task.setRecurrenceFrequency("none");
                task.setRecurrenceInterval(1);
                task.setRecurrenceEndDate(null);
            }
            return;
        }
        String frequency = recurrence.frequency() == null ? "none" : recurrence.frequency().toLowerCase(Locale.ROOT);
        if (!List.of("none", "daily", "weekly", "monthly", "yearly").contains(frequency)) {
            throw validationError("Invalid recurrence frequency");
        }
        task.setRecurrenceFrequency(frequency);
        task.setRecurrenceInterval(recurrence.interval() == null || recurrence.interval() < 1
                ? 1 : recurrence.interval());
        task.setRecurrenceEndDate(recurrence.endDate());
    }

    private Set<Task> resolveDependencies(List<Long> ids, Long selfId) {
        if (ids == null || ids.isEmpty()) {
            return new HashSet<>();
        }
        Set<Task> dependencies = new LinkedHashSet<>();
        for (Long dependencyId : ids) {
            if (dependencyId == null) {
                continue;
            }
            if (selfId != null && dependencyId.equals(selfId)) {
                throw new BadRequestException("A task cannot depend on itself.", "SELF_DEPENDENCY");
            }
            Task dependency = taskRepository.findById(dependencyId).orElse(null);
            if (dependency == null) {
                continue;
            }
            if (selfId != null && createsCycle(selfId, dependencyId)) {
                throw new BadRequestException("Adding this dependency would create a circular dependency.",
                        "CIRCULAR_DEPENDENCY");
            }
            dependencies.add(dependency);
        }
        return dependencies;
    }

    /** Breadth-first walk over the dependency graph looking for {@code taskId}. */
    private boolean createsCycle(Long taskId, Long dependencyId) {
        Set<Long> visited = new HashSet<>();
        java.util.ArrayDeque<Long> queue = new java.util.ArrayDeque<>();
        queue.add(dependencyId);
        while (!queue.isEmpty()) {
            Long current = queue.poll();
            if (current.equals(taskId)) {
                return true;
            }
            if (!visited.add(current)) {
                continue;
            }
            taskRepository.findById(current).ifPresent(task ->
                    task.getDependencies().forEach(next -> queue.add(next.getId())));
        }
        return false;
    }

    private User resolveUser(Long userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found.", "USER_NOT_FOUND"));
    }

    private Project resolveProject(Long projectId) {
        if (projectId == null) {
            return null;
        }
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found.", "PROJECT_NOT_FOUND"));
    }

    private List<User> resolveUsers(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return List.of();
        }
        return userRepository.findAllById(userIds);
    }

    private List<Task> filterByStatus(List<Task> tasks, TaskStatus status) {
        return tasks.stream().filter(task -> task.getStatus() == status).collect(Collectors.toList());
    }

    private Sort resolveSort(String sortBy, String sortOrder) {
        if (sortBy != null && SORTABLE_FIELDS.contains(sortBy)) {
            Sort.Direction direction = "asc".equalsIgnoreCase(sortOrder) ? Sort.Direction.ASC : Sort.Direction.DESC;
            return Sort.by(direction, sortBy);
        }
        return Sort.by(Sort.Direction.DESC, "createdAt");
    }

    private LocalDate weekEnd(LocalDate today) {
        int jsDayOfWeek = today.getDayOfWeek().getValue() % 7; // Sunday = 0 ... Saturday = 6
        return today.plusDays(7 - jsDayOfWeek);
    }

    private int mongoDayOfWeek(DayOfWeek dayOfWeek) {
        return (dayOfWeek.getValue() % 7) + 1; // Sunday = 1 ... Saturday = 7
    }

    private static int nullSafeCompare(LocalDateTime a, LocalDateTime b) {
        if (a == null && b == null) {
            return 0;
        }
        if (a == null) {
            return -1;
        }
        if (b == null) {
            return 1;
        }
        return a.compareTo(b);
    }

    private TaskStatus parseStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return TaskStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw validationError("Invalid status value");
        }
    }

    private TaskPriority parsePriority(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return TaskPriority.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw validationError("Invalid priority value");
        }
    }

    private List<TaskStatus> parseStatusList(String value) {
        return parseCsv(value).stream()
                .map(item -> {
                    try {
                        return TaskStatus.valueOf(item.toUpperCase(Locale.ROOT));
                    } catch (IllegalArgumentException ex) {
                        throw validationError("Invalid status value");
                    }
                })
                .collect(Collectors.toList());
    }

    private List<TaskPriority> parsePriorityList(String value) {
        return parseCsv(value).stream()
                .map(item -> {
                    try {
                        return TaskPriority.valueOf(item.toUpperCase(Locale.ROOT));
                    } catch (IllegalArgumentException ex) {
                        throw validationError("Invalid priority value");
                    }
                })
                .collect(Collectors.toList());
    }

    private List<String> parseCsv(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return java.util.Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(item -> !item.isEmpty())
                .collect(Collectors.toList());
    }

    private Long parseLong(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Long.valueOf(value.trim());
        } catch (NumberFormatException ex) {
            throw validationError("Invalid id: " + value);
        }
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return DateParser.parseDate(value);
        } catch (RuntimeException ex) {
            throw validationError("Invalid date: " + value);
        }
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private Long asLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        String text = String.valueOf(value).trim();
        if (text.isEmpty()) {
            return null;
        }
        try {
            return Long.valueOf(text);
        } catch (NumberFormatException ex) {
            throw validationError("Invalid id: " + text);
        }
    }

    private Integer asInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.valueOf(String.valueOf(value).trim());
        } catch (NumberFormatException ex) {
            throw validationError("Invalid number: " + value);
        }
    }

    private LocalDate asDate(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return DateParser.parseDate(String.valueOf(value));
        } catch (RuntimeException ex) {
            throw validationError("Invalid due date");
        }
    }

    private LocalDateTime asDateTime(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return DateParser.parseDateTime(String.valueOf(value));
        } catch (RuntimeException ex) {
            throw validationError("Invalid reminder date");
        }
    }

    private List<String> asStringList(Object value, String message) {
        if (value == null) {
            return new ArrayList<>();
        }
        if (!(value instanceof Collection<?> collection)) {
            throw validationError(message);
        }
        return collection.stream().map(String::valueOf).collect(Collectors.toList());
    }

    private List<Long> asLongList(Object value, String message) {
        if (value == null) {
            return List.of();
        }
        if (!(value instanceof Collection<?> collection)) {
            throw validationError(message);
        }
        List<Long> ids = new ArrayList<>();
        for (Object item : collection) {
            Long id = asLong(item);
            if (id != null) {
                ids.add(id);
            }
        }
        return ids;
    }

    @SuppressWarnings("unchecked")
    private TaskRequests.RecurrenceRequest asRecurrence(Object value) {
        if (value == null) {
            return null;
        }
        if (!(value instanceof Map<?, ?> map)) {
            throw validationError("Invalid recurrence value");
        }
        Map<String, Object> recurrence = (Map<String, Object>) map;
        Integer interval = recurrence.get("interval") == null ? null : asInteger(recurrence.get("interval"));
        LocalDate endDate = recurrence.get("endDate") == null ? null : asDate(recurrence.get("endDate"));
        String frequency = recurrence.get("frequency") == null ? "none" : String.valueOf(recurrence.get("frequency"));
        return new TaskRequests.RecurrenceRequest(frequency, interval, endDate);
    }

    private BadRequestException validationError(String message) {
        return new BadRequestException(message, "VALIDATION_ERROR", HttpStatus.UNPROCESSABLE_ENTITY);
    }
}
