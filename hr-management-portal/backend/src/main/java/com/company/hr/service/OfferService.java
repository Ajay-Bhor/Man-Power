package com.company.hr.service;

import com.company.hr.dto.*;
import com.company.hr.entity.*;
import com.company.hr.exception.BadRequestException;
import com.company.hr.exception.ResourceNotFoundException;
import com.company.hr.repository.*;
import com.company.hr.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OfferService {

    private final OfferRepository offerRepository;
    private final OnboardingChecklistRepository checklistRepository;
    private final CandidateRepository candidateRepository;
    private final RequisitionRepository requisitionRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;

    @Transactional(readOnly = true)
    public OfferSummaryStatsDto getSummaryStats() {
        long total = offerRepository.countTotalOffers();
        long sent = offerRepository.countByStatus(Offer.OfferStatus.OFFER_SENT);
        long accepted = offerRepository.countByStatus(Offer.OfferStatus.ACCEPTED);
        long declined = offerRepository.countByStatus(Offer.OfferStatus.DECLINED);
        long scheduled = offerRepository.countByStatus(Offer.OfferStatus.JOINING_SCHEDULED);
        long onboarding = offerRepository.countByOnboardingStatus(Offer.OnboardingStatus.IN_PROGRESS);
        long onboarded = offerRepository.countByStatus(Offer.OfferStatus.ONBOARDED);

        return OfferSummaryStatsDto.builder()
                .totalOffers(total)
                .offersSent(sent)
                .accepted(accepted)
                .declined(declined)
                .joiningScheduled(scheduled)
                .onboardingInProgress(onboarding)
                .onboarded(onboarded)
                .build();
    }

    @Transactional(readOnly = true)
    public Page<OfferResponseDto> filterOffers(
            String tab,
            Long requisitionId,
            String department,
            String statusStr,
            String joiningMonth,
            String search,
            UserPrincipal currentUser,
            Pageable pageable) {

        Offer.OfferStatus status = null;
        Offer.OnboardingStatus onboardingStatus = null;

        if (tab != null && !tab.equalsIgnoreCase("ALL")) {
            switch (tab.toUpperCase()) {
                case "OFFER_SENT", "OFFERSENT" -> status = Offer.OfferStatus.OFFER_SENT;
                case "ACCEPTED" -> status = Offer.OfferStatus.ACCEPTED;
                case "DECLINED" -> status = Offer.OfferStatus.DECLINED;
                case "JOINING_SCHEDULED", "JOININGSCHEDULED" -> status = Offer.OfferStatus.JOINING_SCHEDULED;
                case "ONBOARDING" -> onboardingStatus = Offer.OnboardingStatus.IN_PROGRESS;
                case "ONBOARDED" -> status = Offer.OfferStatus.ONBOARDED;
                default -> {
                    try {
                        status = Offer.OfferStatus.valueOf(tab.toUpperCase());
                    } catch (IllegalArgumentException ignored) {}
                }
            }
        }

        if (statusStr != null && !statusStr.equalsIgnoreCase("ALL") && !statusStr.isBlank()) {
            try {
                status = Offer.OfferStatus.valueOf(statusStr.toUpperCase().replace(" ", "_"));
            } catch (IllegalArgumentException ignored) {}
        }

        if (department != null && (department.equalsIgnoreCase("ALL") || department.equalsIgnoreCase("All Departments") || department.isBlank())) {
            department = null;
        }

        LocalDate monthStart = null;
        LocalDate monthEnd = null;
        if (joiningMonth != null && !joiningMonth.isBlank() && !joiningMonth.equalsIgnoreCase("ALL")) {
            try {
                if (joiningMonth.matches("\\d{4}-\\d{2}")) {
                    monthStart = LocalDate.parse(joiningMonth + "-01");
                    monthEnd = monthStart.plusMonths(1).minusDays(1);
                } else if (joiningMonth.toLowerCase().contains("oct")) {
                    monthStart = LocalDate.of(2026, 10, 1);
                    monthEnd = LocalDate.of(2026, 10, 31);
                } else if (joiningMonth.toLowerCase().contains("nov")) {
                    monthStart = LocalDate.of(2026, 11, 1);
                    monthEnd = LocalDate.of(2026, 11, 30);
                } else if (joiningMonth.toLowerCase().contains("dec")) {
                    monthStart = LocalDate.of(2026, 12, 1);
                    monthEnd = LocalDate.of(2026, 12, 31);
                } else if (joiningMonth.toLowerCase().contains("jan")) {
                    monthStart = LocalDate.of(2027, 1, 1);
                    monthEnd = LocalDate.of(2027, 1, 31);
                }
            } catch (Exception e) {
                log.warn("Could not parse joiningMonth filter: {}", joiningMonth);
            }
        }

        if (search != null && search.trim().isEmpty()) {
            search = null;
        }

        Page<Offer> offersPage = offerRepository.filterOffers(
                search, requisitionId, department, status, onboardingStatus, monthStart, monthEnd, pageable
        );

        boolean isRestricted = isCompensationRestricted(currentUser);

        List<OfferResponseDto> dtos = offersPage.getContent().stream()
                .map(o -> toDto(o, isRestricted))
                .collect(Collectors.toList());

        return new PageImpl<>(dtos, pageable, offersPage.getTotalElements());
    }

    @Transactional(readOnly = true)
    public OfferResponseDto getOfferById(Long id, UserPrincipal currentUser) {
        Offer offer = offerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found with id: " + id));

        boolean isRestricted = isCompensationRestricted(currentUser);

        return toDto(offer, isRestricted);
    }

    @Transactional
    public OfferResponseDto createOffer(OfferRequestDto request, UserPrincipal currentUser) {
        Candidate candidate = candidateRepository.findById(request.getCandidateId())
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found: " + request.getCandidateId()));

        // Prevent duplicate active offers
        List<Offer.OfferStatus> inactiveStatuses = List.of(
                Offer.OfferStatus.DECLINED, Offer.OfferStatus.WITHDRAWN, Offer.OfferStatus.EXPIRED
        );
        if (offerRepository.existsByCandidateIdAndStatusNotIn(candidate.getId(), inactiveStatuses)) {
            throw new BadRequestException("Candidate " + candidate.getName() + " already has an active offer record.");
        }

        Requisition requisition = null;
        if (request.getRequisitionId() != null) {
            requisition = requisitionRepository.findById(request.getRequisitionId()).orElse(null);
        }

        User creator = null;
        if (currentUser != null) {
            creator = userRepository.findById(currentUser.getId()).orElse(null);
        }

        String code = "URJ-OFF-2026-" + String.format("%03d", (offerRepository.count() + 1));

        Offer.OfferStatus initialStatus;
        String approvalStage;
        Offer.OnboardingStatus initialOnboardingStatus;

        if ("SAVE_DRAFT".equalsIgnoreCase(request.getAction())) {
            initialStatus = Offer.OfferStatus.DRAFT;
            approvalStage = "Draft";
            initialOnboardingStatus = Offer.OnboardingStatus.NOT_STARTED;
        } else if ("ROUTED_TO_DGM".equalsIgnoreCase(request.getApprovalWorkflow())) {
            initialStatus = Offer.OfferStatus.PENDING_APPROVAL;
            approvalStage = "Pending with DGM";
            initialOnboardingStatus = Offer.OnboardingStatus.NOT_STARTED;
        } else {
            initialStatus = Offer.OfferStatus.OFFER_SENT;
            approvalStage = "Approved";
            initialOnboardingStatus = Offer.OnboardingStatus.PENDING;
            candidate.setStatus(Candidate.CandidateStatus.OFFER_EXTENDED);
            candidateRepository.save(candidate);
        }

        BigDecimal fixed = request.getCtcFixed() != null ? request.getCtcFixed() : BigDecimal.ZERO;
        BigDecimal variable = request.getCtcVariable() != null ? request.getCtcVariable() : BigDecimal.ZERO;
        // Total Gross CTC: user manually enters total annual CTC, do not calculate automatically
        BigDecimal total = request.getCtcTotal() != null ? request.getCtcTotal() : BigDecimal.ZERO;

        if (fixed.compareTo(BigDecimal.ZERO) < 0 || variable.compareTo(BigDecimal.ZERO) < 0 || total.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Compensation amounts cannot be negative.");
        }

        Offer offer = Offer.builder()
                .offerCode(code)
                .candidate(candidate)
                .candidateName(candidate.getName())
                .candidateEmail(candidate.getEmail())
                .requisition(requisition)
                .requisitionCode(requisition != null ? requisition.getRequisitionCode() : null)
                .jobTitle(request.getJobTitle())
                .department(request.getDepartment())
                .location(request.getLocation())
                .offerDate(request.getOfferDate())
                .joiningDate(request.getJoiningDate())
                .ctcFixed(fixed)
                .ctcVariable(variable)
                .ctcTotal(total)
                .status(initialStatus)
                .onboardingStatus(initialOnboardingStatus)
                .approvalStage(approvalStage)
                .offerLetterUrl("/documents/offers/" + code + ".pdf")
                .notes(request.getNotes())
                .createdBy(creator)
                .build();

        Offer savedOffer = offerRepository.save(offer);

        // Seed comprehensive onboarding checklist
        seedDefaultChecklist(savedOffer);

        // Record Audit Log
        recordAudit(currentUser, "OFFER_CREATED", "OFFER", savedOffer.getOfferCode(),
                "Generated new offer letter for " + savedOffer.getCandidateName() + " (" + savedOffer.getJobTitle() + ")");

        return toDto(savedOffer, false);
    }

    @Transactional
    public OfferResponseDto updateOffer(Long id, OfferRequestDto request, UserPrincipal currentUser) {
        Offer offer = offerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found with id: " + id));

        if (request.getJobTitle() != null && !request.getJobTitle().isBlank()) {
            offer.setJobTitle(request.getJobTitle());
        }
        if (request.getDepartment() != null && !request.getDepartment().isBlank()) {
            offer.setDepartment(request.getDepartment());
        }
        if (request.getLocation() != null && !request.getLocation().isBlank()) {
            offer.setLocation(request.getLocation());
        }
        if (request.getOfferDate() != null) {
            offer.setOfferDate(request.getOfferDate());
        }
        if (request.getJoiningDate() != null) {
            offer.setJoiningDate(request.getJoiningDate());
        }
        if (request.getNotes() != null) {
            offer.setNotes(request.getNotes());
        }

        if (request.getCtcFixed() != null) {
            if (request.getCtcFixed().compareTo(BigDecimal.ZERO) < 0) {
                throw new BadRequestException("Fixed CTC cannot be negative.");
            }
            offer.setCtcFixed(request.getCtcFixed());
        }
        if (request.getCtcVariable() != null) {
            if (request.getCtcVariable().compareTo(BigDecimal.ZERO) < 0) {
                throw new BadRequestException("Variable CTC cannot be negative.");
            }
            offer.setCtcVariable(request.getCtcVariable());
        }
        // Total Gross CTC is entered manually by the user, saved separately in the existing database
        if (request.getCtcTotal() != null) {
            if (request.getCtcTotal().compareTo(BigDecimal.ZERO) < 0) {
                throw new BadRequestException("Total Gross CTC cannot be negative.");
            }
            offer.setCtcTotal(request.getCtcTotal());
        }

        Offer saved = offerRepository.save(offer);

        recordAudit(currentUser, "OFFER_UPDATED", "OFFER", saved.getOfferCode(),
                "Updated offer details and compensation for " + saved.getCandidateName());

        boolean isRestricted = isCompensationRestricted(currentUser);

        return toDto(saved, isRestricted);
    }

    @Transactional
    public OfferResponseDto transitionWorkflow(Long id, OfferWorkflowRequest request, UserPrincipal currentUser) {
        Offer offer = offerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found with id: " + id));

        Offer.OfferStatus oldStatus = offer.getStatus();
        Offer.OfferStatus newStatus = request.getStatus();

        offer.setStatus(newStatus);

        if (request.getNotes() != null && !request.getNotes().isBlank()) {
            offer.setNotes(offer.getNotes() != null ? offer.getNotes() + "\n" + request.getNotes() : request.getNotes());
        }

        Candidate candidate = offer.getCandidate();

        switch (newStatus) {
            case OFFER_SENT -> {
                offer.setApprovalStage("Approved");
                if (offer.getOnboardingStatus() == Offer.OnboardingStatus.NOT_STARTED) {
                    offer.setOnboardingStatus(Offer.OnboardingStatus.PENDING);
                }
                if (candidate != null) {
                    candidate.setStatus(Candidate.CandidateStatus.OFFER_EXTENDED);
                    candidateRepository.save(candidate);
                }
            }
            case ACCEPTED -> {
                offer.setOnboardingStatus(Offer.OnboardingStatus.IN_PROGRESS);
                if (candidate != null) {
                    candidate.setStatus(Candidate.CandidateStatus.OFFER_ACCEPTED);
                    candidateRepository.save(candidate);
                }
                // Mark offer letter acceptance in checklist
                checklistRepository.findByOfferIdOrderByIdAsc(offer.getId()).stream()
                        .filter(c -> "Signed Offer Letter Copy".equalsIgnoreCase(c.getItemName()))
                        .findFirst()
                        .ifPresent(c -> {
                            c.setIsCompleted(true);
                            c.setVerifiedBy(currentUser != null ? currentUser.getName() : "HR Admin");
                            c.setVerifiedAt(LocalDateTime.now());
                            checklistRepository.save(c);
                        });
            }
            case DECLINED -> {
                offer.setOnboardingStatus(Offer.OnboardingStatus.NOT_APPLICABLE);
                offer.setDeclineReason(request.getDeclineReason() != null ? request.getDeclineReason() : "Declined by candidate");
                if (candidate != null) {
                    candidate.setStatus(Candidate.CandidateStatus.REJECTED);
                    candidateRepository.save(candidate);
                }
            }
            case JOINING_SCHEDULED -> {
                offer.setOnboardingStatus(Offer.OnboardingStatus.IN_PROGRESS);
                if (request.getJoiningDate() != null) {
                    offer.setJoiningDate(request.getJoiningDate());
                }
            }
            case ONBOARDING -> {
                offer.setOnboardingStatus(Offer.OnboardingStatus.IN_PROGRESS);
            }
            case ONBOARDED -> {
                offer.setOnboardingStatus(Offer.OnboardingStatus.COMPLETED);
                if (candidate != null) {
                    candidate.setStatus(Candidate.CandidateStatus.JOINED);
                    candidateRepository.save(candidate);
                }
            }
            case WITHDRAWN -> {
                offer.setOnboardingStatus(Offer.OnboardingStatus.NOT_APPLICABLE);
                if (candidate != null) {
                    candidate.setStatus(Candidate.CandidateStatus.WITHDRAWN);
                    candidateRepository.save(candidate);
                }
            }
            default -> {}
        }

        if (request.getOnboardingStatus() != null) {
            offer.setOnboardingStatus(request.getOnboardingStatus());
        }

        Offer updated = offerRepository.save(offer);

        recordAudit(currentUser, "OFFER_STATUS_CHANGED", "OFFER", updated.getOfferCode(),
                "Status transitioned from " + oldStatus + " to " + newStatus + " for " + updated.getCandidateName());

        boolean isRestricted = isCompensationRestricted(currentUser);

        return toDto(updated, isRestricted);
    }

    @Transactional
    public List<OnboardingItemDto> getOnboardingChecklist(Long offerId) {
        List<OnboardingChecklist> items = checklistRepository.findByOfferIdOrderByIdAsc(offerId);
        if (items.isEmpty()) {
            Offer offer = offerRepository.findById(offerId).orElse(null);
            if (offer != null) {
                seedDefaultChecklist(offer);
                items = checklistRepository.findByOfferIdOrderByIdAsc(offerId);
            }
        }
        return items.stream()
                .map(this::toChecklistDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public OnboardingItemDto updateChecklistItem(Long offerId, Long itemId, Boolean isCompleted, String notes, UserPrincipal currentUser) {
        OnboardingChecklist item = checklistRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Checklist item not found: " + itemId));

        if (!item.getOffer().getId().equals(offerId)) {
            throw new BadRequestException("Item does not belong to specified offer.");
        }

        item.setIsCompleted(isCompleted != null ? isCompleted : !item.getIsCompleted());
        if (item.getIsCompleted()) {
            item.setVerifiedBy(currentUser != null ? currentUser.getName() : "HR Admin");
            item.setVerifiedAt(LocalDateTime.now());
        } else {
            item.setVerifiedBy(null);
            item.setVerifiedAt(null);
        }

        if (notes != null) {
            item.setNotes(notes);
        }

        OnboardingChecklist saved = checklistRepository.save(item);

        // Update overall offer onboarding progress if needed
        int total = checklistRepository.countByOfferId(offerId);
        int done = checklistRepository.countByOfferIdAndIsCompletedTrue(offerId);
        Offer offer = item.getOffer();
        if (done == total && total > 0 && offer.getStatus() == Offer.OfferStatus.JOINING_SCHEDULED) {
            offer.setOnboardingStatus(Offer.OnboardingStatus.IN_PROGRESS);
            offerRepository.save(offer);
        }

        return toChecklistDto(saved);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> generateOfferLetter(Long offerId, UserPrincipal currentUser) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found: " + offerId));

        boolean isRestricted = currentUser != null && currentUser.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_INTERVIEWER"));

        Map<String, Object> letter = new LinkedHashMap<>();
        letter.put("companyName", "Urja Foods & Agro Ltd.");
        letter.put("companyTagline", "Cleaner Energy • Nourishing A Better Tomorrow");
        letter.put("companyAddress", "Corporate Office: Urja Heights, Senapati Bapat Road, Pune - 411016, Maharashtra");
        letter.put("companyCin", "U15400PN2015PLC154890");
        letter.put("offerCode", offer.getOfferCode());
        letter.put("date", offer.getOfferDate().format(DateTimeFormatter.ofPattern("dd MMMM yyyy")));
        letter.put("candidateName", offer.getCandidateName());
        letter.put("candidateEmail", offer.getCandidateEmail());
        letter.put("jobTitle", offer.getJobTitle());
        letter.put("department", offer.getDepartment());
        letter.put("location", offer.getLocation());
        letter.put("joiningDate", offer.getJoiningDate().format(DateTimeFormatter.ofPattern("dd MMMM yyyy")));
        letter.put("status", offer.getStatus().name());

        if (isRestricted) {
            letter.put("compensationMasked", true);
            letter.put("totalCtc", "[CONFIDENTIAL - AUTHORIZED HR ACCESS ONLY]");
        } else {
            letter.put("compensationMasked", false);
            letter.put("fixedCtc", offer.getCtcFixed() + " LPA");
            letter.put("variableCtc", offer.getCtcVariable() + " LPA");
            letter.put("totalCtc", offer.getCtcTotal() + " LPA");
            letter.put("monthlyGross", String.format("₹ %,.2f", offer.getCtcFixed().multiply(BigDecimal.valueOf(100000)).divide(BigDecimal.valueOf(12), 2, java.math.RoundingMode.HALF_UP)));
        }

        letter.put("reportingManager", "Head of " + offer.getDepartment());
        letter.put("workplaceLocation", offer.getLocation());
        letter.put("probationPeriod", "6 Months from the date of joining");
        letter.put("noticePeriod", "30 Days during probation, 60 Days upon confirmation");
        letter.put("authorizedSignatory", "Priyanka Deshmukh");
        letter.put("signatoryTitle", "Head of Human Resources & Talent Acquisition");

        return letter;
    }

    private void seedDefaultChecklist(Offer offer) {
        List<OnboardingChecklist> items = List.of(
                OnboardingChecklist.builder().offer(offer).category("OFFER_ACCEPTANCE").itemName("Signed Offer Letter Copy").isCompleted(false).build(),
                OnboardingChecklist.builder().offer(offer).category("OFFER_ACCEPTANCE").itemName("Non-Disclosure Agreement (NDA)").isCompleted(false).build(),
                OnboardingChecklist.builder().offer(offer).category("IDENTITY_ADDRESS").itemName("Aadhaar Card Copy (UIDAI Verified)").isCompleted(false).build(),
                OnboardingChecklist.builder().offer(offer).category("IDENTITY_ADDRESS").itemName("PAN Card Verification").isCompleted(false).build(),
                OnboardingChecklist.builder().offer(offer).category("EDUCATION_EMPLOYMENT").itemName("Degree Certificate & Marksheets").isCompleted(false).build(),
                OnboardingChecklist.builder().offer(offer).category("EDUCATION_EMPLOYMENT").itemName("Relieving Letter / Resignation Acceptance").isCompleted(false).build(),
                OnboardingChecklist.builder().offer(offer).category("EDUCATION_EMPLOYMENT").itemName("Last 3 Months Salary Payslips").isCompleted(false).build(),
                OnboardingChecklist.builder().offer(offer).category("BGV").itemName("Criminal Background Verification (Police Clearance)").isCompleted(false).build(),
                OnboardingChecklist.builder().offer(offer).category("BGV").itemName("Past Employment Reference Check").isCompleted(false).build(),
                OnboardingChecklist.builder().offer(offer).category("JOINING_CONFIRMATION").itemName("Bank Account Details & Cancelled Cheque").isCompleted(false).build(),
                OnboardingChecklist.builder().offer(offer).category("JOINING_CONFIRMATION").itemName("EPF & Gratuity Nominee Details Form").isCompleted(false).build(),
                OnboardingChecklist.builder().offer(offer).category("FORMALITIES").itemName("Pre-Employment Medical Fitness Certificate").isCompleted(false).build(),
                OnboardingChecklist.builder().offer(offer).category("FORMALITIES").itemName("IT Asset Provisioning (Laptop & Email ID)").isCompleted(false).build()
        );
        checklistRepository.saveAll(items);
    }

    private void recordAudit(UserPrincipal user, String action, String entityType, String entityId, String details) {
        try {
            AuditLog log = AuditLog.builder()
                    .actorId(user != null ? user.getId() : 1L)
                    .actorName(user != null ? user.getName() : "HR Admin")
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .newValue("{\"details\":\"" + details + "\"}")
                    .ipAddress("127.0.0.1")
                    .userAgent("Urja ATS Web Client")
                    .build();
            auditLogRepository.save(log);
        } catch (Exception e) {
            log.warn("Could not record audit log: {}", e.getMessage());
        }
    }

    private OfferResponseDto toDto(Offer o, boolean isRestricted) {
        int total = checklistRepository.countByOfferId(o.getId());
        int completed = checklistRepository.countByOfferIdAndIsCompletedTrue(o.getId());
        int percent = (total > 0) ? (int) Math.round(((double) completed / total) * 100.0) : 0;

        String avatar = null;
        if (o.getCandidate() != null) {
            // compute avatar initials or mock photo
            String[] parts = o.getCandidateName().trim().split("\\s+");
            if (parts.length >= 2) {
                avatar = "" + parts[0].charAt(0) + parts[1].charAt(0);
            } else if (parts.length == 1 && !parts[0].isEmpty()) {
                avatar = "" + parts[0].charAt(0);
            }
        }

        return OfferResponseDto.builder()
                .id(o.getId())
                .offerCode(o.getOfferCode())
                .candidateId(o.getCandidate() != null ? o.getCandidate().getId() : null)
                .candidateName(o.getCandidateName())
                .candidateEmail(o.getCandidateEmail())
                .candidateMobile(o.getCandidate() != null ? o.getCandidate().getMobile() : null)
                .candidateAvatar(avatar)
                .requisitionId(o.getRequisition() != null ? o.getRequisition().getId() : null)
                .requisitionCode(o.getRequisitionCode())
                .jobTitle(o.getJobTitle())
                .department(o.getDepartment())
                .location(o.getLocation())
                .offerDate(o.getOfferDate())
                .joiningDate(o.getJoiningDate())
                .ctcFixed(isRestricted ? null : o.getCtcFixed())
                .ctcVariable(isRestricted ? null : o.getCtcVariable())
                .ctcTotal(isRestricted ? null : o.getCtcTotal())
                .compensationMasked(isRestricted)
                .status(o.getStatus())
                .onboardingStatus(o.getOnboardingStatus())
                .approvalStage(o.getApprovalStage())
                .offerLetterUrl(o.getOfferLetterUrl())
                .declineReason(o.getDeclineReason())
                .notes(o.getNotes())
                .createdByName(o.getCreatedBy() != null ? o.getCreatedBy().getName() : "HR Admin")
                .createdAt(o.getCreatedAt())
                .updatedAt(o.getUpdatedAt())
                .onboardingTotalTasks(total)
                .onboardingCompletedTasks(completed)
                .onboardingProgressPercent(percent)
                .build();
    }

    private OnboardingItemDto toChecklistDto(OnboardingChecklist item) {
        return OnboardingItemDto.builder()
                .id(item.getId())
                .offerId(item.getOffer().getId())
                .category(item.getCategory())
                .itemName(item.getItemName())
                .isCompleted(item.getIsCompleted())
                .verifiedBy(item.getVerifiedBy())
                .verifiedAt(item.getVerifiedAt())
                .documentUrl(item.getDocumentUrl())
                .notes(item.getNotes())
                .build();
    }

    private boolean isCompensationRestricted(UserPrincipal currentUser) {
        if (currentUser == null) return true;
        boolean hasHrRole = currentUser.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_HR_ADMIN") ||
                               a.getAuthority().equals("ROLE_HRBP") ||
                               a.getAuthority().equals("ROLE_HR_RECRUITER"));
        return !hasHrRole;
    }
}
