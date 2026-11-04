package com.company.hr.repository;

import com.company.hr.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Boolean existsByUsername(String username);
    Boolean existsByEmail(String email);

    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.roleName = :roleName AND u.status = 'ACTIVE'")
    List<User> findActiveUsersByRole(@Param("roleName") String roleName);

    @Query("SELECT DISTINCT u FROM User u JOIN u.roles r WHERE u.status = 'ACTIVE' AND r.roleName IN ('ROLE_INTERVIEWER', 'ROLE_DEPT_HEAD', 'ROLE_APPROVING_MANAGER', 'ROLE_HR_ADMIN', 'ROLE_HRBP')")
    List<User> findEligibleInterviewers();

    long countByStatus(User.UserStatus status);
}
