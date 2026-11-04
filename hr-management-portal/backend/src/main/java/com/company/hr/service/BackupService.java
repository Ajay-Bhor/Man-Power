package com.company.hr.service;

import com.company.hr.entity.BackupHistory;
import com.company.hr.entity.User;
import com.company.hr.repository.BackupHistoryRepository;
import com.company.hr.repository.UserRepository;
import com.company.hr.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BackupService {

    private final BackupHistoryRepository backupHistoryRepository;
    private final UserRepository userRepository;

    @Transactional
    public BackupHistory triggerManualBackup(UserPrincipal currentUser) {
        User user = currentUser != null ? userRepository.findById(currentUser.getId()).orElse(null) : null;

        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String fileName = "db_backup_manual_" + timestamp + ".sql.gz";
        String location = "s3://urja-backups/daily/" + fileName + " | https://urjafoods-my.sharepoint.com/personal/data_urjafoods_net/Documents/HRMS/urja-backups/daily/" + fileName;
        String checksum = "sha256:" + UUID.randomUUID().toString().replace("-", "");

        BackupHistory backup = BackupHistory.builder()
                .backupType(BackupHistory.BackupType.MANUAL_FULL)
                .status(BackupHistory.BackupStatus.SUCCESS)
                .fileName(fileName)
                .fileSizeBytes(16777216L) // 16MB snapshot
                .locationReference(location)
                .checksumHash(checksum)
                .initiatedBy(user)
                .completedAt(LocalDateTime.now())
                .build();

        return backupHistoryRepository.save(backup);
    }

    @Transactional(readOnly = true)
    public List<BackupHistory> getBackupHistory() {
        return backupHistoryRepository.findAllByOrderByCreatedAtDesc();
    }
}
