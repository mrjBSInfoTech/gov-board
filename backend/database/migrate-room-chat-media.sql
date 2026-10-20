-- Run this migration against an existing gov-board database.
ALTER TABLE `room_message`
  ADD COLUMN IF NOT EXISTS `media_filename` varchar(255) DEFAULT NULL AFTER `message`,
  ADD COLUMN IF NOT EXISTS `media_name` varchar(255) DEFAULT NULL AFTER `media_filename`,
  ADD COLUMN IF NOT EXISTS `media_type` enum('image','video','file') DEFAULT NULL AFTER `media_name`;

ALTER TABLE `room_message`
  MODIFY COLUMN `media_type` enum('image','video','file') DEFAULT NULL;
