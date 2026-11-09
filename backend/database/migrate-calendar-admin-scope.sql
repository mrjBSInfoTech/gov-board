-- Run after migrate-calendar.sql against an existing gov-board database.
ALTER TABLE `calendar_event`
  MODIFY `room_id` int(11) DEFAULT NULL,
  MODIFY `created_by` int(11) DEFAULT NULL,
  ADD COLUMN `visibility_scope` enum('room','college','global') NOT NULL DEFAULT 'room',
  ADD COLUMN `college` varchar(150) DEFAULT NULL,
  ADD COLUMN `created_by_admin` int(11) DEFAULT NULL,
  ADD KEY `idx_calendar_event_admin_creator` (`created_by_admin`),
  ADD KEY `idx_calendar_event_scope_college` (`visibility_scope`,`college`),
  ADD CONSTRAINT `calendar_event_admin_creator_fk`
    FOREIGN KEY (`created_by_admin`) REFERENCES `admin` (`admin_id`) ON DELETE SET NULL;
