package com.company.hr.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "backup_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BackupHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "backup_type", nullable = false, length = 30)
    private BackupType backupType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BackupStatus status;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_size_bytes", nullable = false)
    @Builder.Default
    private Long fileSizeBytes = 0L;

    @Column(name = "location_reference", nullable = false, length = 500)
    private String locationReference;

    @Column(name = "checksum_hash", length = 100)
    private String checksumHash;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "initiated_by")
    private User initiatedBy;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum BackupType {
        SCHEDULED_DAILY,
        SCHEDULED_WEEKLY,
        MANUAL_FULL,
        DATABASE_ONLY
    }

    public enum BackupStatus {
        IN_PROGRESS,
        SUCCESS,
        FAILED
    }
}
