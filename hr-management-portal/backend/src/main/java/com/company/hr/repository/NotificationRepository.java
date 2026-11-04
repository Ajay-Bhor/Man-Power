package com.company.hr.repository;

import com.company.hr.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    Page<Notification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<Notification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(Long userId);

    long countByUserIdAndIsReadFalse(Long userId);

    long countByUserIdAndReadStatus(Long userId, Notification.ReadStatus readStatus);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readStatus = com.company.hr.entity.Notification.ReadStatus.READ WHERE n.user.id = :userId AND n.readStatus = com.company.hr.entity.Notification.ReadStatus.UNREAD")
    int markAllAsReadForUser(@Param("userId") Long userId);
}
