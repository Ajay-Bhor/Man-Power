package com.company.hr.service;

import com.company.hr.dto.*;
import com.company.hr.entity.*;
import com.company.hr.exception.BadRequestException;
import com.company.hr.exception.ResourceNotFoundException;
import com.company.hr.repository.*;
import com.company.hr.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InterviewService {

    private final InterviewRepository interviewRepository;
    private final InterviewFeedbackRepository feedbackRepository;
    private final CandidateRepository candidateRepository;
    private final RequisitionRepository requisitionRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final RecruitmentTaskRepository taskRepository;
    private final NotificationService notificationService;
    private final AuditLogRepository auditLogRepository;
    private final AccessPolicyService accessPolicyService;

    @Transactional(readOnly = true)
    public List<EligibleInterviewerResponse> getEligibleInterviewers() {
        List<User> users = userRepository.findEligibleInterviewers();
        return users.stream()
                .filter(u -> u.getStatus() == User.UserStatus.ACTIVE)
                .filter(this::isUserEligibleInterviewer)
                .map(this::mapToEligibleInterviewerResponse)
                .collect(Collectors.toList());
    }

    public boolean isUserEligibleInterviewer(User user) {
        if (user == null || user.getStatus() != User.UserStatus.ACTIVE) return false;
        return user.getRoles().stream()
                .anyMatch(r -> r.getRoleName().equals("ROLE_INTERVIEWER")
                        || r.getRoleName().equals("ROLE_DEPT_HEAD")
                        || r.getRoleName().equals("ROLE_APPROVING_MANAGER")
                        || r.getRoleName().equals("ROLE_HR_ADMIN")
                        || r.getRoleName().equals("ROLE_HRBP"));
    }

    private EligibleInterviewerResponse mapToEligibleInterviewerResponse(User user) {
        String designation = user.getDesignation();
        String department = "General";

        Optional<Employee> empOpt = employeeRepository.findByEmail(user.getEmail());
        if (empOpt.isPresent()) {
            Employee emp = empOpt.get();
            if (emp.getDesignation() != null && emp.getDesignation().getDesignationName() != null) {
                designation = emp.getDesignation().getDesignationName();
            }
            if (emp.getDepartment() != null && emp.getDepartment().getDepartmentName() != null) {
                department = emp.getDepartment().getDepartmentName();
            }
        }

        List<String> roleNames = user.getRoles().stream()
                .map(Role::getRoleName)
                .collect(Collectors.toList());

        return EligibleInterviewerResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .username(user.getUsername())
                .designation(designation)
                .title(designation)
                .department(department)
                .status(user.getStatus().name())
                .roles(roleNames)
                .eligible(true)
                .build();
    }

    @Transactional(readOnly = true)
    public InterviewerAvailabilityResponse checkAvailability(Long interviewerId, LocalDateTime scheduledAt, Integer durationMinutes, Long excludeInterviewId) {
        if (interviewerId == null) {
            return InterviewerAvailabilityResponse.builder()
                    .eligible(false)
                    .active(false)
                    .available(false)
                    .hasConflict(false)
                    .message("Please select an interviewer from the list.")
                    .build();
        }

        Optional<User> userOpt = userRepository.findById(interviewerId);
        if (userOpt.isEmpty()) {
            return InterviewerAvailabilityResponse.builder()
                    .interviewerId(interviewerId)
                    .eligible(false)
                    .active(false)
                    .available(false)
                    .hasConflict(false)
                    .message("Selected user ID " + interviewerId + " was not found in records.")
                    .build();
        }

        User user = userOpt.get();
        String designation = user.getDesignation();
        Optional<Employee> empOpt = employeeRepository.findByEmail(user.getEmail());
        if (empOpt.isPresent() && empOpt.get().getDesignation() != null) {
            designation = empOpt.get().getDesignation().getDesignationName();
        }

        if (user.getStatus() != User.UserStatus.ACTIVE) {
            return InterviewerAvailabilityResponse.builder()
                    .interviewerId(user.getId())
                    .interviewerName(user.getName())
                    .designation(designation)
                    .eligible(false)
                    .active(false)
                    .available(false)
                    .hasConflict(false)
                    .message("Interviewer account is currently " + user.getStatus() + ". Inactive staff cannot be assigned.")
                    .build();
        }

        if (!isUserEligibleInterviewer(user)) {
            return InterviewerAvailabilityResponse.builder()
                    .interviewerId(user.getId())
                    .interviewerName(user.getName())
                    .designation(designation)
                    .eligible(false)
                    .active(true)
                    .available(false)
                    .hasConflict(false)
                    .message("User " + user.getName() + " does not hold an authorized interviewer role.")
                    .build();
        }

        if (scheduledAt != null) {
            int duration = durationMinutes != null ? durationMinutes : 45;
            LocalDateTime windowStart = scheduledAt.minusMinutes(30);
            LocalDateTime windowEnd = scheduledAt.plusMinutes(duration);

            List<Interview> activeAtTime = interviewRepository.findByScheduledAtBetweenAndStatus(
                    windowStart, windowEnd, Interview.InterviewStatus.SCHEDULED);
            List<Interview> rescheduledAtTime = interviewRepository.findByScheduledAtBetweenAndStatus(
                    windowStart, windowEnd, Interview.InterviewStatus.RESCHEDULED);

            List<Interview> allAtTime = new ArrayList<>(activeAtTime);
            allAtTime.addAll(rescheduledAtTime);

            Optional<Interview> conflictOpt = allAtTime.stream()
                    .filter(i -> i.getInterviewer().getId().equals(user.getId()))
                    .filter(i -> excludeInterviewId == null || !i.getId().equals(excludeInterviewId))
                    .findFirst();

            if (conflictOpt.isPresent()) {
                Interview conf = conflictOpt.get();
                String candName = conf.getCandidate() != null ? conf.getCandidate().getName() : "another candidate";
                String timeStr = conf.getScheduledAt() != null ? conf.getScheduledAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a")) : "same time slot";
                String conflictMsg = "Interviewer " + user.getName() + " already has an active interview scheduled at " + timeStr + " (" + candName + ").";

                return InterviewerAvailabilityResponse.builder()
                        .interviewerId(user.getId())
                        .interviewerName(user.getName())
                        .designation(designation)
                        .eligible(true)
                        .active(true)
                        .available(false)
                        .hasConflict(true)
                        .conflictingInterviewTime(conf.getScheduledAt())
                        .conflictReason(conflictMsg)
                        .message(conflictMsg)
                        .build();
            }
        }

        return InterviewerAvailabilityResponse.builder()
                .interviewerId(user.getId())
                .interviewerName(user.getName())
                .designation(designation)
                .eligible(true)
                .active(true)
                .available(true)
                .hasConflict(false)
                .message("Panel member availability and role credentials verified.")
                .build();
    }

    @Transactional
    public Interview scheduleInterview(InterviewScheduleRequest request, UserPrincipal currentUser) {
        if (currentUser != null && !accessPolicyService.canUserAssignInterviewers(currentUser)) {
            throw new AccessDeniedException("User role is not authorized to schedule interviews or assign interviewers");
        }

        Candidate candidate = candidateRepository.findById(request.getCandidateId())
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found with ID: " + request.getCandidateId()));

        Requisition requisition = requisitionRepository.findById(request.getRequisitionId())
                .orElseThrow(() -> new ResourceNotFoundException("Requisition not found with ID: " + request.getRequisitionId()));

        User interviewer = userRepository.findById(request.getInterviewerId())
                .orElseThrow(() -> new ResourceNotFoundException("Interviewer not found with ID: " + request.getInterviewerId()));

        if (interviewer.getStatus() != User.UserStatus.ACTIVE) {
            throw new BadRequestException("Selected interviewer " + interviewer.getName() + " is inactive or suspended");
        }

        if (!isUserEligibleInterviewer(interviewer)) {
            throw new BadRequestException("Selected user " + interviewer.getName() + " does not hold an authorized interviewer role");
        }

        // Validate availability / overlapping schedule check (same day/hour conflict check)
        LocalDateTime requestedTime = request.getScheduledAt();
        LocalDateTime windowStart = requestedTime.minusMinutes(30);
        LocalDateTime windowEnd = requestedTime.plusMinutes(request.getDurationMinutes() != null ? request.getDurationMinutes() : 45);

        List<Interview> activeAtTime = interviewRepository.findByScheduledAtBetweenAndStatus(
                windowStart, windowEnd, Interview.InterviewStatus.SCHEDULED);
        List<Interview> rescheduledAtTime = interviewRepository.findByScheduledAtBetweenAndStatus(
                windowStart, windowEnd, Interview.InterviewStatus.RESCHEDULED);
        List<Interview> allAtTime = new ArrayList<>(activeAtTime);
        allAtTime.addAll(rescheduledAtTime);

        boolean hasConflict = allAtTime.stream()
                .anyMatch(i -> i.getInterviewer().getId().equals(interviewer.getId()));
        if (hasConflict) {
            throw new BadRequestException("Interviewer " + interviewer.getName() + " already has an interview scheduled within this time slot");
        }

        // Validate interview mode and mode-specific fields
        Interview.InterviewMode interviewMode = Interview.InterviewMode.fromString(request.getMode());
        String meetingLink = null;
        String meetingLocation = null;

        if (interviewMode == Interview.InterviewMode.ONLINE) {
            String link = request.getMeetingLink();
            if (link == null || link.isBlank()) {
                throw new BadRequestException("Meeting link URL is required for online interviews");
            }
            link = link.trim();
            if (!isValidMeetingUrl(link)) {
                throw new BadRequestException("Please enter a valid meeting URL (e.g., https://teams.microsoft.com/... or https://meet.google.com/...)");
            }
            meetingLink = link;
            meetingLocation = "Online Video Call";
        } else if (interviewMode == Interview.InterviewMode.IN_PERSON) {
            String loc = request.getMeetingLocation();
            if (loc == null || loc.isBlank()) {
                throw new BadRequestException("Plant / Office Location is required for in-person interviews");
            }
            meetingLocation = loc.trim();
            meetingLink = null;
        } else if (interviewMode == Interview.InterviewMode.TELEPHONIC) {
            meetingLink = null;
            meetingLocation = "Telephonic Screen";
        }

        Interview interview = Interview.builder()
                .candidate(candidate)
                .requisition(requisition)
                .round(request.getRound())
                .interviewer(interviewer)
                .scheduledAt(request.getScheduledAt())
                .durationMinutes(request.getDurationMinutes() != null ? request.getDurationMinutes() : 45)
                .mode(interviewMode)
                .meetingLink(meetingLink)
                .meetingLocation(meetingLocation)
                .instructions(request.getInstructions() != null ? request.getInstructions() : "Evaluate candidate skills for " + requisition.getJobTitle() + " and submit scorecard.")
                .status(Interview.InterviewStatus.SCHEDULED)
                .build();

        interview = interviewRepository.save(interview);

        // Advance Candidate Status
        candidate.setStatus(Candidate.CandidateStatus.INTERVIEW_SCHEDULED);
        candidateRepository.save(candidate);

        // Automatically assign feedback task to interviewer
        RecruitmentTask task = RecruitmentTask.builder()
                .requisition(requisition)
                .assignedUser(interviewer)
                .taskTitle("Conduct " + request.getRound() + " Interview: " + candidate.getName())
                .taskDescription(interview.getInstructions())
                .dueDate(request.getScheduledAt().toLocalDate())
                .status(RecruitmentTask.TaskStatus.PENDING)
                .priority(RecruitmentTask.TaskPriority.HIGH)
                .build();
        taskRepository.save(task);

        String locationDetails = interviewMode == Interview.InterviewMode.ONLINE ? ("Link: " + meetingLink) :
                (interviewMode == Interview.InterviewMode.IN_PERSON ? ("Location: " + meetingLocation) : "Mode: Telephonic Screen");

        // Notify Interviewer
        notificationService.notifyUser(interviewer, "Interview Scheduled: " + candidate.getName(),
                "You are assigned to evaluate " + candidate.getName() + " for " + requisition.getJobTitle() +
                        " on " + request.getScheduledAt().toString().replace("T", " ") + " (" + locationDetails + ")",
                "/interviews/" + interview.getId());

        // Audit Log
        AuditLog auditLog = AuditLog.builder()
                .actorId(currentUser != null ? currentUser.getId() : null)
                .actorName(currentUser != null ? currentUser.getName() : "HR Admin")
                .action("INTERVIEW_SCHEDULED")
                .entityType("INTERVIEW")
                .entityId(String.valueOf(interview.getId()))
                .newValue("{\"candidate\":\"" + candidate.getName() + "\",\"round\":\"" + request.getRound() + "\",\"mode\":\"" + interviewMode + "\",\"interviewer\":\"" + interviewer.getName() + "\",\"time\":\"" + request.getScheduledAt() + "\"}")
                .ipAddress("127.0.0.1")
                .build();
        auditLogRepository.save(auditLog);

        return interview;
    }

    public static boolean isValidMeetingUrl(String url) {
        if (url == null || url.isBlank()) return false;
        try {
            java.net.URI uri = new java.net.URI(url.trim());
            String scheme = uri.getScheme();
            if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
                return false;
            }
            if (uri.getHost() == null || !uri.getHost().contains(".")) {
                return false;
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Transactional
    public Interview rescheduleInterview(Long interviewId, InterviewRescheduleRequest request, UserPrincipal currentUser) {
        if (currentUser != null && !accessPolicyService.canUserAssignInterviewers(currentUser)) {
            throw new AccessDeniedException("User role is not authorized to reschedule interviews or reassign panel");
        }

        Interview interview = interviewRepository.findById(interviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview not found with ID: " + interviewId));

        LocalDateTime oldTime = interview.getScheduledAt();
        LocalDateTime requestedTime = request.getScheduledAt();

        // Validate availability and conflict check for new slot
        LocalDateTime windowStart = requestedTime.minusMinutes(30);
        LocalDateTime windowEnd = requestedTime.plusMinutes(request.getDurationMinutes() != null ? request.getDurationMinutes() : (interview.getDurationMinutes() != null ? interview.getDurationMinutes() : 45));

        List<Interview> activeAtTime = interviewRepository.findByScheduledAtBetweenAndStatus(
                windowStart, windowEnd, Interview.InterviewStatus.SCHEDULED);
        List<Interview> rescheduledAtTime = interviewRepository.findByScheduledAtBetweenAndStatus(
                windowStart, windowEnd, Interview.InterviewStatus.RESCHEDULED);
        List<Interview> allAtTime = new ArrayList<>(activeAtTime);
        allAtTime.addAll(rescheduledAtTime);

        boolean hasConflict = allAtTime.stream()
                .filter(i -> !i.getId().equals(interview.getId()))
                .anyMatch(i -> i.getInterviewer().getId().equals(interview.getInterviewer().getId()));
        if (hasConflict) {
            throw new BadRequestException("Interviewer " + interview.getInterviewer().getName() + " already has an interview scheduled within this time slot");
        }

        interview.setScheduledAt(request.getScheduledAt());
        if (request.getDurationMinutes() != null) interview.setDurationMinutes(request.getDurationMinutes());

        if (request.getMode() != null && !request.getMode().isBlank()) {
            Interview.InterviewMode interviewMode = Interview.InterviewMode.fromString(request.getMode());
            interview.setMode(interviewMode);

            if (interviewMode == Interview.InterviewMode.ONLINE) {
                String link = request.getMeetingLink();
                if (link == null || link.isBlank()) {
                    throw new BadRequestException("Meeting link URL is required for online interviews");
                }
                link = link.trim();
                if (!isValidMeetingUrl(link)) {
                    throw new BadRequestException("Please enter a valid meeting URL (e.g., https://teams.microsoft.com/... or https://meet.google.com/...)");
                }
                interview.setMeetingLink(link);
                interview.setMeetingLocation("Online Video Call");
            } else if (interviewMode == Interview.InterviewMode.IN_PERSON) {
                String loc = request.getMeetingLocation();
                if (loc == null || loc.isBlank()) {
                    throw new BadRequestException("Plant / Office Location is required for in-person interviews");
                }
                interview.setMeetingLocation(loc.trim());
                interview.setMeetingLink(null);
            } else if (interviewMode == Interview.InterviewMode.TELEPHONIC) {
                interview.setMeetingLink(null);
                interview.setMeetingLocation("Telephonic Screen");
            }
        } else {
            if (request.getMeetingLink() != null) interview.setMeetingLink(request.getMeetingLink());
            if (request.getMeetingLocation() != null) interview.setMeetingLocation(request.getMeetingLocation());
        }

        interview.setStatus(Interview.InterviewStatus.RESCHEDULED);

        Interview saved = interviewRepository.save(interview);

        // Update task due date
        List<RecruitmentTask> tasks = taskRepository.findByAssignedUserId(interview.getInterviewer().getId());
        tasks.stream()
                .filter(t -> t.getTaskTitle().contains(interview.getCandidate().getName()) && t.getStatus() == RecruitmentTask.TaskStatus.PENDING)
                .findFirst()
                .ifPresent(t -> {
                    t.setDueDate(request.getScheduledAt().toLocalDate());
                    taskRepository.save(t);
                });

        String rescheduleLocDetails = saved.getMode() == Interview.InterviewMode.ONLINE ? ("Link: " + saved.getMeetingLink()) :
                (saved.getMode() == Interview.InterviewMode.IN_PERSON ? ("Location: " + saved.getMeetingLocation()) : "Mode: Telephonic Screen");

        // Notify Interviewer
        notificationService.notifyUser(interview.getInterviewer(), "Interview Rescheduled: " + interview.getCandidate().getName(),
                "Your interview with " + interview.getCandidate().getName() + " was rescheduled to " + request.getScheduledAt().toString().replace("T", " ") + 
                        " (" + rescheduleLocDetails + ")" + (request.getReason() != null ? " (" + request.getReason() + ")" : ""),
                "/interviews/" + interview.getId());

        // Audit Log
        AuditLog auditLog = AuditLog.builder()
                .actorId(currentUser != null ? currentUser.getId() : null)
                .actorName(currentUser != null ? currentUser.getName() : "HR Admin")
                .action("INTERVIEW_RESCHEDULED")
                .entityType("INTERVIEW")
                .entityId(String.valueOf(interview.getId()))
                .oldValue("{\"time\":\"" + oldTime + "\"}")
                .newValue("{\"newTime\":\"" + request.getScheduledAt() + "\",\"mode\":\"" + saved.getMode() + "\",\"reason\":\"" + (request.getReason() != null ? request.getReason() : "") + "\"}")
                .ipAddress("127.0.0.1")
                .build();
        auditLogRepository.save(auditLog);

        return saved;
    }

    @Transactional
    public Interview reassignInterview(Long interviewId, InterviewReassignRequest request, UserPrincipal currentUser) {
        if (currentUser != null && !accessPolicyService.canUserAssignInterviewers(currentUser)) {
            throw new AccessDeniedException("User role is not authorized to reassign interview panel members");
        }

        Interview interview = interviewRepository.findById(interviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview not found with ID: " + interviewId));

        User oldInterviewer = interview.getInterviewer();
        User newInterviewer = userRepository.findById(request.getNewInterviewerId())
                .orElseThrow(() -> new ResourceNotFoundException("New interviewer not found with ID: " + request.getNewInterviewerId()));

        if (newInterviewer.getStatus() != User.UserStatus.ACTIVE) {
            throw new BadRequestException("Target interviewer " + newInterviewer.getName() + " is inactive or suspended");
        }

        if (!isUserEligibleInterviewer(newInterviewer)) {
            throw new BadRequestException("Selected user " + newInterviewer.getName() + " does not hold an authorized interviewer role");
        }

        // Validate availability and conflict check for new interviewer
        if (interview.getScheduledAt() != null) {
            LocalDateTime requestedTime = interview.getScheduledAt();
            LocalDateTime windowStart = requestedTime.minusMinutes(30);
            LocalDateTime windowEnd = requestedTime.plusMinutes(interview.getDurationMinutes() != null ? interview.getDurationMinutes() : 45);

            List<Interview> activeAtTime = interviewRepository.findByScheduledAtBetweenAndStatus(
                    windowStart, windowEnd, Interview.InterviewStatus.SCHEDULED);
            List<Interview> rescheduledAtTime = interviewRepository.findByScheduledAtBetweenAndStatus(
                    windowStart, windowEnd, Interview.InterviewStatus.RESCHEDULED);
            List<Interview> allAtTime = new ArrayList<>(activeAtTime);
            allAtTime.addAll(rescheduledAtTime);

            boolean hasConflict = allAtTime.stream()
                    .filter(i -> !i.getId().equals(interview.getId()))
                    .anyMatch(i -> i.getInterviewer().getId().equals(newInterviewer.getId()));
            if (hasConflict) {
                throw new BadRequestException("Interviewer " + newInterviewer.getName() + " already has an interview scheduled within this time slot");
            }
        }

        interview.setInterviewer(newInterviewer);
        Interview saved = interviewRepository.save(interview);

        // Reassign task
        List<RecruitmentTask> tasks = taskRepository.findByAssignedUserId(oldInterviewer.getId());
        tasks.stream()
                .filter(t -> t.getTaskTitle().contains(interview.getCandidate().getName()) && t.getStatus() == RecruitmentTask.TaskStatus.PENDING)
                .findFirst()
                .ifPresent(t -> {
                    t.setAssignedUser(newInterviewer);
                    taskRepository.save(t);
                });

        // Notifications
        notificationService.notifyUser(oldInterviewer, "Interview Reassigned",
                "Your interview with " + interview.getCandidate().getName() + " has been reassigned to " + newInterviewer.getName(),
                "/interviews");
        notificationService.notifyUser(newInterviewer, "Interview Assigned: " + interview.getCandidate().getName(),
                "You have been assigned to evaluate " + interview.getCandidate().getName() + " on " + interview.getScheduledAt(),
                "/interviews/" + interview.getId());

        // Audit Log
        AuditLog auditLog = AuditLog.builder()
                .actorId(currentUser != null ? currentUser.getId() : null)
                .actorName(currentUser != null ? currentUser.getName() : "HR Admin")
                .action("INTERVIEW_REASSIGNED")
                .entityType("INTERVIEW")
                .entityId(String.valueOf(interview.getId()))
                .oldValue("{\"interviewerId\":" + oldInterviewer.getId() + ",\"interviewerName\":\"" + oldInterviewer.getName() + "\"}")
                .newValue("{\"interviewerId\":" + newInterviewer.getId() + ",\"interviewerName\":\"" + newInterviewer.getName() + "\",\"reason\":\"" + (request.getReason() != null ? request.getReason() : "") + "\"}")
                .ipAddress("127.0.0.1")
                .build();
        auditLogRepository.save(auditLog);

        return saved;
    }

    @Transactional
    public Interview cancelInterview(Long interviewId, String reason, UserPrincipal currentUser) {
        Interview interview = interviewRepository.findById(interviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview not found with ID: " + interviewId));

        interview.setStatus(Interview.InterviewStatus.CANCELLED);
        Interview saved = interviewRepository.save(interview);

        // Cancel pending task
        List<RecruitmentTask> tasks = taskRepository.findByAssignedUserId(interview.getInterviewer().getId());
        tasks.stream()
                .filter(t -> t.getTaskTitle().contains(interview.getCandidate().getName()) && t.getStatus() == RecruitmentTask.TaskStatus.PENDING)
                .findFirst()
                .ifPresent(t -> {
                    t.setStatus(RecruitmentTask.TaskStatus.CANCELLED);
                    taskRepository.save(t);
                });

        // Notification
        notificationService.notifyUser(interview.getInterviewer(), "Interview Cancelled: " + interview.getCandidate().getName(),
                "Interview scheduled on " + interview.getScheduledAt() + " was cancelled." + (reason != null ? " Reason: " + reason : ""),
                "/interviews");

        // Audit Log
        AuditLog auditLog = AuditLog.builder()
                .actorId(currentUser != null ? currentUser.getId() : null)
                .actorName(currentUser != null ? currentUser.getName() : "HR Admin")
                .action("INTERVIEW_CANCELLED")
                .entityType("INTERVIEW")
                .entityId(String.valueOf(interview.getId()))
                .newValue("{\"reason\":\"" + (reason != null ? reason : "") + "\"}")
                .ipAddress("127.0.0.1")
                .build();
        auditLogRepository.save(auditLog);

        return saved;
    }

    @Transactional
    public InterviewFeedback submitFeedback(Long interviewId, InterviewFeedbackRequest request, UserPrincipal currentUser) {
        Interview interview = interviewRepository.findById(interviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview not found with ID: " + interviewId));

        // Enforce: only assigned interviewer or HR Admin can submit feedback
        boolean isAssignedInterviewer = currentUser != null && currentUser.getId().equals(interview.getInterviewer().getId());
        boolean isHRAdmin = currentUser != null && currentUser.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_HR_ADMIN"));

        if (!isAssignedInterviewer && !isHRAdmin) {
            throw new AccessDeniedException("Only the assigned interviewer (" + interview.getInterviewer().getName() + ") is authorized to submit evaluation feedback");
        }

        double avg = (request.getTechnicalRating() + request.getCommunicationRating() + request.getCultureFitRating()) / 3.0;
        BigDecimal overallRating = BigDecimal.valueOf(avg).setScale(1, RoundingMode.HALF_UP);

        InterviewFeedback feedback = InterviewFeedback.builder()
                .interview(interview)
                .technicalRating(request.getTechnicalRating())
                .communicationRating(request.getCommunicationRating())
                .cultureFitRating(request.getCultureFitRating())
                .overallRating(overallRating)
                .recommendation(request.getRecommendation())
                .strengths(request.getStrengths())
                .weaknesses(request.getWeaknesses())
                .detailedComments(request.getDetailedComments())
                .submittedAt(LocalDateTime.now())
                .build();

        feedback = feedbackRepository.save(feedback);

        // Mark Interview Completed
        interview.setStatus(Interview.InterviewStatus.COMPLETED);
        interviewRepository.save(interview);

        // Complete corresponding task
        List<RecruitmentTask> tasks = taskRepository.findByAssignedUserId(interview.getInterviewer().getId());
        tasks.stream()
                .filter(t -> t.getTaskTitle().contains(interview.getCandidate().getName()) && t.getStatus() == RecruitmentTask.TaskStatus.PENDING)
                .findFirst()
                .ifPresent(t -> {
                    t.setStatus(RecruitmentTask.TaskStatus.COMPLETED);
                    t.setCompletedAt(LocalDateTime.now());
                    taskRepository.save(t);
                });

        // Advance Candidate Status based on recommendation & round
        if (request.getRecommendation() == InterviewFeedback.Recommendation.STRONG_HIRE
                || request.getRecommendation() == InterviewFeedback.Recommendation.HIRE) {
            if (interview.getRound() == Interview.InterviewRound.DIRECTOR_FINAL) {
                interview.getCandidate().setStatus(Candidate.CandidateStatus.OFFER_EXTENDED);
            } else {
                interview.getCandidate().setStatus(Candidate.CandidateStatus.SHORTLISTED);
            }
        } else if (request.getRecommendation() == InterviewFeedback.Recommendation.REJECT) {
            interview.getCandidate().setStatus(Candidate.CandidateStatus.REJECTED);
        }
        candidateRepository.save(interview.getCandidate());

        // Audit Log
        AuditLog auditLog = AuditLog.builder()
                .actorId(currentUser != null ? currentUser.getId() : null)
                .actorName(currentUser != null ? currentUser.getName() : "Interviewer")
                .action("INTERVIEW_FEEDBACK_SUBMITTED")
                .entityType("INTERVIEW_FEEDBACK")
                .entityId(String.valueOf(feedback.getId()))
                .newValue("{\"recommendation\":\"" + request.getRecommendation() + "\",\"overallRating\":" + overallRating + "}")
                .ipAddress("127.0.0.1")
                .build();
        auditLogRepository.save(auditLog);

        return feedback;
    }

    @Transactional(readOnly = true)
    public Interview getInterviewById(Long id, UserPrincipal currentUser) {
        Interview interview = interviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Interview not found with ID: " + id));

        if (currentUser != null) {
            List<String> roles = currentUser.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
            boolean isITAdmin = roles.contains("ROLE_IT_ADMIN");
            boolean isHRAdmin = roles.contains("ROLE_HR_ADMIN");
            boolean isInterviewer = roles.contains("ROLE_INTERVIEWER");
            boolean isRecruiter = roles.contains("ROLE_HR_RECRUITER");

            if (isITAdmin && !isHRAdmin && !accessPolicyService.canItAdminAccessCandidates()) {
                throw new AccessDeniedException("IT Admin is restricted from accessing candidate interview records by security policy");
            }

            if (isInterviewer && !isHRAdmin) {
                if (!interview.getInterviewer().getId().equals(currentUser.getId())) {
                    throw new AccessDeniedException("Access denied: You are only authorized to view your own assigned interviews");
                }
            } else if (isRecruiter && !isHRAdmin) {
                Long recruiterId = interview.getRequisition().getAssignedRecruiter() != null ? interview.getRequisition().getAssignedRecruiter().getId() : null;
                if (recruiterId == null || !recruiterId.equals(currentUser.getId())) {
                    throw new AccessDeniedException("Access denied: You are only authorized to view interviews for your assigned requisitions");
                }
            }
        }

        return interview;
    }

    @Transactional(readOnly = true)
    public Page<Interview> getInterviews(UserPrincipal currentUser, Pageable pageable) {
        if (currentUser == null) {
            return interviewRepository.findAll(pageable);
        }

        List<String> roles = currentUser.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
        boolean isITAdmin = roles.contains("ROLE_IT_ADMIN");
        boolean isHRAdmin = roles.contains("ROLE_HR_ADMIN");
        boolean isInterviewer = roles.contains("ROLE_INTERVIEWER");
        boolean isRecruiter = roles.contains("ROLE_HR_RECRUITER");

        if (isInterviewer && !isHRAdmin) {
            return interviewRepository.findByInterviewerId(currentUser.getId(), pageable);
        }

        if (isRecruiter && !isHRAdmin) {
            return interviewRepository.findByRequisitionAssignedRecruiterId(currentUser.getId(), pageable);
        }

        if (isITAdmin && !isHRAdmin) {
            if (!accessPolicyService.canItAdminAccessCandidates()) {
                return Page.empty(pageable);
            }
        }

        return interviewRepository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public InterviewFeedback getFeedback(Long interviewId, UserPrincipal currentUser) {
        Interview interview = interviewRepository.findById(interviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview not found with ID: " + interviewId));

        if (currentUser != null) {
            List<String> roles = currentUser.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
            boolean isITAdmin = roles.contains("ROLE_IT_ADMIN");
            boolean isHRAdmin = roles.contains("ROLE_HR_ADMIN");
            boolean isInterviewer = roles.contains("ROLE_INTERVIEWER");

            if (isITAdmin && !accessPolicyService.canItAdminAccessFeedback()) {
                throw new AccessDeniedException("IT Admin is restricted from accessing candidate interview feedback by security policy");
            }

            if (isInterviewer && !isHRAdmin) {
                if (!interview.getInterviewer().getId().equals(currentUser.getId())) {
                    throw new AccessDeniedException("Access denied: You cannot view another interviewer's private feedback");
                }
            }
        }

        return feedbackRepository.findByInterviewId(interviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback has not been submitted for this interview yet"));
    }
}
