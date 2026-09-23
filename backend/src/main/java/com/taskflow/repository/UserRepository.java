package com.taskflow.repository;

import com.taskflow.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    Page<User> findByActiveTrue(Pageable pageable);

    @Query("select u from User u where u.active = true and (lower(u.name) like lower(concat('%', :q, '%'))"
            + " or lower(u.email) like lower(concat('%', :q, '%')))")
    Page<User> searchActive(@Param("q") String query, Pageable pageable);

    @Query("select u from User u where lower(u.name) in :values or lower(u.email) in :values")
    List<User> findByLowerNameOrLowerEmailIn(@Param("values") Collection<String> values);

    long countByActiveTrue();
}
