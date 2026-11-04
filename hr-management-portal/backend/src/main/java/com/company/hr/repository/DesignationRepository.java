package com.company.hr.repository;

import com.company.hr.entity.Designation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DesignationRepository extends JpaRepository<Designation, Long> {
    List<Designation> findByDepartmentIdAndActiveTrue(Long departmentId);
    List<Designation> findByActiveTrue();
}
