-- Run against an existing gov-board database.
-- Adds customizable title/subject support for room and governance announcements.
ALTER TABLE `announcement`
  ADD COLUMN IF NOT EXISTS `title` varchar(200) DEFAULT NULL AFTER `room_id`;

ALTER TABLE `governance_announcement`
  ADD COLUMN IF NOT EXISTS `title` varchar(200) DEFAULT NULL AFTER `college`;
