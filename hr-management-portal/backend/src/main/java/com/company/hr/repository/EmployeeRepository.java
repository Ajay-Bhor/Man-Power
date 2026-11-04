package com.company.hr.repository;

import com.company.hr.entity.Employee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long>, JpaSpecificationExecutor<Employee> {
    Optional<Employee> findByEmployeeCode(String employeeCode);
    Optional<Employee> findByEmail(String email);
    Page<Employee> findByDepartmentId(Long departmentId, Pageable pageable);
    
    @Query("SELECT COUNT(e) FROM Employee e WHERE e.candidate IS NOT NULL")
    long countAtsRecruited();

    @Query("SELECT COUNT(e) FROM Employee e WHERE e.candidate IS NOT NULL AND e.status = :status")
    long countAtsRecruitedByStatus(@Param("status") Employee.EmployeeStatus status);

    @Query("SELECT COUNT(e) FROM Employee e WHERE e.candidate IS NOT NULL AND e.status IN :statuses")
    long countAtsRecruitedByStatusIn(@Param("statuses") Collection<Employee.EmployeeStatus> statuses);

    @Query("SELECT COUNT(e) FROM Employee e WHERE e.candidate IS NOT NULL AND e.status = 'ON_PROBATION' AND e.probationEndDate IS NOT NULL AND e.probationEndDate <= :threshold AND (e.confirmationStatus IS NULL OR e.confirmationStatus <> 'CONFIRMED')")
    long countConfirmationDue(@Param("threshold") LocalDate threshold);

    @Query("SELECT COUNT(e) FROM Employee e WHERE e.candidate IS NOT NULL AND e.joiningDate >= :startDate AND e.joiningDate <= :endDate")
    long countNewJoinersBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
