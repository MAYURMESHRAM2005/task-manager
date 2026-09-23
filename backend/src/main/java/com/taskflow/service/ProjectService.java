package com.taskflow.service;

import com.taskflow.dto.request.ProjectRequests;
import com.taskflow.dto.response.ServiceResults;
import com.taskflow.entity.Project;
import com.taskflow.entity.ProjectMember;
import com.taskflow.entity.User;
import com.taskflow.entity.enums.ActivityEntityType;
import com.taskflow.entity.enums.MemberRole;
import com.taskflow.entity.enums.NotificationType;
import com.taskflow.entity.enums.ProjectStatus;
import com.taskflow.entity.enums.Role;
import com.taskflow.entity.enums.TaskStatus;
import com.taskflow.exception.BadRequestException;
import com.taskflow.exception.ConflictException;
import com.taskflow.exception.ForbiddenException;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.ProjectRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.UserRepository;
import com.taskflow.util.Pagination;
import com.taskflow.util.PaginationUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ActivityService activityService;

    public ProjectService(ProjectRepository projectRepository, TaskRepository taskRepository,
                          UserRepository userRepository, NotificationService notificationService,
                          ActivityService activityService) {
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.activityService = activityService;
    }

    @Transactional
    public Project createProject(ProjectRequests.CreateProjectRequest request, User current,
                                 String ip, String userAgent) {
        Project project = new Project();
        project.setName(request.name().trim());
        project.setDescription(request.description() == null ? "" : request.description());
        project.setOwner(current);
        project.setStatus(parseStatus(request.status()));
        project.setStartDate(request.startDate());
        project.setEndDate(request.endDate());
        project.addMember(current, MemberRole.OWNER);
        projectRepository.save(project);

        activityService.logActivity(current, "PROJECT_CREATED", ActivityEntityType.Project, project.getId(),
                "Project created: \"" + project.getName() + "\"", null, ip, userAgent);
        return project;
    }

    @Transactional(readOnly = true)
    public ServiceResults.PageResult<Project> getProjects(PaginationUtils.PageRequest page, User current) {
        PageRequest pageRequest = PageRequest.of(page.page() - 1, page.limit(),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Project> result = current.getRole() == Role.USER
                ? projectRepository.findByMemberUserId(current.getId(), pageRequest)
                : projectRepository.findAll(pageRequest);

        for (Project project : result.getContent()) {
            project.setTaskStats(buildTaskStats(project.getId(), false));
            project.setHealth(computeHealth(project.getId()));
        }

        return new ServiceResults.PageResult<>(result.getContent(),
                Pagination.of(page.page(), page.limit(), result.getTotalElements()));
    }

    @Transactional(readOnly = true)
    public Project getProjectById(Long id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found.", "PROJECT_NOT_FOUND"));
        project.setTaskStats(buildTaskStats(id, true));
        project.setHealth(computeHealth(id));
        return project;
    }

    @Transactional
    public Project updateProject(Long id, ProjectRequests.UpdateProjectRequest request, User current,
                                 String ip, String userAgent) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found.", "PROJECT_NOT_FOUND"));

        ProjectMember member = findMember(project, current.getId());
        if (member == null || !canManage(member)) {
            throw new ForbiddenException("You do not have permission to update this project.", "NOT_AUTHORIZED");
        }

        if (request.name() != null) {
            project.setName(request.name().trim());
        }
        if (request.description() != null) {
            project.setDescription(request.description());
        }
        if (request.status() != null) {
            project.setStatus(parseStatus(request.status()));
        }
        if (request.startDate() != null) {
            project.setStartDate(request.startDate());
        }
        if (request.endDate() != null) {
            project.setEndDate(request.endDate());
        }
        projectRepository.save(project);

        activityService.logActivity(current, "PROJECT_UPDATED", ActivityEntityType.Project, project.getId(),
                "Project updated: \"" + project.getName() + "\"", null, ip, userAgent);
        return project;
    }

    @Transactional
    public void deleteProject(Long id, User current, String ip, String userAgent) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found.", "PROJECT_NOT_FOUND"));

        if (!project.getOwner().getId().equals(current.getId())) {
            throw new ForbiddenException("Only the project owner can delete it.", "NOT_AUTHORIZED");
        }

        taskRepository.unassignProject(id);
        projectRepository.delete(project);

        activityService.logActivity(current, "PROJECT_DELETED", ActivityEntityType.Project, id,
                "Project deleted successfully", null, ip, userAgent);
    }

    @Transactional
    public Project addMember(Long projectId, Long memberId, String role, User current,
                             String ip, String userAgent) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found.", "PROJECT_NOT_FOUND"));

        ProjectMember requester = findMember(project, current.getId());
        if (requester == null || !canManage(requester)) {
            throw new ForbiddenException("You do not have permission to manage project members.", "NOT_AUTHORIZED");
        }
        if (memberId == null) {
            throw new BadRequestException("userId is required.", "VALIDATION_ERROR", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        if (findMember(project, memberId) != null) {
            throw new ConflictException("User is already a member of this project.", "ALREADY_MEMBER");
        }

        User user = userRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found.", "USER_NOT_FOUND"));
        project.addMember(user, parseMemberRole(role));
        projectRepository.save(project);

        notificationService.createAndPush(user, NotificationType.PROJECT_MEMBER_ADDED,
                "You have been added to project: \"" + project.getName() + "\"", "Project", project.getId());

        activityService.logActivity(current, "PROJECT_MEMBER_ADDED", ActivityEntityType.Project, project.getId(),
                "Member added to project", null, ip, userAgent);
        return project;
    }

    @Transactional
    public Project removeMember(Long projectId, Long memberId, User current, String ip, String userAgent) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found.", "PROJECT_NOT_FOUND"));

        ProjectMember requester = findMember(project, current.getId());
        if (requester == null || !canManage(requester)) {
            throw new ForbiddenException("You do not have permission to manage project members.", "NOT_AUTHORIZED");
        }
        if (project.getOwner().getId().equals(memberId)) {
            throw new BadRequestException("Cannot remove the project owner.", "CANNOT_REMOVE_OWNER");
        }

        ProjectMember member = findMember(project, memberId);
        if (member == null) {
            throw new ResourceNotFoundException("User is not a member of this project.", "MEMBER_NOT_FOUND");
        }
        project.getMembers().remove(member);
        projectRepository.save(project);

        activityService.logActivity(current, "PROJECT_MEMBER_REMOVED", ActivityEntityType.Project, project.getId(),
                "Member removed from project", null, ip, userAgent);
        return project;
    }

    // ─── Stats / health ──────────────────────────────────────────────────────

    private ServiceResults.TaskStats buildTaskStats(Long projectId, boolean withBreakdown) {
        long total = taskRepository.countByProjectId(projectId);
        long completed = taskRepository.countByProjectIdAndStatus(projectId, TaskStatus.COMPLETED);
        long overdue = taskRepository.countOverdueInProject(projectId, LocalDate.now().plusDays(1),
                List.of(TaskStatus.TODO, TaskStatus.IN_PROGRESS));
        int completionPercentage = total > 0 ? (int) Math.round((completed * 100.0) / total) : 0;

        Map<String, Long> breakdown = null;
        if (withBreakdown) {
            breakdown = new LinkedHashMap<>();
            for (TaskStatus status : TaskStatus.values()) {
                breakdown.put(status.name(), taskRepository.countByProjectIdAndStatus(projectId, status));
            }
        }
        return new ServiceResults.TaskStats(total, completed, overdue, completionPercentage, breakdown);
    }

    private ServiceResults.Health computeHealth(Long projectId) {
        long total = taskRepository.countByProjectId(projectId);
        if (total == 0) {
            return new ServiceResults.Health(100, "No Tasks", "#94a3b8");
        }
        long completed = taskRepository.countByProjectIdAndStatus(projectId, TaskStatus.COMPLETED);
        long inProgress = taskRepository.countByProjectIdAndStatus(projectId, TaskStatus.IN_PROGRESS);
        long overdue = taskRepository.countOverdueInProject(projectId, LocalDate.now().plusDays(1),
                List.of(TaskStatus.TODO, TaskStatus.IN_PROGRESS));

        double completionRate = (double) completed / total;
        double overdueRate = (double) overdue / total;
        double activeRate = (double) (inProgress + completed) / total;
        int score = (int) Math.round((completionRate * 50) + ((1 - overdueRate) * 30) + (activeRate * 20));

        String label;
        String color;
        if (score >= 80) {
            label = "Healthy";
            color = "#22c55e";
        } else if (score >= 60) {
            label = "On Track";
            color = "#f59e0b";
        } else if (score >= 40) {
            label = "At Risk";
            color = "#f97316";
        } else {
            label = "Needs Attention";
            color = "#ef4444";
        }
        return new ServiceResults.Health(score, label, color);
    }

    private ProjectMember findMember(Project project, Long userId) {
        if (userId == null) {
            return null;
        }
        return project.getMembers().stream()
                .filter(member -> member.getUser() != null && userId.equals(member.getUser().getId()))
                .findFirst()
                .orElse(null);
    }

    private boolean canManage(ProjectMember member) {
        return member.getRole() == MemberRole.OWNER || member.getRole() == MemberRole.MANAGER;
    }

    private ProjectStatus parseStatus(String value) {
        if (value == null || value.isBlank()) {
            return ProjectStatus.PLANNED;
        }
        try {
            return ProjectStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid status value", "VALIDATION_ERROR", HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }

    private MemberRole parseMemberRole(String value) {
        if (value == null || value.isBlank()) {
            return MemberRole.MEMBER;
        }
        try {
            return MemberRole.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid role value", "VALIDATION_ERROR", HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }
}
