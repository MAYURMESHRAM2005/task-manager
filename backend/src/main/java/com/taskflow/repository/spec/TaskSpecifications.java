package com.taskflow.repository.spec;

import com.taskflow.entity.Task;
import com.taskflow.entity.enums.TaskPriority;
import com.taskflow.entity.enums.TaskStatus;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.List;

/** Dynamic, role-aware filtering translated from the original Mongo query builder. */
public final class TaskSpecifications {

    private TaskSpecifications() {
    }

    public static Specification<Task> none() {
        return (root, query, cb) -> cb.conjunction();
    }

    /** USER role only sees tasks they created or are assigned to. */
    public static Specification<Task> accessibleBy(String role, Long userId) {
        if (!"USER".equals(role)) {
            return null;
        }
        return (root, query, cb) -> cb.or(
                cb.equal(root.get("createdBy").get("id"), userId),
                cb.equal(root.join("assignedTo", JoinType.LEFT).get("id"), userId));
    }

    public static Specification<Task> statusIn(List<TaskStatus> statuses) {
        return statuses == null || statuses.isEmpty()
                ? null
                : (root, query, cb) -> root.get("status").in(statuses);
    }

    public static Specification<Task> priorityIn(List<TaskPriority> priorities) {
        return priorities == null || priorities.isEmpty()
                ? null
                : (root, query, cb) -> root.get("priority").in(priorities);
    }

    public static Specification<Task> categoryEquals(String category) {
        return category == null || category.isBlank()
                ? null
                : (root, query, cb) -> cb.equal(root.get("category"), category);
    }

    public static Specification<Task> labeledWith(List<String> labels) {
        if (labels == null || labels.isEmpty()) {
            return null;
        }
        return (root, query, cb) -> {
            if (query != null) {
                query.distinct(true);
            }
            return root.join("labels", JoinType.LEFT).in(labels);
        };
    }

    public static Specification<Task> inProject(Long projectId) {
        return projectId == null
                ? null
                : (root, query, cb) -> cb.equal(root.join("project", JoinType.LEFT).get("id"), projectId);
    }

    public static Specification<Task> assignedTo(Long userId) {
        return userId == null
                ? null
                : (root, query, cb) -> cb.equal(root.join("assignedTo", JoinType.LEFT).get("id"), userId);
    }

    public static Specification<Task> createdBy(Long userId) {
        return userId == null
                ? null
                : (root, query, cb) -> cb.equal(root.get("createdBy").get("id"), userId);
    }

    public static Specification<Task> matchesSearch(String search) {
        if (search == null || search.isBlank()) {
            return null;
        }
        String pattern = "%" + search.trim().toLowerCase() + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("title")), pattern),
                cb.like(cb.lower(cb.coalesce(root.get("description"), "")), pattern));
    }

    public static Specification<Task> dueBefore(LocalDate date) {
        return date == null
                ? null
                : (root, query, cb) -> cb.lessThanOrEqualTo(root.get("dueDate"), date);
    }

    public static Specification<Task> dueAfter(LocalDate date) {
        return date == null
                ? null
                : (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("dueDate"), date);
    }

    public static Specification<Task> dueBetween(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            return null;
        }
        return (root, query, cb) -> cb.between(root.get("dueDate"), from, to);
    }

    /** Mirrors the original "overdue" rule: due date not in the future, still TODO/IN_PROGRESS. */
    public static Specification<Task> overdue() {
        LocalDate cutOff = LocalDate.now().plusDays(1);
        return (root, query, cb) -> cb.and(
                cb.lessThan(root.get("dueDate"), cutOff),
                root.get("status").in(List.of(TaskStatus.TODO, TaskStatus.IN_PROGRESS)));
    }

    public static Specification<Task> hasDependencies() {
        return (root, query, cb) -> cb.isNotEmpty(root.get("dependencies"));
    }

    @SafeVarargs
    public static Specification<Task> allOf(Specification<Task>... specifications) {
        Specification<Task> result = null;
        for (Specification<Task> specification : specifications) {
            if (specification == null) {
                continue;
            }
            result = result == null ? specification : result.and(specification);
        }
        return result == null ? none() : result;
    }
}
