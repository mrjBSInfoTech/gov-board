-- Run after migrate-audit-log.sql against an existing gov-board database.
-- Room ID is intentionally not a foreign key so historical logs survive room deletion.
ALTER TABLE `audit_logs`
  ADD COLUMN `room_id` int(11) DEFAULT NULL AFTER `information`,
  ADD KEY `idx_audit_logs_room` (`room_id`, `datetime`, `audit_id`);
