package com.company.hr.repository;

import com.company.hr.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findByEntityTypeOrderByTimestampDesc(String entityType, Pageable pageable);
    Page<AuditLog> findByEntityTypeIn(List<String> entityTypes, Pageable pageable);
    List<AuditLog> findTop20ByOrderByTimestampDesc();
}
