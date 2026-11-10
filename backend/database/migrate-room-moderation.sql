-- Run against an existing gov-board database.
ALTER TABLE `room_member`
  ADD COLUMN IF NOT EXISTS `muted_until` datetime DEFAULT NULL;
