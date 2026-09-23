package com.taskflow.service;

import com.taskflow.dto.response.ServiceResults;
import com.taskflow.entity.ActivityLog;
import com.taskflow.entity.User;
import com.taskflow.entity.enums.ActivityEntityType;
import com.taskflow.repository.ActivityLogRepository;
import com.taskflow.util.Pagination;
import com.taskflow.util.PaginationUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Audit logging (Admin audit trail) and activity feeds. */
@Service
public class ActivityService {

    private static final Logger log = LoggerFactory.getLogger(ActivityService.class);

    private final ActivityLogRepository activityLogRepository;

    public ActivityService(ActivityLogRepository activityLogRepository) {
        this.activityLogRepository = activityLogRepository;
    }

    @Transactional
    public void logActivity(User user, String action, ActivityEntityType entity, Long entityId,
                            String description, Long projectId, String ipAddress, String userAgent) {
        try {
            ActivityLog entry = new ActivityLog();
            entry.setUser(user);
            entry.setAction(action);
            entry.setEntity(entity);
            entry.setEntityId(entityId);
            entry.setDescription(description == null ? "" : description);
            entry.setProjectId(projectId);
            entry.setIpAddress(ipAddress == null ? "" : ipAddress);
            entry.setUserAgent(userAgent == null ? "" : truncate(userAgent));
            activityLogRepository.save(entry);
        } catch (Exception ex) {
            // Audit logging must never break the main operation.
            log.warn("Failed to log activity {}: {}", action, ex.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public ServiceResults.PageResult<ActivityLog> getAuditLogs(PaginationUtils.PageRequest page,
                                                               Long userId,
                                                               String entity,
                                                               String action) {
        Specification<ActivityLog> specification = (root, query, cb) -> userId == null
                ? cb.conjunction()
                : cb.equal(root.get("user").get("id"), userId);
        if (entity != null && !entity.isBlank()) {
            try {
                ActivityEntityType entityType = ActivityEntityType.valueOf(entity.trim());
                specification = specification.and((root, query, cb) -> cb.equal(root.get("entity"), entityType));
            } catch (IllegalArgumentException ignored) {
                // Unknown entity filter — ignore it rather than failing the request.
            }
        }
        if (action != null && !action.isBlank()) {
            String pattern = "%" + action.toLowerCase() + "%";
            specification = specification.and((root, query, cb) ->
                    cb.like(cb.lower(root.get("action")), pattern));
        }

        Page<ActivityLog> result = activityLogRepository.findAll(specification,
                PageRequest.of(page.page() - 1, page.limit(), Sort.by(Sort.Direction.DESC, "createdAt")));

        return new ServiceResults.PageResult<>(result.getContent(),
                Pagination.of(page.page(), page.limit(), result.getTotalElements()));
    }

    @Transactional(readOnly = true)
    public ServiceResults.PageResult<ActivityLog> getProjectActivity(Long projectId, PaginationUtils.PageRequest page) {
        Page<ActivityLog> result = activityLogRepository.findByProjectId(projectId,
                PageRequest.of(page.page() - 1, page.limit(), Sort.by(Sort.Direction.DESC, "createdAt")));
        return new ServiceResults.PageResult<>(result.getContent(),
                Pagination.of(page.page(), page.limit(), result.getTotalElements()));
    }

    @Transactional(readOnly = true)
    public ServiceResults.PageResult<ActivityLog> getUserActivity(Long userId, PaginationUtils.PageRequest page) {
        Page<ActivityLog> result = activityLogRepository.findByUserId(userId,
                PageRequest.of(page.page() - 1, page.limit(), Sort.by(Sort.Direction.DESC, "createdAt")));
        return new ServiceResults.PageResult<>(result.getContent(),
                Pagination.of(page.page(), page.limit(), result.getTotalElements()));
    }

    private String truncate(String value) {
        return value.length() > 500 ? value.substring(0, 500) : value;
    }
}
