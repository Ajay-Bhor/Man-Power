package com.company.hr.repository;

import com.company.hr.entity.EmployeeStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmployeeStatusHistoryRepository extends JpaRepository<EmployeeStatusHistory, Long> {
    List<EmployeeStatusHistory> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);
}
