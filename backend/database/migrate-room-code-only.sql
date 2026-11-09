-- Run once on databases that have the room eligibility migration applied.
-- Existing room college ownership is retained for admin/calendar scoping.
DROP TABLE IF EXISTS `room_allowed_college`;

ALTER TABLE `room`
  ADD COLUMN `description` text DEFAULT NULL;

UPDATE `room`
SET `description` = ''
WHERE `description` IS NULL;

ALTER TABLE `room`
  MODIFY COLUMN `description` text NOT NULL,
  DROP COLUMN `join_access`,
  DROP COLUMN `eligible_year`,
  DROP COLUMN `eligible_section`,
  DROP COLUMN `eligible_course`;
