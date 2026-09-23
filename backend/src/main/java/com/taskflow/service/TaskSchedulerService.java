package com.taskflow.service;

import com.taskflow.entity.Task;
import com.taskflow.entity.enums.NotificationType;
import com.taskflow.entity.enums.TaskStatus;
import com.taskflow.repository.TaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Port of the original Node schedulers: task reminders, due-soon/overdue alerts
 * and recurring task generation.
 */
@Service
public class TaskSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(TaskSchedulerService.class);

    private static final List<TaskStatus> NOT_DONE_STATUSES =
            List.of(TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW);
    private static final List<TaskStatus> OPEN_STATUSES =
            List.of(TaskStatus.TODO, TaskStatus.IN_PROGRESS);

    private final TaskRepository taskRepository;
    private final NotificationService notificationService;

    public TaskSchedulerService(TaskRepository taskRepository, NotificationService notificationService) {
        this.taskRepository = taskRepository;
        this.notificationService = notificationService;
    }

    /** Marks reminders due and notifies the assignee (or creator). Runs every minute. */
    @Scheduled(initialDelay = 30_000, fixedDelayString = "${app.scheduler.reminder-interval-ms:60000}")
    @Transactional
    public void checkReminders() {
        LocalDateTime now = LocalDateTime.now();
        List<Task> tasks = taskRepository
                .findByReminderAtBeforeAndReminderNotifiedFalseAndStatusNotIn(now, List.of(
                        TaskStatus.COMPLETED, TaskStatus.CANCELLED));

        for (Task task : tasks) {
            Long userId = task.getAssignedTo() != null ? task.getAssignedTo().getId() : task.getCreatedBy().getId();
            if (userId != null && !notificationService.existsForUser(userId, NotificationType.TASK_REMINDER, task.getId())) {
                notificationService.createAndPushToUser(userId, NotificationType.TASK_REMINDER,
                        "\u23F0 Reminder: Task \"" + task.getTitle() + "\" is due now", "Task", task.getId());
            }
            task.setReminderNotified(true);
            taskRepository.save(task);
        }
        if (!tasks.isEmpty()) {
            log.info("[ReminderScheduler] Processed {} reminder(s)", tasks.size());
        }
    }

    /** Creates due-soon and overdue notifications. Runs every 5 minutes. */
    @Scheduled(initialDelay = 60_000, fixedDelayString = "${app.scheduler.due-date-interval-ms:300000}")
    @Transactional
    public void checkDueDates() {
        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);

        List<Task> dueSoonTasks = taskRepository
                .findByDueDateBetweenAndReminderNotifiedFalseAndStatusNotIn(today, tomorrow, NOT_DONE_STATUSES);
        for (Task task : dueSoonTasks) {
            Long userId = notifyTarget(task);
            if (userId != null && !notificationService.existsForUser(userId, NotificationType.TASK_DUE_SOON, task.getId())) {
                notificationService.createAndPushToUser(userId, NotificationType.TASK_DUE_SOON,
                        "\u23F0 Task \"" + task.getTitle() + "\" is due soon", "Task", task.getId());
            }
        }

        List<Task> overdueTasks = taskRepository
                .findByDueDateBeforeAndStatusNotIn(tomorrow, NOT_DONE_STATUSES);
        for (Task task : overdueTasks) {
            Long userId = notifyTarget(task);
            if (userId != null && !notificationService.existsForUser(userId, NotificationType.TASK_OVERDUE, task.getId())) {
                notificationService.createAndPushToUser(userId, NotificationType.TASK_OVERDUE,
                        "\u26A0\uFE0F Task \"" + task.getTitle() + "\" is overdue", "Task", task.getId());
            }
        }

        int total = dueSoonTasks.size() + overdueTasks.size();
        if (total > 0) {
            log.info("[DueDateScheduler] Processed {} due-soon, {} overdue",
                    dueSoonTasks.size(), overdueTasks.size());
        }
    }

    /** Generates the next instance of completed recurring tasks. Runs every 5 minutes. */
    @Scheduled(initialDelay = 90_000, fixedDelayString = "${app.scheduler.recurring-interval-ms:300000}")
    @Transactional
    public void checkRecurringTasks() {
        List<Task> completedRecurring = taskRepository
                .findByStatusAndRecurrenceFrequencyNot(TaskStatus.COMPLETED, "none");

        for (Task task : completedRecurring) {
            LocalDateTime nextDate = getNextOccurrence(task.getCompletedAt(), task.getRecurrenceFrequency(),
                    task.getRecurrenceInterval() == null ? 1 : task.getRecurrenceInterval());
            if (nextDate == null) {
                continue;
            }
            if (task.getRecurrenceEndDate() != null && nextDate.toLocalDate().isAfter(task.getRecurrenceEndDate())) {
                task.setRecurrenceFrequency("none");
                task.setNextRecurrenceAt(null);
                taskRepository.save(task);
                continue;
            }

            long existing = taskRepository.countByTitleAndCreatedByIdAndNextRecurrenceAtIsNotNullAndStatusIn(
                    task.getTitle(), task.getCreatedBy().getId(), NOT_DONE_STATUSES);
            if (existing > 0) {
                continue;
            }

            Task next = new Task();
            next.setTitle(task.getTitle());
            next.setDescription(task.getDescription());
            next.setStatus(TaskStatus.TODO);
            next.setPriority(task.getPriority());
            next.setCategory(task.getCategory());
            next.setLabels(new ArrayList<>(task.getLabels()));
            next.setDueDate(nextDate.toLocalDate());
            next.setCreatedBy(task.getCreatedBy());
            next.setAssignedTo(task.getAssignedTo());
            next.setProject(task.getProject());
            next.setRecurrenceFrequency(task.getRecurrenceFrequency());
            next.setRecurrenceInterval(task.getRecurrenceInterval());
            next.setRecurrenceEndDate(task.getRecurrenceEndDate());
            next.setNextRecurrenceAt(nextDate);
            taskRepository.save(next);

            task.setNextRecurrenceAt(null);
            taskRepository.save(task);

            if (next.getAssignedTo() != null
                    && !next.getAssignedTo().getId().equals(next.getCreatedBy().getId())) {
                notificationService.createAndPushToUser(next.getAssignedTo().getId(), NotificationType.TASK_ASSIGNED,
                        "Recurring task \"" + next.getTitle() + "\" is due on " + next.getDueDate(),
                        "Task", next.getId());
            }
            log.info("[RecurringScheduler] Created next instance for task: {}", task.getTitle());
        }
    }

    private Long notifyTarget(Task task) {
        if (task.getAssignedTo() != null) {
            return task.getAssignedTo().getId();
        }
        return task.getCreatedBy() == null ? null : task.getCreatedBy().getId();
    }

    private LocalDateTime getNextOccurrence(LocalDateTime completedAt, String frequency, int interval) {
        if (completedAt == null || frequency == null || "none".equals(frequency)) {
            return null;
        }
        return switch (frequency) {
            case "daily" -> completedAt.plusDays(interval);
            case "weekly" -> completedAt.plusWeeks(interval);
            case "monthly" -> completedAt.plusMonths(interval);
            case "yearly" -> completedAt.plusYears(interval);
            default -> null;
        };
    }
}
