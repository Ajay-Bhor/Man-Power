package com.company.hr.repository;

import com.company.hr.entity.AccessPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AccessPolicyRepository extends JpaRepository<AccessPolicy, Long> {
    Optional<AccessPolicy> findByPolicyKey(String policyKey);
}
