package com.taskflow.repository;

import com.taskflow.entity.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long>, JpaSpecificationExecutor<ActivityLog> {

    Page<ActivityLog> findByProjectId(Long projectId, Pageable pageable);

    Page<ActivityLog> findByUserId(Long userId, Pageable pageable);
}
