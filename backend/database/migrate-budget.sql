-- Run this migration against the selected gov-board database.
-- Budget records belong to a room and can only be managed by officers in that room.
CREATE TABLE IF NOT EXISTS `budgets` (
  `budget_id` int(11) NOT NULL AUTO_INCREMENT,
  `room_id` int(11) NOT NULL,
  `budget_name` varchar(100) NOT NULL,
  `category` varchar(50) NOT NULL DEFAULT 'Other',
  `planned_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `spent_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `budget_period` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `status` enum('Planned','Ongoing','Completed') NOT NULL DEFAULT 'Planned',
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`budget_id`),
  KEY `idx_budgets_room` (`room_id`, `created_at`),
  CONSTRAINT `budgets_room_fk`
    FOREIGN KEY (`room_id`) REFERENCES `room` (`room_id`) ON DELETE CASCADE,
  CONSTRAINT `budgets_creator_fk`
    FOREIGN KEY (`created_by`) REFERENCES `student` (`student_id`) ON DELETE SET NULL,
  CONSTRAINT `budgets_planned_amount_check` CHECK (`planned_amount` >= 0),
  CONSTRAINT `budgets_spent_amount_check` CHECK (`spent_amount` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
