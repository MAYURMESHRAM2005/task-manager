package com.taskflow.repository;

import com.taskflow.entity.Team;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TeamRepository extends JpaRepository<Team, Long> {

    @Query("select distinct t from Team t join t.members m where m.user.id = :userId")
    Page<Team> findByMemberUserId(@Param("userId") Long userId, Pageable pageable);
}
