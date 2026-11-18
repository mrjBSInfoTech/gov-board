-- Run this migration against an existing gov-board database.
ALTER TABLE `room_message`
  ADD UNIQUE KEY `uq_room_message_room_message` (`room_id`,`message_id`);

CREATE TABLE IF NOT EXISTS `room_message_reaction` (
  `room_id` int(11) NOT NULL,
  `message_id` int(11) NOT NULL,
  `member_id` int(11) NOT NULL,
  `member_type` enum('admin','member') NOT NULL,
  `emoji` varchar(16) DEFAULT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`room_id`,`message_id`,`member_type`,`member_id`),
  KEY `idx_room_message_reaction_message` (`room_id`,`message_id`,`emoji`),
  CONSTRAINT `room_message_reaction_message_fk`
    FOREIGN KEY (`room_id`,`message_id`)
    REFERENCES `room_message` (`room_id`,`message_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `room_message_hidden` (
  `room_id` int(11) NOT NULL,
  `message_id` int(11) NOT NULL,
  `member_id` int(11) NOT NULL,
  `member_type` enum('admin','member') NOT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`room_id`,`message_id`,`member_type`,`member_id`),
  CONSTRAINT `room_message_hidden_message_fk`
    FOREIGN KEY (`room_id`,`message_id`)
    REFERENCES `room_message` (`room_id`,`message_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
