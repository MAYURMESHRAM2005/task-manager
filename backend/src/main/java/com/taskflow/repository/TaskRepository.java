package com.taskflow.repository;

import com.taskflow.entity.Task;
import com.taskflow.entity.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {

    long countByProjectId(Long projectId);

    long countByProjectIdAndStatus(Long projectId, TaskStatus status);

    @Query("select count(t) from Task t where t.project.id = :projectId and t.dueDate < :date and t.status in :statuses")
    long countOverdueInProject(@Param("projectId") Long projectId,
                               @Param("date") LocalDate date,
                               @Param("statuses") Collection<TaskStatus> statuses);

    @Query("select coalesce(max(t.position), -1) from Task t where t.status = :status and t.project is null")
    int maxPositionWithoutProject(@Param("status") TaskStatus status);

    @Query("select coalesce(max(t.position), -1) from Task t where t.status = :status and t.project.id = :projectId")
    int maxPositionInProject(@Param("status") TaskStatus status, @Param("projectId") Long projectId);

    /** Tasks that declare the given task as a dependency (used for cleanup on delete). */
    @Query("select t from Task t join t.dependencies d where d.id = :taskId")
    List<Task> findDependents(@Param("taskId") Long taskId);

    @Modifying
    @Query("update Task t set t.project = null where t.project.id = :projectId")
    void unassignProject(@Param("projectId") Long projectId);

    List<Task> findByReminderAtBeforeAndReminderNotifiedFalseAndStatusNotIn(LocalDateTime reminderAt,
                                                                           Collection<TaskStatus> statuses);

    List<Task> findByDueDateBetweenAndReminderNotifiedFalseAndStatusNotIn(LocalDate from,
                                                                          LocalDate to,
                                                                          Collection<TaskStatus> statuses);

    List<Task> findByDueDateBeforeAndStatusNotIn(LocalDate date, Collection<TaskStatus> statuses);

    List<Task> findByStatusAndRecurrenceFrequencyNot(TaskStatus status, String frequency);

    long countByTitleAndCreatedByIdAndNextRecurrenceAtIsNotNullAndStatusIn(String title,
                                                                          Long createdById,
                                                                          Collection<TaskStatus> statuses);

    @Query("select t.status, count(t) from Task t group by t.status")
    List<Object[]> countGroupedByStatus();

    @Query("select t.priority, count(t) from Task t group by t.priority")
    List<Object[]> countGroupedByPriority();
}
