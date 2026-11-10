-- Run against an existing gov-board database.
CREATE TABLE IF NOT EXISTS `room_join_request` (
  `join_request_id` int(11) NOT NULL AUTO_INCREMENT,
  `room_id` int(11) NOT NULL,
  `member_id` int(11) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `requested_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `decided_by_type` enum('admin','officer') DEFAULT NULL,
  `decided_by_id` int(11) DEFAULT NULL,
  `decided_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`join_request_id`),
  UNIQUE KEY `uq_room_join_request_member` (`room_id`, `member_id`),
  KEY `idx_room_join_request_pending` (`room_id`, `status`, `requested_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
