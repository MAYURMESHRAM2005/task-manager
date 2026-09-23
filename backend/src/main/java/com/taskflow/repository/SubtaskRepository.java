package com.taskflow.repository;

import com.taskflow.entity.Subtask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SubtaskRepository extends JpaRepository<Subtask, Long> {

    List<Subtask> findByTaskIdOrderByPositionAscCreatedAtAsc(Long taskId);

    @Query("select coalesce(max(s.position), -1) from Subtask s where s.task.id = :taskId")
    int maxPosition(@Param("taskId") Long taskId);

    @Modifying
    @Query("delete from Subtask s where s.task.id = :taskId")
    void deleteByTaskId(@Param("taskId") Long taskId);
}
