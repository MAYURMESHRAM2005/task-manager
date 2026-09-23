package com.taskflow.service;

import com.taskflow.dto.response.ServiceResults;
import com.taskflow.entity.User;
import com.taskflow.entity.enums.ActivityEntityType;
import com.taskflow.entity.enums.Role;
import com.taskflow.exception.BadRequestException;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.ProjectRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.TeamRepository;
import com.taskflow.repository.UserRepository;
import com.taskflow.util.Pagination;
import com.taskflow.util.PaginationUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final TeamRepository teamRepository;
    private final ActivityService activityService;

    public AdminService(UserRepository userRepository, TaskRepository taskRepository,
                        ProjectRepository projectRepository, TeamRepository teamRepository,
                        ActivityService activityService) {
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.teamRepository = teamRepository;
        this.activityService = activityService;
    }

    @Transactional(readOnly = true)
    public ServiceResults.PageResult<User> getUsers(PaginationUtils.PageRequest page) {
        Page<User> result = userRepository.findAll(PageRequest.of(page.page() - 1, page.limit(),
                Sort.by(Sort.Direction.DESC, "createdAt")));
        return new ServiceResults.PageResult<>(result.getContent(),
                Pagination.of(page.page(), page.limit(), result.getTotalElements()));
    }

    @Transactional
    public User updateUserStatus(Long id, Boolean isActive, User current, String ip, String userAgent) {
        if (isActive == null) {
            throw new BadRequestException("isActive is required.", "VALIDATION_ERROR",
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found.", "USER_NOT_FOUND"));

        user.setActive(isActive);
        userRepository.save(user);

        activityService.logActivity(current, isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
                ActivityEntityType.User, user.getId(),
                "User " + user.getEmail() + (isActive ? " activated" : " deactivated"), null, ip, userAgent);
        return user;
    }

    @Transactional
    public User updateUserRole(Long id, String roleValue, User current, String ip, String userAgent) {
        if (roleValue == null || roleValue.isBlank()) {
            throw new BadRequestException("role is required.", "VALIDATION_ERROR", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        Role role;
        try {
            role = Role.valueOf(roleValue.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid role value", "VALIDATION_ERROR",
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found.", "USER_NOT_FOUND"));
        user.setRole(role);
        userRepository.save(user);

        activityService.logActivity(current, "ROLE_CHANGED", ActivityEntityType.User, user.getId(),
                "User " + user.getEmail() + " role changed to " + role, null, ip, userAgent);
        return user;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStatistics() {
        Map<String, Object> statistics = new LinkedHashMap<>();
        statistics.put("totalUsers", userRepository.count());
        statistics.put("activeUsers", userRepository.countByActiveTrue());
        statistics.put("totalTasks", taskRepository.count());
        statistics.put("totalProjects", projectRepository.count());
        statistics.put("totalTeams", teamRepository.count());

        Map<String, Long> statusBreakdown = new LinkedHashMap<>();
        for (Object[] row : taskRepository.countGroupedByStatus()) {
            statusBreakdown.put(String.valueOf(row[0]), ((Number) row[1]).longValue());
        }
        Map<String, Long> priorityBreakdown = new LinkedHashMap<>();
        for (Object[] row : taskRepository.countGroupedByPriority()) {
            priorityBreakdown.put(String.valueOf(row[0]), ((Number) row[1]).longValue());
        }
        statistics.put("taskStatusBreakdown", statusBreakdown);
        statistics.put("taskPriorityBreakdown", priorityBreakdown);
        return statistics;
    }
}
