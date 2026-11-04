package com.company.hr.service;

import com.company.hr.dto.NotificationCountDto;
import com.company.hr.dto.NotificationDto;
import com.company.hr.entity.Notification;
import com.company.hr.entity.User;
import com.company.hr.exception.ResourceNotFoundException;
import com.company.hr.repository.NotificationRepository;
import com.company.hr.repository.UserRepository;
import com.company.hr.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;

    @Transactional(readOnly = true)
    public List<NotificationDto> getUserNotifications(UserPrincipal currentUser) {
        if (currentUser == null) return List.of();

        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId());
        
        // If user has no notifications in the database yet, seed the default 5 unread notifications
        if (notifications.isEmpty()) {
            User user = userRepository.findById(currentUser.getId()).orElse(null);
            if (user != null) {
                seedInitialNotificationsForUser(user);
                notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId());
            }
        }

        return notifications.stream()
                .map(NotificationDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public NotificationCountDto getUnreadCount(UserPrincipal currentUser) {
        if (currentUser == null) {
            return NotificationCountDto.builder().unreadCount(0).totalCount(0).build();
        }

        long unread = notificationRepository.countByUserIdAndReadStatus(currentUser.getId(), Notification.ReadStatus.UNREAD);
        long total = notificationRepository.count(); // or user's total notifications
        return NotificationCountDto.builder()
                .unreadCount(unread)
                .totalCount(total)
                .build();
    }

    @Transactional
    public NotificationDto markAsRead(Long notificationId, UserPrincipal currentUser) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to update notification read status");
        }

        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with ID: " + notificationId));

        // Validate that authenticated user can update only their own notifications
        if (!notification.getUser().getId().equals(currentUser.getId())) {
            log.warn("Security Alert: User {} attempted to read notification {} owned by user {}", 
                    currentUser.getId(), notificationId, notification.getUser().getId());
            throw new AccessDeniedException("Access denied: You can only update your own notifications");
        }

        // Idempotent: If already read, do not perform duplicate read operations or change unread count
        if (notification.getReadStatus() == Notification.ReadStatus.READ) {
            log.info("Notification {} is already marked as READ for user {}", notificationId, currentUser.getId());
            return NotificationDto.fromEntity(notification);
        }

        // Mark as READ in entity and MySQL
        notification.markAsRead();
        Notification saved = notificationRepository.save(notification);
        log.info("Successfully marked notification {} as READ for user {}", notificationId, currentUser.getId());

        return NotificationDto.fromEntity(saved);
    }

    @Transactional
    public int markAllAsRead(UserPrincipal currentUser) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to update notifications");
        }

        int count = notificationRepository.markAllAsReadForUser(currentUser.getId());
        log.info("Successfully marked all ({}) unread notifications as READ for user {}", count, currentUser.getId());
        return count;
    }

    @Transactional
    public void notifyUser(User user, String title, String message, String targetUrl) {
        Notification notification = Notification.builder()
                .user(user)
                .eventType("PORTAL_ALERT")
                .title(title)
                .message(message)
                .targetUrl(targetUrl)
                .isRead(false)
                .readStatus(Notification.ReadStatus.UNREAD)
                .deliveryStatus(Notification.DeliveryStatus.SENT)
                .sentAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notification);

        sendEmailNotification(user.getEmail(), title, message);
    }

    @Transactional
    public void notifyRole(String roleName, String title, String message, String targetUrl) {
        List<User> targetUsers = userRepository.findActiveUsersByRole(roleName);
        for (User user : targetUsers) {
            notifyUser(user, title, message, targetUrl);
        }
    }

    @Async
    public void sendEmailNotification(String toEmail, String subject, String body) {
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setTo(toEmail);
            mail.setSubject("[HR Portal] " + subject);
            mail.setText(body);
            mailSender.send(mail);
            log.info("Email notification sent successfully to {}", toEmail);
        } catch (Exception ex) {
            log.warn("Could not dispatch email to {} (SMTP may be unconfigured in dev): {}", toEmail, ex.getMessage());
        }
    }

    private void seedInitialNotificationsForUser(User user) {
        List<Notification> initialList = List.of(
                Notification.builder()
                        .user(user)
                        .eventType("APPLICATION_RECEIVED")
                        .title("New application received")
                        .message("Production Executive - Soya Division candidate applied via portal.")
                        .targetUrl("/candidates")
                        .isRead(false)
                        .readStatus(Notification.ReadStatus.UNREAD)
                        .deliveryStatus(Notification.DeliveryStatus.SENT)
                        .sentAt(LocalDateTime.now().minusMinutes(2))
                        .build(),
                Notification.builder()
                        .user(user)
                        .eventType("INTERVIEW_SCHEDULED")
                        .title("Interview scheduled")
                        .message("Sr. Shift Incharge - Feedmill interview scheduled with Sachin Jadhav.")
                        .targetUrl("/interviews")
                        .isRead(false)
                        .readStatus(Notification.ReadStatus.UNREAD)
                        .deliveryStatus(Notification.DeliveryStatus.SENT)
                        .sentAt(LocalDateTime.now().minusMinutes(25))
                        .build(),
                Notification.builder()
                        .user(user)
                        .eventType("OFFER_RELEASED")
                        .title("Offer released")
                        .message("QA / QC Executive offer dispatched to Pooja Sawant.")
                        .targetUrl("/offers")
                        .isRead(false)
                        .readStatus(Notification.ReadStatus.UNREAD)
                        .deliveryStatus(Notification.DeliveryStatus.SENT)
                        .sentAt(LocalDateTime.now().minusHours(1))
                        .build(),
                Notification.builder()
                        .user(user)
                        .eventType("CANDIDATE_JOINED")
                        .title("Candidate joined")
                        .message("Maintenance Technician joined Urja Foods Rahuri plant.")
                        .targetUrl("/employees")
                        .isRead(false)
                        .readStatus(Notification.ReadStatus.UNREAD)
                        .deliveryStatus(Notification.DeliveryStatus.SENT)
                        .sentAt(LocalDateTime.now().minusHours(3))
                        .build(),
                Notification.builder()
                        .user(user)
                        .eventType("TAT_MILESTONE")
                        .title("TAT Milestone Reached")
                        .message("Feedmill recruitment is tracking at 18 days (Well within 30-day target).")
                        .targetUrl("/dashboard")
                        .isRead(false)
                        .readStatus(Notification.ReadStatus.UNREAD)
                        .deliveryStatus(Notification.DeliveryStatus.SENT)
                        .sentAt(LocalDateTime.now().minusHours(5))
                        .build()
        );
        notificationRepository.saveAll(initialList);
    }
}
