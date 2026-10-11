-- Run this migration against an existing gov-board database.
CREATE TABLE IF NOT EXISTS `calendar_event` (
  `event_id` int(11) NOT NULL AUTO_INCREMENT,
  `room_id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `start_at` datetime NOT NULL,
  `end_at` datetime DEFAULT NULL,
  `reminder_minutes` int(11) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`event_id`),
  KEY `idx_calendar_event_start` (`start_at`),
  KEY `idx_calendar_event_creator` (`created_by`),
  KEY `idx_calendar_event_room` (`room_id`),
  CONSTRAINT `calendar_event_creator_fk`
    FOREIGN KEY (`created_by`) REFERENCES `student` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `calendar_event_room_fk`
    FOREIGN KEY (`room_id`) REFERENCES `room` (`room_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Existing installations created before room scoping need this column and FK.
ALTER TABLE `calendar_event`
  ADD COLUMN IF NOT EXISTS `room_id` int(11) NOT NULL AFTER `event_id`;
