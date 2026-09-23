package com.taskflow.repository;

import com.taskflow.entity.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    @Query("select distinct p from Project p join p.members m where m.user.id = :userId")
    Page<Project> findByMemberUserId(@Param("userId") Long userId, Pageable pageable);
}
