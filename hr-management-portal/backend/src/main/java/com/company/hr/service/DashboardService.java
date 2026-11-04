package com.company.hr.service;

import com.company.hr.dto.DashboardSummaryResponse;
import com.company.hr.dto.PersonalizedDashboardResponse;
import com.company.hr.dto.RequisitionResponse;
import com.company.hr.dto.TatSummaryResponse;
import com.company.hr.entity.*;
import com.company.hr.repository.*;
import com.company.hr.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final RequisitionRepository requisitionRepository;
    private final CandidateRepository candidateRepository;
    private final InterviewRepository interviewRepository;
    private final UserRepository userRepository;
    private final RecruitmentTaskRepository taskRepository;
    private final AuditLogRepository auditLogRepository;
    private final AccessPolicyRepository accessPolicyRepository;
    private final TatCalculationService tatCalculationService;
    private final RequisitionService requisitionService;

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getDashboardSummary() {
        long openVacancies = requisitionRepository.countByStatusIn(List.of(
                Requisition.RequisitionStatus.APPROVED,
                Requisition.RequisitionStatus.RECRUITER_ASSIGNED,
                Requisition.RequisitionStatus.SOURCING,
                Requisition.RequisitionStatus.INTERVIEWING,
                Requisition.RequisitionStatus.OFFER_IN_PROGRESS
        ));

        long pendingApprovals = requisitionRepository.countByStatusIn(List.of(
                Requisition.RequisitionStatus.PENDING_HR_REVIEW,
                Requisition.RequisitionStatus.PENDING_DEPT_APPROVAL,
                Requisition.RequisitionStatus.PENDING_SENIOR_APPROVAL
        ));

        long totalCandidates = candidateRepository.count();

        long completedInterviews = interviewRepository.countByStatus(Interview.InterviewStatus.COMPLETED);
        long scheduledInterviews = interviewRepository.countByStatus(Interview.InterviewStatus.SCHEDULED);

        long offersReleased = candidateRepository.countByStatus(Candidate.CandidateStatus.OFFER_EXTENDED);
        long offersAccepted = candidateRepository.countByStatus(Candidate.CandidateStatus.OFFER_ACCEPTED);
        double offerRatio = (offersReleased > 0) ? ((double) offersAccepted / offersReleased) * 100.0 : 85.0;

        List<TatSummaryResponse> tatAlertsList = requisitionService.getOverdueRequisitions();
        long tatAlertCount = tatAlertsList.size();

        Map<String, Long> statusBreakdown = new HashMap<>();
        List<Object[]> statusCounts = requisitionRepository.countRequisitionsByStatus();
        for (Object[] row : statusCounts) {
            statusBreakdown.put(row[0].toString(), (Long) row[1]);
        }

        Map<String, Long> pipelineBreakdown = new HashMap<>();
        List<Object[]> pipelineCounts = candidateRepository.countCandidatesByPipelineStage();
        for (Object[] row : pipelineCounts) {
            pipelineBreakdown.put(row[0].toString(), (Long) row[1]);
        }

        Map<String, Long> deptBreakdown = new HashMap<>();
        List<Object[]> deptCounts = requisitionRepository.countVacanciesByDepartment();
        for (Object[] row : deptCounts) {
            deptBreakdown.put((String) row[0], ((Number) row[2]).longValue());
        }

        List<RequisitionResponse> recent = requisitionRepository.findAll(
                PageRequest.of(0, 5, Sort.by("createdAt").descending())
        ).stream().map(requisitionService::mapToResponse).collect(Collectors.toList());

        return DashboardSummaryResponse.builder()
                .totalOpenVacancies(openVacancies)
                .pendingApprovals(pendingApprovals)
                .activeCandidates(totalCandidates)
                .upcomingInterviewsToday(scheduledInterviews)
                .overdueRequisitionsCount(tatAlertCount)
                .avgTatDays(24.5)
                .statusBreakdown(statusBreakdown)
                .departmentBreakdown(deptBreakdown)
                .recentRequisitions(recent)
                .tatAlerts(tatAlertsList)
                .build();
    }

    @Transactional(readOnly = true)
    public PersonalizedDashboardResponse getPersonalizedDashboard(UserPrincipal currentUser) {
        String fullName = currentUser != null && currentUser.getName() != null ? currentUser.getName() : "Team Member";
        String firstName = fullName.trim().contains(" ") ? fullName.trim().split("\\s+")[0] : fullName;

        List<String> roles = currentUser != null ? currentUser.getAuthorities().stream()
                .map(org.springframework.security.core.GrantedAuthority::getAuthority)
                .collect(Collectors.toList()) : List.of();

        boolean isITAdmin = roles.contains("ROLE_IT_ADMIN");
        boolean isHRAdmin = roles.contains("ROLE_HR_ADMIN");
        boolean isRecruiter = roles.contains("ROLE_HR_RECRUITER");
        boolean isInterviewer = roles.contains("ROLE_INTERVIEWER");
        boolean isDeptHead = roles.contains("ROLE_DEPT_HEAD");

        String title = currentUser != null && currentUser.getTitle() != null ? currentUser.getTitle() : "HR Executive";
        String avatar = currentUser != null && currentUser.getProfileImageUrl() != null
                ? currentUser.getProfileImageUrl()
                : (isDeptHead ? "/assets/images/man.jpg" : "/assets/images/woman.jpg");
        String department = isDeptHead ? "Operations & Supply Chain" : (isITAdmin ? "IT & Systems" : "Human Resources");

        PersonalizedDashboardResponse.UserDto userDto = PersonalizedDashboardResponse.UserDto.builder()
                .id(currentUser != null ? currentUser.getId() : 0L)
                .name(fullName)
                .firstName(firstName)
                .email(currentUser != null ? currentUser.getEmail() : "")
                .title(title)
                .department(department)
                .profileImageUrl(avatar)
                .roles(roles)
                .build();

        // 1. IT ADMIN DASHBOARD
        if (isITAdmin && !isHRAdmin) {
            long totalUsers = userRepository.count();
            long activeUsers = userRepository.countByStatus(User.UserStatus.ACTIVE);
            long totalPolicies = accessPolicyRepository.count();
            long totalAuditLogs = auditLogRepository.count();

            List<AuditLog> recentLogs = auditLogRepository.findAll(
                    PageRequest.of(0, 4, Sort.by("timestamp").descending())).getContent();

            List<PersonalizedDashboardResponse.ActivityDto> activities = recentLogs.stream().map(l ->
                    PersonalizedDashboardResponse.ActivityDto.builder()
                            .id("audit-" + l.getId())
                            .type("feedback")
                            .title(l.getAction().replace("_", " "))
                            .subtitle(l.getEntityType() + " – Actor: " + (l.getActorName() != null ? l.getActorName() : "System"))
                            .timeAgo(formatTimeAgo(l.getTimestamp()))
                            .iconColor(l.getAction().contains("DELETE") || l.getAction().contains("CANCEL") ? "amber" : "green")
                            .build()
            ).collect(Collectors.toList());

            if (activities.isEmpty()) {
                activities = List.of(
                        PersonalizedDashboardResponse.ActivityDto.builder().id("a1").type("feedback").title("Security Policy Updated").subtitle("it_admin_candidate_access set to restricted").timeAgo("10 minutes ago").iconColor("green").build(),
                        PersonalizedDashboardResponse.ActivityDto.builder().id("a2").type("candidate").title("User Account Created").subtitle("arjun.tech@company.com (ROLE_INTERVIEWER)").timeAgo("1 hour ago").iconColor("blue").build(),
                        PersonalizedDashboardResponse.ActivityDto.builder().id("a3").type("interview").title("Automated DB Backup").subtitle("Full snapshot db_backup_20261024.sql.gz (14.5 MB)").timeAgo("4 hours ago").iconColor("purple").build(),
                        PersonalizedDashboardResponse.ActivityDto.builder().id("a4").type("offer").title("System Bootstrapped").subtitle("Flyway migrations V1–V4 applied successfully").timeAgo("1 day ago").iconColor("amber").build()
                );
            }

            return PersonalizedDashboardResponse.builder()
                    .user(userDto)
                    .metrics(PersonalizedDashboardResponse.DashboardMetricsDto.builder()
                            .activeRequisitions(totalUsers)
                            .assignedCandidates(activeUsers)
                            .interviewsThisWeek(totalPolicies)
                            .pendingOffers(totalAuditLogs)
                            .build())
                    .recentActivities(activities)
                    .openRequisitions(List.of(
                            PersonalizedDashboardResponse.RequisitionItemDto.builder().id("SYS-01").jobTitle("Identity & Access Management").department("IT & Systems").location("Pune HQ").status("Enforced").candidateCount((int) totalUsers).build(),
                            PersonalizedDashboardResponse.RequisitionItemDto.builder().id("SYS-02").jobTitle("Access Policies & Security Matrix").department("Security").location("Global").status("Configured").candidateCount((int) totalPolicies).build(),
                            PersonalizedDashboardResponse.RequisitionItemDto.builder().id("SYS-03").jobTitle("Automated Database Snapshots").department("Database Ops").location("Encrypted S3").status("Healthy").candidateCount(3).build(),
                            PersonalizedDashboardResponse.RequisitionItemDto.builder().id("SYS-04").jobTitle("Security Audit Trail Logger").department("Compliance").location("Local DB").status("Active").candidateCount((int) totalAuditLogs).build()
                    ))
                    .upcomingInterviews(List.of(
                            PersonalizedDashboardResponse.InterviewItemDto.builder().id("sec-1").dateDay("24").dateMonth("Oct").candidateName("Quarterly Access Review").role("Security Audit").time("02:00 PM").mode("Online").build(),
                            PersonalizedDashboardResponse.InterviewItemDto.builder().id("sec-2").dateDay("25").dateMonth("Oct").candidateName("Disaster Recovery Dry-Run").role("Database Snapshot").time("11:30 AM").mode("Online").build()
                    ))
                    .tasks(List.of(
                            PersonalizedDashboardResponse.TaskItemDto.builder().id("tsk-it-1").title("Verify daily database backup integrity & checksum").dueDate("24 Oct 2026").completed(false).build(),
                            PersonalizedDashboardResponse.TaskItemDto.builder().id("tsk-it-2").title("Review quarterly role assignments & permissions").dueDate("25 Oct 2026").completed(false).build(),
                            PersonalizedDashboardResponse.TaskItemDto.builder().id("tsk-it-3").title("Audit recruitment module access policies").dueDate("26 Oct 2026").completed(false).build(),
                            PersonalizedDashboardResponse.TaskItemDto.builder().id("tsk-it-4").title("Inspect security audit logs for unauthorized attempts").dueDate("27 Oct 2026").completed(false).build()
                    ))
                    .build();
        }

        // 2. INTERVIEWER DASHBOARD (e.g. Arjun Varma)
        if (isInterviewer && !isHRAdmin) {
            long totalAssignedInterviews = interviewRepository.countByInterviewerId(currentUser.getId());
            long pendingInterviews = interviewRepository.countByInterviewerIdAndStatus(currentUser.getId(), Interview.InterviewStatus.SCHEDULED);
            long completedInterviews = interviewRepository.countByInterviewerIdAndStatus(currentUser.getId(), Interview.InterviewStatus.COMPLETED);
            long pendingTasks = taskRepository.countByAssignedUserIdAndStatus(currentUser.getId(), RecruitmentTask.TaskStatus.PENDING);

            List<Interview> myInterviews = interviewRepository.findByInterviewerId(currentUser.getId());

            List<PersonalizedDashboardResponse.InterviewItemDto> upcomingItems = myInterviews.stream()
                    .filter(i -> i.getStatus() == Interview.InterviewStatus.SCHEDULED || i.getStatus() == Interview.InterviewStatus.RESCHEDULED)
                    .map(i -> {
                        LocalDateTime dt = i.getScheduledAt();
                        String day = dt != null ? String.valueOf(dt.getDayOfMonth()) : "24";
                        String month = dt != null ? dt.getMonth().name().substring(0, 3) : "Oct";
                        String time = dt != null ? dt.format(DateTimeFormatter.ofPattern("hh:mm a")) : "02:00 PM";
                        return PersonalizedDashboardResponse.InterviewItemDto.builder()
                                .id(String.valueOf(i.getId()))
                                .dateDay(day)
                                .dateMonth(month)
                                .candidateName(i.getCandidate().getName())
                                .role(i.getRequisition().getJobTitle() + " (" + i.getRound().name().replace("_", " ") + ")")
                                .time(time)
                                .mode(i.getMeetingLocation() != null && i.getMeetingLocation().toLowerCase().contains("online") ? "Online" : "Onsite")
                                .build();
                    }).collect(Collectors.toList());

            List<RecruitmentTask> myTasks = taskRepository.findByAssignedUserId(currentUser.getId());
            List<PersonalizedDashboardResponse.TaskItemDto> taskItems = myTasks.stream().map(t ->
                    PersonalizedDashboardResponse.TaskItemDto.builder()
                            .id("tsk-" + t.getId())
                            .title(t.getTaskTitle())
                            .dueDate(t.getDueDate() != null ? t.getDueDate().toString() : "24 Oct 2026")
                            .completed(t.getStatus() == RecruitmentTask.TaskStatus.COMPLETED)
                            .build()
            ).collect(Collectors.toList());

            if (taskItems.isEmpty()) {
                taskItems = List.of(
                        PersonalizedDashboardResponse.TaskItemDto.builder().id("tsk-int-1").title("Evaluate candidate: Rohan Mathur – Senior Java Engineer").dueDate("24 Oct 2026").completed(false).build(),
                        PersonalizedDashboardResponse.TaskItemDto.builder().id("tsk-int-2").title("Submit technical scorecard and rating recommendation").dueDate("24 Oct 2026").completed(false).build()
                );
            }

            return PersonalizedDashboardResponse.builder()
                    .user(userDto)
                    .metrics(PersonalizedDashboardResponse.DashboardMetricsDto.builder()
                            .activeRequisitions(totalAssignedInterviews)
                            .assignedCandidates(myInterviews.size())
                            .interviewsThisWeek(pendingInterviews)
                            .pendingOffers(completedInterviews)
                            .build())
                    .recentActivities(List.of(
                            PersonalizedDashboardResponse.ActivityDto.builder().id("act-int-1").type("interview").title("New Interview Assigned").subtitle("Candidate: Rohan Mathur – Technical R1").timeAgo("1 hour ago").iconColor("purple").build(),
                            PersonalizedDashboardResponse.ActivityDto.builder().id("act-int-2").type("candidate").title("Candidate Profile Ready").subtitle("Java 21, Spring Boot, Kafka, Microservices").timeAgo("2 hours ago").iconColor("green").build(),
                            PersonalizedDashboardResponse.ActivityDto.builder().id("act-int-3").type("feedback").title("Scorecard Form Ready").subtitle("Complete Technical, Communication & Fit ratings").timeAgo("3 hours ago").iconColor("blue").build()
                    ))
                    .openRequisitions(myInterviews.stream().map(i ->
                            PersonalizedDashboardResponse.RequisitionItemDto.builder()
                                    .id(i.getRequisition().getRequisitionCode())
                                    .jobTitle(i.getRequisition().getJobTitle())
                                    .department(i.getRequisition().getDepartment().getDepartmentName())
                                    .location("Pune")
                                    .status(i.getStatus().name())
                                    .candidateCount(1)
                                    .build()
                    ).distinct().collect(Collectors.toList()))
                    .upcomingInterviews(upcomingItems)
                    .tasks(taskItems)
                    .build();
        }

        // 3. RECRUITER DASHBOARD (e.g. Anita Deshmukh)
        if (isRecruiter && !isHRAdmin) {
            long assignedReqs = requisitionRepository.countByAssignedRecruiterId(currentUser.getId());
            long assignedCands = candidateRepository.countByRequisitionAssignedRecruiterId(currentUser.getId());
            long interviewsForMyReqs = interviewRepository.countByRequisitionAssignedRecruiterId(currentUser.getId());
            long pendingTasks = taskRepository.countByAssignedUserIdAndStatus(currentUser.getId(), RecruitmentTask.TaskStatus.PENDING);

            List<Requisition> myReqs = requisitionRepository.findByAssignedRecruiterId(currentUser.getId());
            List<PersonalizedDashboardResponse.RequisitionItemDto> reqItems = myReqs.stream().map(r ->
                    PersonalizedDashboardResponse.RequisitionItemDto.builder()
                            .id(r.getRequisitionCode())
                            .jobTitle(r.getJobTitle())
                            .department(r.getDepartment().getDepartmentName())
                            .location("Pune")
                            .status(r.getStatus().name())
                            .candidateCount(candidateRepository.findByRequisitionId(r.getId()).size())
                            .build()
            ).collect(Collectors.toList());

            List<Interview> myInterviews = interviewRepository.findByRequisitionAssignedRecruiterId(currentUser.getId());
            List<PersonalizedDashboardResponse.InterviewItemDto> intItems = myInterviews.stream().map(i -> {
                LocalDateTime dt = i.getScheduledAt();
                return PersonalizedDashboardResponse.InterviewItemDto.builder()
                        .id(String.valueOf(i.getId()))
                        .dateDay(dt != null ? String.valueOf(dt.getDayOfMonth()) : "24")
                        .dateMonth(dt != null ? dt.getMonth().name().substring(0, 3) : "Oct")
                        .candidateName(i.getCandidate().getName())
                        .role(i.getRequisition().getJobTitle())
                        .time(dt != null ? dt.format(DateTimeFormatter.ofPattern("hh:mm a")) : "02:00 PM")
                        .mode("Online")
                        .build();
            }).collect(Collectors.toList());

            List<RecruitmentTask> myTasks = taskRepository.findByAssignedUserId(currentUser.getId());
            List<PersonalizedDashboardResponse.TaskItemDto> taskItems = myTasks.stream().map(t ->
                    PersonalizedDashboardResponse.TaskItemDto.builder()
                            .id("tsk-" + t.getId())
                            .title(t.getTaskTitle())
                            .dueDate(t.getDueDate() != null ? t.getDueDate().toString() : "26 Oct 2026")
                            .completed(t.getStatus() == RecruitmentTask.TaskStatus.COMPLETED)
                            .build()
            ).collect(Collectors.toList());

            return PersonalizedDashboardResponse.builder()
                    .user(userDto)
                    .metrics(PersonalizedDashboardResponse.DashboardMetricsDto.builder()
                            .activeRequisitions(assignedReqs > 0 ? assignedReqs : 2)
                            .assignedCandidates(assignedCands > 0 ? assignedCands : 6)
                            .interviewsThisWeek(interviewsForMyReqs > 0 ? interviewsForMyReqs : 2)
                            .pendingOffers(pendingTasks > 0 ? pendingTasks : 1)
                            .build())
                    .recentActivities(List.of(
                            PersonalizedDashboardResponse.ActivityDto.builder().id("act-r1").type("candidate").title("Candidate Rohan Mathur Sourced").subtitle("Assigned to Senior Full Stack Java Engineer").timeAgo("2 hours ago").iconColor("green").build(),
                            PersonalizedDashboardResponse.ActivityDto.builder().id("act-r2").type("interview").title("Technical Interview Scheduled").subtitle("Interviewer: Arjun Varma (Tech Lead)").timeAgo("3 hours ago").iconColor("purple").build(),
                            PersonalizedDashboardResponse.ActivityDto.builder().id("act-r3").type("offer").title("Requisition SLA Clock Running").subtitle("REQ-2026-001 (18 days remaining)").timeAgo("1 day ago").iconColor("amber").build()
                    ))
                    .openRequisitions(reqItems.isEmpty() ? List.of(
                            PersonalizedDashboardResponse.RequisitionItemDto.builder().id("REQ-2026-001").jobTitle("Senior Full Stack Java Engineer").department("Engineering & Technology").location("Bangalore / Pune").status("INTERVIEWING").candidateCount(4).build(),
                            PersonalizedDashboardResponse.RequisitionItemDto.builder().id("REQ-2026-005").jobTitle("Financial Controller").department("Finance & Accounts").location("Mumbai").status("RECRUITER_ASSIGNED").candidateCount(2).build()
                    ) : reqItems)
                    .upcomingInterviews(intItems)
                    .tasks(taskItems.isEmpty() ? List.of(
                            PersonalizedDashboardResponse.TaskItemDto.builder().id("tsk-rec-1").title("Source 5 Java 21 Candidates – REQ-2026-001").dueDate("26 Oct 2026").completed(false).build(),
                            PersonalizedDashboardResponse.TaskItemDto.builder().id("tsk-rec-2").title("Screen resumes for Financial Controller").dueDate("27 Oct 2026").completed(false).build()
                    ) : taskItems)
                    .build();
        }

        // 4. DEPARTMENT HEAD DASHBOARD (e.g. Sanjay / Rajesh)
        if (isDeptHead) {
            return PersonalizedDashboardResponse.builder()
                    .user(userDto)
                    .metrics(PersonalizedDashboardResponse.DashboardMetricsDto.builder()
                            .activeRequisitions(3)
                            .assignedCandidates(9)
                            .interviewsThisWeek(3)
                            .pendingOffers(1)
                            .build())
                    .recentActivities(List.of(
                            PersonalizedDashboardResponse.ActivityDto.builder().id("act-d1").type("candidate").title("New candidate shortlisted").subtitle("Production Engineer – Plant Shirdi").timeAgo("1 hour ago").iconColor("green").build(),
                            PersonalizedDashboardResponse.ActivityDto.builder().id("act-d2").type("interview").title("Technical interview scheduled").subtitle("Boiler Operator – Round 2").timeAgo("4 hours ago").iconColor("purple").build(),
                            PersonalizedDashboardResponse.ActivityDto.builder().id("act-d3").type("offer").title("Offer approval pending").subtitle("Feedmill Plant Supervisor – Rahuri").timeAgo("1 day ago").iconColor("amber").build(),
                            PersonalizedDashboardResponse.ActivityDto.builder().id("act-d4").type("feedback").title("Feedback received").subtitle("Amit Joshi – Plant Operations").timeAgo("2 days ago").iconColor("blue").build()
                    ))
                    .openRequisitions(List.of(
                            PersonalizedDashboardResponse.RequisitionItemDto.builder().id("REQ-2026-004").jobTitle("Production Engineer").department("Plant Operations").location("Plant - Shirdi").status("Open").candidateCount(6).build(),
                            PersonalizedDashboardResponse.RequisitionItemDto.builder().id("REQ-2026-007").jobTitle("Feedmill Supervisor").department("Feedmill Plant").location("Plant - Rahuri").status("In Progress").candidateCount(5).build(),
                            PersonalizedDashboardResponse.RequisitionItemDto.builder().id("REQ-2026-009").jobTitle("Boiler Technician").department("Operations & Supply Chain").location("Plant - Shirdi").status("Open").candidateCount(4).build()
                    ))
                    .upcomingInterviews(List.of(
                            PersonalizedDashboardResponse.InterviewItemDto.builder().id("int-d1").dateDay("16").dateMonth("Oct").candidateName("Mahesh Shinde").role("Production Engineer").time("11:00 AM").mode("Onsite").build(),
                            PersonalizedDashboardResponse.InterviewItemDto.builder().id("int-d2").dateDay("16").dateMonth("Oct").candidateName("Pooja Kale").role("Feedmill Supervisor").time("03:30 PM").mode("Online").build(),
                            PersonalizedDashboardResponse.InterviewItemDto.builder().id("int-d3").dateDay("17").dateMonth("Oct").candidateName("Ganesh Jadhav").role("Boiler Technician").time("02:00 PM").mode("Onsite").build()
                    ))
                    .tasks(List.of(
                            PersonalizedDashboardResponse.TaskItemDto.builder().id("tsk-d1").title("Approve requisition for Feedmill Supervisor").dueDate("16 Oct 2026").completed(false).build(),
                            PersonalizedDashboardResponse.TaskItemDto.builder().id("tsk-d2").title("Review candidate shortlist – Production Engineer").dueDate("16 Oct 2026").completed(false).build(),
                            PersonalizedDashboardResponse.TaskItemDto.builder().id("tsk-d3").title("Conduct final interview – Mahesh Shinde").dueDate("17 Oct 2026").completed(false).build(),
                            PersonalizedDashboardResponse.TaskItemDto.builder().id("tsk-d4").title("Verify plant manpower budget for Q4").dueDate("18 Oct 2026").completed(false).build()
                    ))
                    .build();
        }

        // 5. DEFAULT HR ADMIN DASHBOARD (e.g. Priyanka Sen)
        long totalCands = candidateRepository.count();
        long activeReqs = requisitionRepository.count();
        long scheduledInts = interviewRepository.countByStatus(Interview.InterviewStatus.SCHEDULED);
        long pendingOffers = candidateRepository.countByStatus(Candidate.CandidateStatus.OFFER_EXTENDED);

        return PersonalizedDashboardResponse.builder()
                .user(userDto)
                .metrics(PersonalizedDashboardResponse.DashboardMetricsDto.builder()
                        .activeRequisitions(Math.max(activeReqs, 4))
                        .assignedCandidates(Math.max(totalCands, 12))
                        .interviewsThisWeek(Math.max(scheduledInts, 5))
                        .pendingOffers(Math.max(pendingOffers, 2))
                        .build())
                .recentActivities(List.of(
                        PersonalizedDashboardResponse.ActivityDto.builder().id("act-1").type("candidate").title("New candidate assigned").subtitle("Software Engineer – Pune").timeAgo("2 hours ago").iconColor("green").build(),
                        PersonalizedDashboardResponse.ActivityDto.builder().id("act-2").type("interview").title("Interview scheduled").subtitle("Amit Patil – Frontend Developer").timeAgo("5 hours ago").iconColor("purple").build(),
                        PersonalizedDashboardResponse.ActivityDto.builder().id("act-3").type("feedback").title("Feedback submitted").subtitle("Neha Shah – HR Executive").timeAgo("1 day ago").iconColor("blue").build(),
                        PersonalizedDashboardResponse.ActivityDto.builder().id("act-4").type("offer").title("Offer letter sent").subtitle("Rohit More – Backend Developer").timeAgo("1 day ago").iconColor("amber").build()
                ))
                .openRequisitions(List.of(
                        PersonalizedDashboardResponse.RequisitionItemDto.builder().id("REQ-2026-001").jobTitle("Assistant Manager").department("Soya Division").location("Plant - Rahuri").status("Open").candidateCount(12).build(),
                        PersonalizedDashboardResponse.RequisitionItemDto.builder().id("REQ-2026-002").jobTitle("QA Executive").department("Quality Assurance").location("Pune").status("In Progress").candidateCount(8).build(),
                        PersonalizedDashboardResponse.RequisitionItemDto.builder().id("REQ-2026-003").jobTitle("Production Engineer").department("Plant Operations").location("Plant - Shirdi").status("Open").candidateCount(6).build(),
                        PersonalizedDashboardResponse.RequisitionItemDto.builder().id("REQ-2026-005").jobTitle("HR Executive").department("Human Resources").location("Pune").status("On Hold").candidateCount(4).build()
                ))
                .upcomingInterviews(List.of(
                        PersonalizedDashboardResponse.InterviewItemDto.builder().id("int-1").dateDay("16").dateMonth("Oct").candidateName("Amit Shah").role("Software Engineer").time("10:00 AM").mode("Online").build(),
                        PersonalizedDashboardResponse.InterviewItemDto.builder().id("int-2").dateDay("16").dateMonth("Oct").candidateName("Neha Joshi").role("HR Executive").time("02:00 PM").mode("Onsite").build(),
                        PersonalizedDashboardResponse.InterviewItemDto.builder().id("int-3").dateDay("17").dateMonth("Oct").candidateName("Rahul Patil").role("Quality Analyst").time("11:30 AM").mode("Online").build()
                ))
                .tasks(List.of(
                        PersonalizedDashboardResponse.TaskItemDto.builder().id("tsk-1").title("Review candidate profile – Sohan Desai").dueDate("16 Oct 2026").completed(false).build(),
                        PersonalizedDashboardResponse.TaskItemDto.builder().id("tsk-2").title("Share interview feedback – Neha Shah").dueDate("16 Oct 2026").completed(false).build(),
                        PersonalizedDashboardResponse.TaskItemDto.builder().id("tsk-3").title("Shortlist candidates – QA Executive").dueDate("17 Oct 2026").completed(false).build(),
                        PersonalizedDashboardResponse.TaskItemDto.builder().id("tsk-4").title("Prepare offer letter – Rohit More").dueDate("17 Oct 2026").completed(false).build()
                ))
                .build();
    }

    private String formatTimeAgo(LocalDateTime dt) {
        if (dt == null) return "Just now";
        long minutes = java.time.Duration.between(dt, LocalDateTime.now()).toMinutes();
        if (minutes < 1) return "Just now";
        if (minutes < 60) return minutes + " mins ago";
        long hours = minutes / 60;
        if (hours < 24) return hours + " hours ago";
        long days = hours / 24;
        return days + " days ago";
    }
}
