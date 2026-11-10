-- Run against an existing gov-board database.
ALTER TABLE `announcement`
  ADD COLUMN IF NOT EXISTS `images` JSON DEFAULT NULL;

ALTER TABLE `governance_announcement`
  ADD COLUMN IF NOT EXISTS `images` JSON DEFAULT NULL;
