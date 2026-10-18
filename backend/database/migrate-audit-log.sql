-- Run against the selected gov-board database.
-- Safe to rerun: existing audit_logs tables and records are preserved.
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `audit_id` int(11) NOT NULL AUTO_INCREMENT,
  `datetime` timestamp NOT NULL DEFAULT current_timestamp(),
  `action` varchar(50) NOT NULL,
  `actor` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL,
  `status` varchar(30) NOT NULL,
  `information` text DEFAULT NULL,
  PRIMARY KEY (`audit_id`),
  KEY `idx_audit_logs_datetime` (`datetime`, `audit_id`),
  KEY `idx_audit_logs_actor` (`role`, `actor`, `datetime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Student and officer actors store their student number; admin actors store
-- their username. Information contains messages such as 'Student logged in'.
-- Section access is enforced by the officer audit endpoint, not this table.
-- No account foreign key: deleting an account must not erase audit history.
