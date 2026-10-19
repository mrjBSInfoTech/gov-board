-- Run this migration against the selected gov-board database.
-- Safe to rerun: existing room level and XP activity records are preserved.
CREATE TABLE IF NOT EXISTS `room_level` (
  `room_id` int(11) NOT NULL,
  `total_exp` int(11) NOT NULL DEFAULT 0,
  `level` int(11) NOT NULL DEFAULT 1,
  `date_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`room_id`),
  CONSTRAINT `room_level_room_fk`
    FOREIGN KEY (`room_id`) REFERENCES `room` (`room_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `room_xp_activity` (
  `activity_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `room_id` int(11) NOT NULL,
  `member_id` int(11) NOT NULL,
  `activity_type` varchar(40) NOT NULL,
  `activity_key` varchar(100) NOT NULL,
  `exp_awarded` int(11) NOT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`activity_id`),
  UNIQUE KEY `uq_room_xp_activity` (`room_id`, `member_id`, `activity_type`, `activity_key`),
  KEY `idx_room_xp_activity_room` (`room_id`),
  CONSTRAINT `room_xp_activity_room_fk`
    FOREIGN KEY (`room_id`) REFERENCES `room` (`room_id`) ON DELETE CASCADE,
  CONSTRAINT `room_xp_activity_member_fk`
    FOREIGN KEY (`member_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
