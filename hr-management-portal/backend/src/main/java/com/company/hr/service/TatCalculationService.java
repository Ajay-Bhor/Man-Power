package com.company.hr.service;

import com.company.hr.dto.TatSummaryResponse;
import com.company.hr.entity.Requisition;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Service
public class TatCalculationService {

    @Value("${app.tat.default-target-days:30}")
    private int defaultTargetDays;

    @Value("${app.tat.calculation-mode:CALENDAR_DAYS}")
    private String calculationMode;

    /**
     * Calculates due date based on start date and target days.
     */
    public LocalDate calculateDueDate(LocalDate startDate, int targetDays) {
        if (startDate == null) return null;

        if ("WORKING_DAYS".equalsIgnoreCase(calculationMode)) {
            LocalDate current = startDate;
            int addedDays = 0;
            while (addedDays < targetDays) {
                current = current.plusDays(1);
                if (current.getDayOfWeek() != DayOfWeek.SATURDAY && current.getDayOfWeek() != DayOfWeek.SUNDAY) {
                    addedDays++;
                }
            }
            return current;
        } else {
            // Default: 30 Calendar Days
            return startDate.plusDays(targetDays);
        }
    }

    /**
     * Calculates days elapsed between start date and target reference date.
     */
    public int calculateDaysElapsed(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) return 0;
        LocalDate referenceDate = (endDate != null) ? endDate : LocalDate.now();

        if ("WORKING_DAYS".equalsIgnoreCase(calculationMode)) {
            int workingDays = 0;
            LocalDate cur = startDate;
            while (cur.isBefore(referenceDate)) {
                cur = cur.plusDays(1);
                if (cur.getDayOfWeek() != DayOfWeek.SATURDAY && cur.getDayOfWeek() != DayOfWeek.SUNDAY) {
                    workingDays++;
                }
            }
            return workingDays;
        } else {
            return (int) Math.max(0, ChronoUnit.DAYS.between(startDate, referenceDate));
        }
    }

    /**
     * Builds comprehensive TAT Summary for a Requisition
     */
    public TatSummaryResponse computeTatSummary(Requisition requisition) {
        LocalDate startDate = requisition.getTatStartDate();
        LocalDate dueDate = requisition.getDueDate();
        int targetDays = requisition.getTatTargetDays() > 0 ? requisition.getTatTargetDays() : defaultTargetDays;

        int elapsedDays = 0;
        Integer daysRemaining = null;
        boolean isOverdue = false;
        double progress = 0.0;
        String statusCategory = "NOT_STARTED";

        if (startDate != null) {
            boolean isCompleted = requisition.getStatus() == Requisition.RequisitionStatus.FILLED
                    || requisition.getStatus() == Requisition.RequisitionStatus.CLOSED;

            if (isCompleted) {
                elapsedDays = requisition.getActualTatDays() != null ? requisition.getActualTatDays()
                        : calculateDaysElapsed(startDate, requisition.getClosedAt() != null ? requisition.getClosedAt().toLocalDate() : LocalDate.now());
                daysRemaining = 0;
                statusCategory = "COMPLETED";
                progress = 100.0;
            } else {
                elapsedDays = calculateDaysElapsed(startDate, LocalDate.now());

                if (dueDate != null) {
                    daysRemaining = (int) ChronoUnit.DAYS.between(LocalDate.now(), dueDate);
                    isOverdue = LocalDate.now().isAfter(dueDate);

                    progress = Math.min(100.0, Math.round(((double) elapsedDays / targetDays) * 100.0));

                    if (isOverdue) {
                        statusCategory = "OVERDUE";
                    } else if (elapsedDays >= 20 || daysRemaining <= 7) {
                        statusCategory = "AT_RISK";
                    } else {
                        statusCategory = "ON_TRACK";
                    }
                }
            }
        }

        return TatSummaryResponse.builder()
                .requisitionId(requisition.getId())
                .requisitionCode(requisition.getRequisitionCode())
                .jobTitle(requisition.getJobTitle())
                .departmentName(requisition.getDepartment() != null ? requisition.getDepartment().getDepartmentName() : "N/A")
                .recruiterName(requisition.getAssignedRecruiter() != null ? requisition.getAssignedRecruiter().getName() : "Unassigned")
                .tatStartDate(startDate)
                .dueDate(dueDate)
                .targetDays(targetDays)
                .elapsedDays(elapsedDays)
                .daysRemaining(daysRemaining)
                .isOverdue(isOverdue)
                .progressPercentage(progress)
                .statusCategory(statusCategory)
                .build();
    }
}
