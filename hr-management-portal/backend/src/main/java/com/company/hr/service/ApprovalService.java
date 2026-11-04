package com.company.hr.service;

import com.company.hr.dto.ApprovalActionRequest;
import com.company.hr.dto.RequisitionResponse;
import com.company.hr.entity.Requisition;
import com.company.hr.entity.RequisitionApproval;
import com.company.hr.entity.RequisitionHistory;
import com.company.hr.entity.User;
import com.company.hr.exception.ResourceNotFoundException;
import com.company.hr.exception.UnauthorizedWorkflowActionException;
import com.company.hr.repository.RequisitionApprovalRepository;
import com.company.hr.repository.RequisitionHistoryRepository;
import com.company.hr.repository.RequisitionRepository;
import com.company.hr.repository.UserRepository;
import com.company.hr.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ApprovalService {

    private final RequisitionRepository requisitionRepository;
    private final RequisitionApprovalRepository approvalRepository;
    private final RequisitionHistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final RequisitionService requisitionService;
    private final NotificationService notificationService;

    @Transactional
    public RequisitionResponse processApproval(Long requisitionId, ApprovalActionRequest request, UserPrincipal currentUser) {
        Requisition requisition = requisitionRepository.findById(requisitionId)
                .orElseThrow(() -> new ResourceNotFoundException("Requisition not found with ID: " + requisitionId));

        User approver = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Approver user not found"));

        RequisitionApproval.ApprovalStage stage = determineStageFromStatus(requisition.getStatus());
        if (stage == null) {
            throw new UnauthorizedWorkflowActionException("Requisition is currently not in a pending approval status. Current status: " + requisition.getStatus());
        }

        RequisitionApproval.ApprovalDecision decision = request.getDecision();
        String oldStatus = requisition.getStatus().name();
        Requisition.RequisitionStatus nextStatus;

        if (decision == RequisitionApproval.ApprovalDecision.APPROVED) {
            nextStatus = switch (stage) {
                case HR_REVIEW -> Requisition.RequisitionStatus.PENDING_DEPT_APPROVAL;
                case MANAGER_APPROVAL -> Requisition.RequisitionStatus.PENDING_SENIOR_APPROVAL;
                case SENIOR_APPROVAL -> Requisition.RequisitionStatus.APPROVED;
            };
        } else if (decision == RequisitionApproval.ApprovalDecision.REJECTED) {
            nextStatus = Requisition.RequisitionStatus.REJECTED;
        } else if (decision == RequisitionApproval.ApprovalDecision.RETURNED_FOR_CORRECTION) {
            nextStatus = Requisition.RequisitionStatus.RETURNED;
        } else {
            throw new IllegalArgumentException("Unsupported approval decision: " + decision);
        }

        // Record Approval Decision
        RequisitionApproval approval = RequisitionApproval.builder()
                .requisition(requisition)
                .approvalStage(stage)
                .approver(approver)
                .decision(decision)
                .remarks(request.getRemarks())
                .decisionDate(LocalDateTime.now())
                .build();
        approvalRepository.save(approval);

        // Update Requisition Status
        requisition.setStatus(nextStatus);
        requisitionRepository.save(requisition);

        // Record History Trail
        RequisitionHistory history = RequisitionHistory.builder()
                .requisition(requisition)
                .oldStatus(oldStatus)
                .newStatus(nextStatus.name())
                .actionComment("[" + stage + " - " + decision + "] " + (request.getRemarks() != null ? request.getRemarks() : ""))
                .changedBy(approver)
                .build();
        historyRepository.save(history);

        // Notifications
        String alertMsg = "Requisition " + requisition.getRequisitionCode() + " has been " + decision.name().toLowerCase()
                + " at stage " + stage + ". Next status: " + nextStatus;
        if (requisition.getCreatedBy() != null) {
            notificationService.notifyUser(requisition.getCreatedBy(), "Requisition Approval Update", alertMsg, "/requisitions/" + requisition.getId());
        }

        return requisitionService.mapToResponse(requisition);
    }

    private RequisitionApproval.ApprovalStage determineStageFromStatus(Requisition.RequisitionStatus status) {
        return switch (status) {
            case PENDING_HR_REVIEW -> RequisitionApproval.ApprovalStage.HR_REVIEW;
            case PENDING_DEPT_APPROVAL -> RequisitionApproval.ApprovalStage.MANAGER_APPROVAL;
            case PENDING_SENIOR_APPROVAL -> RequisitionApproval.ApprovalStage.SENIOR_APPROVAL;
            default -> null;
        };
    }
}
