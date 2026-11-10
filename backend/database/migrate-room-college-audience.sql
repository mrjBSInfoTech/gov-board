-- Run against an existing gov-board database.
-- Existing college-owned rooms keep their former audience; unassigned rooms
-- are treated as available to every college.
ALTER TABLE `room`
  ADD COLUMN `all_colleges` tinyint(1) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS `room_college` (
  `room_id` int(11) NOT NULL,
  `college` varchar(150) NOT NULL,
  PRIMARY KEY (`room_id`, `college`),
  KEY `idx_room_college_college` (`college`, `room_id`),
  CONSTRAINT `room_college_room_fk`
    FOREIGN KEY (`room_id`) REFERENCES `room` (`room_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO `room_college` (`room_id`, `college`)
SELECT `room_id`, `college`
  FROM `room`
 WHERE `college` IS NOT NULL AND TRIM(`college`) <> '';

UPDATE `room`
   SET `all_colleges` = 1
 WHERE `college` IS NULL OR TRIM(`college`) = '';

CREATE TABLE IF NOT EXISTS `governance_announcement` (
  `announcement_id` int(11) NOT NULL AUTO_INCREMENT,
  `visibility_scope` enum('college','global') NOT NULL,
  `college` varchar(150) DEFAULT NULL,
  `announcement_body` text NOT NULL,
  `link` varchar(255) DEFAULT NULL,
  `created_by_admin` int(11) NOT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`announcement_id`),
  KEY `idx_governance_announcement_visibility`
    (`visibility_scope`, `college`, `date_created`, `announcement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
