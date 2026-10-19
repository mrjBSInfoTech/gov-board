-- Run this migration against the selected gov-board database.
-- Funds belong to a room. Contributions are recorded for students in that fund.
CREATE TABLE IF NOT EXISTS `funds` (
  `fund_id` int(11) NOT NULL AUTO_INCREMENT,
  `room_id` int(11) NOT NULL,
  `fund_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `target_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `contribution_amount` decimal(10,2) NOT NULL,
  `deadline` date DEFAULT NULL,
  `status` enum('Collecting','Active','Closed') NOT NULL DEFAULT 'Collecting',
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`fund_id`),
  KEY `idx_funds_room_id` (`room_id`),
  CONSTRAINT `fk_funds_room`
    FOREIGN KEY (`room_id`) REFERENCES `room` (`room_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `fund_contributions` (
  `contribution_id` int(11) NOT NULL AUTO_INCREMENT,
  `fund_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_date` datetime NOT NULL DEFAULT current_timestamp(),
  `payment_method` enum('Cash','GCash','Bank Transfer','Other') NOT NULL DEFAULT 'Cash',
  `remarks` text DEFAULT NULL,
  `recorded_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`contribution_id`),
  KEY `idx_contrib_fund_student` (`fund_id`, `student_id`),
  KEY `idx_contrib_student_id` (`student_id`),
  CONSTRAINT `fk_contrib_fund`
    FOREIGN KEY (`fund_id`) REFERENCES `funds` (`fund_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_contrib_student`
    FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
