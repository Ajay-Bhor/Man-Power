-- ==============================================================================
-- V11: Notification Read/Unread Status & Initial Seed Data
-- ==============================================================================

-- 1. Add read_status column and index
ALTER TABLE notifications 
    ADD COLUMN read_status VARCHAR(20) NOT NULL DEFAULT 'UNREAD' AFTER is_read;

CREATE INDEX idx_notif_user_status ON notifications(user_id, read_status);

-- 2. Sync existing rows if any
UPDATE notifications 
SET read_status = CASE WHEN is_read = 1 THEN 'READ' ELSE 'UNREAD' END;

-- 3. Seed notifications for all users (5 unread per user)
INSERT INTO notifications (user_id, event_type, title, message, target_url, is_read, read_status, delivery_status, sent_at, created_at)
SELECT 
    u.id,
    'APPLICATION_RECEIVED',
    'New application received',
    'Production Executive - Soya Division candidate applied via portal.',
    '/candidates',
    0,
    'UNREAD',
    'SENT',
    NOW() - INTERVAL 2 MINUTE,
    NOW() - INTERVAL 2 MINUTE
FROM users u;

INSERT INTO notifications (user_id, event_type, title, message, target_url, is_read, read_status, delivery_status, sent_at, created_at)
SELECT 
    u.id,
    'INTERVIEW_SCHEDULED',
    'Interview scheduled',
    'Sr. Shift Incharge - Feedmill interview scheduled with Sachin Jadhav.',
    '/interviews',
    0,
    'UNREAD',
    'SENT',
    NOW() - INTERVAL 25 MINUTE,
    NOW() - INTERVAL 25 MINUTE
FROM users u;

INSERT INTO notifications (user_id, event_type, title, message, target_url, is_read, read_status, delivery_status, sent_at, created_at)
SELECT 
    u.id,
    'OFFER_RELEASED',
    'Offer released',
    'QA / QC Executive offer dispatched to Pooja Sawant.',
    '/offers',
    0,
    'UNREAD',
    'SENT',
    NOW() - INTERVAL 1 HOUR,
    NOW() - INTERVAL 1 HOUR
FROM users u;

INSERT INTO notifications (user_id, event_type, title, message, target_url, is_read, read_status, delivery_status, sent_at, created_at)
SELECT 
    u.id,
    'CANDIDATE_JOINED',
    'Candidate joined',
    'Maintenance Technician joined Urja Foods Rahuri plant.',
    '/employees',
    0,
    'UNREAD',
    'SENT',
    NOW() - INTERVAL 3 HOUR,
    NOW() - INTERVAL 3 HOUR
FROM users u;

INSERT INTO notifications (user_id, event_type, title, message, target_url, is_read, read_status, delivery_status, sent_at, created_at)
SELECT 
    u.id,
    'TAT_MILESTONE',
    'TAT Milestone Reached',
    'Feedmill recruitment is tracking at 18 days (Well within 30-day target).',
    '/dashboard',
    0,
    'UNREAD',
    'SENT',
    NOW() - INTERVAL 5 HOUR,
    NOW() - INTERVAL 5 HOUR
FROM users u;

